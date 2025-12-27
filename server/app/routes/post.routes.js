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
};

