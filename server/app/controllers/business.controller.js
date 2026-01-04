const db = require("../models");
const Business = db.business;
const User = db.user;
const Page = db.page;
const logger = require("../utils/logger");
const { generateAccountId, generatePageId } = require("../utils/accountId");
const { canEditProfile, getActiveAccountContext } = require("../utils/permissions");

// Generate a unique slug from business name
const generateSlug = async (businessName) => {
    const baseSlug = businessName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    
    let slug = baseSlug;
    let counter = 1;
    
    while (await Business.findOne({ businessSlug: slug })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
    }
    
    return slug;
};

// Create a new business
exports.createBusiness = async (req, res) => {
    try {
        const userId = req.userId;
        const {
            businessName,
            description,
            businessType,
            trade,
            abn,
            phone,
            email,
            website,
            location,
            googleBusinessProfileUrl,
            bookingSettings,
            businessHours,
            serviceAreas,
            licenseNumbers
        } = req.body;

        // Validate required fields
        if (!businessName || !businessName.trim()) {
            return res.status(400).send({ message: "Business name is required" });
        }
        if (!abn || !abn.trim()) {
            return res.status(400).send({ message: "ABN (or equivalent) is required" });
        }
        if (!trade || !trade.trim()) {
            return res.status(400).send({ message: "Industry is required" });
        }
        if (!phone || !phone.trim()) {
            return res.status(400).send({ message: "Phone is required" });
        }
        if (!email || !email.trim()) {
            return res.status(400).send({ message: "Email is required" });
        }
        if (!location || (!location.city && !location.formattedAddress)) {
            return res.status(400).send({ message: "Location is required" });
        }

        // Validate business type if provided
        if (businessType && !['operator', 'service_provider', 'quote_based'].includes(businessType)) {
            return res.status(400).send({ message: "Invalid business type" });
        }

        // Check if user already has a business with this name
        const existingBusiness = await Business.findOne({
            ownerId: userId,
            businessName: businessName.trim()
        });

        if (existingBusiness) {
            return res.status(400).send({ message: "You already have a business with this name" });
        }

        // Check for duplicate phone, email, website, or ABN across all businesses
        const duplicateChecks = [];
        
        if (phone && phone.trim()) {
            const existingPhone = await Business.findOne({ 
                phone: phone.trim(),
                isActive: { $ne: false }
            });
            if (existingPhone) {
                duplicateChecks.push("phone");
            }
        }
        
        if (email && email.trim()) {
            const existingEmail = await Business.findOne({ 
                email: email.trim(),
                isActive: { $ne: false }
            });
            if (existingEmail) {
                duplicateChecks.push("email");
            }
        }
        
        if (website && website.trim()) {
            const existingWebsite = await Business.findOne({ 
                website: website.trim(),
                isActive: { $ne: false }
            });
            if (existingWebsite) {
                duplicateChecks.push("website");
            }
        }
        
        if (abn && abn.trim()) {
            const existingAbn = await Business.findOne({ 
                abn: abn.trim(),
                isActive: { $ne: false }
            });
            if (existingAbn) {
                duplicateChecks.push("ABN");
            }
        }
        
        if (duplicateChecks.length > 0) {
            return res.status(400).send({ 
                message: `The following ${duplicateChecks.length === 1 ? 'field is' : 'fields are'} already in use: ${duplicateChecks.join(', ')}` 
            });
        }

        // Generate unique slug
        const businessSlug = await generateSlug(businessName);

        // Generate accountId for the business
        const accountId = await generateAccountId(db);

        // Generate pageId
        const pageId = generatePageId(accountId);

        // DEBUG: Log the googleBusinessProfileUrl before saving
        console.log('DEBUG: Creating business with googleBusinessProfileUrl:', googleBusinessProfileUrl);
        console.log('DEBUG: Type of googleBusinessProfileUrl:', typeof googleBusinessProfileUrl);
        console.log('DEBUG: googleBusinessProfileUrl value:', JSON.stringify(googleBusinessProfileUrl));
        
        // Create business
        const businessData = {
            ownerId: userId,
            accountId,
            pageId,
            businessName: businessName.trim(),
            businessSlug,
            description: description ? description.trim() : '',
            businessType: businessType || null,
            trade: trade.trim(),
            abn: abn.trim(),
            phone: phone.trim(),
            email: email.trim(),
            website: website ? website.trim() : '',
            location: location,
            bookingSettings: bookingSettings || {},
            businessHours: businessHours || {},
            serviceAreas: serviceAreas || [],
            licenseNumbers: licenseNumbers || [],
            isActive: true,
            isVerified: false
        };
        
        // Explicitly set googleBusinessProfileUrl
        if (googleBusinessProfileUrl) {
            businessData.googleBusinessProfileUrl = googleBusinessProfileUrl.trim();
            console.log('DEBUG: Setting googleBusinessProfileUrl in businessData:', businessData.googleBusinessProfileUrl);
        } else {
            businessData.googleBusinessProfileUrl = '';
            console.log('DEBUG: googleBusinessProfileUrl is empty, setting to empty string');
        }
        
        const business = new Business(businessData);
        console.log('DEBUG: Business object before save:', business.toObject());
        console.log('DEBUG: googleBusinessProfileUrl in business object before save:', business.googleBusinessProfileUrl);

        await business.save();
        
        // Create page for this business
        const page = new Page({
            pageId,
            accountId: String(accountId),
            pageType: 'business',
            accountRef: business._id,
            accountModel: 'Business',
            activity: [],
            settings: {}
        });
        await page.save();
        
        // DEBUG: Log the saved business
        console.log('DEBUG: Business saved with googleBusinessProfileUrl:', business.googleBusinessProfileUrl);
        console.log('DEBUG: Business object after save:', business.toObject());

        // Populate owner info
        await business.populate('ownerId', 'firstName lastName username avatar');

        return res.status(201).send({
            message: "Business created successfully",
            business
        });
    } catch (error) {
        logger.error("Create business error:", error);
        const isDevelopment = process.env.NODE_ENV !== 'production';
        return res.status(500).send({
            message: isDevelopment ? (error.message || "Failed to create business.") : "Failed to create business. Please try again."
        });
    }
};

// Get business by ID or slug
exports.getBusiness = async (req, res) => {
    try {
        const { id, slug } = req.params;
        const viewerUserId = req.userId || null;

        let business;
        if (id) {
            business = await Business.findById(id);
        } else if (slug) {
            business = await Business.findOne({ businessSlug: slug });
        } else {
            return res.status(400).send({ message: "Business ID or slug is required" });
        }

        if (!business) {
            return res.status(404).send({ message: "Business not found" });
        }

        // Check if business is active
        if (!business.isActive) {
            // Only owner can view inactive businesses
            if (!viewerUserId || business.ownerId.toString() !== viewerUserId) {
                return res.status(404).send({ message: "Business not found" });
            }
        }

        // Populate owner info
        await business.populate('ownerId', 'firstName lastName username avatar email');
        
        // DEBUG: Log the business being returned
        console.log('DEBUG: Returning business with googleBusinessProfileUrl:', business.googleBusinessProfileUrl);

        return res.status(200).json(business);
    } catch (error) {
        logger.error("Get business error:", error);
        const isDevelopment = process.env.NODE_ENV !== 'production';
        return res.status(500).send({
            message: isDevelopment ? (error.message || "Failed to get business.") : "Failed to get business. Please try again."
        });
    }
};

// Get all businesses owned by user
exports.getUserBusinesses = async (req, res) => {
    try {
        const userId = req.userId;

        const businesses = await Business.find({ ownerId: userId })
            .sort({ createdAt: -1 });

        return res.status(200).send({
            businesses
        });
    } catch (error) {
        logger.error("Get user businesses error:", error);
        const isDevelopment = process.env.NODE_ENV !== 'production';
        return res.status(500).send({
            message: isDevelopment ? (error.message || "Failed to get businesses.") : "Failed to get businesses. Please try again."
        });
    }
};

// Update business
exports.updateBusiness = async (req, res) => {
    try {
        const businessId = req.params.id;
        const userId = req.userId;

        const business = await Business.findById(businessId);
        if (!business) {
            return res.status(404).send({ message: "Business not found" });
        }

        // Get active account context
        const { activeAccountId, activePageId } = getActiveAccountContext(req);

        // Get user's accountId if activeAccountId not provided
        let finalActiveAccountId = activeAccountId;
        if (!finalActiveAccountId && userId) {
            const user = await User.findById(userId);
            if (user && user.accountId) {
                finalActiveAccountId = user.accountId;
            }
        }

        // Get user's pageId if activePageId not provided
        let finalActivePageId = activePageId;
        if (!finalActivePageId && userId) {
            const user = await User.findById(userId);
            if (user && user.pageId) {
                finalActivePageId = user.pageId;
            }
        }

        // Check permissions
        const permissionCheck = await canEditProfile(
            business,
            'business',
            userId,
            finalActiveAccountId,
            finalActivePageId
        );

        if (!permissionCheck.allowed) {
            return res.status(403).send({
                message: permissionCheck.reason || "You don't have permission to update this business"
            });
        }

        // Check for duplicate phone, email, website, or ABN across all businesses (excluding current business)
        const duplicateChecks = [];
        
        if (req.body.phone && req.body.phone.trim() && req.body.phone.trim() !== business.phone) {
            const existingPhone = await Business.findOne({ 
                phone: req.body.phone.trim(),
                _id: { $ne: businessId },
                isActive: { $ne: false }
            });
            if (existingPhone) {
                duplicateChecks.push("phone");
            }
        }
        
        if (req.body.email && req.body.email.trim() && req.body.email.trim() !== business.email) {
            const existingEmail = await Business.findOne({ 
                email: req.body.email.trim(),
                _id: { $ne: businessId },
                isActive: { $ne: false }
            });
            if (existingEmail) {
                duplicateChecks.push("email");
            }
        }
        
        if (req.body.website && req.body.website.trim() && req.body.website.trim() !== business.website) {
            const existingWebsite = await Business.findOne({ 
                website: req.body.website.trim(),
                _id: { $ne: businessId },
                isActive: { $ne: false }
            });
            if (existingWebsite) {
                duplicateChecks.push("website");
            }
        }
        
        if (req.body.abn && req.body.abn.trim() && req.body.abn.trim() !== business.abn) {
            const existingAbn = await Business.findOne({ 
                abn: req.body.abn.trim(),
                _id: { $ne: businessId },
                isActive: { $ne: false }
            });
            if (existingAbn) {
                duplicateChecks.push("ABN");
            }
        }
        
        if (duplicateChecks.length > 0) {
            return res.status(400).send({ 
                message: `The following ${duplicateChecks.length === 1 ? 'field is' : 'fields are'} already in use: ${duplicateChecks.join(', ')}` 
            });
        }

        const updates = {};
        const allowedFields = [
            'businessName', 'description', 'businessType', 'trade', 'abn', 'phone', 'email', 'website',
            'location', 'googleBusinessProfileUrl', 'bookingSettings', 'businessHours', 'serviceAreas', 'licenseNumbers',
            'certifications', 'portfolio', 'socialMedia', 'avatar', 'coverImage', 'isActive'
        ];

        for (const field of allowedFields) {
            if (req.body.hasOwnProperty(field)) {
                if (field === 'businessName' && req.body.businessName !== business.businessName) {
                    // Regenerate slug if name changes
                    updates.businessSlug = await generateSlug(req.body.businessName.trim());
                }
                // Handle string fields that should be trimmed
                if (typeof req.body[field] === 'string') {
                    updates[field] = req.body[field].trim();
                } else if (field === 'googleBusinessProfileUrl') {
                    // Allow empty string or null to clear the field
                    updates[field] = req.body[field] ? req.body[field].trim() : '';
                } else {
                    updates[field] = req.body[field];
                }
            }
        }

        // Update email privacy setting
        if (req.body.hasOwnProperty('emailPrivacy')) {
            const validPrivacyOptions = ['public', 'contacts_of_contacts', 'contacts_only', 'private'];
            if (validPrivacyOptions.includes(req.body.emailPrivacy)) {
                updates.emailPrivacy = req.body.emailPrivacy;
            }
        }

        // Update privacy settings
        if (req.body.hasOwnProperty('privacySettings') && typeof req.body.privacySettings === 'object') {
            const validPrivacyOptions = ['public', 'contacts_of_contacts', 'contacts_only', 'private'];
            const privacyFields = ['phone', 'website', 'description', 'location', 'socialMedia', 'trade'];
            
            // Create a copy of existing privacy settings or initialize empty object
            updates.privacySettings = business.privacySettings ? { ...business.privacySettings } : {};
            
            privacyFields.forEach(field => {
                if (req.body.privacySettings.hasOwnProperty(field) && 
                    validPrivacyOptions.includes(req.body.privacySettings[field])) {
                    updates.privacySettings[field] = req.body.privacySettings[field];
                }
            });
        }

        // Update connection request settings
        if (req.body.hasOwnProperty('connectionRequestSettings') && typeof req.body.connectionRequestSettings === 'object') {
            const validWhoCanSend = ['everyone', 'connections_of_connections', 'no_one'];
            const settings = req.body.connectionRequestSettings;
            
            // Create a copy of existing connection request settings or initialize with defaults
            updates.connectionRequestSettings = business.connectionRequestSettings ? 
                { ...business.connectionRequestSettings } : 
                {
                    whoCanSend: 'everyone',
                    requireManualAcceptance: true
                };
            
            if (settings.hasOwnProperty('whoCanSend') && validWhoCanSend.includes(settings.whoCanSend)) {
                updates.connectionRequestSettings.whoCanSend = settings.whoCanSend;
            }
            
            if (settings.hasOwnProperty('requireManualAcceptance') && typeof settings.requireManualAcceptance === 'boolean') {
                updates.connectionRequestSettings.requireManualAcceptance = settings.requireManualAcceptance;
            }
        }

        // Update follow request settings
        if (req.body.hasOwnProperty('followRequestSettings') && typeof req.body.followRequestSettings === 'object') {
            const validWhoCanSend = ['everyone', 'connections_of_connections', 'no_one'];
            const settings = req.body.followRequestSettings;
            
            // Create a copy of existing follow request settings or initialize with defaults
            updates.followRequestSettings = business.followRequestSettings ? 
                { ...business.followRequestSettings } : 
                {
                    whoCanSend: 'everyone',
                    requireManualAcceptance: true
                };
            
            if (settings.hasOwnProperty('whoCanSend') && validWhoCanSend.includes(settings.whoCanSend)) {
                updates.followRequestSettings.whoCanSend = settings.whoCanSend;
            }
            
            if (settings.hasOwnProperty('requireManualAcceptance') && typeof settings.requireManualAcceptance === 'boolean') {
                updates.followRequestSettings.requireManualAcceptance = settings.requireManualAcceptance;
            }
        }

        // DEBUG: Log updates before saving
        console.log('DEBUG: Updating business with updates:', updates);
        console.log('DEBUG: googleBusinessProfileUrl in updates:', updates.googleBusinessProfileUrl);
        
        Object.assign(business, updates);
        await business.save();
        
        // DEBUG: Log the saved business
        console.log('DEBUG: Business updated with googleBusinessProfileUrl:', business.googleBusinessProfileUrl);

        await business.populate('ownerId', 'firstName lastName username avatar');

        return res.status(200).send({
            message: "Business updated successfully",
            business
        });
    } catch (error) {
        logger.error("Update business error:", error);
        const isDevelopment = process.env.NODE_ENV !== 'production';
        return res.status(500).send({
            message: isDevelopment ? (error.message || "Failed to update business.") : "Failed to update business. Please try again."
        });
    }
};

// Delete business (hard delete)
exports.deleteBusiness = async (req, res) => {
    try {
        const businessId = req.params.id;
        const userId = req.userId;

        const business = await Business.findById(businessId);
        if (!business) {
            return res.status(404).send({ message: "Business not found" });
        }

        // Get active account context
        const { activeAccountId, activePageId } = getActiveAccountContext(req);

        // Get user's accountId if activeAccountId not provided
        let finalActiveAccountId = activeAccountId;
        if (!finalActiveAccountId && userId) {
            const user = await User.findById(userId);
            if (user && user.accountId) {
                finalActiveAccountId = user.accountId;
            }
        }

        // Get user's pageId if activePageId not provided
        let finalActivePageId = activePageId;
        if (!finalActivePageId && userId) {
            const user = await User.findById(userId);
            if (user && user.pageId) {
                finalActivePageId = user.pageId;
            }
        }

        // Check permissions
        const permissionCheck = await canDeleteBusiness(business, userId, finalActiveAccountId, finalActivePageId);

        if (!permissionCheck.allowed) {
            return res.status(403).send({
                message: permissionCheck.reason || "You don't have permission to delete this business"
            });
        }

        // Delete business from database (hard delete)
        await Business.findByIdAndDelete(businessId);

        return res.status(200).send({
            message: "Business deleted successfully"
        });
    } catch (error) {
        logger.error("Delete business error:", error);
        const isDevelopment = process.env.NODE_ENV !== 'production';
        return res.status(500).send({
            message: isDevelopment ? (error.message || "Failed to delete business.") : "Failed to delete business. Please try again."
        });
    }
};

// Get posts for a business
exports.getBusinessPosts = async (req, res) => {
    try {
        const businessId = req.params.id;
        const viewerUserId = req.userId || null;

        // Check if business exists
        const business = await Business.findById(businessId);
        if (!business) {
            return res.status(404).send({ message: "Business not found" });
        }

        // Check if business is active
        if (!business.isActive) {
            // Only owner can view inactive businesses
            if (!viewerUserId || business.ownerId.toString() !== viewerUserId) {
                return res.status(404).send({ message: "Business not found" });
            }
        }

        // Import Post model
        const Post = db.post;

        // Get pageId for this business (new format) or use businessId (legacy)
        const pageId = business.pageId || null;

        // Build query - support both new (pageId) and legacy (businessId) formats
        const pageQuery = pageId ? { pageId: pageId } : {};
        const legacyQuery = { businessId: businessId };
        const targetQuery = pageId ? pageQuery : legacyQuery;

        // Get top-level posts (no parentPostId or parentCommentId)
        // Only show posts that were posted ON this business page
        const posts = await Post.find({
            $and: [
                targetQuery,
                {
                    $or: [
                        { parentPostId: null },
                        { parentPostId: { $exists: false } }
                    ]
                },
                {
                    $or: [
                        { parentCommentId: null },
                        { parentCommentId: { $exists: false } }
                    ]
                },
                { isDeleted: false }
            ]
        })
        .populate('authorUserId', 'firstName lastName username avatar')
        .populate({
            path: 'businessId',
            select: 'businessName businessSlug avatar ownerId',
            populate: {
                path: 'ownerId',
                select: '_id'
            }
        })
        .populate({
            path: 'postedAsBusinessId',
            select: 'businessName businessSlug avatar ownerId',
            populate: {
                path: 'ownerId',
                select: '_id'
            }
        })
        .populate('likes.userId', 'firstName lastName username')
        .sort({ createdAt: -1 })
        .limit(50);

        // Get all comments/replies for these posts (recursively)
        const postIds = posts.map(p => p._id);
        let allCommentIds = [...postIds];
        let allComments = [];
        let depth = 0;
        const maxDepth = 10; // Prevent infinite loops
        const fetchedIds = new Set();

        while (allCommentIds.length > 0 && depth < maxDepth) {
            const comments = await Post.find({
                $or: [
                    { parentPostId: { $in: allCommentIds } },
                    { parentCommentId: { $in: allCommentIds } }
                ],
                isDeleted: false,
                _id: { $nin: Array.from(fetchedIds) }
            })
            .populate('authorUserId', 'firstName lastName username avatar')
            .populate({
                path: 'postedAsBusinessId',
                select: 'businessName businessSlug avatar ownerId',
                populate: {
                    path: 'ownerId',
                    select: '_id'
                }
            })
            .populate('likes.userId', 'firstName lastName username');
            
            comments.forEach(c => fetchedIds.add(c._id));
            allComments = [...allComments, ...comments];
            allCommentIds = comments.map(c => c._id);
            depth++;
        }

        // Import helper functions from post controller
        const postController = require('./post.controller');
        const buildCommentTree = postController.buildCommentTree;
        const formatPostWithComments = postController.formatPostWithComments;
        const populateAuthorAccount = postController.populateAuthorAccount;

        const postsWithComments = await Promise.all(posts.map(async (post) => {
            await populateAuthorAccount(post);
            const comments = await buildCommentTree(allComments, post._id.toString());
            // Populate authorAccount for comments too
            for (const comment of comments) {
                await populateAuthorAccount(comment);
                if (comment.replies) {
                    for (const reply of comment.replies) {
                        await populateAuthorAccount(reply);
                    }
                }
            }
            return formatPostWithComments(post, comments);
        }));

        return res.status(200).send({
            posts: postsWithComments
        });
    } catch (error) {
        logger.error("Get business posts error:", error);
        const isDevelopment = process.env.NODE_ENV !== 'production';
        return res.status(500).send({
            message: isDevelopment ? (error.message || "Failed to get business posts.") : "Failed to get business posts. Please try again."
        });
    }
};

// Search businesses
exports.searchBusinesses = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        
        const searchTerm = req.query.q || '';
        const excludeBusinessId = req.query.excludeBusinessId || null; // Exclude this business from results

        // Build query conditions
        const conditions = [{ isActive: true }]; // Only show active businesses

        // Exclude the active business profile from results
        if (excludeBusinessId) {
            const mongoose = require('mongoose');
            try {
                // Try to convert to ObjectId if valid, otherwise use as string
                let excludeObjectId;
                if (mongoose.Types.ObjectId.isValid(excludeBusinessId)) {
                    excludeObjectId = new mongoose.Types.ObjectId(excludeBusinessId);
                } else {
                    // If not a valid ObjectId, try to match as string
                    excludeObjectId = excludeBusinessId;
                }
                conditions.push({
                    _id: { $ne: excludeObjectId }
                });
                logger.info("Excluding business from search:", excludeBusinessId);
            } catch (err) {
                // Invalid ObjectId format, skip exclusion
                logger.warn("Invalid excludeBusinessId format:", excludeBusinessId, err);
            }
        }

        // Search across multiple fields
        if (searchTerm) {
            const sanitizedSearch = searchTerm.trim().substring(0, 100).replace(/[.$]/g, '');
            if (sanitizedSearch) {
                conditions.push({
                    $or: [
                        { businessName: { $regex: sanitizedSearch, $options: 'i' } },
                        { trade: { $regex: sanitizedSearch, $options: 'i' } },
                        { abn: { $regex: sanitizedSearch, $options: 'i' } },
                        { 'location.city': { $regex: sanitizedSearch, $options: 'i' } },
                        { 'location.state': { $regex: sanitizedSearch, $options: 'i' } },
                        { 'location.formattedAddress': { $regex: sanitizedSearch, $options: 'i' } }
                    ]
                });
            }
        }

        // Build final query
        const query = conditions.length > 0 ? { $and: conditions } : { isActive: true };

        // Get businesses with filters
        const businesses = await Business.find(query)
            .populate('ownerId', 'firstName lastName username avatar')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Get total count for pagination
        const total = await Business.countDocuments(query);

        // Format businesses for response
        const formattedBusinesses = businesses.map(business => {
            const locationStr = business.location?.city && business.location?.state
                ? `${business.location.city}, ${business.location.state}`
                : business.location?.formattedAddress || business.location?.city || business.location?.state || '';

            return {
                id: business._id,
                businessId: business._id,
                businessName: business.businessName || '',
                businessSlug: business.businessSlug || '',
                trade: business.trade || '',
                avatar: business.avatar || '',
                location: {
                    city: business.location?.city || '',
                    state: business.location?.state || '',
                    country: business.location?.country || '',
                    formattedAddress: business.location?.formattedAddress || ''
                },
                locationString: locationStr,
                ownerId: business.ownerId?._id || business.ownerId,
                owner: business.ownerId ? {
                    firstName: business.ownerId.firstName || '',
                    lastName: business.ownerId.lastName || '',
                    username: business.ownerId.username || ''
                } : null
            };
        });

        return res.status(200).json({
            businesses: formattedBusinesses,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        logger.error("Search businesses error:", error);
        const isDevelopment = process.env.NODE_ENV !== 'production';
        return res.status(500).send({
            message: isDevelopment ? (error.message || "Failed to search businesses.") : "Failed to search businesses. Please try again."
        });
    }
};

