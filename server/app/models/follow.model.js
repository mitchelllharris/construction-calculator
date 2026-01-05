const mongoose = require('mongoose');

const followSchema = new mongoose.Schema({
    follower: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'followerModel',
        index: true
    },
    followerModel: {
        type: String,
        required: true,
        enum: ['User', 'Business'],
        index: true
    },
    following: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'followingModel',
        index: true
    },
    followingModel: {
        type: String,
        required: true,
        enum: ['User', 'Business'],
        index: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'accepted', // If user allows anyone to follow, status is immediately 'accepted'
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound index to ensure unique follows
followSchema.index({ follower: 1, following: 1, followerModel: 1, followingModel: 1 }, { unique: true });

// Prevent self-follows
followSchema.pre('save', async function() {
    if (this.follower.toString() === this.following.toString()) {
        throw new Error('Cannot follow yourself');
    }
});

const Follow = mongoose.model('Follow', followSchema);

module.exports = Follow;
