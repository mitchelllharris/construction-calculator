const mongoose = require('mongoose');

const ContactForm = mongoose.model(
    'ContactForm',
    new mongoose.Schema({
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true
        },
        subject: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200
        },
        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 5000
        },
        status: {
            type: String,
            enum: ['new', 'read', 'replied', 'archived'],
            default: 'new'
        },
        ipAddress: {
            type: String
        },
        userAgent: {
            type: String
        }
    }, {
        timestamps: true // Adds createdAt and updatedAt automatically
    })
);

module.exports = ContactForm;

