const db = require("../models");
const User = db.user;
const Role = db.role;
const logger = require("../utils/logger");

// Get all users (with pagination, filtering, search)
exports.getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        const search = req.query.search || '';
        const roleFilter = req.query.role || '';
        const verifiedFilter = req.query.verified;

        // Build query
        const query = {};

        // Search by username or email
        // SECURITY: Sanitize search input to prevent NoSQL injection
        if (search) {
            // Remove MongoDB operators and limit length
            const sanitizedSearch = search.trim().substring(0, 100).replace(/[.$]/g, '');
            if (sanitizedSearch) {
                query.$or = [
                    { username: { $regex: sanitizedSearch, $options: 'i' } },
                    { email: { $regex: sanitizedSearch, $options: 'i' } }
                ];
            }
        }

        // Filter by verified status
        if (verifiedFilter !== undefined) {
            query.emailVerified = verifiedFilter === 'true';
        }

        // Get users with filters
        let users = await User.find(query)
            .populate("roles", "-__v")
            .select("-password -verificationToken -resetPasswordToken")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Filter by role if specified
        if (roleFilter) {
            const role = await Role.findOne({ name: roleFilter });
            if (role) {
                users = users.filter(user => 
                    user.roles.some(r => r._id.toString() === role._id.toString())
                );
            }
        }

        // Get total count for pagination
        const total = await User.countDocuments(query);

        // Format users
        const formattedUsers = users.map(user => {
            const authorities = user.roles.map(role => "ROLE_" + role.name.toUpperCase());
            return {
                id: user._id,
                username: user.username,
                email: user.email,
                emailVerified: user.emailVerified || false,
                firstName: user.firstName || "",
                lastName: user.lastName || "",
                roles: authorities,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            };
        });

        return res.status(200).json({
            users: formattedUsers,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        logger.error("Get all users error:", err);
        const isDevelopment = process.env.NODE_ENV !== 'production';
        return res.status(500).send({ 
            message: isDevelopment ? (err.message || "Failed to get users.") : "Failed to get users. Please try again." 
        });
    }
};

// Get user by ID
exports.getUserById = async (req, res) => {
    try {
        // SECURITY: Validate ObjectId format to prevent NoSQL injection
        if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
            return res.status(400).send({ message: "Invalid user ID format" });
        }

        const user = await User.findById(req.params.id)
            .populate("roles", "-__v")
            .select("-password -verificationToken -resetPasswordToken");

        if (!user) {
            return res.status(404).send({ message: "User not found" });
        }

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
        logger.error("Get user by ID error:", err);
        const isDevelopment = process.env.NODE_ENV !== 'production';
        return res.status(500).send({ 
            message: isDevelopment ? (err.message || "Failed to get user.") : "Failed to get user. Please try again." 
        });
    }
};

// Update user (admin only)
exports.updateUser = async (req, res) => {
    try {
        // SECURITY: Validate ObjectId format to prevent NoSQL injection
        if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
            return res.status(400).send({ message: "Invalid user ID format" });
        }

        const userId = req.params.id;
        const { username, email, firstName, lastName } = req.body;

        // Prevent admin from modifying themselves (optional security measure)
        // if (userId === req.userId) {
        //     return res.status(403).send({ message: "Cannot modify your own account through admin panel" });
        // }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).send({ message: "User not found" });
        }

        const updates = {};

        if (username && username !== user.username) {
            const existingUser = await User.findOne({ username: username.trim() });
            if (existingUser && existingUser._id.toString() !== userId) {
                return res.status(400).send({ message: "Username is already taken" });
            }
            updates.username = username.trim();
        }

        if (email && email.toLowerCase() !== user.email.toLowerCase()) {
            const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
            if (existingUser && existingUser._id.toString() !== userId) {
                return res.status(400).send({ message: "Email is already taken" });
            }
            updates.email = email.trim().toLowerCase();
        }

        if (firstName !== undefined) updates.firstName = firstName.trim() || null;
        if (lastName !== undefined) updates.lastName = lastName.trim() || null;

        Object.assign(user, updates);
        await user.save();

        const updatedUser = await User.findById(userId)
            .populate("roles", "-__v")
            .select("-password -verificationToken -resetPasswordToken");

        const authorities = updatedUser.roles.map(role => "ROLE_" + role.name.toUpperCase());

        return res.status(200).json({
            message: "User updated successfully",
            user: {
                id: updatedUser._id,
                username: updatedUser.username,
                email: updatedUser.email,
                emailVerified: updatedUser.emailVerified || false,
                firstName: updatedUser.firstName || "",
                lastName: updatedUser.lastName || "",
                roles: authorities,
                createdAt: updatedUser.createdAt,
                updatedAt: updatedUser.updatedAt
            }
        });
    } catch (err) {
        logger.error("Update user error:", err);
        const isDevelopment = process.env.NODE_ENV !== 'production';
        return res.status(500).send({ 
            message: isDevelopment ? (err.message || "Failed to update user.") : "Failed to update user. Please try again." 
        });
    }
};

// Assign/remove roles
exports.assignRole = async (req, res) => {
    try {
        // SECURITY: Validate ObjectId format to prevent NoSQL injection
        if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
            return res.status(400).send({ message: "Invalid user ID format" });
        }

        const userId = req.params.id;
        const { roles } = req.body; // Array of role names

        if (!Array.isArray(roles)) {
            return res.status(400).send({ message: "Roles must be an array" });
        }

        // Prevent admin from removing their own admin role
        if (userId === req.userId) {
            const hasAdmin = roles.includes('admin');
            if (!hasAdmin) {
                return res.status(403).send({ message: "Cannot remove admin role from yourself" });
            }
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).send({ message: "User not found" });
        }

        // Validate roles exist
        const validRoles = await Role.find({ name: { $in: roles } });
        
        if (validRoles.length !== roles.length) {
            return res.status(400).send({ message: "One or more roles are invalid" });
        }

        // Assign roles
        user.roles = validRoles.map(role => role._id);
        await user.save();

        const updatedUser = await User.findById(userId)
            .populate("roles", "-__v")
            .select("-password");

        const authorities = updatedUser.roles.map(role => "ROLE_" + role.name.toUpperCase());

        return res.status(200).json({
            message: "Roles updated successfully",
            user: {
                id: updatedUser._id,
                username: updatedUser.username,
                email: updatedUser.email,
                roles: authorities
            }
        });
    } catch (err) {
        logger.error("Assign role error:", err);
        const isDevelopment = process.env.NODE_ENV !== 'production';
        return res.status(500).send({ 
            message: isDevelopment ? (err.message || "Failed to assign roles.") : "Failed to assign roles. Please try again." 
        });
    }
};

// Delete user
exports.deleteUser = async (req, res) => {
    try {
        // SECURITY: Validate ObjectId format to prevent NoSQL injection
        if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
            return res.status(400).send({ message: "Invalid user ID format" });
        }

        const userId = req.params.id;

        // Prevent admin from deleting themselves
        if (userId === req.userId) {
            return res.status(403).send({ message: "Cannot delete your own account" });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).send({ message: "User not found" });
        }

        await User.findByIdAndDelete(userId);

        return res.status(200).send({ message: "User deleted successfully" });
    } catch (err) {
        logger.error("Delete user error:", err);
        const isDevelopment = process.env.NODE_ENV !== 'production';
        return res.status(500).send({ 
            message: isDevelopment ? (err.message || "Failed to delete user.") : "Failed to delete user. Please try again." 
        });
    }
};

// Manually verify email (admin only)
exports.verifyUserEmail = async (req, res) => {
    try {
        // SECURITY: Validate ObjectId format to prevent NoSQL injection
        if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
            return res.status(400).send({ message: "Invalid user ID format" });
        }

        const userId = req.params.id;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).send({ message: "User not found" });
        }

        user.emailVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;
        await user.save();

        return res.status(200).send({ message: "Email verified successfully" });
    } catch (err) {
        logger.error("Verify user email error:", err);
        const isDevelopment = process.env.NODE_ENV !== 'production';
        return res.status(500).send({ 
            message: isDevelopment ? (err.message || "Failed to verify email.") : "Failed to verify email. Please try again." 
        });
    }
};

// Get user statistics
exports.getUserStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const verifiedUsers = await User.countDocuments({ emailVerified: true });
        const unverifiedUsers = totalUsers - verifiedUsers;

        // Count users by role
        const userRole = await Role.findOne({ name: 'user' });
        const moderatorRole = await Role.findOne({ name: 'moderator' });
        const adminRole = await Role.findOne({ name: 'admin' });

        const usersByRole = {
            user: userRole ? await User.countDocuments({ roles: userRole._id }) : 0,
            moderator: moderatorRole ? await User.countDocuments({ roles: moderatorRole._id }) : 0,
            admin: adminRole ? await User.countDocuments({ roles: adminRole._id }) : 0
        };

        return res.status(200).json({
            total: totalUsers,
            verified: verifiedUsers,
            unverified: unverifiedUsers,
            byRole: usersByRole
        });
    } catch (err) {
        logger.error("Get user stats error:", err);
        const isDevelopment = process.env.NODE_ENV !== 'production';
        return res.status(500).send({ 
            message: isDevelopment ? (err.message || "Failed to get statistics.") : "Failed to get statistics. Please try again." 
        });
    }
};

