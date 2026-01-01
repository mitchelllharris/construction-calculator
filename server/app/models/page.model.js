const mongoose = require('mongoose');

const Page = mongoose.model(
    'Page',
    new mongoose.Schema({
        pageId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        accountId: {
            type: String,
            required: true,
            index: true
        },
        pageType: {
            type: String,
            enum: ['profile', 'business', 'group'],
            required: true,
            index: true
        },
        // Reference to the account (User or Business)
        accountRef: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: 'accountModel',
            index: true
        },
        accountModel: {
            type: String,
            enum: ['User', 'Business'],
            required: true
        },
        // Activity feed - array of post IDs
        activity: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Post'
        }],
        // Page-specific settings
        settings: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    }, {
        timestamps: true
    })
);

module.exports = Page;

