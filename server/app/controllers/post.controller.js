const db = require('../models');
const Post = db.post;
const User = db.user;
const logger = require('../utils/logger');

// Create a new post
exports.createPost = async (req, res) => {
    try {
        const { profileUserId, content, images, videos, replySettings, poll, location, taggedUsers } = req.body;
        const authorUserId = req.userId;

        // Validate required fields
        if (!profileUserId) {
            return res.status(400).send({ message: "Profile user ID is required" });
        }

        // At least one of content, images, videos, or poll must be provided
        const hasContent = content && content.trim();
        const hasImages = images && Array.isArray(images) && images.length > 0;
        const hasVideos = videos && Array.isArray(videos) && videos.length > 0;
        const hasPoll = poll && poll.options && Array.isArray(poll.options) && poll.options.length >= 2;

        if (!hasContent && !hasImages && !hasVideos && !hasPoll) {
            return res.status(400).send({ message: "Post must contain at least text, images, videos, or a poll" });
        }

        // Check if profile user exists
        const profileUser = await User.findById(profileUserId);
        if (!profileUser) {
            return res.status(404).send({ message: "Profile user not found" });
        }

        // Check privacy settings for posting
        const canPost = checkPostPrivacy(profileUser, authorUserId, profileUserId);
        if (!canPost) {
            return res.status(403).send({ message: "You don't have permission to post on this profile" });
        }

        // Create post
        const postData = {
            profileUserId,
            authorUserId,
            content: hasContent ? content.trim() : '',
            images: images || [],
            videos: videos || [],
            replySettings: replySettings || 'everyone'
        };

        // Add poll if provided
        if (poll && poll.options && poll.options.length >= 2) {
            const endsAt = new Date();
            endsAt.setDate(endsAt.getDate() + (poll.duration || 1));
            postData.poll = {
                options: poll.options,
                votes: [],
                duration: poll.duration || 1,
                endsAt: endsAt
            };
        }

        // Add location if provided
        if (location && location.name) {
            postData.location = location;
        }

        // Add tagged users if provided
        if (taggedUsers && Array.isArray(taggedUsers) && taggedUsers.length > 0) {
            postData.taggedUsers = taggedUsers;
        }

        // Create the post
        // Note: Every post appears on the profile where it's posted (profileUserId)
        // When fetching posts for a user's profile, we also include posts where they are the author
        // This ensures posts appear on both the target profile and the author's profile
        const post = new Post(postData);
        await post.save();

        // Populate author and profile info
        await post.populate('authorUserId', 'firstName lastName username avatar');
        await post.populate('profileUserId', 'firstName lastName username avatar');

        return res.status(201).send({
            message: "Post created successfully",
            post
        });
    } catch (error) {
        logger.error("Create post error:", error);
        return res.status(500).send({
            message: error.message || "Failed to create post"
        });
    }
};

// Get posts for a profile
exports.getProfilePosts = async (req, res) => {
    try {
        const profileUserId = req.params.id;
        const viewerUserId = req.userId || null;

        // Check if profile user exists
        const profileUser = await User.findById(profileUserId);
        if (!profileUser) {
            return res.status(404).send({ message: "Profile user not found" });
        }

        // Check privacy settings for viewing posts
        const canView = checkPostPrivacy(profileUser, viewerUserId, profileUserId);
        if (!canView) {
            return res.status(403).send({ message: "You don't have permission to view posts on this profile" });
        }

        // Get posts that appear on this profile:
        // 1. Posts where this user is the profile owner (profileUserId)
        // 2. Posts where this user is the author (authorUserId) - their own posts
        const posts = await Post.find({
            $or: [
                { profileUserId: profileUserId },
                { authorUserId: profileUserId }
            ],
            isDeleted: false
        })
        .populate('authorUserId', 'firstName lastName username avatar')
        .populate('profileUserId', 'firstName lastName username avatar')
        .populate('likes.userId', 'firstName lastName username')
        .populate('comments.userId', 'firstName lastName username avatar')
        .sort({ createdAt: -1 })
        .limit(50);

        return res.status(200).send({
            posts
        });
    } catch (error) {
        logger.error("Get profile posts error:", error);
        return res.status(500).send({
            message: error.message || "Failed to get posts"
        });
    }
};

// Delete a post
exports.deletePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.userId;

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).send({ message: "Post not found" });
        }

        // Only author or profile owner can delete
        if (post.authorUserId.toString() !== userId && post.profileUserId.toString() !== userId) {
            return res.status(403).send({ message: "You don't have permission to delete this post" });
        }

        post.isDeleted = true;
        await post.save();

        return res.status(200).send({
            message: "Post deleted successfully"
        });
    } catch (error) {
        logger.error("Delete post error:", error);
        return res.status(500).send({
            message: error.message || "Failed to delete post"
        });
    }
};

// Vote on a poll
exports.voteOnPoll = async (req, res) => {
    try {
        const { postId } = req.params;
        const { optionIndex } = req.body;
        const userId = req.userId;

        if (!userId) {
            return res.status(401).send({ message: "Authentication required" });
        }

        if (optionIndex === undefined || optionIndex === null) {
            return res.status(400).send({ message: "Option index is required" });
        }

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).send({ message: "Post not found" });
        }

        if (!post.poll || !post.poll.options) {
            return res.status(400).send({ message: "This post does not have a poll" });
        }

        // Check if poll has ended
        if (post.poll.endsAt && new Date() > new Date(post.poll.endsAt)) {
            return res.status(400).send({ message: "This poll has ended" });
        }

        // Validate option index
        if (optionIndex < 0 || optionIndex >= post.poll.options.length) {
            return res.status(400).send({ message: "Invalid option index" });
        }

        // Note: Voting is allowed for all authenticated users regardless of replySettings
        // The replySettings only controls who can comment/reply, not who can vote on polls
        
        // Check if user already voted - remove their previous vote if exists
        const existingVoteIndex = post.poll.votes.findIndex(
            vote => {
                const voteUserId = vote.userId?._id?.toString() || vote.userId?.toString();
                return voteUserId === userId.toString();
            }
        );

        if (existingVoteIndex !== -1) {
            // Update existing vote
            post.poll.votes[existingVoteIndex].optionIndex = optionIndex;
            post.poll.votes[existingVoteIndex].votedAt = new Date();
        } else {
            // Add new vote
            post.poll.votes.push({
                userId: userId,
                optionIndex: optionIndex,
                votedAt: new Date()
            });
        }

        await post.save();

        // Populate author info and poll votes
        await post.populate('authorUserId', 'firstName lastName username avatar');
        await post.populate('poll.votes.userId', 'firstName lastName username');

        return res.status(200).send({
            message: "Vote recorded successfully",
            post
        });
    } catch (error) {
        logger.error("Vote on poll error:", error);
        return res.status(500).send({
            message: error.message || "Failed to vote on poll"
        });
    }
};

// Upload post media (images/videos)
exports.uploadPostMedia = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).send({ message: "Media files are required" });
        }

        const mediaUrls = req.files.map(file => `/uploads/posts/${file.filename}`);
        const images = [];
        const videos = [];

        req.files.forEach((file, index) => {
            const url = mediaUrls[index];
            if (file.mimetype.startsWith('image/')) {
                images.push(url);
            } else if (file.mimetype.startsWith('video/')) {
                videos.push(url);
            }
        });

        return res.status(200).send({
            message: "Media uploaded successfully",
            images,
            videos,
            mediaUrls
        });
    } catch (error) {
        logger.error("Upload post media error:", error);
        return res.status(500).send({
            message: error.message || "Failed to upload media"
        });
    }
};

// Helper function to check post privacy
function checkPostPrivacy(profileUser, viewerUserId, profileUserId) {
    const postPrivacy = profileUser.privacySettings?.posts || 'public';

    // Profile owner can always post/view
    if (viewerUserId && viewerUserId.toString() === profileUserId.toString()) {
        return true;
    }

    switch (postPrivacy) {
        case 'public':
            return true;
        case 'contacts_only':
            // Check if viewer is a contact (would need Contact model check)
            // For now, allow authenticated users
            return viewerUserId !== null;
        case 'contacts_of_contacts':
            // More complex logic needed
            return viewerUserId !== null;
        case 'private':
            return false;
        default:
            return true;
    }
}

