const db = require("../models");
const User = db.user;
const bcrypt = require("bcryptjs");
const { generateToken, sendPasswordResetEmail } = require("../services/email.service");
const logger = require("../utils/logger");

// Request password reset
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).send({ message: "Email is required" });
        }

        // Find user by email
        const user = await User.findOne({ email: email.trim().toLowerCase() });

        // Always return success to prevent email enumeration
        // But only process if user exists
        if (user) {
            // Check reset attempts (prevent abuse)
            if (user.resetPasswordAttempts >= 5) {
                return res.status(429).send({ 
                    message: "Too many reset attempts. Please try again later." 
                });
            }

            // Generate reset token
            const token = generateToken();
            user.resetPasswordToken = token;
            user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
            user.resetPasswordAttempts += 1;
            await user.save();

            // Send password reset email
            try {
                await sendPasswordResetEmail(user, token);
            } catch (emailError) {
                logger.error("Failed to send password reset email:", emailError);
                // Don't fail the request if email fails
            }
        }

        // Always return success message
        return res.status(200).send({ 
            message: "If an account exists with this email, a password reset link has been sent." 
        });
    } catch (err) {
        logger.error("Forgot password error:", err);
        const isDevelopment = process.env.NODE_ENV !== 'production';
        return res.status(500).send({ 
            message: isDevelopment ? (err.message || "Failed to process request.") : "Failed to process request. Please try again." 
        });
    }
};

// Reset password with token
exports.resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token) {
            return res.status(400).send({ message: "Reset token is required" });
        }

        if (!password) {
            return res.status(400).send({ message: "New password is required" });
        }

        // Find user with matching token and check expiration
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).send({ 
                message: "Invalid or expired reset token" 
            });
        }

        // Validate password strength (same as signup)
        if (password.length < 8) {
            return res.status(400).send({ 
                message: "Password must be at least 8 characters long" 
            });
        }

        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(password)) {
            return res.status(400).send({ 
                message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)" 
            });
        }

        // Hash new password with higher salt rounds for better security
        const hashedPassword = bcrypt.hashSync(password, 12);

        // Update password and clear reset token
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        user.resetPasswordAttempts = 0; // Reset attempts counter
        await user.save();

        return res.status(200).send({ 
            message: "Password reset successfully" 
        });
    } catch (err) {
        logger.error("Reset password error:", err);
        const isDevelopment = process.env.NODE_ENV !== 'production';
        return res.status(500).send({ 
            message: isDevelopment ? (err.message || "Password reset failed.") : "Password reset failed. Please try again." 
        });
    }
};

