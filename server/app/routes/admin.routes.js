const checkAdmin = require("../middlewares/checkAdmin");
const { apiLimiter } = require("../middlewares/rateLimiter");
const { body } = require("express-validator");
const { handleValidationErrors } = require("../middlewares/validator");
const controller = require("../controllers/admin.controller");

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

    // Get all users with pagination and filtering
    app.get(
        "/api/admin/users",
        apiLimiter,
        checkAdmin,
        controller.getAllUsers
    );

    // Get user statistics
    app.get(
        "/api/admin/stats",
        apiLimiter,
        checkAdmin,
        controller.getUserStats
    );

    // Get user by ID
    app.get(
        "/api/admin/users/:id",
        apiLimiter,
        checkAdmin,
        controller.getUserById
    );

    // Update user
    app.put(
        "/api/admin/users/:id",
        apiLimiter,
        checkAdmin,
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
                .isLength({ max: 50 })
                .withMessage('First name must be less than 50 characters'),
            body('lastName')
                .optional()
                .trim()
                .isLength({ max: 50 })
                .withMessage('Last name must be less than 50 characters'),
            handleValidationErrors
        ],
        controller.updateUser
    );

    // Assign roles to user
    app.put(
        "/api/admin/users/:id/role",
        apiLimiter,
        checkAdmin,
        [
            body('roles')
                .isArray()
                .withMessage('Roles must be an array')
                .notEmpty()
                .withMessage('At least one role is required'),
            body('roles.*')
                .isIn(['user', 'moderator', 'admin'])
                .withMessage('Invalid role name'),
            handleValidationErrors
        ],
        controller.assignRole
    );

    // Delete user
    app.delete(
        "/api/admin/users/:id",
        apiLimiter,
        checkAdmin,
        controller.deleteUser
    );

    // Manually verify user email
    app.post(
        "/api/admin/users/:id/verify-email",
        apiLimiter,
        checkAdmin,
        controller.verifyUserEmail
    );
};

