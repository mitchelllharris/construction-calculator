const db = require('../models');
const Post = db.post;
const User = db.user;
const logger = require('../utils/logger');

// Create a new post
exports.createPost = async (req, res) => {
    try {
        const { profileUserId, content, images, videos } = req.body;
        const authorUserId = req.userId;

        // Validate required fields
        if (!profileUserId) {
            return res.status(400).send({ message: "Profile user ID is required" });
        }

        // At least one of content, images, or videos must be provided
        const hasContent = content && content.trim();
        const hasImages = images && Array.isArray(images) && images.length > 0;
        const hasVideos = videos && Array.isArray(videos) && videos.length > 0;

        if (!hasContent && !hasImages && !hasVideos) {
            return res.status(400).send({ message: "Post must contain at least text, images, or videos" });
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
        const post = new Post({
            profileUserId,
            authorUserId,
            content: hasContent ? content.trim() : '',
            images: images || [],
            videos: videos || []
        });

        await post.save();

        // Populate author info
        await post.populate('authorUserId', 'firstName lastName username avatar');

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

        // Get posts
        const posts = await Post.find({
            profileUserId,
            isDeleted: false
        })
        .populate('authorUserId', 'firstName lastName username avatar')
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

