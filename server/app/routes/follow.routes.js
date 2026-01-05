const { authJwt } = require("../middlewares");
const { apiLimiter } = require("../middlewares/rateLimiter");
const { param } = require("express-validator");
const { handleValidationErrors } = require("../middlewares/validator");
const controller = require("../controllers/follow.controller");

module.exports = function(app) {
    app.use(function(req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "x-access-token, Origin, Content-Type, Accept"
        );
        next();
    });

    // Follow a user (or send follow request)
    app.post(
        "/api/follow/:userId",
        apiLimiter,
        [authJwt.verifyToken],
        [
            param('userId')
                .isMongoId()
                .withMessage('User ID must be a valid MongoDB ID'),
            handleValidationErrors
        ],
        controller.followUser
    );

    // Unfollow a user
    app.delete(
        "/api/follow/:userId",
        apiLimiter,
        [authJwt.verifyToken],
        [
            param('userId')
                .isMongoId()
                .withMessage('User ID must be a valid MongoDB ID'),
            handleValidationErrors
        ],
        controller.unfollowUser
    );

    // Accept a follow request
    app.post(
        "/api/follow/:followId/accept",
        apiLimiter,
        [authJwt.verifyToken],
        [
            param('followId')
                .isMongoId()
                .withMessage('Follow ID must be a valid MongoDB ID'),
            handleValidationErrors
        ],
        controller.acceptFollowRequest
    );

    // Reject a follow request
    app.post(
        "/api/follow/:followId/reject",
        apiLimiter,
        [authJwt.verifyToken],
        [
            param('followId')
                .isMongoId()
                .withMessage('Follow ID must be a valid MongoDB ID'),
            handleValidationErrors
        ],
        controller.rejectFollowRequest
    );

    // Get follow status with a specific user
    app.get(
        "/api/follow/status/:userId",
        [authJwt.verifyToken],
        [
            param('userId')
                .isMongoId()
                .withMessage('User ID must be a valid MongoDB ID'),
            handleValidationErrors
        ],
        controller.getFollowStatus
    );

    // Get pending follow requests (received)
    app.get(
        "/api/follow/pending",
        [authJwt.verifyToken],
        controller.getPendingFollowRequests
    );

    // Get followers count
    app.get(
        "/api/follow/:userId/followers/count",
        [authJwt.verifyToken],
        [
            param('userId')
                .isMongoId()
                .withMessage('User ID must be a valid MongoDB ID'),
            handleValidationErrors
        ],
        controller.getFollowersCount
    );

    // Get following count
    app.get(
        "/api/follow/:userId/following/count",
        [authJwt.verifyToken],
        [
            param('userId')
                .isMongoId()
                .withMessage('User ID must be a valid MongoDB ID'),
            handleValidationErrors
        ],
        controller.getFollowingCount
    );

    // Get list of users I am following
    app.get(
        "/api/follow/following",
        [authJwt.verifyToken],
        controller.getFollowing
    );

    // Get list of followers
    app.get(
        "/api/follow/followers",
        [authJwt.verifyToken],
        controller.getFollowers
    );
};
