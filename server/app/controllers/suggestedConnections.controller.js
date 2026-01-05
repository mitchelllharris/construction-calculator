const db = require("../models");
const mongoose = require("mongoose");
const User = db.user;
const Business = db.business;
const Connection = db.connection;
const logger = require("../utils/logger");

// Helper function to format location string
const formatLocationString = (location) => {
    if (!location) return '';
    if (location.city && location.state) {
        return `${location.city}, ${location.state}`;
    }
    return location.formattedAddress || location.city || location.state || '';
};

// Get suggested connections
exports.getSuggestedConnections = async (req, res) => {
    try {
        const userId = req.userId;
        const limit = parseInt(req.query.limit) || 20;
        
        // Get user's profile to determine active profile type
        const user = await User.findById(userId).select('location trade accountId');
        if (!user) {
            return res.status(404).send({ message: "User not found" });
        }
        
        // Get active profile context
        const { getActiveAccountContext } = require("../utils/permissions");
        let activeAccountId, activePageId;
        try {
            const context = getActiveAccountContext(req);
            activeAccountId = context?.activeAccountId;
            activePageId = context?.activePageId;
        } catch (error) {
            logger.error("Error getting active account context:", error);
            // Continue with null values
            activeAccountId = null;
            activePageId = null;
        }
        
        // Determine if we're looking for user or business suggestions
        let isBusinessProfile = false;
        let activeBusiness = null;
        let activeBusinessId = null;
        
        if (activeAccountId != null && user.accountId != null) {
            try {
                const userAccountId = Number(user.accountId);
                const activeAccountIdNum = Number(activeAccountId);
                
                if (!isNaN(userAccountId) && !isNaN(activeAccountIdNum) && userAccountId !== activeAccountIdNum) {
                    // User is on a business profile
                    activeBusiness = await Business.findOne({ 
                        ownerId: userId,
                        accountId: activeAccountIdNum 
                    }).select('location trade businessType');
                    
                    if (activeBusiness) {
                        isBusinessProfile = true;
                        activeBusinessId = activeBusiness._id;
                    }
                }
            } catch (error) {
                logger.error("Error determining business profile:", error);
                // Continue with user profile
            }
        }
        
        const suggestions = [];
        const seenIds = new Set();
        
        // Exclude self
        seenIds.add(userId.toString());
        if (activeBusinessId) {
            seenIds.add(activeBusinessId.toString());
        }
        
        // Get user's direct connections (for user profile) or business connections (for business profile)
        let directConnections = [];
        try {
            const connectionQuery = isBusinessProfile && activeBusinessId
                ? {
                    $or: [
                        { requester: activeBusinessId, requesterModel: 'Business', status: 'accepted' },
                        { recipient: activeBusinessId, recipientModel: 'Business', status: 'accepted' }
                    ]
                }
                : {
                    $or: [
                        { requester: userId, requesterModel: 'User', status: 'accepted' },
                        { recipient: userId, recipientModel: 'User', status: 'accepted' }
                    ]
                };
            
            directConnections = await Connection.find(connectionQuery)
                .select('requester recipient requesterModel recipientModel')
                .lean();
        } catch (error) {
            logger.error("Error fetching direct connections:", error);
            directConnections = [];
        }
        
        const connectedUserIds = new Set();
        const connectedBusinessIds = new Set();
        const currentProfileId = isBusinessProfile && activeBusinessId ? activeBusinessId.toString() : userId.toString();
        
        directConnections.forEach(conn => {
            const requesterId = conn.requester.toString();
            const recipientId = conn.recipient.toString();
            
            // Add the other party (not the current profile) to connected sets
            if (requesterId === currentProfileId) {
                // Current profile is the requester, so add recipient
                if (conn.recipientModel === 'User') {
                    connectedUserIds.add(recipientId);
                } else if (conn.recipientModel === 'Business') {
                    connectedBusinessIds.add(recipientId);
                }
            } else if (recipientId === currentProfileId) {
                // Current profile is the recipient, so add requester
                if (conn.requesterModel === 'User') {
                    connectedUserIds.add(requesterId);
                } else if (conn.requesterModel === 'Business') {
                    connectedBusinessIds.add(requesterId);
                }
            }
        });
        
        // Add direct connections to seenIds
        connectedUserIds.forEach(id => seenIds.add(id));
        connectedBusinessIds.forEach(id => seenIds.add(id));
        
        // 1. Connections of connections (2nd degree)
        if (connectedUserIds.size > 0) {
            const secondDegreeConnections = await Connection.find({
                $or: [
                    { requester: { $in: Array.from(connectedUserIds) }, requesterModel: 'User', status: 'accepted' },
                    { recipient: { $in: Array.from(connectedUserIds) }, recipientModel: 'User', status: 'accepted' }
                ]
            }).select('requester recipient requesterModel recipientModel').lean();
            
            const secondDegreeUserIds = new Set();
            const secondDegreeBusinessIds = new Set();
            
            secondDegreeConnections.forEach(conn => {
                const requesterId = conn.requester.toString();
                const recipientId = conn.recipient.toString();
                
                // Only add if not already connected and not the current profile
                if (conn.requesterModel === 'User' && !connectedUserIds.has(requesterId) && requesterId !== currentProfileId) {
                    secondDegreeUserIds.add(requesterId);
                }
                if (conn.recipientModel === 'User' && !connectedUserIds.has(recipientId) && recipientId !== currentProfileId) {
                    secondDegreeUserIds.add(recipientId);
                }
                if (conn.requesterModel === 'Business' && requesterId !== currentProfileId) {
                    secondDegreeBusinessIds.add(requesterId);
                }
                if (conn.recipientModel === 'Business' && recipientId !== currentProfileId) {
                    secondDegreeBusinessIds.add(recipientId);
                }
            });
            
            // Get users
            if (secondDegreeUserIds.size > 0) {
                const filteredIds = Array.from(secondDegreeUserIds).filter(id => !seenIds.has(id.toString()));
                if (filteredIds.length > 0) {
                    const users = await User.find({
                        _id: { $in: filteredIds }
                    })
                    .select('username firstName lastName avatar trade location accountId')
                    .limit(limit)
                    .lean();
                    
                    users.forEach(user => {
                        suggestions.push({
                            ...user,
                            _id: user._id,
                            id: user._id,
                            fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
                            isBusiness: false,
                            locationString: formatLocationString(user.location),
                            suggestionReason: 'Connection of connection'
                        });
                        seenIds.add(user._id.toString());
                    });
                }
            }
            
            // Get businesses
            if (secondDegreeBusinessIds.size > 0) {
                const filteredBusinessIds = Array.from(secondDegreeBusinessIds).filter(id => !seenIds.has(id.toString()));
                if (filteredBusinessIds.length > 0) {
                    const businesses = await Business.find({
                        _id: { $in: filteredBusinessIds }
                    })
                    .select('businessName businessSlug avatar trade businessType location accountId')
                    .limit(limit)
                    .lean();
                    
                        businesses.forEach(business => {
                        suggestions.push({
                            ...business,
                            _id: business._id,
                            id: business._id,
                            businessId: business._id,
                            fullName: business.businessName,
                            username: business.businessSlug || business._id,
                            isBusiness: true,
                            locationString: formatLocationString(business.location),
                            suggestionReason: 'Connection of connection'
                        });
                        seenIds.add(business._id.toString());
                    });
                }
            }
        }
        
        // 2. Connections of connections of connections (3rd degree) - if we need more suggestions
        if (suggestions.length < limit && connectedUserIds.size > 0) {
            const secondDegreeUserIds = new Set();
            let secondDegreeConnections = [];
            try {
                secondDegreeConnections = await Connection.find({
                    $or: [
                        { requester: { $in: Array.from(connectedUserIds) } },
                        { recipient: { $in: Array.from(connectedUserIds) } }
                    ],
                    status: 'accepted'
                }).select('requester recipient requesterModel recipientModel').lean();
            } catch (error) {
                logger.error("Error fetching second degree connections for 3rd degree:", error);
                secondDegreeConnections = [];
            }
            
            secondDegreeConnections.forEach(conn => {
                const requesterId = conn.requester.toString();
                const recipientId = conn.recipient.toString();
                
                if (conn.requesterModel === 'User' && !connectedUserIds.has(requesterId) && requesterId !== currentProfileId) {
                    secondDegreeUserIds.add(requesterId);
                }
                if (conn.recipientModel === 'User' && !connectedUserIds.has(recipientId) && recipientId !== currentProfileId) {
                    secondDegreeUserIds.add(recipientId);
                }
            });
            
            if (secondDegreeUserIds.size > 0) {
                const thirdDegreeConnections = await Connection.find({
                    $or: [
                        { requester: { $in: Array.from(secondDegreeUserIds) }, status: 'accepted' },
                        { recipient: { $in: Array.from(secondDegreeUserIds) }, status: 'accepted' }
                    ]
                }).select('requester recipient requesterModel recipientModel').lean();
                
                const thirdDegreeUserIds = new Set();
                const thirdDegreeBusinessIds = new Set();
                
                thirdDegreeConnections.forEach(conn => {
                    if (conn.requesterModel === 'User' && !secondDegreeUserIds.has(conn.requester.toString()) && !connectedUserIds.has(conn.requester.toString()) && conn.requester.toString() !== userId.toString()) {
                        thirdDegreeUserIds.add(conn.requester.toString());
                    }
                    if (conn.recipientModel === 'User' && !secondDegreeUserIds.has(conn.recipient.toString()) && !connectedUserIds.has(conn.recipient.toString()) && conn.recipient.toString() !== userId.toString()) {
                        thirdDegreeUserIds.add(conn.recipient.toString());
                    }
                    if (conn.requesterModel === 'Business') {
                        thirdDegreeBusinessIds.add(conn.requester.toString());
                    }
                    if (conn.recipientModel === 'Business') {
                        thirdDegreeBusinessIds.add(conn.recipient.toString());
                    }
                });
                
                // Get users
                if (thirdDegreeUserIds.size > 0) {
                    const filteredThirdUserIds = Array.from(thirdDegreeUserIds).filter(id => !seenIds.has(id.toString()));
                    if (filteredThirdUserIds.length > 0) {
                        const users = await User.find({
                            _id: { $in: filteredThirdUserIds }
                        })
                        .select('username firstName lastName avatar trade location accountId')
                        .limit(limit - suggestions.length)
                        .lean();
                        
                        users.forEach(user => {
                            suggestions.push({
                                ...user,
                                _id: user._id,
                                id: user._id,
                                fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
                                isBusiness: false,
                                locationString: formatLocationString(user.location),
                                suggestionReason: 'Connection of connection of connection'
                            });
                            seenIds.add(user._id.toString());
                        });
                    }
                }
                
                // Get businesses
                if (thirdDegreeBusinessIds.size > 0 && suggestions.length < limit) {
                    const filteredThirdBusinessIds = Array.from(thirdDegreeBusinessIds).filter(id => !seenIds.has(id.toString()));
                    if (filteredThirdBusinessIds.length > 0) {
                        const businesses = await Business.find({
                            _id: { $in: filteredThirdBusinessIds }
                        })
                        .select('businessName businessSlug avatar trade businessType location accountId')
                        .limit(limit - suggestions.length)
                        .lean();
                        
                        businesses.forEach(business => {
                            suggestions.push({
                                ...business,
                                _id: business._id,
                                id: business._id,
                                businessId: business._id,
                                fullName: business.businessName,
                                username: business.businessSlug || business._id,
                                isBusiness: true,
                                locationString: formatLocationString(business.location),
                                suggestionReason: 'Connection of connection of connection'
                            });
                            seenIds.add(business._id.toString());
                        });
                    }
                }
            }
        }
        
        // 3. People in the same suburb (location.city)
        const profileLocation = isBusinessProfile && activeBusiness?.location?.city 
            ? activeBusiness.location.city 
            : (user.location?.city || null);
        
        if (profileLocation && typeof profileLocation === 'string' && profileLocation.trim() && suggestions.length < limit) {
            let sameLocationUsers = [];
            try {
                const seenIdsArray = Array.from(seenIds).map(id => mongoose.Types.ObjectId.isValid(id) ? mongoose.Types.ObjectId(id) : id);
                
                sameLocationUsers = await User.find({
                    'location.city': new RegExp(profileLocation, 'i'),
                    _id: { $nin: seenIdsArray }
                })
                    .select('username firstName lastName avatar trade location accountId')
                    .limit(limit - suggestions.length)
                    .lean();
            } catch (error) {
                logger.error("Error fetching same location users:", error);
                sameLocationUsers = [];
            }
            
            sameLocationUsers.forEach(user => {
                suggestions.push({
                    ...user,
                    _id: user._id,
                    id: user._id,
                    fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
                    isBusiness: false,
                    locationString: formatLocationString(user.location),
                    suggestionReason: 'Same location'
                });
                seenIds.add(user._id.toString());
            });
            
            let sameLocationBusinesses = [];
            try {
                const seenIdsArray = Array.from(seenIds).map(id => mongoose.Types.ObjectId.isValid(id) ? mongoose.Types.ObjectId(id) : id);
                
                sameLocationBusinesses = await Business.find({
                    'location.city': new RegExp(profileLocation, 'i'),
                    _id: { $nin: seenIdsArray }
                })
                .select('businessName businessSlug avatar trade businessType location accountId')
                .limit(limit - suggestions.length)
                .lean();
            } catch (error) {
                logger.error("Error fetching same location businesses:", error);
                sameLocationBusinesses = [];
            }
            
            sameLocationBusinesses.forEach(business => {
                suggestions.push({
                    ...business,
                    _id: business._id,
                    id: business._id,
                    businessId: business._id,
                    fullName: business.businessName,
                    username: business.businessSlug || business._id,
                    isBusiness: true,
                    locationString: formatLocationString(business.location),
                    suggestionReason: 'Same location'
                });
                seenIds.add(business._id.toString());
            });
        }
        
        // 4. People in the same industry (trade)
        const profileTrade = isBusinessProfile && activeBusiness?.trade 
            ? activeBusiness.trade 
            : (user.trade || null);
        
        if (profileTrade && typeof profileTrade === 'string' && profileTrade.trim() && suggestions.length < limit) {
            let sameTradeUsers = [];
            try {
                const seenIdsArray = Array.from(seenIds).map(id => mongoose.Types.ObjectId.isValid(id) ? mongoose.Types.ObjectId(id) : id);
                
                sameTradeUsers = await User.find({
                    trade: new RegExp(profileTrade, 'i'),
                    _id: { $nin: seenIdsArray }
                })
                    .select('username firstName lastName avatar trade location accountId')
                    .limit(limit - suggestions.length)
                    .lean();
            } catch (error) {
                logger.error("Error fetching same trade users:", error);
                sameTradeUsers = [];
            }
            
            sameTradeUsers.forEach(user => {
                suggestions.push({
                    ...user,
                    _id: user._id,
                    id: user._id,
                    fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
                    isBusiness: false,
                    locationString: formatLocationString(user.location),
                    suggestionReason: 'Same industry'
                });
                seenIds.add(user._id.toString());
            });
            
            let sameTradeBusinesses = [];
            try {
                const seenIdsArray = Array.from(seenIds).map(id => mongoose.Types.ObjectId.isValid(id) ? mongoose.Types.ObjectId(id) : id);
                
                sameTradeBusinesses = await Business.find({
                    trade: new RegExp(profileTrade, 'i'),
                    _id: { $nin: seenIdsArray }
                })
                .select('businessName businessSlug avatar trade businessType location accountId')
                .limit(limit - suggestions.length)
                .lean();
            } catch (error) {
                logger.error("Error fetching same trade businesses:", error);
                sameTradeBusinesses = [];
            }
            
            sameTradeBusinesses.forEach(business => {
                suggestions.push({
                    ...business,
                    _id: business._id,
                    id: business._id,
                    businessId: business._id,
                    fullName: business.businessName,
                    username: business.businessSlug || business._id,
                    isBusiness: true,
                    locationString: formatLocationString(business.location),
                    suggestionReason: 'Same industry'
                });
                seenIds.add(business._id.toString());
            });
        }
        
        // 5. People with the same business role (businessType) - only for businesses
        if (isBusinessProfile && activeBusiness?.businessType && suggestions.length < limit) {
            let sameRoleBusinesses = [];
            try {
                const seenIdsArray = Array.from(seenIds).map(id => mongoose.Types.ObjectId.isValid(id) ? mongoose.Types.ObjectId(id) : id);
                
                sameRoleBusinesses = await Business.find({
                    businessType: activeBusiness.businessType,
                    _id: { $nin: seenIdsArray }
                })
                .select('businessName businessSlug avatar trade businessType location accountId')
                .limit(limit - suggestions.length)
                .lean();
            } catch (error) {
                logger.error("Error fetching same role businesses:", error);
                sameRoleBusinesses = [];
            }
            
            sameRoleBusinesses.forEach(business => {
                suggestions.push({
                    ...business,
                    _id: business._id,
                    id: business._id,
                    businessId: business._id,
                    fullName: business.businessName,
                    username: business.businessSlug || business._id,
                    isBusiness: true,
                    locationString: formatLocationString(business.location),
                    suggestionReason: 'Same business role'
                });
                seenIds.add(business._id.toString());
            });
        }
        
        // Limit to requested amount and shuffle for variety
        const shuffled = suggestions.sort(() => Math.random() - 0.5).slice(0, limit);
        
        return res.status(200).json({
            suggestions: shuffled,
            count: shuffled.length
        });
    } catch (error) {
        logger.error("Error getting suggested connections:", error);
        logger.error("Error stack:", error.stack);
        return res.status(500).send({ message: "Internal server error", error: error.message });
    }
};
