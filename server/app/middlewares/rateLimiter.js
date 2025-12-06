const rateLimit = require('express-rate-limit');

// Rate limiter for login attempts (stricter)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login requests per windowMs
    message: {
        message: 'Too many login attempts from this IP, please try again after 15 minutes.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Rate limiter for signup attempts
const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 signup requests per hour
    message: {
        message: 'Too many signup attempts from this IP, please try again after an hour.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter for resend verification
const resendVerificationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 resend requests per hour
    message: {
        message: 'Too many verification email requests from this IP, please try again after an hour.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter for forgot password
const forgotPasswordLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 password reset requests per hour
    message: {
        message: 'Too many password reset requests from this IP, please try again after an hour.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter for contact form submissions
const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each IP to 5 contact form submissions per hour
    message: {
        message: 'Too many contact form submissions from this IP, please try again after an hour.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// General API rate limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    loginLimiter,
    signupLimiter,
    resendVerificationLimiter,
    forgotPasswordLimiter,
    contactLimiter,
    apiLimiter
};

