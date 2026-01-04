const db = require("../models");
const logger = require("../utils/logger");
const User = db.user;
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
        const followerId = req.userId;

        if (followerId.toString() === targetUserId.toString()) {
            return res.status(400).send({ message: "Cannot follow yourself" });
        }

        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            return res.status(404).send({ message: "User not found" });
        }

        // Check if follower is blocked by target user
        const isBlocked = await isUserBlocked(targetUserId, followerId);
        if (isBlocked) {
            return res.status(403).send({ message: "Cannot follow this user" });
        }

        // Check if already following
        const existingFollow = await Follow.findOne({
            follower: followerId,
            following: targetUserId
        });

        if (existingFollow) {
            if (existingFollow.status === 'accepted') {
                return res.status(400).send({ message: "Already following this user" });
            }
            if (existingFollow.status === 'pending') {
                return res.status(400).send({ message: "Follow request already sent" });
            }
        }

        // Determine status based on target user's follow settings
        const followStatus = targetUser.followSettings === 'anyone' ? 'accepted' : 'pending';

        const follow = new Follow({
            follower: followerId,
            following: targetUserId,
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
        const followerId = req.userId;

        const follow = await Follow.findOne({
            follower: followerId,
            following: targetUserId
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

        if (currentUserId.toString() === userId.toString()) {
            return res.status(400).send({ message: "Cannot check follow status with yourself" });
        }

        const follow = await Follow.findOne({
            follower: currentUserId,
            following: userId
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

        const follows = await Follow.find({
            following: userId,
            status: 'pending'
        })
        .populate('follower', 'username firstName lastName avatar accountId')
        .sort({ createdAt: -1 });

        return res.status(200).send({
            requests: follows,
            total: follows.length
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

        const follows = await Follow.find({
            follower: userId,
            status: 'accepted'
        })
        .populate('following', 'username firstName lastName avatar accountId email')
        .sort({ createdAt: -1 });

        return res.status(200).send({
            following: follows.map(f => ({
                _id: f.following._id,
                username: f.following.username,
                firstName: f.following.firstName,
                lastName: f.following.lastName,
                avatar: f.following.avatar,
                accountId: f.following.accountId,
                email: f.following.email,
                followedAt: f.createdAt
            })),
            total: follows.length
        });
    } catch (error) {
        logger.error("Error getting following list:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};
