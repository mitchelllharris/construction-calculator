const mongoose = require('mongoose');

const Interaction = mongoose.model(
    'Interaction',
    new mongoose.Schema({
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        contact: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Contact',
            required: true
        },
        type: {
            type: String,
            enum: ['call', 'email', 'meeting', 'note', 'task'],
            required: true
        },
        direction: {
            type: String,
            enum: ['inbound', 'outbound'],
            required: function() {
                return ['call', 'email'].includes(this.type);
            }
        },
        subject: {
            type: String,
            trim: true,
            maxlength: 200
        },
        description: {
            type: String,
            trim: true,
            maxlength: 5000
        },
        duration: {
            type: Number, // Duration in minutes (for calls/meetings)
            min: 0
        },
        date: {
            type: Date,
            required: true,
            default: Date.now
        },
        status: {
            type: String,
            enum: ['completed', 'scheduled', 'pending', 'cancelled'],
            default: 'completed'
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
    })
);

module.exports = Interaction;

