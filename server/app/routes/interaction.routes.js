const { authJwt } = require("../middlewares");
const { apiLimiter } = require("../middlewares/rateLimiter");
const { body } = require("express-validator");
const { handleValidationErrors } = require("../middlewares/validator");
const controller = require("../controllers/interaction.controller");

module.exports = function(app) {
    app.use(function(req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "x-access-token, Origin, Content-Type, Accept"
        );
        next();
    });

    // Get all interactions for a contact
    app.get(
        "/api/contacts/:contactId/interactions",
        apiLimiter,
        [authJwt.verifyToken],
        controller.getContactInteractions
    );

    // Get a single interaction
    app.get(
        "/api/interactions/:id",
        apiLimiter,
        [authJwt.verifyToken],
        controller.getInteractionById
    );

    // Create a new interaction
    app.post(
        "/api/interactions",
        apiLimiter,
        [authJwt.verifyToken],
        [
            body('contactId')
                .notEmpty()
                .withMessage('Contact ID is required')
                .isMongoId()
                .withMessage('Invalid contact ID'),
            body('type')
                .notEmpty()
                .withMessage('Interaction type is required')
                .isIn(['call', 'email', 'meeting', 'note', 'task'])
                .withMessage('Invalid interaction type'),
            body('direction')
                .optional()
                .isIn(['inbound', 'outbound'])
                .withMessage('Direction must be inbound or outbound'),
            body('subject')
                .optional()
                .trim()
                .isLength({ max: 200 })
                .withMessage('Subject must be less than 200 characters'),
            body('description')
                .optional()
                .trim()
                .isLength({ max: 5000 })
                .withMessage('Description must be less than 5000 characters'),
            body('duration')
                .optional()
                .isInt({ min: 0 })
                .withMessage('Duration must be a positive number'),
            body('date')
                .optional()
                .isISO8601()
                .withMessage('Date must be a valid ISO 8601 date'),
            body('status')
                .optional()
                .isIn(['completed', 'scheduled', 'pending', 'cancelled'])
                .withMessage('Invalid status'),
            handleValidationErrors
        ],
        controller.createInteraction
    );

    // Update an interaction
    app.put(
        "/api/interactions/:id",
        apiLimiter,
        [authJwt.verifyToken],
        [
            body('type')
                .optional()
                .isIn(['call', 'email', 'meeting', 'note', 'task'])
                .withMessage('Invalid interaction type'),
            body('direction')
                .optional()
                .isIn(['inbound', 'outbound'])
                .withMessage('Direction must be inbound or outbound'),
            body('subject')
                .optional()
                .trim()
                .isLength({ max: 200 })
                .withMessage('Subject must be less than 200 characters'),
            body('description')
                .optional()
                .trim()
                .isLength({ max: 5000 })
                .withMessage('Description must be less than 5000 characters'),
            body('duration')
                .optional()
                .isInt({ min: 0 })
                .withMessage('Duration must be a positive number'),
            body('date')
                .optional()
                .isISO8601()
                .withMessage('Date must be a valid ISO 8601 date'),
            body('status')
                .optional()
                .isIn(['completed', 'scheduled', 'pending', 'cancelled'])
                .withMessage('Invalid status'),
            handleValidationErrors
        ],
        controller.updateInteraction
    );

    // Delete an interaction
    app.delete(
        "/api/interactions/:id",
        apiLimiter,
        [authJwt.verifyToken],
        controller.deleteInteraction
    );
};

