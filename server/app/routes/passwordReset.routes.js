const { forgotPasswordLimiter } = require("../middlewares/rateLimiter");
const { body } = require("express-validator");
const { handleValidationErrors } = require("../middlewares/validator");
const controller = require("../controllers/passwordReset.controller");

// Custom email validator that requires TLD with at least 3 characters
const validateEmailStrict = (value) => {
    if (!value) return false;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{3,}$/;
    return emailRegex.test(value.trim());
};

module.exports = function(app) {
    // Forgot password endpoint
    app.post(
        "/api/auth/forgot-password",
        forgotPasswordLimiter, // Rate limiting
        [
            body('email')
                .trim()
                .isEmail()
                .withMessage('Please provide a valid email address')
                .custom(validateEmailStrict)
                .withMessage('Email must have a valid domain extension (e.g., .com, .org, .net)')
                .normalizeEmail(),
            handleValidationErrors
        ],
        controller.forgotPassword
    );

    // Reset password endpoint
    app.post(
        "/api/auth/reset-password",
        [
            body('token')
                .notEmpty()
                .withMessage('Reset token is required'),
            body('password')
                .isLength({ min: 8 })
                .withMessage('Password must be at least 8 characters long')
                .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
                .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'),
            handleValidationErrors
        ],
        controller.resetPassword
    );
};

