const db = require("../models");
const User = db.user;
const bcrypt = require("bcryptjs");
const { generateToken, sendVerificationEmail } = require("../services/email.service");
const logger = require("../utils/logger");

// Get current user's profile
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.userId)
            .populate("roles", "-__v")
            .select("-password -verificationToken -resetPasswordToken");

        if (!user) {
            return res.status(404).send({ message: "User not found" });
        }

        // Convert roles into array format
        const authorities = user.roles.map(role => "ROLE_" + role.name.toUpperCase());

        return res.status(200).json({
            id: user._id,
            username: user.username,
            email: user.email,
            emailVerified: user.emailVerified || false,
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            avatar: user.avatar || "",
            roles: authorities,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        });
    } catch (err) {
        logger.error("Get profile error:", err);
        const isDevelopment = process.env.NODE_ENV !== 'production';
        return res.status(500).send({ 
            message: isDevelopment ? (err.message || "Failed to get profile.") : "Failed to get profile. Please try again." 
        });
    }
};

// Update profile
exports.updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).send({ message: "User not found" });
        }

        const { username, email, firstName, lastName } = req.body;
        const updates = {};

        // Update username if provided and different
        if (username && username !== user.username) {
            // Check if username is already taken
            const existingUser = await User.findOne({ username: username.trim() });
            if (existingUser && existingUser._id.toString() !== req.userId) {
                return res.status(400).send({ message: "Username is already taken" });
            }
            updates.username = username.trim();
        }

        // Update email if provided and different
        if (email && email.toLowerCase() !== user.email.toLowerCase()) {
            // Check if email is already taken
            const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
            if (existingUser && existingUser._id.toString() !== req.userId) {
                return res.status(400).send({ message: "Email is already taken" });
            }

            // If email changes, require verification
            updates.email = email.trim().toLowerCase();
            updates.emailVerified = false; // Reset verification status
            
            // Generate new verification token
            const verificationToken = generateToken();
            updates.verificationToken = verificationToken;
            updates.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

            // Send verification email to new address
            try {
                const userForEmail = { ...user.toObject(), ...updates };
                await sendVerificationEmail(userForEmail, verificationToken);
            } catch (emailError) {
                logger.error("Failed to send verification email:", emailError);
                // Don't fail the update if email fails
            }
        }

        // Update required fields - firstName and lastName are required
        if ('firstName' in req.body) {
            const trimmedFirstName = firstName ? firstName.trim() : '';
            if (!trimmedFirstName) {
                return res.status(400).send({ message: "First name is required" });
            }
            updates.firstName = trimmedFirstName;
        }
        if ('lastName' in req.body) {
            const trimmedLastName = lastName ? lastName.trim() : '';
            if (!trimmedLastName) {
                return res.status(400).send({ message: "Last name is required" });
            }
            updates.lastName = trimmedLastName;
        }

        // Apply updates
        Object.assign(user, updates);
        await user.save();

        // Return updated profile (without sensitive data)
        const updatedUser = await User.findById(req.userId)
            .populate("roles", "-__v")
            .select("-password -verificationToken -resetPasswordToken");

        const authorities = updatedUser.roles.map(role => "ROLE_" + role.name.toUpperCase());

        return res.status(200).json({
            message: "Profile updated successfully",
            user: {
                id: updatedUser._id,
                username: updatedUser.username,
                email: updatedUser.email,
                emailVerified: updatedUser.emailVerified || false,
                firstName: updatedUser.firstName || "",
                lastName: updatedUser.lastName || "",
                avatar: updatedUser.avatar || "",
                roles: authorities,
                createdAt: updatedUser.createdAt,
                updatedAt: updatedUser.updatedAt
            }
        });
    } catch (err) {
        logger.error("Update profile error:", err);
        const isDevelopment = process.env.NODE_ENV !== 'production';
        return res.status(500).send({ 
            message: isDevelopment ? (err.message || "Failed to update profile.") : "Failed to update profile. Please try again." 
        });
    }
};

// Change password
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).send({ message: "Current password and new password are required" });
        }

        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).send({ message: "User not found" });
        }

        // Verify current password
        const passwordIsValid = bcrypt.compareSync(currentPassword, user.password);

        if (!passwordIsValid) {
            return res.status(401).send({ message: "Current password is incorrect" });
        }

        // Validate new password strength
        if (newPassword.length < 8) {
            return res.status(400).send({ message: "New password must be at least 8 characters long" });
        }

        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(newPassword)) {
            return res.status(400).send({ 
                message: "New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)" 
            });
        }

        // Hash and update password with higher salt rounds
        user.password = bcrypt.hashSync(newPassword, 12);
        
        // SECURITY: Invalidate all existing tokens by updating a token version
        // This ensures old tokens become invalid after password change
        user.tokenVersion = (user.tokenVersion || 0) + 1;
        
        await user.save();

        return res.status(200).send({ message: "Password changed successfully" });
    } catch (err) {
        logger.error("Change password error:", err);
        const isDevelopment = process.env.NODE_ENV !== 'production';
        return res.status(500).send({ 
            message: isDevelopment ? (err.message || "Failed to change password.") : "Failed to change password. Please try again." 
        });
    }
};

// Get verification status
exports.getVerificationStatus = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("emailVerified email");

        if (!user) {
            return res.status(404).send({ message: "User not found" });
        }

        return res.status(200).json({
            emailVerified: user.emailVerified || false,
            email: user.email
        });
    } catch (err) {
        logger.error("Get verification status error:", err);
        const isDevelopment = process.env.NODE_ENV !== 'production';
        return res.status(500).send({ 
            message: isDevelopment ? (err.message || "Failed to get verification status.") : "Failed to get verification status. Please try again." 
        });
    }
};

