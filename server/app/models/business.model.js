const mongoose = require('mongoose');

const Business = mongoose.model(
    'Business',
    new mongoose.Schema({
        accountId: {
            type: Number,
            unique: true,
            sparse: true,
            index: true
        },
        pageId: {
            type: String,
            unique: true,
            sparse: true,
            index: true
        },
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        businessName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200
        },
        businessSlug: {
            type: String,
            trim: true,
            maxlength: 200,
            unique: true,
            sparse: true,
            index: true
        },
        description: {
            type: String,
            trim: true,
            maxlength: 2000
        },
        businessType: {
            type: String,
            enum: ['operator', 'service_provider', 'quote_based'],
            required: false
        },
        trade: {
            type: String,
            trim: true,
            maxlength: 100
        },
        abn: {
            type: String,
            trim: true,
            maxlength: 20
        },
        avatar: {
            type: String,
            trim: true
        },
        coverImage: {
            type: String,
            trim: true
        },
        phone: {
            type: String,
            trim: true,
            maxlength: 20
        },
        email: {
            type: String,
            trim: true,
            maxlength: 200
        },
        website: {
            type: String,
            trim: true,
            maxlength: 200
        },
        location: {
            // Simple format (backward compatible)
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
            // Full address format (Google Maps)
            formattedAddress: {
                type: String,
                trim: true,
                maxlength: 500
            },
            name: {
                type: String,
                trim: true,
                maxlength: 200
            },
            coordinates: {
                lat: {
                    type: Number
                },
                lng: {
                    type: Number
                }
            },
            postalCode: {
                type: String,
                trim: true,
                maxlength: 20
            },
            placeId: {
                type: String,
                trim: true
            },
            googleBusinessPlaceId: {
                type: String,
                trim: true
            }
        },
        googleBusinessProfileUrl: {
            type: String,
            trim: true,
            maxlength: 500
        },
        // Business-specific settings
        bookingSettings: {
            // For operators: hourly booking
            hourlyRate: {
                type: Number,
                min: 0
            },
            minimumHours: {
                type: Number,
                min: 1,
                default: 1
            },
            availableMachinery: [{
                name: {
                    type: String,
                    trim: true,
                    maxlength: 100
                },
                description: {
                    type: String,
                    trim: true,
                    maxlength: 500
                }
            }],
            // For service providers: fixed fees
            serviceFees: [{
                serviceName: {
                    type: String,
                    trim: true,
                    maxlength: 100,
                    required: true
                },
                description: {
                    type: String,
                    trim: true,
                    maxlength: 500
                },
                price: {
                    type: Number,
                    required: true,
                    min: 0
                },
                unit: {
                    type: String,
                    enum: ['fixed', 'per_hour', 'per_sqft', 'per_unit'],
                    default: 'fixed'
                }
            }],
            callOutFee: {
                type: Number,
                min: 0
            },
            // For quote-based: quote settings
            quoteSettings: {
                requiresSiteVisit: {
                    type: Boolean,
                    default: true
                },
                estimatedResponseTime: {
                    type: Number, // in hours
                    min: 0
                }
            }
        },
        // Business hours
        businessHours: {
            monday: {
                open: String,
                close: String,
                closed: { type: Boolean, default: false }
            },
            tuesday: {
                open: String,
                close: String,
                closed: { type: Boolean, default: false }
            },
            wednesday: {
                open: String,
                close: String,
                closed: { type: Boolean, default: false }
            },
            thursday: {
                open: String,
                close: String,
                closed: { type: Boolean, default: false }
            },
            friday: {
                open: String,
                close: String,
                closed: { type: Boolean, default: false }
            },
            saturday: {
                open: String,
                close: String,
                closed: { type: Boolean, default: false }
            },
            sunday: {
                open: String,
                close: String,
                closed: { type: Boolean, default: false }
            }
        },
        // Additional business info
        serviceAreas: [{
            type: String,
            trim: true,
            maxlength: 100
        }],
        licenseNumbers: [{
            type: String,
            trim: true,
            maxlength: 100
        }],
        certifications: [{
            name: {
                type: String,
                trim: true,
                maxlength: 200
            },
            issuer: {
                type: String,
                trim: true,
                maxlength: 200
            },
            issueDate: Date,
            expirationDate: Date
        }],
        portfolio: [{
            title: {
                type: String,
                trim: true,
                maxlength: 200
            },
            description: {
                type: String,
                trim: true,
                maxlength: 2000
            },
            images: [{
                type: String,
                trim: true
            }],
            date: Date,
            location: String
        }],
        socialMedia: {
            linkedin: String,
            facebook: String,
            instagram: String,
            twitter: String
        },
        // Business status
        isActive: {
            type: Boolean,
            default: true
        },
        isVerified: {
            type: Boolean,
            default: false
        },
        // Privacy settings
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
            description: {
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
            }
        },
        // Connection and follow request settings
        connectionRequestSettings: {
            whoCanSend: {
                type: String,
                enum: ['everyone', 'connections_of_connections', 'no_one'],
                default: 'everyone'
            },
            requireManualAcceptance: {
                type: Boolean,
                default: true
            }
        },
        followRequestSettings: {
            whoCanSend: {
                type: String,
                enum: ['everyone', 'connections_of_connections', 'no_one'],
                default: 'everyone'
            },
            requireManualAcceptance: {
                type: Boolean,
                default: true
            }
        }
    }, {
        timestamps: true
    })
);

module.exports = Business;

