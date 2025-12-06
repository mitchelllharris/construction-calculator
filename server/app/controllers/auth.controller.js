const config = require("../config/auth.config");
const db = require("../models");
const User = db.user;
const Role = db.role;

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { generateToken, sendVerificationEmail } = require("../services/email.service");

// SIGNUP
exports.signup = async (req, res) => {
    try {
        // Create user with hashed password
        // SECURITY: Ignore roles field - users cannot assign themselves roles
        // SECURITY: Use bcrypt rounds 12 for better security (higher than 8)
        const user = new User({
            username: req.body.username,
            email: req.body.email,
            password: bcrypt.hashSync(req.body.password, 12)
        });

        // Save user to DB
        const savedUser = await user.save();

        // Always assign default "user" role - role assignment must be done by admin
        const defaultRole = await Role.findOne({ name: "user" });
        
        if (!defaultRole) {
            return res.status(500).send({ message: "System error. Please contact support." });
        }

        savedUser.roles = [defaultRole._id];
        
        // Generate verification token
        const verificationToken = generateToken();
        savedUser.verificationToken = verificationToken;
        savedUser.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
        
        await savedUser.save();

        // Send verification email
        try {
            await sendVerificationEmail(savedUser, verificationToken);
        } catch (emailError) {
            logger.error("Failed to send verification email:", emailError);
            // Don't fail registration if email fails
        }

        return res.send({ 
            message: "User was registered successfully! Please check your email to verify your account." 
        });

    } catch (err) {
        logger.error("Signup error:", err);
        // Don't expose internal error details in production
        const isDevelopment = process.env.NODE_ENV !== 'production';
        return res.status(500).send({ 
            message: isDevelopment ? (err.message || "Signup failed.") : "Signup failed. Please try again." 
        });
    }
};


// SIGNIN
exports.signin = async (req, res) => {
    try {
        // Find user by username
        const user = await User.findOne({ username: req.body.username })
        .populate("roles", "-__v");

        // SECURITY: Use generic error message to prevent user enumeration
        // Always perform password check even if user doesn't exist (timing attack mitigation)
        let passwordIsValid = false;
        if (user) {
            // SECURITY: Check if account is locked
            if (user.lockUntil && user.lockUntil > Date.now()) {
                const lockTime = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
                return res.status(423).send({
                    accessToken: null,
                    message: `Account is locked. Please try again in ${lockTime} minute(s).`
                });
            }

            passwordIsValid = bcrypt.compareSync(
                req.body.password,
                user.password
            );

            // SECURITY: Handle failed login attempts and account lockout
            if (!passwordIsValid) {
                user.loginAttempts = (user.loginAttempts || 0) + 1;
                
                // Lock account after 5 failed attempts for 30 minutes
                if (user.loginAttempts >= 5) {
                    user.lockUntil = Date.now() + 30 * 60 * 1000; // 30 minutes
                    await user.save();
                    return res.status(423).send({
                        accessToken: null,
                        message: "Too many failed login attempts. Account locked for 30 minutes."
                    });
                }
                
                await user.save();
            }
        } else {
            // Perform dummy comparison to prevent timing attacks
            bcrypt.compareSync(req.body.password || '', '$2a$08$dummyhash');
        }

        // Generic error message for both invalid user and invalid password
        if (!user || !passwordIsValid) {
            return res.status(401).send({
                accessToken: null,
                message: "Invalid username or password"
            });
        }

        // SECURITY: Check if account is locked
        if (user.lockUntil && user.lockUntil > Date.now()) {
            const lockTime = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
            return res.status(423).send({
                accessToken: null,
                message: `Account is locked. Please try again in ${lockTime} minute(s).`
            });
        }

        // Reset login attempts on successful login
        if (user.loginAttempts > 0) {
            user.loginAttempts = 0;
            user.lockUntil = undefined;
            await user.save();
        }

        // Generate JWT token
        // SECURITY: Explicitly specify algorithm and include tokenVersion
        const token = jwt.sign(
            { 
                id: user.id,
                tokenVersion: user.tokenVersion || 0
            },
            config.secret,
            {
                algorithm: "HS256",
                expiresIn: 86400 // 24 hours
            }
        );

        // Convert roles into ["ROLE_ADMIN", "ROLE_USER"]
        const authorities = user.roles.map(role => "ROLE_" + role.name.toUpperCase());

        // Successful response
        return res.status(200).send({
            id: user._id,
            username: user.username,
            email: user.email,
            emailVerified: user.emailVerified || false,
            roles: authorities,
            accessToken: token
        });

    } catch (err) {
        logger.error("Signin error:", err);
        // Don't expose internal error details in production
        const isDevelopment = process.env.NODE_ENV !== 'production';
        return res.status(500).send({ 
            message: isDevelopment ? (err.message || "Signin failed.") : "Signin failed. Please try again." 
        });
    }
};
