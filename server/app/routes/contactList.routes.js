const { authJwt } = require("../middlewares");
const { apiLimiter } = require("../middlewares/rateLimiter");
const { body } = require("express-validator");
const { handleValidationErrors } = require("../middlewares/validator");
const controller = require("../controllers/contactList.controller");

module.exports = function(app) {
    app.use(function(req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "x-access-token, Origin, Content-Type, Accept"
        );
        next();
    });

    // Create a new contact list
    app.post(
        "/api/contact-lists",
        apiLimiter,
        [authJwt.verifyToken],
        [
            body('name')
                .notEmpty()
                .trim()
                .isLength({ min: 1, max: 100 })
                .withMessage('List name is required and must be between 1 and 100 characters'),
            body('type')
                .isIn(['manual', 'filter'])
                .withMessage('List type must be either "manual" or "filter"'),
            body('description')
                .optional()
                .trim()
                .isLength({ max: 500 })
                .withMessage('Description must be less than 500 characters'),
            handleValidationErrors
        ],
        controller.createContactList
    );

    // Get all contact lists for the authenticated user
    app.get(
        "/api/contact-lists",
        [authJwt.verifyToken],
        controller.getAllContactLists
    );

    // Get a single contact list by ID
    app.get(
        "/api/contact-lists/:id",
        [authJwt.verifyToken],
        controller.getContactListById
    );

    // Get contacts for a contact list
    app.get(
        "/api/contact-lists/:id/contacts",
        [authJwt.verifyToken],
        controller.getContactsForList
    );

    // Update a contact list
    app.put(
        "/api/contact-lists/:id",
        apiLimiter,
        [authJwt.verifyToken],
        [
            body('name')
                .optional()
                .trim()
                .isLength({ min: 1, max: 100 })
                .withMessage('List name must be between 1 and 100 characters'),
            body('description')
                .optional()
                .trim()
                .isLength({ max: 500 })
                .withMessage('Description must be less than 500 characters'),
            handleValidationErrors
        ],
        controller.updateContactList
    );

    // Add contact to manual list
    app.post(
        "/api/contact-lists/:id/contacts/:contactId",
        apiLimiter,
        [authJwt.verifyToken],
        controller.addContactToList
    );

    // Remove contact from manual list
    app.delete(
        "/api/contact-lists/:id/contacts/:contactId",
        apiLimiter,
        [authJwt.verifyToken],
        controller.removeContactFromList
    );

    // Delete a contact list
    app.delete(
        "/api/contact-lists/:id",
        apiLimiter,
        [authJwt.verifyToken],
        controller.deleteContactList
    );
};
