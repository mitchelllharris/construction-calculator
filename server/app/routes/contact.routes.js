const { authJwt } = require("../middlewares");
const { apiLimiter } = require("../middlewares/rateLimiter");
const { body } = require("express-validator");
const { handleValidationErrors } = require("../middlewares/validator");
const controller = require("../controllers/contact.controller");

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

    // Create a new contact
    app.post(
        "/api/contacts",
        apiLimiter,
        [authJwt.verifyToken],
        [
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
            body('email')
                .notEmpty()
                .withMessage('Email is required')
                .trim()
                .isEmail()
                .withMessage('Please provide a valid email address')
                .custom(validateEmailStrict)
                .withMessage('Email must have a valid domain extension (e.g., .com, .org, .net)')
                .normalizeEmail(),
            body('phone')
                .optional()
                .trim()
                .isLength({ max: 20 })
                .withMessage('Phone number must be less than 20 characters'),
            body('type')
                .optional()
                .isIn(['client', 'business', 'supplier', 'contractor'])
                .withMessage('Type must be one of: client, business, supplier, contractor'),
            body('address')
                .optional()
                .trim()
                .isLength({ max: 200 })
                .withMessage('Address must be less than 200 characters'),
            body('city')
                .optional()
                .trim()
                .isLength({ max: 50 })
                .withMessage('City must be less than 50 characters'),
            body('state')
                .optional()
                .trim()
                .isLength({ max: 50 })
                .withMessage('State must be less than 50 characters'),
            body('zip')
                .optional()
                .trim()
                .isLength({ max: 10 })
                .withMessage('Zip code must be less than 10 characters'),
            body('country')
                .optional()
                .trim()
                .isLength({ max: 50 })
                .withMessage('Country must be less than 50 characters'),
            body('notes')
                .optional()
                .trim()
                .isLength({ max: 1000 })
                .withMessage('Notes must be less than 1000 characters'),
            handleValidationErrors
        ],
        controller.createContact
    );

    // Get all contacts for the authenticated user
    app.get(
        "/api/contacts",
        [authJwt.verifyToken],
        controller.getAllContacts
    );

    // Export contacts to CSV (must be before /:id route)
    app.get(
        "/api/contacts/export",
        [authJwt.verifyToken],
        controller.exportContactsToCSV
    );

    // Import contacts from CSV (must be before /:id route)
    app.post(
        "/api/contacts/import",
        apiLimiter,
        [authJwt.verifyToken],
        require("../middlewares/upload").uploadCSV,
        controller.importContactsFromCSV
    );

    // Bulk delete contacts (must be before /:id route)
    app.post(
        "/api/contacts/bulk-delete",
        apiLimiter,
        [authJwt.verifyToken],
        [
            body('contactIds')
                .isArray()
                .withMessage('Contact IDs must be an array')
                .notEmpty()
                .withMessage('At least one contact ID is required'),
            body('contactIds.*')
                .isMongoId()
                .withMessage('Each contact ID must be a valid MongoDB ID'),
            handleValidationErrors
        ],
        controller.bulkDeleteContacts
    );

    // Upload avatar for a contact (must be before /:id route)
    app.post(
        "/api/contacts/upload-avatar/:id",
        apiLimiter,
        [authJwt.verifyToken],
        require("../middlewares/upload").uploadAvatar,
        controller.uploadAvatar
    );

    // Get a single contact by ID
    app.get(
        "/api/contacts/:id",
        [authJwt.verifyToken],
        controller.getContactById
    );

    // Update a contact
    app.put(
        "/api/contacts/:id",
        apiLimiter,
        [authJwt.verifyToken],
        [
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
            body('email')
                .notEmpty()
                .withMessage('Email is required')
                .trim()
                .isEmail()
                .withMessage('Please provide a valid email address')
                .custom(validateEmailStrict)
                .withMessage('Email must have a valid domain extension (e.g., .com, .org, .net)')
                .normalizeEmail(),
            body('phone')
                .optional()
                .trim()
                .isLength({ max: 20 })
                .withMessage('Phone number must be less than 20 characters'),
            body('type')
                .optional()
                .isIn(['client', 'business', 'supplier', 'contractor'])
                .withMessage('Type must be one of: client, business, supplier, contractor'),
            body('address')
                .optional()
                .trim()
                .isLength({ max: 200 })
                .withMessage('Address must be less than 200 characters'),
            body('city')
                .optional()
                .trim()
                .isLength({ max: 50 })
                .withMessage('City must be less than 50 characters'),
            body('state')
                .optional()
                .trim()
                .isLength({ max: 50 })
                .withMessage('State must be less than 50 characters'),
            body('zip')
                .optional()
                .trim()
                .isLength({ max: 10 })
                .withMessage('Zip code must be less than 10 characters'),
            body('country')
                .optional()
                .trim()
                .isLength({ max: 50 })
                .withMessage('Country must be less than 50 characters'),
            body('notes')
                .optional()
                .trim()
                .isLength({ max: 1000 })
                .withMessage('Notes must be less than 1000 characters'),
            handleValidationErrors
        ],
        controller.updateContact
    );

    // Delete a contact
    app.delete(
        "/api/contacts/:id",
        apiLimiter,
        [authJwt.verifyToken],
        controller.deleteContact
    );
};

