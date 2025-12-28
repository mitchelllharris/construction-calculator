const db = require('../models');
const Post = db.post;
const User = db.user;
const logger = require('../utils/logger');

// Helper function to build comment tree from flat posts
async function buildCommentTree(posts, parentId = null) {
    const children = posts.filter(p => {
        if (parentId === null) {
            return !p.parentPostId && !p.parentCommentId;
        }
        return (p.parentPostId && p.parentPostId.toString() === parentId.toString()) ||
               (p.parentCommentId && p.parentCommentId.toString() === parentId.toString());
    });

    return await Promise.all(children.map(async (post) => {
        const replies = await buildCommentTree(posts, post._id);
        return {
            ...post.toObject(),
            replies
        };
    }));
}

// Helper function to format post for frontend (maintains compatibility)
function formatPostWithComments(post, comments) {
    const postObj = post.toObject ? post.toObject() : post;
    const formatComment = (comment) => ({
        _id: comment._id,
        userId: comment.authorUserId,
        authorUserId: comment.authorUserId,
        content: comment.content,
        commentedAt: comment.createdAt,
        createdAt: comment.createdAt,
        likes: comment.likes || [],
        reactions: comment.likes || [],
        replies: (comment.replies || []).map(formatComment)
    });
    postObj.comments = comments.map(formatComment);
    return postObj;
}

// Create a new post
exports.createPost = async (req, res) => {
    try {
        const { profileUserId, content, images, videos, replySettings, poll, location, taggedUsers, parentPostId, parentCommentId } = req.body;
        const authorUserId = req.userId;

        // Validate required fields
        if (!profileUserId) {
            return res.status(400).send({ message: "Profile user ID is required" });
        }

        // If this is a comment/reply, content is required
        if (parentPostId || parentCommentId) {
            if (!content || !content.trim()) {
                return res.status(400).send({ message: "Comment/Reply content is required" });
            }
        } else {
            // For top-level posts, at least one of content, images, videos, or poll must be provided
            const hasContent = content && content.trim();
            const hasImages = images && Array.isArray(images) && images.length > 0;
            const hasVideos = videos && Array.isArray(videos) && videos.length > 0;
            const hasPoll = poll && poll.options && Array.isArray(poll.options) && poll.options.length >= 2;

            if (!hasContent && !hasImages && !hasVideos && !hasPoll) {
                return res.status(400).send({ message: "Post must contain at least text, images, videos, or a poll" });
            }
        }

        // Check if profile user exists
        const profileUser = await User.findById(profileUserId);
        if (!profileUser) {
            return res.status(404).send({ message: "Profile user not found" });
        }

        // For comments/replies, inherit profileUserId from parent post
        let finalProfileUserId = profileUserId;
        if (parentPostId) {
            const parentPost = await Post.findById(parentPostId);
            if (!parentPost) {
                return res.status(404).send({ message: "Parent post not found" });
            }
            finalProfileUserId = parentPost.profileUserId;
        } else if (parentCommentId) {
            const parentComment = await Post.findById(parentCommentId);
            if (!parentComment) {
                return res.status(404).send({ message: "Parent comment not found" });
            }
            // Find root post
            let rootPost = parentComment;
            while (rootPost.parentPostId || rootPost.parentCommentId) {
                rootPost = await Post.findById(rootPost.parentPostId || rootPost.parentCommentId);
                if (!rootPost) break;
            }
            if (rootPost) {
                finalProfileUserId = rootPost.profileUserId;
            }
        }

        // Check privacy settings for posting
        const canPost = checkPostPrivacy(profileUser, authorUserId, finalProfileUserId);
        if (!canPost) {
            return res.status(403).send({ message: "You don't have permission to post on this profile" });
        }

        // Create post
        const postData = {
            profileUserId: finalProfileUserId,
            authorUserId,
            content: content ? content.trim() : '',
            images: images || [],
            videos: videos || [],
            parentPostId: parentPostId || null,
            parentCommentId: parentCommentId || null
        };

        // Only top-level posts can have replySettings, poll, location, taggedUsers
        if (!parentPostId && !parentCommentId) {
            postData.replySettings = replySettings || 'everyone';
            
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

            if (location && location.name) {
                postData.location = location;
            }

            if (taggedUsers && Array.isArray(taggedUsers) && taggedUsers.length > 0) {
                postData.taggedUsers = taggedUsers;
            }
        }

        const post = new Post(postData);
        await post.save();

        // Populate author and profile info
        await post.populate('authorUserId', 'firstName lastName username avatar');
        await post.populate('profileUserId', 'firstName lastName username avatar');
        await post.populate('parentPostId', 'authorUserId profileUserId');
        await post.populate('parentCommentId', 'authorUserId profileUserId');

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

        // Get top-level posts (no parentPostId or parentCommentId)
        const posts = await Post.find({
            $and: [
                {
                    $or: [
                        { profileUserId: profileUserId },
                        { authorUserId: profileUserId }
                    ]
                },
                {
                    $or: [
                        { parentPostId: null },
                        { parentPostId: { $exists: false } }
                    ]
                },
                {
                    $or: [
                        { parentCommentId: null },
                        { parentCommentId: { $exists: false } }
                    ]
                },
                { isDeleted: false }
            ]
        })
        .populate('authorUserId', 'firstName lastName username avatar')
        .populate('profileUserId', 'firstName lastName username avatar')
        .populate('likes.userId', 'firstName lastName username')
        .sort({ createdAt: -1 })
        .limit(50);

        // Get all comments/replies for these posts (recursively)
        const postIds = posts.map(p => p._id);
        let allCommentIds = [...postIds];
        let allComments = [];
        let depth = 0;
        const maxDepth = 10; // Prevent infinite loops
        const fetchedIds = new Set();

        while (allCommentIds.length > 0 && depth < maxDepth) {
            const comments = await Post.find({
                $or: [
                    { parentPostId: { $in: allCommentIds } },
                    { parentCommentId: { $in: allCommentIds } }
                ],
                isDeleted: false,
                _id: { $nin: Array.from(fetchedIds) }
            })
            .populate('authorUserId', 'firstName lastName username avatar')
            .populate('likes.userId', 'firstName lastName username')
            .sort({ createdAt: 1 });
            
            comments.forEach(c => fetchedIds.add(c._id));
            allComments = [...allComments, ...comments];
            allCommentIds = comments.map(c => c._id);
            depth++;
        }

        // Build comment trees for each post
        const postsWithComments = await Promise.all(posts.map(async (post) => {
            const comments = await buildCommentTree(allComments, post._id);
            return formatPostWithComments(post, comments);
        }));

        return res.status(200).send({
            posts: postsWithComments
        });
    } catch (error) {
        logger.error("Get profile posts error:", error);
        return res.status(500).send({
            message: error.message || "Failed to get posts"
        });
    }
};

// Get a single post with its full comment thread
exports.getPostWithThread = async (req, res) => {
    try {
        const postId = req.params.id;

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).send({ message: "Post not found" });
        }

        // Get all comments/replies for this post recursively
        let allComments = [];
        let allCommentIds = [postId];
        let depth = 0;
        const maxDepth = 10;

        while (allCommentIds.length > 0 && depth < maxDepth) {
            const comments = await Post.find({
                $or: [
                    { parentPostId: { $in: allCommentIds } },
                    { parentCommentId: { $in: allCommentIds } }
                ],
                isDeleted: false,
                _id: { $nin: allComments.map(c => c._id) }
            })
            .populate('authorUserId', 'firstName lastName username avatar')
            .populate('likes.userId', 'firstName lastName username')
            .sort({ createdAt: 1 });
            
            allComments = [...allComments, ...comments];
            allCommentIds = comments.map(c => c._id);
            depth++;
        }

        // Build comment tree
        const comments = await buildCommentTree(allComments, postId);

        // Populate post
        await post.populate('authorUserId', 'firstName lastName username avatar');
        await post.populate('profileUserId', 'firstName lastName username avatar');
        await post.populate('likes.userId', 'firstName lastName username');

        const postObj = formatPostWithComments(post, comments);

        return res.status(200).send({
            post: postObj
        });
    } catch (error) {
        logger.error("Get post with thread error:", error);
        return res.status(500).send({
            message: error.message || "Failed to get post"
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

// React to a post (like, love, care, haha, wow, sad, angry)
exports.reactToPost = async (req, res) => {
    try {
        const { postId } = req.params;
        const { reactionType } = req.body;
        const userId = req.userId;

        if (!userId) {
            return res.status(401).send({ message: "Authentication required" });
        }

        if (!reactionType) {
            return res.status(400).send({ message: "Reaction type is required" });
        }

        const validReactions = ['like', 'love', 'care', 'haha', 'wow', 'sad', 'angry'];
        if (!validReactions.includes(reactionType)) {
            return res.status(400).send({ message: "Invalid reaction type" });
        }

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).send({ message: "Post not found" });
        }

        // Check if user already reacted
        const existingReactionIndex = post.likes.findIndex(
            like => {
                const likeUserId = like.userId?._id?.toString() || like.userId?.toString();
                return likeUserId === userId.toString();
            }
        );

        if (existingReactionIndex !== -1) {
            // If same reaction, remove it (toggle off)
            if (post.likes[existingReactionIndex].reactionType === reactionType) {
                post.likes.splice(existingReactionIndex, 1);
            } else {
                // Update to new reaction type
                post.likes[existingReactionIndex].reactionType = reactionType;
                post.likes[existingReactionIndex].likedAt = new Date();
            }
        } else {
            // Add new reaction
            post.likes.push({
                userId: userId,
                reactionType: reactionType,
                likedAt: new Date()
            });
        }

        await post.save();

        // Populate likes with user info
        await post.populate('likes.userId', 'firstName lastName username');
        await post.populate('authorUserId', 'firstName lastName username avatar');

        return res.status(200).send({
            message: "Reaction updated successfully",
            post
        });
    } catch (error) {
        logger.error("React to post error:", error);
        return res.status(500).send({
            message: error.message || "Failed to react to post"
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

// Add a comment to a post (creates a new Post document)
exports.addComment = async (req, res) => {
    try {
        const { postId } = req.params;
        const { content } = req.body;
        const userId = req.userId;

        if (!userId) {
            return res.status(401).send({ message: "Authentication required" });
        }

        if (!content || !content.trim()) {
            return res.status(400).send({ message: "Comment content is required" });
        }

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).send({ message: "Post not found" });
        }

        // Check reply settings
        const profileUser = await User.findById(post.profileUserId);
        if (profileUser) {
            const canComment = checkReplySettings(post.replySettings, userId, post.profileUserId, post.authorUserId);
            if (!canComment) {
                return res.status(403).send({ message: "You don't have permission to comment on this post" });
            }
        }

        // Create comment as a new Post
        const comment = new Post({
            profileUserId: post.profileUserId,
            authorUserId: userId,
            content: content.trim(),
            parentPostId: postId,
            likes: []
        });

        await comment.save();

        // Populate comment user info
        await comment.populate('authorUserId', 'firstName lastName username avatar');
        await comment.populate('profileUserId', 'firstName lastName username avatar');

        // Get all comments for this post
        const allComments = await Post.find({
            $or: [
                { parentPostId: postId },
                { parentCommentId: postId }
            ],
            isDeleted: false
        })
        .populate('authorUserId', 'firstName lastName username avatar')
        .populate('likes.userId', 'firstName lastName username')
        .sort({ createdAt: 1 });

        // Recursively get all nested comments
        let allCommentIds = [postId];
        let depth = 0;
        const maxDepth = 10;
        while (allCommentIds.length > 0 && depth < maxDepth) {
            const nestedComments = await Post.find({
                $or: [
                    { parentPostId: { $in: allCommentIds } },
                    { parentCommentId: { $in: allCommentIds } }
                ],
                isDeleted: false,
                _id: { $nin: allComments.map(c => c._id) }
            })
            .populate('authorUserId', 'firstName lastName username avatar')
            .populate('likes.userId', 'firstName lastName username')
            .sort({ createdAt: 1 });
            
            allComments.push(...nestedComments);
            allCommentIds = nestedComments.map(c => c._id);
            depth++;
        }

        // Build comment tree
        const comments = await buildCommentTree(allComments, postId);
        
        // Populate post
        await post.populate('authorUserId', 'firstName lastName username avatar');
        await post.populate('profileUserId', 'firstName lastName username avatar');
        await post.populate('likes.userId', 'firstName lastName username');

        const postObj = formatPostWithComments(post, comments);

        return res.status(200).send({
            message: "Comment added successfully",
            post: postObj
        });
    } catch (error) {
        logger.error("Add comment error:", error);
        return res.status(500).send({
            message: error.message || "Failed to add comment"
        });
    }
};

// Add a reply to a comment (creates a new Post document)
exports.addReply = async (req, res) => {
    try {
        const { postId, commentId } = req.params;
        const { content } = req.body;
        const userId = req.userId;

        if (!userId) {
            return res.status(401).send({ message: "Authentication required" });
        }

        if (!content || !content.trim()) {
            return res.status(400).send({ message: "Reply content is required" });
        }

        const parentPost = await Post.findById(postId);
        if (!parentPost) {
            return res.status(404).send({ message: "Parent post not found" });
        }

        const parentComment = await Post.findById(commentId);
        if (!parentComment) {
            return res.status(404).send({ message: "Parent comment not found" });
        }

        // Verify comment belongs to post
        if (parentComment.parentPostId && parentComment.parentPostId.toString() !== postId) {
            return res.status(400).send({ message: "Comment does not belong to this post" });
        }

        // Check reply settings from root post
        const canReply = checkReplySettings(parentPost.replySettings, userId, parentPost.profileUserId, parentPost.authorUserId);
        if (!canReply) {
            return res.status(403).send({ message: "You don't have permission to reply to this comment" });
        }

        // Create reply as a new Post
        const reply = new Post({
            profileUserId: parentPost.profileUserId,
            authorUserId: userId,
            content: content.trim(),
            parentCommentId: commentId,
            likes: []
        });

        await reply.save();

        // Populate reply user info
        await reply.populate('authorUserId', 'firstName lastName username avatar');
        await reply.populate('profileUserId', 'firstName lastName username avatar');

        // Get all comments for this post
        const allComments = await Post.find({
            $or: [
                { parentPostId: postId },
                { parentCommentId: postId }
            ],
            isDeleted: false
        })
        .populate('authorUserId', 'firstName lastName username avatar')
        .populate('likes.userId', 'firstName lastName username')
        .sort({ createdAt: 1 });

        // Recursively get all nested comments
        let allCommentIds = [postId];
        let depth = 0;
        const maxDepth = 10;
        while (allCommentIds.length > 0 && depth < maxDepth) {
            const nestedComments = await Post.find({
                $or: [
                    { parentPostId: { $in: allCommentIds } },
                    { parentCommentId: { $in: allCommentIds } }
                ],
                isDeleted: false,
                _id: { $nin: allComments.map(c => c._id) }
            })
            .populate('authorUserId', 'firstName lastName username avatar')
            .populate('likes.userId', 'firstName lastName username')
            .sort({ createdAt: 1 });
            
            allComments.push(...nestedComments);
            allCommentIds = nestedComments.map(c => c._id);
            depth++;
        }

        // Build comment tree
        const comments = await buildCommentTree(allComments, postId);
        
        // Populate post
        await parentPost.populate('authorUserId', 'firstName lastName username avatar');
        await parentPost.populate('profileUserId', 'firstName lastName username avatar');
        await parentPost.populate('likes.userId', 'firstName lastName username');

        const postObj = formatPostWithComments(parentPost, comments);

        return res.status(200).send({
            message: "Reply added successfully",
            post: postObj
        });
    } catch (error) {
        logger.error("Add reply error:", error);
        return res.status(500).send({
            message: error.message || "Failed to add reply"
        });
    }
};

// React to a comment or reply (uses same reactToPost logic)
exports.reactToComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const { reactionType } = req.body;
        const userId = req.userId;

        if (!userId) {
            return res.status(401).send({ message: "Authentication required" });
        }

        if (!reactionType) {
            return res.status(400).send({ message: "Reaction type is required" });
        }

        // Use the same reactToPost logic since comments/replies are now Posts
        return exports.reactToPost({ params: { postId: commentId }, body: { reactionType }, userId }, res);
    } catch (error) {
        logger.error("React to comment error:", error);
        return res.status(500).send({
            message: error.message || "Failed to react to comment"
        });
    }
};

// Helper function to check reply settings
function checkReplySettings(replySettings, userId, profileUserId, authorUserId) {
    if (!userId) return false;

    // Profile owner and author can always reply
    if (userId.toString() === profileUserId.toString() || userId.toString() === authorUserId.toString()) {
        return true;
    }

    switch (replySettings) {
        case 'everyone':
            return true;
        case 'following':
            return true; // Simplified for now
        case 'verified':
            return true; // Simplified for now
        case 'mentioned':
            return true; // Simplified for now
        case 'contacts_only':
            return true; // Simplified for now
        case 'contacts_of_contacts':
            return true; // Simplified for now
        case 'page_owner':
            return userId.toString() === profileUserId.toString();
        default:
            return true;
    }
}

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
            return viewerUserId !== null;
        case 'contacts_of_contacts':
            return viewerUserId !== null;
        case 'private':
            return false;
        default:
            return true;
    }
}
