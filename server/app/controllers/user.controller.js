const db = require("../models");
const User = db.user;
const logger = require("../utils/logger");

exports.publicAccess = (req, res) => {
    res.status(200).send("Public Content.");
};

exports.userBoard = (req, res) => {
    res.status(200).send("User Content.");
};

exports.adminBoard = (req, res) => {
    res.status(200).send("Admin Content.");
};

exports.moderatorBoard = (req, res) => {
    res.status(200).send("Moderator Content.");
};

// Token verification endpoint
exports.verifyToken = (req, res) => {
    // If we reach here, the token is valid (verified by authJwt.verifyToken middleware)
    res.status(200).json({
        valid: true,
        message: "Token is valid"
    });
};

// Search users (people and businesses)
exports.searchUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        
        const searchTerm = req.query.q || '';
        const type = req.query.type || 'all'; // 'all', 'people', 'businesses'
        const excludeUserId = req.query.excludeUserId || null; // Exclude this user's personal profile
        const allowOwnProfile = req.query.allowOwnProfile === 'true'; // Allow own profile if logged in as business
        const loggedInUserId = req.userId; // The logged-in user's ID (for allowOwnProfile logic)
        
        // Debug logging
        logger.info("Search users params:", { 
            searchTerm, 
            type, 
            excludeUserId, 
            allowOwnProfile,
            loggedInUserId,
            userId: req.userId 
        });

        // Build query conditions
        const conditions = [];

        // Filter by type (people vs businesses)
        if (type === 'people') {
            // People: exclude users with businessName
            // BUT: if allowOwnProfile is true, we need to allow the personal profile through
            // even if it has a businessName field (by including it explicitly)
            if (allowOwnProfile && loggedInUserId) {
                // Allow the personal profile (loggedInUserId) even if it has businessName
                const mongoose = require('mongoose');
                try {
                    const userIdObjectId = mongoose.Types.ObjectId.isValid(loggedInUserId) 
                        ? new mongoose.Types.ObjectId(loggedInUserId) 
                        : loggedInUserId;
                    conditions.push({
                        $or: [
                            { businessName: { $exists: false } },
                            { businessName: null },
                            { businessName: '' },
                            // Include the personal profile even if it has businessName
                            { _id: userIdObjectId }
                        ]
                    });
                    logger.info("Allowing personal profile in people search (has businessName):", loggedInUserId);
                } catch (err) {
                    // Invalid ObjectId format, use normal filter
                    logger.warn("Invalid loggedInUserId format, using normal people filter:", loggedInUserId);
                    conditions.push({
                        $or: [
                            { businessName: { $exists: false } },
                            { businessName: null },
                            { businessName: '' }
                        ]
                    });
                }
            } else {
                // Normal people filter: exclude users with businessName
                conditions.push({
                    $or: [
                        { businessName: { $exists: false } },
                        { businessName: null },
                        { businessName: '' }
                    ]
                });
            }
        } else if (type === 'businesses') {
            // Businesses: only include users with businessName
            conditions.push({
                businessName: { $exists: true, $ne: null, $ne: '' }
            });
        }

        // Exclude current user's personal profile from search results
        // Logic:
        // - If logged in as personal user (excludeUserId provided, allowOwnProfile false): exclude personal profile
        // - If logged in as business (allowOwnProfile true): don't exclude personal profile, allow it to show
        // - If excludeUserId is null (logged in as business): don't exclude anything
        if (excludeUserId && !allowOwnProfile) {
            // User is logged in as personal profile - exclude their personal profile from results
            const mongoose = require('mongoose');
            try {
                const excludeObjectId = mongoose.Types.ObjectId.isValid(excludeUserId) 
                    ? new mongoose.Types.ObjectId(excludeUserId) 
                    : excludeUserId;
                conditions.push({
                    _id: { $ne: excludeObjectId }
                });
                logger.info("Excluding user from search:", excludeUserId);
            } catch (err) {
                // Invalid ObjectId format, skip exclusion
                logger.warn("Invalid excludeUserId format:", excludeUserId);
            }
        } else if (allowOwnProfile) {
            // Logged in as business - explicitly allow personal profile to show
            logger.info("Allowing own profile in search (logged in as business)");
        }
        // If excludeUserId is null and allowOwnProfile is false, no exclusion needed (normal case)

        // Search across multiple fields
        // SECURITY: Sanitize search input to prevent NoSQL injection
        if (searchTerm) {
            const sanitizedSearch = searchTerm.trim().substring(0, 100).replace(/[.$]/g, '');
            if (sanitizedSearch) {
                conditions.push({
                    $or: [
                        { username: { $regex: sanitizedSearch, $options: 'i' } },
                        { firstName: { $regex: sanitizedSearch, $options: 'i' } },
                        { lastName: { $regex: sanitizedSearch, $options: 'i' } },
                        { businessName: { $regex: sanitizedSearch, $options: 'i' } },
                        { trade: { $regex: sanitizedSearch, $options: 'i' } },
                        { 'location.city': { $regex: sanitizedSearch, $options: 'i' } },
                        { 'location.state': { $regex: sanitizedSearch, $options: 'i' } }
                    ]
                });
            }
        }

        // Build final query
        const query = conditions.length > 0 ? { $and: conditions } : {};

        // Get users with filters
        logger.info("Search users query:", JSON.stringify(query));
        const users = await User.find(query)
            .select("-password -verificationToken -resetPasswordToken -loginAttempts -lockUntil -tokenVersion -email")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Get total count for pagination
        const total = await User.countDocuments(query);

        // Format users for response
        const formattedUsers = users.map(user => {
            const fullName = user.firstName && user.lastName 
                ? `${user.firstName} ${user.lastName}` 
                : user.username;
            
            const locationStr = user.location?.city && user.location?.state
                ? `${user.location.city}, ${user.location.state}`
                : user.location?.city || user.location?.state || '';

            return {
                id: user._id,
                username: user.username,
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                fullName: fullName,
                avatar: user.avatar || '',
                businessName: user.businessName || '',
                trade: user.trade || '',
                location: {
                    city: user.location?.city || '',
                    state: user.location?.state || '',
                    country: user.location?.country || ''
                },
                locationString: locationStr
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
        logger.error("Search users error:", err);
        const isDevelopment = process.env.NODE_ENV !== 'production';
        return res.status(500).send({ 
            message: isDevelopment ? (err.message || "Failed to search users.") : "Failed to search users. Please try again." 
        });
    }
};