const { authJwt } = require("../middlewares");
const controller = require("../controllers/post.controller");
const { apiLimiter } = require("../middlewares/rateLimiter");
const { uploadPostMedia } = require("../middlewares/upload");

module.exports = function(app) {
    // Create a post
    app.post(
        "/api/posts",
        apiLimiter,
        [authJwt.verifyToken],
        controller.createPost
    );

    // Get posts for a profile
    app.get(
        "/api/profile/:id/posts",
        [authJwt.verifyTokenOptional],
        controller.getProfilePosts
    );

    // Delete a post
    app.delete(
        "/api/posts/:id",
        apiLimiter,
        [authJwt.verifyToken],
        controller.deletePost
    );

    // Upload post media (images/videos)
    app.post(
        "/api/posts/upload-media",
        apiLimiter,
        [authJwt.verifyToken],
        uploadPostMedia,
        controller.uploadPostMedia
    );

    // React to a post
    app.post(
        "/api/posts/:postId/react",
        apiLimiter,
        [authJwt.verifyToken],
        controller.reactToPost
    );

    // Vote on a poll
    app.post(
        "/api/posts/:postId/vote",
        apiLimiter,
        [authJwt.verifyToken],
        controller.voteOnPoll
    );

    // Get a post with its full comment thread
    app.get(
        "/api/posts/:id/thread",
        [authJwt.verifyTokenOptional],
        controller.getPostWithThread
    );

    // Add a comment to a post
    app.post(
        "/api/posts/:postId/comments",
        apiLimiter,
        [authJwt.verifyToken],
        controller.addComment
    );

    // Add a reply to a comment
    app.post(
        "/api/posts/:postId/comments/:commentId/replies",
        apiLimiter,
        [authJwt.verifyToken],
        controller.addReply
    );

    // React to a comment or reply (comments/replies are now Posts, so use commentId as postId)
    app.post(
        "/api/posts/:commentId/react",
        apiLimiter,
        [authJwt.verifyToken],
        controller.reactToComment
    );
};

