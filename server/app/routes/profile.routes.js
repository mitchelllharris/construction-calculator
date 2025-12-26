const { authJwt } = require("../middlewares");
const { apiLimiter } = require("../middlewares/rateLimiter");
const { body } = require("express-validator");
const { handleValidationErrors } = require("../middlewares/validator");
const { uploadAvatar, uploadPortfolioImage, uploadCertificationPDF } = require("../middlewares/upload");
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

    // Get public profile by username or ID (optional auth for privacy checks)
    app.get(
        "/api/profile/:username",
        [authJwt.verifyTokenOptional], // Optional auth - won't fail if no token
        controller.getPublicProfile
    );
    app.get(
        "/api/profile/id/:id",
        [authJwt.verifyTokenOptional], // Optional auth - won't fail if no token
        controller.getPublicProfile
    );

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
                .optional()
                .trim()
                .isLength({ min: 1, max: 50 })
                .withMessage('First name must be between 1 and 50 characters'),
            body('lastName')
                .optional()
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

    // Upload portfolio image
    app.post(
        "/api/user/portfolio/upload-image",
        apiLimiter,
        [authJwt.verifyToken],
        uploadPortfolioImage,
        controller.uploadPortfolioImage
    );

    // Upload certification PDF
    app.post(
        "/api/user/certifications/upload-pdf",
        apiLimiter,
        [authJwt.verifyToken],
        uploadCertificationPDF,
        controller.uploadCertificationPDF
    );

    // Upload user avatar
    app.post(
        "/api/user/avatar",
        apiLimiter,
        [authJwt.verifyToken],
        uploadAvatar,
        controller.uploadAvatar
    );

    // Get verification status
    app.get(
        "/api/user/verification-status",
        [authJwt.verifyToken],
        controller.getVerificationStatus
    );
};

