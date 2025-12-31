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

        // Build query conditions
        const conditions = [];

        // Filter by type (people vs businesses)
        if (type === 'people') {
            // People: exclude users with businessName
            conditions.push({
                $or: [
                    { businessName: { $exists: false } },
                    { businessName: null },
                    { businessName: '' }
                ]
            });
        } else if (type === 'businesses') {
            // Businesses: only include users with businessName
            conditions.push({
                businessName: { $exists: true, $ne: null, $ne: '' }
            });
        }

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