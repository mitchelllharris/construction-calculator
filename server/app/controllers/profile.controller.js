const db = require("../models");
const User = db.user;
const Contact = db.contact;
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
            trade: user.trade || "",
            businessName: user.businessName || "",
            bio: user.bio || "",
            phone: user.phone || "",
            website: user.website || "",
            location: user.location || {},
            yearsOfExperience: user.yearsOfExperience || null,
            skills: user.skills || [],
            certifications: user.certifications || [],
            portfolio: user.portfolio || [],
            serviceAreas: user.serviceAreas || [],
            licenseNumbers: user.licenseNumbers || [],
            socialMedia: user.socialMedia || {},
            emailPrivacy: user.emailPrivacy || 'private',
            privacySettings: user.privacySettings || {},
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

        const { 
            username, email, firstName, lastName, 
            trade, businessName, bio, phone, website,
            location, yearsOfExperience, experience, skills, certifications,
            portfolio, serviceAreas, licenseNumbers, socialMedia
        } = req.body;
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

        // Update firstName and lastName if provided
        if (req.body.hasOwnProperty('firstName')) {
            const trimmedFirstName = firstName ? firstName.trim() : '';
            updates.firstName = trimmedFirstName || user.firstName || '';
        }
        if (req.body.hasOwnProperty('lastName')) {
            const trimmedLastName = lastName ? lastName.trim() : '';
            updates.lastName = trimmedLastName || user.lastName || '';
        }

        // Update email privacy setting
        if (req.body.hasOwnProperty('emailPrivacy')) {
            const validPrivacyOptions = ['public', 'contacts_of_contacts', 'contacts_only', 'private'];
            if (validPrivacyOptions.includes(req.body.emailPrivacy)) {
                updates.emailPrivacy = req.body.emailPrivacy;
            }
        }

        // Update privacy settings
        if (req.body.hasOwnProperty('privacySettings') && typeof req.body.privacySettings === 'object') {
            const validPrivacyOptions = ['public', 'contacts_of_contacts', 'contacts_only', 'private'];
            const privacyFields = ['phone', 'website', 'bio', 'experience', 'skills', 'certifications', 
                'portfolio', 'serviceAreas', 'licenseNumbers', 'location', 'socialMedia', 'trade', 
                'businessName', 'yearsOfExperience'];
            
            if (!updates.privacySettings) {
                updates.privacySettings = user.privacySettings || {};
            }
            
            privacyFields.forEach(field => {
                if (req.body.privacySettings.hasOwnProperty(field) && 
                    validPrivacyOptions.includes(req.body.privacySettings[field])) {
                    updates.privacySettings[field] = req.body.privacySettings[field];
                }
            });
        }

        // Update tradie-specific fields - always update if field is present in request
        if (req.body.hasOwnProperty('trade')) updates.trade = trade ? trade.trim() : null;
        if (req.body.hasOwnProperty('businessName')) updates.businessName = businessName ? businessName.trim() : null;
        if (req.body.hasOwnProperty('bio')) {
            // Remove links from bio - only allow text and emojis
            let cleanedBio = bio ? bio.trim() : null;
            if (cleanedBio) {
                // Remove URLs (http://, https://, www., emails)
                cleanedBio = cleanedBio
                    .replace(/https?:\/\/[^\s]+/gi, '')
                    .replace(/www\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s]*/gi, '')
                    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();
            }
            updates.bio = cleanedBio || null;
        }
        if (req.body.hasOwnProperty('phone')) updates.phone = phone ? phone.trim() : null;
        if (req.body.hasOwnProperty('website')) updates.website = website ? website.trim() : null;
        if (req.body.hasOwnProperty('location')) updates.location = location || {};
        if (req.body.hasOwnProperty('yearsOfExperience')) updates.yearsOfExperience = yearsOfExperience || null;
        if (req.body.hasOwnProperty('experience')) updates.experience = Array.isArray(experience) ? experience : [];
        if (req.body.hasOwnProperty('skills')) updates.skills = Array.isArray(skills) ? skills : [];
        if (req.body.hasOwnProperty('certifications')) {
            // Normalize certifications - ensure both expirationDate and expiryDate are set
            const normalizedCerts = Array.isArray(certifications) ? certifications.map(cert => ({
                ...cert,
                expiryDate: cert.expiryDate || cert.expirationDate || null,
                expirationDate: cert.expirationDate || cert.expiryDate || null,
            })) : [];
            updates.certifications = normalizedCerts;
        }
        if (req.body.hasOwnProperty('portfolio')) updates.portfolio = Array.isArray(portfolio) ? portfolio : [];
        if (req.body.hasOwnProperty('serviceAreas')) updates.serviceAreas = Array.isArray(serviceAreas) ? serviceAreas : [];
        if (req.body.hasOwnProperty('licenseNumbers')) updates.licenseNumbers = Array.isArray(licenseNumbers) ? licenseNumbers : [];
        if (req.body.hasOwnProperty('socialMedia')) updates.socialMedia = socialMedia || {};

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
                trade: updatedUser.trade || "",
                businessName: updatedUser.businessName || "",
                bio: updatedUser.bio || "",
                phone: updatedUser.phone || "",
                website: updatedUser.website || "",
                location: updatedUser.location || {},
                yearsOfExperience: updatedUser.yearsOfExperience || null,
                experience: updatedUser.experience || [],
                skills: updatedUser.skills || [],
                certifications: updatedUser.certifications || [],
                portfolio: updatedUser.portfolio || [],
                serviceAreas: updatedUser.serviceAreas || [],
                licenseNumbers: updatedUser.licenseNumbers || [],
            socialMedia: updatedUser.socialMedia || {},
                emailPrivacy: updatedUser.emailPrivacy || 'private',
                privacySettings: updatedUser.privacySettings || {},
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

// Helper function to check if a field should be visible based on privacy settings
const checkPrivacy = async (privacySetting, viewerUserId, profileOwnerId, profileOwnerEmail) => {
    if (!privacySetting || privacySetting === 'public') {
        return true;
    }
    
    if (privacySetting === 'private') {
        return false;
    }
    
    // Owner can always see their own data
    if (viewerUserId && viewerUserId === profileOwnerId.toString()) {
        return true;
    }
    
    if (!viewerUserId) {
        return false; // Not authenticated
    }
    
    // Check if viewer is in profile owner's contacts
    const viewer = await User.findById(viewerUserId).select('email');
    if (!viewer || !viewer.email) {
        return false;
    }
    
    const contact = await Contact.findOne({
        user: profileOwnerId,
        email: viewer.email.toLowerCase()
    });
    
    if (privacySetting === 'contacts_only') {
        return !!contact;
    }
    
    if (privacySetting === 'contacts_of_contacts') {
        // For now, same as contacts_only. Can be enhanced later
        return !!contact;
    }
    
    return false;
};

// Get public profile by username or ID (authentication optional for privacy checks)
exports.getPublicProfile = async (req, res) => {
    try {
        const { username, id } = req.params;
        const viewerUserId = req.userId || null; // May be null if not authenticated
        let user;

        if (id) {
            user = await User.findById(id)
                .select("-password -verificationToken -resetPasswordToken -loginAttempts -lockUntil -tokenVersion");
        } else if (username) {
            user = await User.findOne({ username: username })
                .select("-password -verificationToken -resetPasswordToken -loginAttempts -lockUntil -tokenVersion");
        } else {
            return res.status(400).send({ message: "Username or ID is required" });
        }

        if (!user) {
            return res.status(404).send({ message: "User not found" });
        }

        const privacySettings = user.privacySettings || {};
        
        // Check privacy for each field
        const showEmail = await checkPrivacy(user.emailPrivacy || 'private', viewerUserId, user._id, user.email);
        const showPhone = await checkPrivacy(privacySettings.phone || 'private', viewerUserId, user._id, user.email);
        const showWebsite = await checkPrivacy(privacySettings.website || 'private', viewerUserId, user._id, user.email);
        const showBio = await checkPrivacy(privacySettings.bio || 'public', viewerUserId, user._id, user.email);
        const showExperience = await checkPrivacy(privacySettings.experience || 'public', viewerUserId, user._id, user.email);
        const showSkills = await checkPrivacy(privacySettings.skills || 'public', viewerUserId, user._id, user.email);
        const showCertifications = await checkPrivacy(privacySettings.certifications || 'public', viewerUserId, user._id, user.email);
        const showPortfolio = await checkPrivacy(privacySettings.portfolio || 'public', viewerUserId, user._id, user.email);
        const showServiceAreas = await checkPrivacy(privacySettings.serviceAreas || 'public', viewerUserId, user._id, user.email);
        const showLicenseNumbers = await checkPrivacy(privacySettings.licenseNumbers || 'public', viewerUserId, user._id, user.email);
        const showLocation = await checkPrivacy(privacySettings.location || 'public', viewerUserId, user._id, user.email);
        const showSocialMedia = await checkPrivacy(privacySettings.socialMedia || 'public', viewerUserId, user._id, user.email);
        const showTrade = await checkPrivacy(privacySettings.trade || 'public', viewerUserId, user._id, user.email);
        const showBusinessName = await checkPrivacy(privacySettings.businessName || 'public', viewerUserId, user._id, user.email);
        const showYearsOfExperience = await checkPrivacy(privacySettings.yearsOfExperience || 'public', viewerUserId, user._id, user.email);

        const response = {
            id: user._id,
            username: user.username,
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            avatar: user.avatar || "",
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };

        // Only include fields if privacy settings allow it
        if (showEmail && user.email) {
            response.email = user.email;
        }
        if (showPhone && user.phone) {
            response.phone = user.phone;
        }
        if (showWebsite && user.website) {
            response.website = user.website;
        }
        if (showBio && user.bio) {
            response.bio = user.bio;
        }
        if (showExperience && user.experience) {
            response.experience = user.experience;
        }
        if (showSkills && user.skills) {
            response.skills = user.skills;
        }
        if (showCertifications && user.certifications) {
            response.certifications = user.certifications;
        }
        if (showPortfolio && user.portfolio) {
            response.portfolio = user.portfolio;
        }
        if (showServiceAreas && user.serviceAreas) {
            response.serviceAreas = user.serviceAreas;
        }
        if (showLicenseNumbers && user.licenseNumbers) {
            response.licenseNumbers = user.licenseNumbers;
        }
        if (showLocation && user.location) {
            response.location = user.location;
        }
        if (showSocialMedia && user.socialMedia) {
            response.socialMedia = user.socialMedia;
        }
        if (showTrade && user.trade) {
            response.trade = user.trade;
        }
        if (showBusinessName && user.businessName) {
            response.businessName = user.businessName;
        }
        if (showYearsOfExperience && user.yearsOfExperience !== undefined && user.yearsOfExperience !== null) {
            response.yearsOfExperience = user.yearsOfExperience;
        }

        return res.status(200).json(response);
    } catch (err) {
        logger.error("Get public profile error:", err);
        const isDevelopment = process.env.NODE_ENV !== 'production';
        return res.status(500).send({ 
            message: isDevelopment ? (err.message || "Failed to get profile.") : "Failed to get profile. Please try again." 
        });
    }
};

// Upload user avatar
exports.uploadAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send({ message: "Avatar image is required" });
        }

        const user = await User.findById(req.userId);
        if (!user) {
            // Delete uploaded file if user not found
            const fs = require('fs');
            if (req.file.path) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(404).send({ message: "User not found" });
        }

        // Delete old avatar if exists
        if (user.avatar) {
            const fs = require('fs');
            const path = require('path');
            const oldAvatarPath = path.join(__dirname, '../../', user.avatar);
            if (fs.existsSync(oldAvatarPath)) {
                try {
                    fs.unlinkSync(oldAvatarPath);
                } catch (err) {
                    logger.warn("Could not delete old avatar:", err);
                }
            }
        }

        // Update user with new avatar path
        // Store relative path from server root: /uploads/avatars/filename
        const avatarPath = `/uploads/avatars/${req.file.filename}`;
        user.avatar = avatarPath;
        await user.save();

        return res.status(200).send({
            message: "Avatar uploaded successfully",
            avatar: avatarPath,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                avatar: avatarPath
            }
        });
    } catch (error) {
        logger.error("Error uploading avatar:", error);
        const isDevelopment = process.env.NODE_ENV !== 'production';
        return res.status(500).send({ 
            message: isDevelopment ? (error.message || "Failed to upload avatar.") : "Failed to upload avatar. Please try again." 
        });
    }
};

// Upload portfolio image
exports.uploadPortfolioImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send({ message: "Image file is required" });
        }

        // Store relative path from server root: /uploads/portfolio/filename
        const imagePath = `/uploads/portfolio/${req.file.filename}`;

        return res.status(200).send({
            message: "Image uploaded successfully",
            imageUrl: imagePath,
        });
    } catch (error) {
        logger.error("Error uploading portfolio image:", error);
        const isDevelopment = process.env.NODE_ENV !== 'production';
        return res.status(500).send({ 
            message: isDevelopment ? (error.message || "Failed to upload image.") : "Failed to upload image. Please try again." 
        });
    }
};

// Upload certification PDF
exports.uploadCertificationPDF = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send({ message: "PDF file is required" });
        }

        // Store relative path from server root: /uploads/certifications/filename
        const pdfPath = `/uploads/certifications/${req.file.filename}`;

        return res.status(200).send({
            message: "PDF uploaded successfully",
            pdfUrl: pdfPath,
        });
    } catch (error) {
        logger.error("Error uploading certification PDF:", error);
        const isDevelopment = process.env.NODE_ENV !== 'production';
        return res.status(500).send({ 
            message: isDevelopment ? (error.message || "Failed to upload PDF.") : "Failed to upload PDF. Please try again." 
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

