const { authJwt } = require("../middlewares");
const { apiLimiter } = require("../middlewares/rateLimiter");
const { body, param } = require("express-validator");
const { handleValidationErrors } = require("../middlewares/validator");
const controller = require("../controllers/connection.controller");
const suggestedController = require("../controllers/suggestedConnections.controller");

module.exports = function(app) {
    app.use(function(req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "x-access-token, Origin, Content-Type, Accept"
        );
        next();
    });

    // Send a connection request
    app.post(
        "/api/connections/request",
        apiLimiter,
        [authJwt.verifyToken],
        [
            body('recipientId')
                .notEmpty()
                .withMessage('Recipient ID is required')
                .isMongoId()
                .withMessage('Recipient ID must be a valid MongoDB ID'),
            handleValidationErrors
        ],
        controller.sendConnectionRequest
    );

    // Accept a connection request
    app.post(
        "/api/connections/:connectionId/accept",
        apiLimiter,
        [authJwt.verifyToken],
        [
            param('connectionId')
                .isMongoId()
                .withMessage('Connection ID must be a valid MongoDB ID'),
            handleValidationErrors
        ],
        controller.acceptConnectionRequest
    );

    // Reject a connection request
    app.post(
        "/api/connections/:connectionId/reject",
        apiLimiter,
        [authJwt.verifyToken],
        [
            param('connectionId')
                .isMongoId()
                .withMessage('Connection ID must be a valid MongoDB ID'),
            handleValidationErrors
        ],
        controller.rejectConnectionRequest
    );

    // Get connection status with a specific user
    app.get(
        "/api/connections/status/:userId",
        [authJwt.verifyToken],
        [
            param('userId')
                .isMongoId()
                .withMessage('User ID must be a valid MongoDB ID'),
            handleValidationErrors
        ],
        controller.getConnectionStatus
    );

    // Get all connections for the current user
    app.get(
        "/api/connections",
        [authJwt.verifyToken],
        controller.getConnections
    );

    // Get pending connection requests (received)
    app.get(
        "/api/connections/pending",
        [authJwt.verifyToken],
        controller.getPendingRequests
    );

    // Remove/Delete a connection
    app.delete(
        "/api/connections/:connectionId",
        apiLimiter,
        [authJwt.verifyToken],
        [
            param('connectionId')
                .isMongoId()
                .withMessage('Connection ID must be a valid MongoDB ID'),
            handleValidationErrors
        ],
        controller.removeConnection
    );

    // Follow a connection
    app.post(
        "/api/connections/:connectionId/follow",
        apiLimiter,
        [authJwt.verifyToken],
        [
            param('connectionId')
                .isMongoId()
                .withMessage('Connection ID must be a valid MongoDB ID'),
            handleValidationErrors
        ],
        controller.followConnection
    );

    // Unfollow a connection
    app.post(
        "/api/connections/:connectionId/unfollow",
        apiLimiter,
        [authJwt.verifyToken],
        [
            param('connectionId')
                .isMongoId()
                .withMessage('Connection ID must be a valid MongoDB ID'),
            handleValidationErrors
        ],
        controller.unfollowConnection
    );

    // Block a user
    app.post(
        "/api/connections/block/:userId",
        apiLimiter,
        [authJwt.verifyToken],
        [
            param('userId')
                .isMongoId()
                .withMessage('User ID must be a valid MongoDB ID'),
            handleValidationErrors
        ],
        controller.blockUser
    );

    // Unblock a user
    app.post(
        "/api/connections/unblock/:userId",
        apiLimiter,
        [authJwt.verifyToken],
        [
            param('userId')
                .isMongoId()
                .withMessage('User ID must be a valid MongoDB ID'),
            handleValidationErrors
        ],
        controller.unblockUser
    );

    // Get block status with a specific user
    app.get(
        "/api/connections/block-status/:userId",
        [authJwt.verifyToken],
        [
            param('userId')
                .isMongoId()
                .withMessage('User ID must be a valid MongoDB ID'),
            handleValidationErrors
        ],
        controller.getBlockStatus
    );

    // Get list of blocked users
    app.get(
        "/api/connections/blocked",
        [authJwt.verifyToken],
        controller.getBlockedUsers
    );

    // Get suggested connections
    app.get(
        "/api/connections/suggested",
        [authJwt.verifyToken],
        suggestedController.getSuggestedConnections
    );
};
