const mongoose = require('mongoose');

const User = mongoose.model(
    'User',
    new mongoose.Schema({
        username: String,
        email: String,
        password: String,
        roles: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Role"
            }
        ],
        // Email verification fields
        emailVerified: {
            type: Boolean,
            default: false
        },
        verificationToken: String,
        verificationTokenExpires: Date,
        // Password reset fields
        resetPasswordToken: String,
        resetPasswordExpires: Date,
        resetPasswordAttempts: {
            type: Number,
            default: 0
        },
        // Security fields
        tokenVersion: {
            type: Number,
            default: 0
        },
        loginAttempts: {
            type: Number,
            default: 0
        },
        lockUntil: {
            type: Date
        },
        // Optional profile fields
        firstName: String,
        lastName: String,
        avatar: String
    }, {
        timestamps: true // Adds createdAt and updatedAt automatically
    })
);

module.exports = User;