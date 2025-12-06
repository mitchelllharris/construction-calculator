const { apiLimiter, contactLimiter } = require("../middlewares/rateLimiter");
const { body, param } = require("express-validator");
const { handleValidationErrors } = require("../middlewares/validator");
const controller = require("../controllers/contactform.controller");
const checkAdmin = require("../middlewares/checkAdmin");
const mongoose = require('mongoose');

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

    // Submit contact form (public endpoint with rate limiting)
    app.post(
        "/api/contact-form",
        contactLimiter, // Rate limiting for contact form
        [
            body('name')
                .trim()
                .notEmpty()
                .withMessage('Name is required')
                .isLength({ min: 2, max: 100 })
                .withMessage('Name must be between 2 and 100 characters'),
            body('email')
                .trim()
                .notEmpty()
                .withMessage('Email is required')
                .isEmail()
                .withMessage('Please provide a valid email address')
                .custom(validateEmailStrict)
                .withMessage('Email must have a valid domain extension (e.g., .com, .org, .net)')
                .normalizeEmail(),
            body('subject')
                .trim()
                .notEmpty()
                .withMessage('Subject is required')
                .isLength({ min: 3, max: 200 })
                .withMessage('Subject must be between 3 and 200 characters'),
            body('message')
                .trim()
                .notEmpty()
                .withMessage('Message is required')
                .isLength({ min: 10, max: 5000 })
                .withMessage('Message must be between 10 and 5000 characters'),
            handleValidationErrors
        ],
        controller.submitContact
    );

    // Get all contact form submissions (admin only)
    app.get(
        "/api/admin/contact-forms",
        apiLimiter,
        checkAdmin,
        controller.getAllContacts
    );

    // Get contact form by ID (admin only)
    app.get(
        "/api/admin/contact-forms/:id",
        apiLimiter,
        checkAdmin,
        [
            param('id')
                .custom(value => mongoose.Types.ObjectId.isValid(value))
                .withMessage('Invalid contact form ID format'),
            handleValidationErrors
        ],
        controller.getContactFormById
    );

    // Update contact form status (admin only)
    app.put(
        "/api/admin/contact-forms/:id/status",
        apiLimiter,
        checkAdmin,
        [
            param('id')
                .custom(value => mongoose.Types.ObjectId.isValid(value))
                .withMessage('Invalid contact form ID format'),
            body('status')
                .isIn(['new', 'read', 'replied', 'archived'])
                .withMessage('Status must be one of: new, read, replied, archived'),
            handleValidationErrors
        ],
        controller.updateContactFormStatus
    );

    // Delete contact form (admin only)
    app.delete(
        "/api/admin/contact-forms/:id",
        apiLimiter,
        checkAdmin,
        [
            param('id')
                .custom(value => mongoose.Types.ObjectId.isValid(value))
                .withMessage('Invalid contact form ID format'),
            handleValidationErrors
        ],
        controller.deleteContactForm
    );
};

