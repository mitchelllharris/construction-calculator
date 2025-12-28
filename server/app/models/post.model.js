const mongoose = require('mongoose');

const Post = mongoose.model(
    'Post',
    new mongoose.Schema({
        profileUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        authorUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
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
            name: {
                type: String,
                trim: true
            },
            coordinates: {
                lat: {
                    type: Number
                },
                lng: {
                    type: Number
                }
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

