const db = require("../models");
const logger = require("../utils/logger");
const User = db.user;
const Business = db.business;
const Connection = db.connection;
const Contact = db.contact;
const Follow = db.follow;

// Helper function to check if a user is blocked by another user
const isUserBlocked = async (blockerId, blockedId) => {
    try {
        const blocker = await User.findById(blockerId).select('blockedUsers');
        if (!blocker) return false;
        return blocker.blockedUsers && blocker.blockedUsers.some(
            id => id.toString() === blockedId.toString()
        );
    } catch (error) {
        logger.error("Error checking block status:", error);
        return false;
    }
};

// Helper function to check if either user has blocked the other
const checkBlockStatus = async (userId1, userId2) => {
    const user1BlockedUser2 = await isUserBlocked(userId1, userId2);
    const user2BlockedUser1 = await isUserBlocked(userId2, userId1);
    return {
        isBlocked: user1BlockedUser2 || user2BlockedUser1,
        user1BlockedUser2: user1BlockedUser2,
        user2BlockedUser1: user2BlockedUser1
    };
};

// Send a connection request
exports.sendConnectionRequest = async (req, res) => {
    try {
        const { recipientId, requesterType = 'User', recipientType = 'User' } = req.body;
        const requesterId = req.userId;

        if (!recipientId) {
            return res.status(400).send({ message: "Recipient ID is required" });
        }

        // Validate types
        if (!['User', 'Business'].includes(requesterType) || !['User', 'Business'].includes(recipientType)) {
            return res.status(400).send({ message: "Invalid requester or recipient type" });
        }

        // Determine requester ID and model
        let requesterModel = requesterType;
        let actualRequesterId = requesterId;
        
        // If requester is a business, get the business ID from active profile
        if (requesterType === 'Business') {
            // For businesses, we need to get the business ID from the request
            // The frontend should send businessId in the request body
            const { businessId } = req.body;
            if (!businessId) {
                return res.status(400).send({ message: "Business ID is required when sending as a business" });
            }
            actualRequesterId = businessId;
            
            // Verify the business exists and user owns it
            const business = await Business.findById(businessId);
            if (!business) {
                return res.status(404).send({ message: "Business not found" });
            }
            if (business.ownerId.toString() !== requesterId.toString()) {
                return res.status(403).send({ message: "You can only send connection requests from your own businesses" });
            }
        }

        // Check if recipient exists
        let recipient;
        if (recipientType === 'User') {
            recipient = await User.findById(recipientId);
            if (!recipient) {
                return res.status(404).send({ message: "User not found" });
            }
        } else {
            recipient = await Business.findById(recipientId);
            if (!recipient) {
                return res.status(404).send({ message: "Business not found" });
            }
        }

        // Prevent self-connections
        if (actualRequesterId.toString() === recipientId.toString() && requesterModel === recipientType) {
            return res.status(400).send({ message: "Cannot send connection request to yourself" });
        }

        // Check if requester is blocked by recipient (only for user-to-user)
        if (requesterModel === 'User' && recipientType === 'User') {
            const blockStatus = await checkBlockStatus(actualRequesterId, recipientId);
            if (blockStatus.user2BlockedUser1) {
                return res.status(403).send({ message: "Cannot send connection request to this user" });
            }
        }

        // Check if connection already exists
        const existingConnection = await Connection.findOne({
            $or: [
                { 
                    requester: actualRequesterId, 
                    recipient: recipientId,
                    requesterModel: requesterModel,
                    recipientModel: recipientType
                },
                { 
                    requester: recipientId, 
                    recipient: actualRequesterId,
                    requesterModel: recipientType,
                    recipientModel: requesterModel
                }
            ]
        });

        if (existingConnection) {
            if (existingConnection.status === 'accepted') {
                return res.status(400).send({ message: "Already connected" });
            }
            if (existingConnection.status === 'pending') {
                if (existingConnection.requester.toString() === actualRequesterId.toString() && 
                    existingConnection.requesterModel === requesterModel) {
                    return res.status(400).send({ message: "Connection request already sent" });
                } else {
                    // If the other user sent a request, accept it automatically
                    existingConnection.status = 'accepted';
                    existingConnection.updatedAt = new Date();
                    await existingConnection.save();

                    // Create contacts for both users automatically (only for user-to-user connections)
                    if (existingConnection.requesterModel === 'User' && existingConnection.recipientModel === 'User') {
                        try {
                            const requesterUser = await User.findById(existingConnection.requester).select('firstName lastName email phone avatar username');
                            const recipientUser = await User.findById(existingConnection.recipient).select('firstName lastName email phone avatar username');

                        logger.info(`Auto-accepting connection. Creating contacts. Requester: ${existingConnection.requester}, Recipient: ${existingConnection.recipient}`);

                        // Create contact for recipient (they now have requester as a contact)
                        // Email is required for contacts, so only create if user has email
                        if (requesterUser && requesterUser.email && requesterUser.email.trim()) {
                            const contactEmail = requesterUser.email.trim().toLowerCase();
                            const existingContactForRecipient = await Contact.findOne({
                                user: existingConnection.recipient,
                                email: contactEmail
                            });

                            if (!existingContactForRecipient) {
                                const lastName = (requesterUser.lastName && requesterUser.lastName.trim()) || requesterUser.username || 'User';
                                const firstName = (requesterUser.firstName && requesterUser.firstName.trim()) || requesterUser.username || 'Unknown';
                                
                                try {
                                const contactForRecipient = new Contact({
                                    user: existingConnection.recipient,
                                    firstName: firstName,
                                    lastName: lastName,
                                    email: contactEmail,
                                    phone: requesterUser.phone || '',
                                    avatar: requesterUser.avatar || '',
                                    type: 'client',
                                    status: 'active',
                                    platformUserId: existingConnection.requester, // Link to platform user
                                    isPlatformUser: true // Mark as platform user
                                });
                                    await contactForRecipient.save();
                                    logger.info(`✓ Created contact for recipient: ${existingConnection.recipient} from user: ${contactEmail}`);
                                } catch (saveError) {
                                    logger.error(`Failed to save contact for recipient:`, saveError.message);
                                }
                            }
                        }

                        // Create contact for requester (they now have recipient as a contact)
                        // Email is required for contacts, so only create if user has email
                        if (recipientUser && recipientUser.email && recipientUser.email.trim()) {
                            const contactEmail = recipientUser.email.trim().toLowerCase();
                            const existingContactForRequester = await Contact.findOne({
                                user: existingConnection.requester,
                                email: contactEmail
                            });

                            if (!existingContactForRequester) {
                                const lastName = (recipientUser.lastName && recipientUser.lastName.trim()) || recipientUser.username || 'User';
                                const firstName = (recipientUser.firstName && recipientUser.firstName.trim()) || recipientUser.username || 'Unknown';
                                
                                try {
                                const contactForRequester = new Contact({
                                    user: existingConnection.requester,
                                    firstName: firstName,
                                    lastName: lastName,
                                    email: contactEmail,
                                    phone: recipientUser.phone || '',
                                    avatar: recipientUser.avatar || '',
                                    type: 'client',
                                    status: 'active',
                                    platformUserId: existingConnection.recipient, // Link to platform user
                                    isPlatformUser: true // Mark as platform user
                                });
                                    await contactForRequester.save();
                                    logger.info(`✓ Created contact for requester: ${existingConnection.requester} from user: ${contactEmail}`);
                                } catch (saveError) {
                                    logger.error(`Failed to save contact for requester:`, saveError.message);
                                }
                            }
                        }
                        } catch (contactError) {
                            logger.error("Error creating contacts from auto-accept:", contactError);
                        }

                        // Automatically create follow relationships for both parties
                        try {
                            const requesterId = existingConnection.requester;
                            const recipientId = existingConnection.recipient;
                            const requesterModel = existingConnection.requesterModel;
                            const recipientModel = existingConnection.recipientModel;

                            // Create follow: requester follows recipient
                            let requesterFollowsRecipient = await Follow.findOne({
                                follower: requesterId,
                                following: recipientId,
                                followerModel: requesterModel,
                                followingModel: recipientModel
                            });

                            if (!requesterFollowsRecipient) {
                                requesterFollowsRecipient = new Follow({
                                    follower: requesterId,
                                    followerModel: requesterModel,
                                    following: recipientId,
                                    followingModel: recipientModel,
                                    status: 'accepted'
                                });
                                await requesterFollowsRecipient.save();
                                logger.info(`[auto-accept] Created follow: requester ${requesterId} (${requesterModel}) follows recipient ${recipientId} (${recipientModel})`);
                            } else if (requesterFollowsRecipient.status !== 'accepted') {
                                requesterFollowsRecipient.status = 'accepted';
                                requesterFollowsRecipient.updatedAt = new Date();
                                await requesterFollowsRecipient.save();
                                logger.info(`[auto-accept] Updated follow status to accepted: requester ${requesterId} (${requesterModel}) follows recipient ${recipientId} (${recipientModel})`);
                            }

                            // Create follow: recipient follows requester
                            let recipientFollowsRequester = await Follow.findOne({
                                follower: recipientId,
                                following: requesterId,
                                followerModel: recipientModel,
                                followingModel: requesterModel
                            });

                            if (!recipientFollowsRequester) {
                                recipientFollowsRequester = new Follow({
                                    follower: recipientId,
                                    followerModel: recipientModel,
                                    following: requesterId,
                                    followingModel: requesterModel,
                                    status: 'accepted'
                                });
                                await recipientFollowsRequester.save();
                                logger.info(`[auto-accept] Created follow: recipient ${recipientId} (${recipientModel}) follows requester ${requesterId} (${requesterModel})`);
                            } else if (recipientFollowsRequester.status !== 'accepted') {
                                recipientFollowsRequester.status = 'accepted';
                                recipientFollowsRequester.updatedAt = new Date();
                                await recipientFollowsRequester.save();
                                logger.info(`[auto-accept] Updated follow status to accepted: recipient ${recipientId} (${recipientModel}) follows requester ${requesterId} (${requesterModel})`);
                            }
                        } catch (followError) {
                            logger.error("[auto-accept] Error creating follow relationships:", followError);
                        }
                    } // End of user-to-user contact creation

                    return res.status(200).send({
                        message: "Connection request accepted",
                        connection: existingConnection
                    });
                }
            }
            if (existingConnection.status === 'rejected') {
                // Allow resending after rejection
                existingConnection.status = 'pending';
                existingConnection.requester = actualRequesterId;
                existingConnection.requesterModel = requesterModel;
                existingConnection.recipient = recipientId;
                existingConnection.recipientModel = recipientType;
                existingConnection.updatedAt = new Date();
                await existingConnection.save();
                return res.status(200).send({
                    message: "Connection request sent",
                    connection: existingConnection
                });
            }
        }

        // Create new connection request
        const connection = new Connection({
            requester: actualRequesterId,
            requesterModel: requesterModel,
            recipient: recipientId,
            recipientModel: recipientType,
            status: 'pending'
        });

        const savedConnection = await connection.save();
        return res.status(201).send({
            message: "Connection request sent",
            connection: savedConnection
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).send({ message: "Connection already exists" });
        }
        logger.error("Error sending connection request:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};

// Accept a connection request
exports.acceptConnectionRequest = async (req, res) => {
    try {
        const { connectionId } = req.params;
        const userId = req.userId;
        const { recipientType = 'User', businessId } = req.body;

        const connection = await Connection.findById(connectionId);
        if (!connection) {
            return res.status(404).send({ message: "Connection request not found" });
        }

        // Determine actual recipient ID
        let actualRecipientId = userId;
        if (recipientType === 'Business') {
            if (!businessId) {
                return res.status(400).send({ message: "Business ID is required when accepting as a business" });
            }
            const business = await Business.findById(businessId);
            if (!business) {
                return res.status(404).send({ message: "Business not found" });
            }
            if (business.ownerId.toString() !== userId.toString()) {
                return res.status(403).send({ message: "You can only accept connection requests for your own businesses" });
            }
            actualRecipientId = businessId;
        }

        // Verify the user/business is the recipient
        if (connection.recipient.toString() !== actualRecipientId.toString() || 
            connection.recipientModel !== recipientType) {
            return res.status(403).send({ message: "You can only accept connection requests sent to you" });
        }

        // Check block status before accepting (only for user-to-user)
        if (connection.requesterModel === 'User' && connection.recipientModel === 'User') {
            const blockStatus = await checkBlockStatus(connection.requester.toString(), connection.recipient.toString());
            if (blockStatus.isBlocked) {
                return res.status(403).send({ message: "Cannot accept connection request due to block status" });
            }
        }

        if (connection.status === 'accepted') {
            return res.status(400).send({ message: "Connection request already accepted" });
        }

        if (connection.status === 'rejected') {
            return res.status(400).send({ message: "Connection request was rejected" });
        }

        connection.status = 'accepted';
        connection.updatedAt = new Date();
        await connection.save();
        
        // Verify the connection was saved correctly
        const savedConnection = await Connection.findById(connectionId);
        if (savedConnection.status !== 'accepted') {
            logger.error(`Connection status update failed for connectionId: ${connectionId}`);
            return res.status(500).send({ message: "Failed to update connection status" });
        }
        
        logger.info(`[acceptConnectionRequest] Connection ${connectionId} accepted. Requester: ${connection.requester}, Recipient: ${connection.recipient}`);

        // Create contacts for both users automatically (only for user-to-user connections)
        let contactsCreated = { recipient: false, requester: false };
        try {
            // Only create contacts for user-to-user connections
            if (connection.requesterModel === 'User' && connection.recipientModel === 'User') {
                // Get both users' details
                const requesterUser = await User.findById(connection.requester).select('firstName lastName email phone avatar username');
                const recipientUser = await User.findById(connection.recipient).select('firstName lastName email phone avatar username');

            logger.info(`Creating contacts from connection. Requester: ${connection.requester}, Recipient: ${connection.recipient}`);
            logger.info(`Requester user data:`, { 
                hasEmail: !!requesterUser?.email, 
                email: requesterUser?.email,
                firstName: requesterUser?.firstName,
                lastName: requesterUser?.lastName,
                username: requesterUser?.username
            });
            logger.info(`Recipient user data:`, { 
                hasEmail: !!recipientUser?.email, 
                email: recipientUser?.email,
                firstName: recipientUser?.firstName,
                lastName: recipientUser?.lastName,
                username: recipientUser?.username
            });

            // Create contact for recipient (they now have requester as a contact)
            // Email is required for contacts, so only create if user has email
            if (requesterUser && requesterUser.email && requesterUser.email.trim()) {
                const contactEmail = requesterUser.email.trim().toLowerCase();
                
                // Check if contact already exists by email
                const existingContactForRecipient = await Contact.findOne({
                    user: connection.recipient,
                    email: contactEmail
                });

                if (!existingContactForRecipient) {
                    // Use username as fallback for names if missing
                    const lastName = (requesterUser.lastName && requesterUser.lastName.trim()) || requesterUser.username || 'User';
                    const firstName = (requesterUser.firstName && requesterUser.firstName.trim()) || requesterUser.username || 'Unknown';
                    
                    try {
                    const contactForRecipient = new Contact({
                        user: connection.recipient,
                        firstName: firstName,
                        lastName: lastName,
                        email: contactEmail,
                        phone: requesterUser.phone || '',
                        avatar: requesterUser.avatar || '',
                        type: 'client',
                        status: 'active',
                        platformUserId: connection.requester, // Link to platform user
                        isPlatformUser: true // Mark as platform user
                    });
                        await contactForRecipient.save();
                        contactsCreated.recipient = true;
                        logger.info(`✓ [acceptConnectionRequest] Created contact for recipient: ${connection.recipient} from user: ${contactEmail} (${firstName} ${lastName})`);
                    } catch (saveError) {
                        logger.error(`[acceptConnectionRequest] Failed to save contact for recipient:`, {
                            error: saveError.message,
                            validationErrors: saveError.errors,
                            contactData: {
                                user: connection.recipient,
                                firstName,
                                lastName,
                                email: contactEmail
                            }
                        });
                    }
                } else {
                    logger.warn(`[acceptConnectionRequest] Contact already exists for recipient: ${connection.recipient} with email: ${contactEmail}`);
                }
            } else {
                logger.warn(`[acceptConnectionRequest] Cannot create contact: requester user missing or has no email. Requester ID: ${connection.requester}, HasEmail: ${!!requesterUser?.email}`);
            }

            // Create contact for requester (they now have recipient as a contact)
            // Email is required for contacts, so only create if user has email
            if (recipientUser && recipientUser.email && recipientUser.email.trim()) {
                const contactEmail = recipientUser.email.trim().toLowerCase();
                
                // Check if contact already exists by email
                const existingContactForRequester = await Contact.findOne({
                    user: connection.requester,
                    email: contactEmail
                });

                if (!existingContactForRequester) {
                    // Use username as fallback for names if missing
                    const lastName = (recipientUser.lastName && recipientUser.lastName.trim()) || recipientUser.username || 'User';
                    const firstName = (recipientUser.firstName && recipientUser.firstName.trim()) || recipientUser.username || 'Unknown';
                    
                    try {
                    const contactForRequester = new Contact({
                        user: connection.requester,
                        firstName: firstName,
                        lastName: lastName,
                        email: contactEmail,
                        phone: recipientUser.phone || '',
                        avatar: recipientUser.avatar || '',
                        type: 'client',
                        status: 'active',
                        platformUserId: connection.recipient, // Link to platform user
                        isPlatformUser: true // Mark as platform user
                    });
                        await contactForRequester.save();
                        contactsCreated.requester = true;
                        logger.info(`✓ [acceptConnectionRequest] Created contact for requester: ${connection.requester} from user: ${contactEmail} (${firstName} ${lastName})`);
                    } catch (saveError) {
                        logger.error(`[acceptConnectionRequest] Failed to save contact for requester:`, {
                            error: saveError.message,
                            validationErrors: saveError.errors,
                            contactData: {
                                user: connection.requester,
                                firstName,
                                lastName,
                                email: contactEmail
                            }
                        });
                    }
                } else {
                    logger.warn(`[acceptConnectionRequest] Contact already exists for requester: ${connection.requester} with email: ${contactEmail}`);
                }
            } else {
                logger.warn(`[acceptConnectionRequest] Cannot create contact: recipient user missing or has no email. Recipient ID: ${connection.recipient}, HasEmail: ${!!recipientUser?.email}`);
            }
            
                // Summary log
                logger.info(`[acceptConnectionRequest] Contact creation summary:`, {
                    connectionId,
                    requesterId: connection.requester,
                    recipientId: connection.recipient,
                    contactsCreated,
                    requesterEmail: requesterUser?.email || 'N/A',
                    recipientEmail: recipientUser?.email || 'N/A'
                });
            } // End of user-to-user contact creation
        } catch (contactError) {
            // Log error but don't fail the connection acceptance
            logger.error("[acceptConnectionRequest] Error creating contacts from connection:", contactError);
            logger.error("[acceptConnectionRequest] Contact creation error details:", {
                error: contactError.message,
                stack: contactError.stack
            });
        }

        // Automatically create follow relationships for both parties
        try {
            const requesterId = connection.requester;
            const recipientId = connection.recipient;
            const requesterModel = connection.requesterModel;
            const recipientModel = connection.recipientModel;

            // Create follow: requester follows recipient
            let requesterFollowsRecipient = await Follow.findOne({
                follower: requesterId,
                following: recipientId,
                followerModel: requesterModel,
                followingModel: recipientModel
            });

            if (!requesterFollowsRecipient) {
                requesterFollowsRecipient = new Follow({
                    follower: requesterId,
                    followerModel: requesterModel,
                    following: recipientId,
                    followingModel: recipientModel,
                    status: 'accepted'
                });
                await requesterFollowsRecipient.save();
                logger.info(`[acceptConnectionRequest] Created follow: requester ${requesterId} (${requesterModel}) follows recipient ${recipientId} (${recipientModel})`);
            } else if (requesterFollowsRecipient.status !== 'accepted') {
                requesterFollowsRecipient.status = 'accepted';
                requesterFollowsRecipient.updatedAt = new Date();
                await requesterFollowsRecipient.save();
                logger.info(`[acceptConnectionRequest] Updated follow status to accepted: requester ${requesterId} (${requesterModel}) follows recipient ${recipientId} (${recipientModel})`);
            }

            // Create follow: recipient follows requester
            let recipientFollowsRequester = await Follow.findOne({
                follower: recipientId,
                following: requesterId,
                followerModel: recipientModel,
                followingModel: requesterModel
            });

            if (!recipientFollowsRequester) {
                recipientFollowsRequester = new Follow({
                    follower: recipientId,
                    followerModel: recipientModel,
                    following: requesterId,
                    followingModel: requesterModel,
                    status: 'accepted'
                });
                await recipientFollowsRequester.save();
                logger.info(`[acceptConnectionRequest] Created follow: recipient ${recipientId} (${recipientModel}) follows requester ${requesterId} (${requesterModel})`);
            } else if (recipientFollowsRequester.status !== 'accepted') {
                recipientFollowsRequester.status = 'accepted';
                recipientFollowsRequester.updatedAt = new Date();
                await recipientFollowsRequester.save();
                logger.info(`[acceptConnectionRequest] Updated follow status to accepted: recipient ${recipientId} (${recipientModel}) follows requester ${requesterId} (${requesterModel})`);
            }
        } catch (followError) {
            // Log error but don't fail the connection acceptance
            logger.error("[acceptConnectionRequest] Error creating follow relationships from connection:", followError);
        }

        // Populate and return the updated connection
        await connection.populate('requester', 'username firstName lastName avatar accountId');
        await connection.populate('recipient', 'username firstName lastName avatar accountId');

        return res.status(200).send({
            message: "Connection request accepted",
            connection: connection
        });
    } catch (error) {
        logger.error("Error accepting connection request:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};

// Reject a connection request
exports.rejectConnectionRequest = async (req, res) => {
    try {
        const { connectionId } = req.params;
        const userId = req.userId;
        const { recipientType = 'User', businessId } = req.body;

        const connection = await Connection.findById(connectionId);
        if (!connection) {
            return res.status(404).send({ message: "Connection request not found" });
        }

        // Determine actual recipient ID
        let actualRecipientId = userId;
        if (recipientType === 'Business') {
            if (!businessId) {
                return res.status(400).send({ message: "Business ID is required when rejecting as a business" });
            }
            const business = await Business.findById(businessId);
            if (!business) {
                return res.status(404).send({ message: "Business not found" });
            }
            if (business.ownerId.toString() !== userId.toString()) {
                return res.status(403).send({ message: "You can only reject connection requests for your own businesses" });
            }
            actualRecipientId = businessId;
        }

        // Verify the user/business is the recipient
        if (connection.recipient.toString() !== actualRecipientId.toString() || 
            connection.recipientModel !== recipientType) {
            return res.status(403).send({ message: "You can only reject connection requests sent to you" });
        }

        if (connection.status === 'accepted') {
            return res.status(400).send({ message: "Cannot reject an accepted connection" });
        }

        connection.status = 'rejected';
        connection.updatedAt = new Date();
        await connection.save();

        return res.status(200).send({
            message: "Connection request rejected",
            connection: connection
        });
    } catch (error) {
        logger.error("Error rejecting connection request:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};

// Get connection status with a specific user or business
exports.getConnectionStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { requesterType = 'User', recipientType = 'User', businessId } = req.query;
        const currentUserId = req.userId;

        // Determine actual requester ID
        let actualRequesterId = currentUserId;
        if (requesterType === 'Business') {
            if (!businessId) {
                return res.status(400).send({ message: "Business ID is required when checking as a business" });
            }
            const business = await Business.findById(businessId);
            if (!business) {
                return res.status(404).send({ message: "Business not found" });
            }
            if (business.ownerId.toString() !== currentUserId.toString()) {
                return res.status(403).send({ message: "You can only check connection status for your own businesses" });
            }
            actualRequesterId = businessId;
        }

        if (actualRequesterId.toString() === userId.toString() && requesterType === recipientType) {
            return res.status(400).send({ message: "Cannot check connection status with yourself" });
        }

        const connection = await Connection.findOne({
            $or: [
                { 
                    requester: actualRequesterId, 
                    recipient: userId,
                    requesterModel: requesterType,
                    recipientModel: recipientType
                },
                { 
                    requester: userId, 
                    recipient: actualRequesterId,
                    requesterModel: recipientType,
                    recipientModel: requesterType
                }
            ]
        });
        
        // Populate based on model types
        if (connection) {
            if (connection.requesterModel === 'User') {
                await connection.populate('requester', 'username firstName lastName avatar');
            } else {
                await connection.populate('requester', 'businessName businessSlug avatar ownerId');
            }
            if (connection.recipientModel === 'User') {
                await connection.populate('recipient', 'username firstName lastName avatar');
            } else {
                await connection.populate('recipient', 'businessName businessSlug avatar ownerId');
            }
        }

        if (!connection) {
            return res.status(200).send({
                status: 'none',
                connection: null
            });
        }

        // Check block status (only for user-to-user)
        if (requesterType === 'User' && recipientType === 'User') {
            const blockStatus = await checkBlockStatus(actualRequesterId, userId);
            if (blockStatus.isBlocked) {
                return res.status(200).send({
                    status: 'blocked',
                    connection: null,
                    isBlocked: true,
                    isFollowing: false
                });
            }
        }

        // Determine the status from the current user's perspective
        let status = connection.status;
        if (connection.status === 'pending') {
            if (connection.requester.toString() === actualRequesterId.toString() && 
                connection.requesterModel === requesterType) {
                status = 'pending_sent';
            } else {
                status = 'pending_received';
            }
        }

        // Determine isFollowing from current user's perspective
        const isRequester = connection.requester.toString() === actualRequesterId.toString() && 
                           connection.requesterModel === requesterType;
        const isFollowing = connection.isFollowing !== false; // Default to true if not set

        return res.status(200).send({
            status: status,
            connection: connection,
            isFollowing: isFollowing,
            isBlocked: false
        });
    } catch (error) {
        logger.error("Error getting connection status:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};

// Get all connections for the current user
exports.getConnections = async (req, res) => {
    try {
        const userId = req.userId;
        const { status, type } = req.query;

        let query = {
            $or: [
                { requester: userId },
                { recipient: userId }
            ]
        };

        // Filter by status if provided
        if (status && ['pending', 'accepted', 'rejected'].includes(status)) {
            query.status = status;
        }

        const connections = await Connection.find(query)
            .populate('requester', 'username firstName lastName avatar accountId')
            .populate('recipient', 'username firstName lastName avatar accountId')
            .sort({ updatedAt: -1 });

        // Format connections to include the other user and direction
        const formattedConnections = connections.map(conn => {
            const isRequester = conn.requester._id.toString() === userId.toString();
            const otherUser = isRequester ? conn.recipient : conn.requester;
            
            return {
                _id: conn._id,
                status: conn.status,
                otherUser: otherUser,
                direction: isRequester ? 'sent' : 'received',
                isFollowing: conn.isFollowing !== false, // Default to true if not set
                createdAt: conn.createdAt,
                updatedAt: conn.updatedAt
            };
        });

        // Filter by type if provided (sent/received)
        let filteredConnections = formattedConnections;
        if (type && ['sent', 'received'].includes(type)) {
            filteredConnections = formattedConnections.filter(conn => conn.direction === type);
        }

        return res.status(200).send({
            connections: filteredConnections,
            total: filteredConnections.length
        });
    } catch (error) {
        logger.error("Error getting connections:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};

// Get pending connection requests (received)
exports.getPendingRequests = async (req, res) => {
    try {
        const userId = req.userId;

        const connections = await Connection.find({
            recipient: userId,
            status: 'pending'
        })
        .populate('requester', 'username firstName lastName avatar accountId')
        .sort({ createdAt: -1 });

        return res.status(200).send({
            requests: connections,
            total: connections.length
        });
    } catch (error) {
        logger.error("Error getting pending requests:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};

// Remove/Delete a connection
exports.removeConnection = async (req, res) => {
    try {
        const { connectionId } = req.params;
        const userId = req.userId;

        const connection = await Connection.findById(connectionId);
        if (!connection) {
            return res.status(404).send({ message: "Connection not found" });
        }

        // Verify the user is part of this connection
        if (connection.requester.toString() !== userId.toString() && 
            connection.recipient.toString() !== userId.toString()) {
            return res.status(403).send({ message: "You can only remove your own connections" });
        }

        await Connection.findByIdAndDelete(connectionId);

        return res.status(200).send({
            message: "Connection removed"
        });
    } catch (error) {
        logger.error("Error removing connection:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};

// Follow a connection (set isFollowing to true)
exports.followConnection = async (req, res) => {
    try {
        const { connectionId } = req.params;
        const userId = req.userId;

        const connection = await Connection.findById(connectionId);
        if (!connection) {
            return res.status(404).send({ message: "Connection not found" });
        }

        // Verify the user is part of this connection
        if (connection.requester.toString() !== userId.toString() && 
            connection.recipient.toString() !== userId.toString()) {
            return res.status(403).send({ message: "You can only follow your own connections" });
        }

        // Only allow following if connection is accepted
        if (connection.status !== 'accepted') {
            return res.status(400).send({ message: "Can only follow accepted connections" });
        }

        connection.isFollowing = true;
        connection.updatedAt = new Date();
        await connection.save();

        return res.status(200).send({
            message: "Now following this connection",
            connection: connection
        });
    } catch (error) {
        logger.error("Error following connection:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};

// Unfollow a connection (set isFollowing to false)
exports.unfollowConnection = async (req, res) => {
    try {
        const { connectionId } = req.params;
        const userId = req.userId;

        const connection = await Connection.findById(connectionId);
        if (!connection) {
            return res.status(404).send({ message: "Connection not found" });
        }

        // Verify the user is part of this connection
        if (connection.requester.toString() !== userId.toString() && 
            connection.recipient.toString() !== userId.toString()) {
            return res.status(403).send({ message: "You can only unfollow your own connections" });
        }

        // Only allow unfollowing if connection is accepted
        if (connection.status !== 'accepted') {
            return res.status(400).send({ message: "Can only unfollow accepted connections" });
        }

        connection.isFollowing = false;
        connection.updatedAt = new Date();
        await connection.save();

        return res.status(200).send({
            message: "Unfollowed this connection",
            connection: connection
        });
    } catch (error) {
        logger.error("Error unfollowing connection:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};

// Block a user
exports.blockUser = async (req, res) => {
    try {
        const { userId: targetUserId } = req.params;
        const blockerId = req.userId;

        if (blockerId.toString() === targetUserId.toString()) {
            return res.status(400).send({ message: "Cannot block yourself" });
        }

        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            return res.status(404).send({ message: "User not found" });
        }

        const blocker = await User.findById(blockerId);
        if (!blocker) {
            return res.status(404).send({ message: "Blocker not found" });
        }

        // Check if already blocked
        if (blocker.blockedUsers && blocker.blockedUsers.some(
            id => id.toString() === targetUserId.toString()
        )) {
            return res.status(400).send({ message: "User is already blocked" });
        }

        // Add to blockedUsers array
        if (!blocker.blockedUsers) {
            blocker.blockedUsers = [];
        }
        blocker.blockedUsers.push(targetUserId);
        await blocker.save();

        // Remove any existing connections between the users (all model types)
        const connections = await Connection.find({
            $or: [
                { 
                    requester: blockerId, 
                    recipient: targetUserId
                },
                { 
                    requester: targetUserId, 
                    recipient: blockerId
                }
            ]
        });

        if (connections.length > 0) {
            await Connection.deleteMany({
                _id: { $in: connections.map(c => c._id) }
            });
            logger.info(`Removed ${connections.length} connection(s) due to blocking`);
        }

        // Unfollow in both directions
        // Remove blocker following target
        const blockerFollowsTarget = await Follow.find({
            $or: [
                {
                    follower: blockerId,
                    following: targetUserId,
                    followerModel: 'User',
                    followingModel: 'User'
                },
                {
                    follower: blockerId,
                    following: targetUserId,
                    followerModel: 'Business',
                    followingModel: 'User'
                }
            ]
        });

        if (blockerFollowsTarget.length > 0) {
            await Follow.deleteMany({
                _id: { $in: blockerFollowsTarget.map(f => f._id) }
            });
            logger.info(`Removed ${blockerFollowsTarget.length} follow relationship(s) where blocker follows target`);
        }

        // Remove target following blocker
        const targetFollowsBlocker = await Follow.find({
            $or: [
                {
                    follower: targetUserId,
                    following: blockerId,
                    followerModel: 'User',
                    followingModel: 'User'
                },
                {
                    follower: targetUserId,
                    following: blockerId,
                    followerModel: 'User',
                    followingModel: 'Business'
                }
            ]
        });

        if (targetFollowsBlocker.length > 0) {
            await Follow.deleteMany({
                _id: { $in: targetFollowsBlocker.map(f => f._id) }
            });
            logger.info(`Removed ${targetFollowsBlocker.length} follow relationship(s) where target follows blocker`);
        }

        // Delete contacts in both directions
        // Delete blocker's contact for target
        const blockerContactForTarget = await Contact.find({
            user: blockerId,
            platformUserId: targetUserId,
            isPlatformUser: true
        });

        if (blockerContactForTarget.length > 0) {
            await Contact.deleteMany({
                _id: { $in: blockerContactForTarget.map(c => c._id) }
            });
            logger.info(`Removed ${blockerContactForTarget.length} contact(s) where blocker has target as contact`);
        }

        // Delete target's contact for blocker
        const targetContactForBlocker = await Contact.find({
            user: targetUserId,
            platformUserId: blockerId,
            isPlatformUser: true
        });

        if (targetContactForBlocker.length > 0) {
            await Contact.deleteMany({
                _id: { $in: targetContactForBlocker.map(c => c._id) }
            });
            logger.info(`Removed ${targetContactForBlocker.length} contact(s) where target has blocker as contact`);
        }

        return res.status(200).send({
            message: "User blocked successfully",
            blocked: true
        });
    } catch (error) {
        logger.error("Error blocking user:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};

// Unblock a user
exports.unblockUser = async (req, res) => {
    try {
        const { userId: targetUserId } = req.params;
        const blockerId = req.userId;

        const blocker = await User.findById(blockerId);
        if (!blocker) {
            return res.status(404).send({ message: "User not found" });
        }

        if (!blocker.blockedUsers || !blocker.blockedUsers.some(
            id => id.toString() === targetUserId.toString()
        )) {
            return res.status(400).send({ message: "User is not blocked" });
        }

        // Remove from blockedUsers array
        blocker.blockedUsers = blocker.blockedUsers.filter(
            id => id.toString() !== targetUserId.toString()
        );
        await blocker.save();

        return res.status(200).send({
            message: "User unblocked successfully",
            blocked: false
        });
    } catch (error) {
        logger.error("Error unblocking user:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};

// Get block status with a specific user
exports.getBlockStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.userId;

        if (currentUserId.toString() === userId.toString()) {
            return res.status(400).send({ message: "Cannot check block status with yourself" });
        }

        const blockStatus = await checkBlockStatus(currentUserId, userId);
        
        return res.status(200).send({
            isBlocked: blockStatus.isBlocked,
            user1BlockedUser2: blockStatus.user1BlockedUser2, // Current user blocked target
            user2BlockedUser1: blockStatus.user2BlockedUser1  // Target blocked current user
        });
    } catch (error) {
        logger.error("Error getting block status:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};

// Get list of blocked users
exports.getBlockedUsers = async (req, res) => {
    try {
        const userId = req.userId;
        
        // Get active profile context
        const { getActiveAccountContext } = require("../utils/permissions");
        const { activeAccountId, activePageId } = getActiveAccountContext(req);
        
        // Determine if we're on a business profile
        let isBusinessProfile = false;
        let activeBusiness = null;
        
        if (activeAccountId) {
            const user = await User.findById(userId).select('accountId');
            if (user && user.accountId && Number(user.accountId) !== Number(activeAccountId)) {
                // User is on a business profile
                activeBusiness = await Business.findOne({ 
                    ownerId: userId,
                    accountId: activeAccountId 
                }).select('blockedUsers');
                
                if (activeBusiness) {
                    isBusinessProfile = true;
                }
            }
        }
        
        let blockedUsers = [];
        
        if (isBusinessProfile && activeBusiness) {
            blockedUsers = await User.find({
                _id: { $in: activeBusiness.blockedUsers || [] }
            }).select('username firstName lastName avatar accountId email');
        } else {
            const user = await User.findById(userId).select('blockedUsers').populate('blockedUsers', 'username firstName lastName avatar accountId email');
            if (!user) {
                return res.status(404).send({ message: "User not found" });
            }
            blockedUsers = user.blockedUsers || [];
        }

        return res.status(200).send({
            blockedUsers: blockedUsers.map(u => ({
                _id: u._id,
                username: u.username,
                firstName: u.firstName,
                lastName: u.lastName,
                avatar: u.avatar,
                accountId: u.accountId,
                email: u.email
            })),
            total: blockedUsers.length
        });
    } catch (error) {
        logger.error("Error getting blocked users:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};
