const { verifySignUp } = require("../middlewares");
const { loginLimiter, signupLimiter } = require("../middlewares/rateLimiter");
const { validateSignup, validateSignin, handleValidationErrors } = require("../middlewares/validator");
const controller = require("../controllers/auth.controller");

module.exports = function(app) {
    app.use(function(req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "x-access-token, Origin, Content-Type, Accept"
        );
        next();
    });

    app.post(
        "/api/auth/signup",
        signupLimiter, // Rate limiting
        validateSignup, // Input validation
        handleValidationErrors, // Handle validation errors
        verifySignUp.checkDuplicateUsernameOrEmail, // Check duplicates
        controller.signup
    );
    
    app.post(
        "/api/auth/signin",
        loginLimiter, // Rate limiting
        validateSignin, // Input validation
        handleValidationErrors, // Handle validation errors
        controller.signin
    );
};