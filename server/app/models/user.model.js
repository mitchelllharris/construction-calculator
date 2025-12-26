const mongoose = require('mongoose');

const User = mongoose.model(
    'User',
    new mongoose.Schema({
        username: String,
        email: String,
        password: String,
        roles: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Role"
            }
        ],
        // Email verification fields
        emailVerified: {
            type: Boolean,
            default: false
        },
        verificationToken: String,
        verificationTokenExpires: Date,
        // Password reset fields
        resetPasswordToken: String,
        resetPasswordExpires: Date,
        resetPasswordAttempts: {
            type: Number,
            default: 0
        },
        // Security fields
        tokenVersion: {
            type: Number,
            default: 0
        },
        loginAttempts: {
            type: Number,
            default: 0
        },
        lockUntil: {
            type: Date
        },
        // Optional profile fields
        firstName: String,
        lastName: String,
        avatar: String,
        // Tradie-specific profile fields
        trade: {
            type: String,
            trim: true,
            maxlength: 100
        },
        businessName: {
            type: String,
            trim: true,
            maxlength: 200
        },
        bio: {
            type: String,
            trim: true,
            maxlength: 2000
        },
        phone: {
            type: String,
            trim: true,
            maxlength: 20
        },
        website: {
            type: String,
            trim: true,
            maxlength: 200
        },
        location: {
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
            }
        },
        yearsOfExperience: {
            type: Number,
            min: 0,
            max: 100
        },
        experience: [{
            position: {
                type: String,
                required: true,
                trim: true,
                maxlength: 200
            },
            company: {
                type: String,
                trim: true,
                maxlength: 200
            },
            location: {
                type: String,
                trim: true,
                maxlength: 200
            },
            startDate: {
                type: Date,
                required: true
            },
            endDate: {
                type: Date
            },
            isCurrent: {
                type: Boolean,
                default: false
            },
            description: {
                type: String,
                trim: true,
                maxlength: 2000
            },
            duties: {
                type: [String],
                default: []
            }
        }],
        skills: {
            type: [String],
            default: []
        },
        certifications: [{
            name: {
                type: String,
                required: true,
                trim: true,
                maxlength: 200
            },
            issuer: {
                type: String,
                trim: true,
                maxlength: 200
            },
            issueDate: Date,
            expiryDate: Date,
            expirationDate: Date, // Alias for expiryDate for frontend compatibility
            credentialId: {
                type: String,
                trim: true,
                maxlength: 100
            },
            credentialUrl: {
                type: String,
                trim: true,
                maxlength: 200
            },
            pdfUrl: {
                type: String,
                trim: true
            }
        }],
        portfolio: [{
            title: {
                type: String,
                required: true,
                trim: true,
                maxlength: 200
            },
            description: {
                type: String,
                trim: true,
                maxlength: 1000
            },
            images: [{
                type: String,
                trim: true
            }],
            date: Date,
            location: {
                type: String,
                trim: true,
                maxlength: 200
            }
        }],
        serviceAreas: {
            type: [String],
            default: []
        },
        licenseNumbers: {
            type: [String],
            default: []
        },
        socialMedia: {
            linkedin: {
                type: String,
                trim: true,
                maxlength: 200
            },
            facebook: {
                type: String,
                trim: true,
                maxlength: 200
            },
            instagram: {
                type: String,
                trim: true,
                maxlength: 200
            },
            twitter: {
                type: String,
                trim: true,
                maxlength: 200
            }
        },
        emailPrivacy: {
            type: String,
            enum: ['public', 'contacts_of_contacts', 'contacts_only', 'private'],
            default: 'private'
        },
        privacySettings: {
            phone: {
                type: String,
                enum: ['public', 'contacts_of_contacts', 'contacts_only', 'private'],
                default: 'private'
            },
            website: {
                type: String,
                enum: ['public', 'contacts_of_contacts', 'contacts_only', 'private'],
                default: 'private'
            },
            bio: {
                type: String,
                enum: ['public', 'contacts_of_contacts', 'contacts_only', 'private'],
                default: 'public'
            },
            experience: {
                type: String,
                enum: ['public', 'contacts_of_contacts', 'contacts_only', 'private'],
                default: 'public'
            },
            skills: {
                type: String,
                enum: ['public', 'contacts_of_contacts', 'contacts_only', 'private'],
                default: 'public'
            },
            certifications: {
                type: String,
                enum: ['public', 'contacts_of_contacts', 'contacts_only', 'private'],
                default: 'public'
            },
            portfolio: {
                type: String,
                enum: ['public', 'contacts_of_contacts', 'contacts_only', 'private'],
                default: 'public'
            },
            serviceAreas: {
                type: String,
                enum: ['public', 'contacts_of_contacts', 'contacts_only', 'private'],
                default: 'public'
            },
            licenseNumbers: {
                type: String,
                enum: ['public', 'contacts_of_contacts', 'contacts_only', 'private'],
                default: 'public'
            },
            location: {
                type: String,
                enum: ['public', 'contacts_of_contacts', 'contacts_only', 'private'],
                default: 'public'
            },
            socialMedia: {
                type: String,
                enum: ['public', 'contacts_of_contacts', 'contacts_only', 'private'],
                default: 'public'
            },
            trade: {
                type: String,
                enum: ['public', 'contacts_of_contacts', 'contacts_only', 'private'],
                default: 'public'
            },
            businessName: {
                type: String,
                enum: ['public', 'contacts_of_contacts', 'contacts_only', 'private'],
                default: 'public'
            },
            yearsOfExperience: {
                type: String,
                enum: ['public', 'contacts_of_contacts', 'contacts_only', 'private'],
                default: 'public'
            }
        }
    }, {
        timestamps: true // Adds createdAt and updatedAt automatically
    })
);

module.exports = User;