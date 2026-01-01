const mongoose = require('mongoose');

const Post = mongoose.model(
    'Post',
    new mongoose.Schema({
        // New unified fields
        pageId: {
            type: String,
            required: false, // Will be required after migration
            index: true
        },
        authorAccountId: {
            type: Number,
            required: false, // Will be required after migration
            index: true
        },
        // Legacy fields - kept for migration compatibility
        profileUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false,
            index: true
        },
        businessId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Business',
            required: false,
            index: true
        },
        authorUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false, // Changed from required: true for migration
            index: true
        },
        postedAsBusinessId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Business',
            required: false,
            index: true
        },
        content: {
            type: String,
            required: false,
            trim: true,
            maxlength: 5000,
            default: ''
        },
        images: [{
            type: String,
            trim: true
        }],
        videos: [{
            type: String,
            trim: true
        }],
        likes: [{
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true
            },
            reactionType: {
                type: String,
                enum: ['like', 'love', 'care', 'haha', 'wow', 'sad', 'angry'],
                default: 'like'
            },
            likedAt: {
                type: Date,
                default: Date.now
            }
        }],
        parentPostId: {
                type: mongoose.Schema.Types.ObjectId,
            ref: 'Post',
            default: null,
            index: true
            },
        parentCommentId: {
                    type: mongoose.Schema.Types.ObjectId,
            ref: 'Post',
            default: null,
            index: true
        },
        replySettings: {
            type: String,
            enum: ['everyone', 'following', 'verified', 'mentioned', 'contacts_only', 'contacts_of_contacts', 'page_owner'],
            default: 'everyone',
            required: false
        },
        poll: {
            options: [{
                type: String,
                trim: true
            }],
            votes: [{
                userId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User'
                },
                optionIndex: {
                    type: Number,
                    required: true
                },
                votedAt: {
                    type: Date,
                    default: Date.now
                }
            }],
            duration: {
                type: Number,
                default: 1 // days
            },
            endsAt: {
                type: Date
            }
        },
        location: {
            // Simple format
            name: {
                type: String,
                trim: true,
                maxlength: 200
            },
            // Full address format (Google Maps)
            formattedAddress: {
                type: String,
                trim: true,
                maxlength: 500
            },
            coordinates: {
                lat: {
                    type: Number
                },
                lng: {
                    type: Number
                }
            },
            city: {
                type: String,
                trim: true,
                maxlength: 100
            },
            state: {
                type: String,
                trim: true,
                maxlength: 100
            },
            country: {
                type: String,
                trim: true,
                maxlength: 100
            },
            postalCode: {
                type: String,
                trim: true,
                maxlength: 20
            },
            placeId: {
                type: String,
                trim: true
            }
        },
        taggedUsers: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        isDeleted: {
            type: Boolean,
            default: false
        }
    }, {
        timestamps: true
    })
);

module.exports = Post;

