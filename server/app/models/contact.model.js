const mongoose = require('mongoose');

const Contact = mongoose.model(
    'Contact',
    new mongoose.Schema({
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        firstName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 50
        },
        lastName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 50
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            maxlength: 100
        },
        phone: {
            type: String,
            trim: true,
        },
        type: {
            type: String,
            enum: ['client', 'business', 'supplier', 'contractor'],
            default: 'client'
        },
        address: {
            type: String,
            trim: true,
            maxlength: 200
        },
        city: {
            type: String,
            trim: true,
            maxlength: 50
        },
        state: {
            type: String,
            trim: true,
            maxlength: 50
        },
        zip: {
            type: String,
            trim: true,
            maxlength: 10
        },
        country: {
            type: String,
            trim: true,
            maxlength: 50
        },
        notes: {
            type: String,
            trim: true,
            maxlength: 1000
        },
        avatar: {
            type: String,
            trim: true
        },
        tags: {
            type: [String],
            default: []
        },
        categories: {
            type: [String],
            default: []
        },
        status: {
            type: String,
            enum: ['active', 'inactive', 'archived'],
            default: 'active'
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
        timestamps: true // Adds createdAt and updatedAt automatically
    })
);

module.exports = Contact;