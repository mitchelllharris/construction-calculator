const mongoose = require('mongoose');

const contactListSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    // Optional: Link list to a specific business (for business-specific lists)
    businessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        index: true,
        sparse: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },
    // Type: 'manual' (manually added contacts) or 'filter' (auto-populated by filters)
    type: {
        type: String,
        enum: ['manual', 'filter'],
        default: 'manual',
        required: true
    },
    // For filter-based lists: criteria to match contacts
    filterCriteria: {
        type: {
            type: String, // 'client', 'business', 'supplier', 'contractor'
            enum: ['client', 'business', 'supplier', 'contractor']
        },
        status: {
            type: String,
            enum: ['active', 'inactive', 'archived']
        },
        tags: [String], // Match contacts with any of these tags
        city: String,
        state: String,
        country: String
    },
    // For manual lists: array of contact IDs
    contactIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contact'
    }],
    // Display order
    order: {
        type: Number,
        default: 0
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

// Compound index for user and businessId
contactListSchema.index({ user: 1, businessId: 1 });

// Ensure unique list names per user/business
contactListSchema.index({ user: 1, businessId: 1, name: 1 }, { unique: true, sparse: true });

const ContactList = mongoose.model('ContactList', contactListSchema);

module.exports = ContactList;
