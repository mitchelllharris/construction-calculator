const mongoose = require('mongoose');

const ProfileView = mongoose.model(
    'ProfileView',
    new mongoose.Schema({
        profileUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        viewerUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null // null for anonymous viewers
        },
        viewerIP: {
            type: String,
            trim: true
        },
        userAgent: {
            type: String,
            trim: true
        },
        viewedAt: {
            type: Date,
            default: Date.now,
            index: true
        }
    }, {
        timestamps: true
    })
);

module.exports = ProfileView;

