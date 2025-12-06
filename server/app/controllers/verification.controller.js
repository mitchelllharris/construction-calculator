const db = require("../models");
const User = db.user;
const { generateToken, sendVerificationEmail } = require("../services/email.service");
const logger = require("../utils/logger");

// Verify email with token
exports.verifyEmail = async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).send({ message: "Verification token is required" });
        }

        // Find user with matching token and check expiration
        const user = await User.findOne({
            verificationToken: token,
            verificationTokenExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).send({ 
                message: "Invalid or expired verification token" 
            });
        }

        // Mark email as verified and clear token
        user.emailVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;
        await user.save();

        return res.status(200).send({ 
            message: "Email verified successfully" 
        });
    } catch (err) {
        logger.error("Email verification error:", err);
        const isDevelopment = process.env.NODE_ENV !== 'production';
        return res.status(500).send({ 
            message: isDevelopment ? (err.message || "Verification failed.") : "Verification failed. Please try again." 
        });
    }
};

// Resend verification email
exports.resendVerification = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).send({ message: "Email is required" });
        }

        // Find user by email
        const user = await User.findOne({ email: email.trim().toLowerCase() });

        // Always return success to prevent email enumeration
        // But only send email if user exists and is not verified
        if (user && !user.emailVerified) {
            // Generate new verification token
            const token = generateToken();
            user.verificationToken = token;
            user.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
            await user.save();

            // Send verification email
            try {
                await sendVerificationEmail(user, token);
            } catch (emailError) {
                logger.error("Failed to send verification email:", emailError);
                // Don't fail the request if email fails
            }
        }

        // Always return success message
        return res.status(200).send({ 
            message: "If an account exists with this email and is not verified, a verification email has been sent." 
        });
    } catch (err) {
        logger.error("Resend verification error:", err);
        const isDevelopment = process.env.NODE_ENV !== 'production';
        return res.status(500).send({ 
            message: isDevelopment ? (err.message || "Failed to resend verification.") : "Failed to resend verification. Please try again." 
        });
    }
};

