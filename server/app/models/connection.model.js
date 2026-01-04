const mongoose = require('mongoose');

const connectionSchema = new mongoose.Schema({
    requester: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'requesterModel',
        index: true
    },
    requesterModel: {
        type: String,
        required: true,
        enum: ['User', 'Business'],
        index: true
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'recipientModel',
        index: true
    },
    recipientModel: {
        type: String,
        required: true,
        enum: ['User', 'Business'],
        index: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending',
        index: true
    },
    isFollowing: {
        type: Boolean,
        default: true,
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

// Compound index to ensure unique connections and prevent duplicates
connectionSchema.index({ requester: 1, recipient: 1, requesterModel: 1, recipientModel: 1 }, { unique: true });

// Prevent self-connections
connectionSchema.pre('save', async function() {
    if (this.requester.toString() === this.recipient.toString() && 
        this.requesterModel === this.recipientModel) {
        throw new Error('Cannot connect to yourself');
    }
});

const Connection = mongoose.model('Connection', connectionSchema);

module.exports = Connection;
