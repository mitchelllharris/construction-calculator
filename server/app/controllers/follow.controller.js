const db = require("../models");
const logger = require("../utils/logger");
const User = db.user;
const Business = db.business;
const Follow = db.follow;

// Helper function to check if a user is blocked
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

// Follow a user (or send follow request)
exports.followUser = async (req, res) => {
    try {
        const { userId: targetUserId } = req.params;
        const currentUserId = req.userId;

        // Get active profile context
        const { getActiveAccountContext } = require("../utils/permissions");
        const { activeAccountId, activePageId } = getActiveAccountContext(req);
        
        // Determine if we're on a business profile
        let isBusinessProfile = false;
        let activeBusinessId = null;
        
        if (activeAccountId) {
            const user = await User.findById(currentUserId).select('accountId');
            if (user && user.accountId && Number(user.accountId) !== Number(activeAccountId)) {
                // User is on a business profile
                const business = await Business.findOne({ 
                    ownerId: currentUserId,
                    accountId: activeAccountId 
                }).select('_id');
                
                if (business) {
                    isBusinessProfile = true;
                    activeBusinessId = business._id;
                }
            }
        }

        const followerId = isBusinessProfile ? activeBusinessId : currentUserId;
        const followerModel = isBusinessProfile ? 'Business' : 'User';
        const followingModel = 'User'; // Always following a user in this endpoint

        if (followerId.toString() === targetUserId.toString() && followerModel === followingModel) {
            return res.status(400).send({ message: "Cannot follow yourself" });
        }

        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            return res.status(404).send({ message: "User not found" });
        }

        // Check if follower is blocked by target user (only check if follower is a user)
        if (followerModel === 'User') {
            const isBlocked = await isUserBlocked(targetUserId, currentUserId);
            if (isBlocked) {
                return res.status(403).send({ message: "Cannot follow this user" });
            }
        } else {
            // For business profiles, check if business is blocked
            if (targetUser.blockedUsers && targetUser.blockedUsers.some(id => id.toString() === followerId.toString())) {
                return res.status(403).send({ message: "Cannot follow this user" });
            }
        }

        // Check if already following (with or without model fields to handle old records)
        let existingFollow = await Follow.findOne({
            follower: followerId,
            followerModel: followerModel,
            following: targetUserId,
            followingModel: followingModel
        });

        // Also check for old records without model fields
        if (!existingFollow) {
            existingFollow = await Follow.findOne({
                follower: followerId,
                following: targetUserId,
                $or: [
                    { followerModel: { $exists: false } },
                    { followingModel: { $exists: false } }
                ]
            });
            
            // If found old record, update it with model fields
            if (existingFollow) {
                existingFollow.followerModel = followerModel;
                existingFollow.followingModel = followingModel;
                await existingFollow.save();
            }
        }

        if (existingFollow) {
            if (existingFollow.status === 'accepted') {
                return res.status(400).send({ message: "Already following this user" });
            }
            if (existingFollow.status === 'pending') {
                return res.status(400).send({ message: "Follow request already sent" });
            }
            // If status is 'rejected', update it to pending or accepted
            const newFollowStatus = targetUser.followSettings === 'anyone' ? 'accepted' : 'pending';
            existingFollow.status = newFollowStatus;
            existingFollow.updatedAt = new Date();
            await existingFollow.save();
            return res.status(200).send({
                message: newFollowStatus === 'accepted' 
                    ? "Now following this user" 
                    : "Follow request sent",
                follow: existingFollow
            });
        }

        // Determine status based on target user's follow settings
        const followStatus = targetUser.followSettings === 'anyone' ? 'accepted' : 'pending';

        try {
            const follow = new Follow({
                follower: followerId,
                followerModel: followerModel,
                following: targetUserId,
                followingModel: followingModel,
                status: followStatus
            });

            await follow.save();
            
            return res.status(200).send({
                message: followStatus === 'accepted' 
                    ? "Now following this user" 
                    : "Follow request sent",
                follow: follow
            });
        } catch (error) {
            // Handle duplicate key error - might be from old index
            if (error.code === 11000) {
                // Try to find the existing follow
                const duplicateFollow = await Follow.findOne({
                    follower: followerId,
                    following: targetUserId
                });
                
                if (duplicateFollow) {
                    // Update it with correct model fields
                    duplicateFollow.followerModel = followerModel;
                    duplicateFollow.followingModel = followingModel;
                    duplicateFollow.status = followStatus;
                    duplicateFollow.updatedAt = new Date();
                    await duplicateFollow.save();
                    
                    return res.status(200).send({
                        message: followStatus === 'accepted' 
                            ? "Now following this user" 
                            : "Follow request sent",
                        follow: duplicateFollow
                    });
                }
            }
            throw error;
        }

        return res.status(200).send({
            message: followStatus === 'accepted' 
                ? "Now following this user" 
                : "Follow request sent",
            follow: follow
        });
    } catch (error) {
        if (error.message === 'Cannot follow yourself') {
            return res.status(400).send({ message: error.message });
        }
        logger.error("Error following user:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};

// Unfollow a user
exports.unfollowUser = async (req, res) => {
    try {
        const { userId: targetUserId } = req.params;
        const currentUserId = req.userId;

        // Get active profile context
        const { getActiveAccountContext } = require("../utils/permissions");
        const { activeAccountId, activePageId } = getActiveAccountContext(req);
        
        // Determine if we're on a business profile
        let isBusinessProfile = false;
        let activeBusinessId = null;
        
        if (activeAccountId) {
            const user = await User.findById(currentUserId).select('accountId');
            if (user && user.accountId && Number(user.accountId) !== Number(activeAccountId)) {
                // User is on a business profile
                const business = await Business.findOne({ 
                    ownerId: currentUserId,
                    accountId: activeAccountId 
                }).select('_id');
                
                if (business) {
                    isBusinessProfile = true;
                    activeBusinessId = business._id;
                }
            }
        }

        const followerId = isBusinessProfile ? activeBusinessId : currentUserId;
        const followerModel = isBusinessProfile ? 'Business' : 'User';
        const followingModel = 'User'; // Always unfollowing a user in this endpoint

        const follow = await Follow.findOne({
            follower: followerId,
            followerModel: followerModel,
            following: targetUserId,
            followingModel: followingModel
        });

        if (!follow) {
            return res.status(404).send({ message: "Not following this user" });
        }

        await Follow.findByIdAndDelete(follow._id);

        return res.status(200).send({
            message: "Unfollowed this user"
        });
    } catch (error) {
        logger.error("Error unfollowing user:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};

// Accept a follow request
exports.acceptFollowRequest = async (req, res) => {
    try {
        const { followId } = req.params;
        const userId = req.userId;

        const follow = await Follow.findById(followId);
        if (!follow) {
            return res.status(404).send({ message: "Follow request not found" });
        }

        // Verify the user is the one being followed
        if (follow.following.toString() !== userId.toString()) {
            return res.status(403).send({ message: "You can only accept follow requests sent to you" });
        }

        if (follow.status === 'accepted') {
            return res.status(400).send({ message: "Follow request already accepted" });
        }

        follow.status = 'accepted';
        follow.updatedAt = new Date();
        await follow.save();

        return res.status(200).send({
            message: "Follow request accepted",
            follow: follow
        });
    } catch (error) {
        logger.error("Error accepting follow request:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};

// Reject a follow request
exports.rejectFollowRequest = async (req, res) => {
    try {
        const { followId } = req.params;
        const userId = req.userId;

        const follow = await Follow.findById(followId);
        if (!follow) {
            return res.status(404).send({ message: "Follow request not found" });
        }

        // Verify the user is the one being followed
        if (follow.following.toString() !== userId.toString()) {
            return res.status(403).send({ message: "You can only reject follow requests sent to you" });
        }

        await Follow.findByIdAndDelete(followId);

        return res.status(200).send({
            message: "Follow request rejected"
        });
    } catch (error) {
        logger.error("Error rejecting follow request:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};

// Get follow status with a specific user
exports.getFollowStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.userId;

        // Get active profile context
        const { getActiveAccountContext } = require("../utils/permissions");
        const { activeAccountId, activePageId } = getActiveAccountContext(req);
        
        // Determine if we're on a business profile
        let isBusinessProfile = false;
        let activeBusinessId = null;
        
        if (activeAccountId) {
            const user = await User.findById(currentUserId).select('accountId');
            if (user && user.accountId && Number(user.accountId) !== Number(activeAccountId)) {
                // User is on a business profile
                const business = await Business.findOne({ 
                    ownerId: currentUserId,
                    accountId: activeAccountId 
                }).select('_id');
                
                if (business) {
                    isBusinessProfile = true;
                    activeBusinessId = business._id;
                }
            }
        }

        const followerId = isBusinessProfile ? activeBusinessId : currentUserId;
        const followerModel = isBusinessProfile ? 'Business' : 'User';
        const followingModel = 'User'; // Always checking follow status with a user in this endpoint

        if (followerId.toString() === userId.toString() && followerModel === followingModel) {
            return res.status(400).send({ message: "Cannot check follow status with yourself" });
        }

        const follow = await Follow.findOne({
            follower: followerId,
            followerModel: followerModel,
            following: userId,
            followingModel: followingModel
        });

        if (!follow) {
            return res.status(200).send({
                status: 'none',
                follow: null
            });
        }

        return res.status(200).send({
            status: follow.status,
            follow: follow
        });
    } catch (error) {
        logger.error("Error getting follow status:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};

// Get pending follow requests (received)
exports.getPendingFollowRequests = async (req, res) => {
    try {
        const userId = req.userId;
        
        // Get active profile context
        const { getActiveAccountContext } = require("../utils/permissions");
        const { activeAccountId, activePageId } = getActiveAccountContext(req);
        
        // Determine if we're on a business profile
        let isBusinessProfile = false;
        let activeBusinessId = null;
        
        if (activeAccountId) {
            const user = await User.findById(userId).select('accountId');
            if (user && user.accountId && Number(user.accountId) !== Number(activeAccountId)) {
                // User is on a business profile
                const business = await Business.findOne({ 
                    ownerId: userId,
                    accountId: activeAccountId 
                }).select('_id');
                
                if (business) {
                    isBusinessProfile = true;
                    activeBusinessId = business._id;
                }
            }
        }
        
        const followingId = isBusinessProfile ? activeBusinessId : userId;
        const followingModel = isBusinessProfile ? 'Business' : 'User';

        const follows = await Follow.find({
            following: followingId,
            followingModel: followingModel,
            status: 'pending'
        })
        .populate('follower', 'username firstName lastName avatar accountId email businessName businessSlug')
        .sort({ createdAt: -1 });

        const requests = follows.map(f => {
            const follower = f.follower;
            const isBusiness = f.followerModel === 'Business';
            return {
                _id: f._id,
                follower: {
                    _id: follower._id,
                    username: isBusiness ? (follower.businessSlug || follower._id) : follower.username,
                    firstName: isBusiness ? null : follower.firstName,
                    lastName: isBusiness ? null : follower.lastName,
                    businessName: isBusiness ? follower.businessName : null,
                    avatar: follower.avatar,
                    accountId: follower.accountId,
                    email: isBusiness ? null : follower.email,
                    isBusiness: isBusiness
                },
                createdAt: f.createdAt
            };
        });

        return res.status(200).send({
            requests: requests,
            total: requests.length
        });
    } catch (error) {
        logger.error("Error getting pending follow requests:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};

// Get followers count
exports.getFollowersCount = async (req, res) => {
    try {
        const { userId } = req.params;

        const count = await Follow.countDocuments({
            following: userId,
            status: 'accepted'
        });

        return res.status(200).send({
            count: count
        });
    } catch (error) {
        logger.error("Error getting followers count:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};

// Get following count
exports.getFollowingCount = async (req, res) => {
    try {
        const { userId } = req.params;

        const count = await Follow.countDocuments({
            follower: userId,
            status: 'accepted'
        });

        return res.status(200).send({
            count: count
        });
    } catch (error) {
        logger.error("Error getting following count:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};

// Get list of users I am following
exports.getFollowing = async (req, res) => {
    try {
        const userId = req.userId;
        
        // Get active profile context
        const { getActiveAccountContext } = require("../utils/permissions");
        const { activeAccountId, activePageId } = getActiveAccountContext(req);
        
        // Determine if we're on a business profile
        let isBusinessProfile = false;
        let activeBusinessId = null;
        
        if (activeAccountId) {
            const user = await User.findById(userId).select('accountId');
            if (user && user.accountId && Number(user.accountId) !== Number(activeAccountId)) {
                // User is on a business profile
                const business = await Business.findOne({ 
                    ownerId: userId,
                    accountId: activeAccountId 
                }).select('_id');
                
                if (business) {
                    isBusinessProfile = true;
                    activeBusinessId = business._id;
                }
            }
        }
        
        const followerId = isBusinessProfile ? activeBusinessId : userId;
        const followerModel = isBusinessProfile ? 'Business' : 'User';

        const follows = await Follow.find({
            follower: followerId,
            followerModel: followerModel,
            status: { $in: ['accepted', 'pending'] }
        })
        .populate('following', 'username firstName lastName avatar accountId email businessName businessSlug')
        .sort({ createdAt: -1 });

        const acceptedFollows = [];
        const pendingFollows = [];

        follows.forEach(f => {
            const following = f.following;
            const isBusiness = f.followingModel === 'Business';
            const followData = {
                _id: following._id,
                username: isBusiness ? (following.businessSlug || following._id) : following.username,
                firstName: isBusiness ? null : following.firstName,
                lastName: isBusiness ? null : following.lastName,
                businessName: isBusiness ? following.businessName : null,
                avatar: following.avatar,
                accountId: following.accountId,
                email: isBusiness ? null : following.email,
                isBusiness: isBusiness,
                followedAt: f.createdAt,
                status: f.status
            };

            if (f.status === 'accepted') {
                acceptedFollows.push(followData);
            } else if (f.status === 'pending') {
                pendingFollows.push(followData);
            }
        });

        return res.status(200).send({
            following: acceptedFollows,
            pending: pendingFollows,
            total: acceptedFollows.length,
            pendingTotal: pendingFollows.length
        });
    } catch (error) {
        logger.error("Error getting following list:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};

// Get list of followers
exports.getFollowers = async (req, res) => {
    try {
        const userId = req.userId;
        
        // Get active profile context
        const { getActiveAccountContext } = require("../utils/permissions");
        const { activeAccountId, activePageId } = getActiveAccountContext(req);
        
        // Determine if we're on a business profile
        let isBusinessProfile = false;
        let activeBusinessId = null;
        
        if (activeAccountId) {
            const user = await User.findById(userId).select('accountId');
            if (user && user.accountId && Number(user.accountId) !== Number(activeAccountId)) {
                // User is on a business profile
                const business = await Business.findOne({ 
                    ownerId: userId,
                    accountId: activeAccountId 
                }).select('_id');
                
                if (business) {
                    isBusinessProfile = true;
                    activeBusinessId = business._id;
                }
            }
        }
        
        const followingId = isBusinessProfile ? activeBusinessId : userId;
        const followingModel = isBusinessProfile ? 'Business' : 'User';

        const follows = await Follow.find({
            following: followingId,
            followingModel: followingModel,
            status: 'accepted'
        })
        .populate('follower', 'username firstName lastName avatar accountId email businessName businessSlug')
        .sort({ createdAt: -1 });

        const followers = follows.map(f => {
            const follower = f.follower;
            const isBusiness = f.followerModel === 'Business';
            return {
                _id: follower._id,
                username: isBusiness ? (follower.businessSlug || follower._id) : follower.username,
                firstName: isBusiness ? null : follower.firstName,
                lastName: isBusiness ? null : follower.lastName,
                businessName: isBusiness ? follower.businessName : null,
                avatar: follower.avatar,
                accountId: follower.accountId,
                email: isBusiness ? null : follower.email,
                isBusiness: isBusiness,
                followedAt: f.createdAt
            };
        });

        return res.status(200).send({
            followers: followers,
            total: followers.length
        });
    } catch (error) {
        logger.error("Error getting followers list:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};
