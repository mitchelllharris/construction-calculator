const { resendVerificationLimiter } = require("../middlewares/rateLimiter");
const { body } = require("express-validator");
const { handleValidationErrors } = require("../middlewares/validator");
const controller = require("../controllers/verification.controller");

// Custom email validator that requires TLD with at least 3 characters
const validateEmailStrict = (value) => {
    if (!value) return false;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{3,}$/;
    return emailRegex.test(value.trim());
};

module.exports = function(app) {
    // Verify email endpoint
    app.post(
        "/api/auth/verify-email",
        [
            body('token')
                .notEmpty()
                .withMessage('Verification token is required'),
            handleValidationErrors
        ],
        controller.verifyEmail
    );

    // Resend verification email endpoint
    app.post(
        "/api/auth/resend-verification",
        resendVerificationLimiter, // Rate limiting
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
        controller.resendVerification
    );
};

