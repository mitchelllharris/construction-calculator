const { authJwt } = require("../middlewares");
const { apiLimiter } = require("../middlewares/rateLimiter");
const { body } = require("express-validator");
const { handleValidationErrors } = require("../middlewares/validator");
const controller = require("../controllers/profile.controller");

// Custom email validator that requires TLD with at least 3 characters
const validateEmailStrict = (value) => {
    if (!value) return false;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{3,}$/;
    return emailRegex.test(value.trim());
};

module.exports = function(app) {
    app.use(function(req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "x-access-token, Origin, Content-Type, Accept"
        );
        next();
    });

    // Get profile
    app.get(
        "/api/user/profile",
        [authJwt.verifyToken],
        controller.getProfile
    );

    // Update profile
    app.put(
        "/api/user/profile",
        apiLimiter, // Rate limiting
        [authJwt.verifyToken],
        [
            body('username')
                .optional()
                .trim()
                .isLength({ min: 3, max: 30 })
                .withMessage('Username must be between 3 and 30 characters')
                .matches(/^[a-zA-Z0-9_]+$/)
                .withMessage('Username can only contain letters, numbers, and underscores'),
            body('email')
                .optional()
                .trim()
                .isEmail()
                .withMessage('Please provide a valid email address')
                .custom(validateEmailStrict)
                .withMessage('Email must have a valid domain extension (e.g., .com, .org, .net)')
                .normalizeEmail(),
            body('firstName')
                .notEmpty()
                .withMessage('First name is required')
                .trim()
                .isLength({ min: 1, max: 50 })
                .withMessage('First name must be between 1 and 50 characters'),
            body('lastName')
                .notEmpty()
                .withMessage('Last name is required')
                .trim()
                .isLength({ min: 1, max: 50 })
                .withMessage('Last name must be between 1 and 50 characters'),
            handleValidationErrors
        ],
        controller.updateProfile
    );

    // Change password
    app.put(
        "/api/user/change-password",
        apiLimiter, // Rate limiting
        [authJwt.verifyToken],
        [
            body('currentPassword')
                .notEmpty()
                .withMessage('Current password is required'),
            body('newPassword')
                .isLength({ min: 8 })
                .withMessage('New password must be at least 8 characters long')
                .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
                .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'),
            handleValidationErrors
        ],
        controller.changePassword
    );

    // Get verification status
    app.get(
        "/api/user/verification-status",
        [authJwt.verifyToken],
        controller.getVerificationStatus
    );
};

