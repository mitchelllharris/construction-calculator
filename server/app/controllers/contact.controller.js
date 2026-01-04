const db = require("../models");
const mongoose = require('mongoose');
const logger = require("../utils/logger");
const { createPhoneSearchRegex, normalizePhone } = require("../utils/phoneSearch");
const User = db.user;
const Contact = db.contact;

// Create a new contact
exports.createContact = async (req, res) => {
    try {
        const { firstName, lastName, email, phone, type, address, city, state, zip, country, notes, tags, categories, avatar } = req.body;
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).send({ message: "User not found" });
        }
        const contact = new Contact({
            user: user._id,
            firstName,
            lastName,
            email,
            phone,
            type,
            address,
            city,
            state,
            zip,
            country,
            notes,
            tags: tags || [],
            categories: categories || [],
            avatar
        });
        const savedContact = await contact.save();
        return res.status(201).send(savedContact);
    } catch (error) {
        logger.error("Error creating contact:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};

// Get all contacts for a user with pagination
exports.getAllContacts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Build query
        const query = { user: req.userId };

        // Debug logging
        logger.info(`[getAllContacts] Fetching contacts for user: ${req.userId}`);
        logger.info(`[getAllContacts] Query params:`, { page, limit, skip, type: req.query.type, status: req.query.status, search: req.query.search });

        // Optional filters
        if (req.query.type) {
            query.type = req.query.type;
        }
        if (req.query.status) {
            query.status = req.query.status;
        }
        if (req.query.search) {
            // Escape special regex characters to prevent errors
            const escapedSearch = req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const searchRegex = new RegExp(escapedSearch, 'i');
            const searchOr = [
                { firstName: searchRegex },
                { lastName: searchRegex },
                { email: searchRegex },
                { type: searchRegex }, // company/type
                { city: searchRegex }, // suburb
                { address: searchRegex }, // street
                { state: searchRegex },
                { country: searchRegex },
                { tags: searchRegex } // search within tags array (matches any tag)
            ];
            
            // Enhanced phone number search - handles country code variations
            // Check if search term contains digits (likely a phone number search)
            const normalizedSearch = normalizePhone(req.query.search);
            // Allow phone search for 2+ digits (to handle country codes like "61")
            // Also check if search term looks like a phone number (contains digits)
            const isPhoneSearch = normalizedSearch && normalizedSearch.length >= 2 && /^\D*\d/.test(req.query.search);
            
            if (isPhoneSearch) {
                // Generate phone search patterns (handles +61 vs 0, etc.)
                const phonePatterns = createPhoneSearchRegex(req.query.search);
                if (phonePatterns.length > 0) {
                    // Add all phone patterns to the $or array
                    searchOr.push(...phonePatterns);
                } else {
                    // Fallback to simple phone regex if no patterns generated
                    searchOr.push({ phone: searchRegex });
                }
            } else {
                // For non-phone searches, use escaped regex
                searchOr.push({ phone: searchRegex });
            }
            
            query.$or = searchOr;
        }

        // Build sort object
        const sortBy = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
        
        // Validate sortBy field to prevent NoSQL injection
        const allowedSortFields = ['firstName', 'lastName', 'email', 'phone', 'type', 'createdAt', 'updatedAt'];
        const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
        const sortObject = { [validSortBy]: sortOrder };

        // Get contacts with pagination
        logger.info(`[getAllContacts] Final query:`, JSON.stringify(query));
        logger.info(`[getAllContacts] Sort:`, sortObject);
        const contacts = await Contact.find(query)
            .populate('platformUserId', 'username firstName lastName avatar accountId')
            .sort(sortObject)
            .skip(skip)
            .limit(limit)
            .select('-__v');

        // Get total count for pagination
        const total = await Contact.countDocuments(query);

        // Debug logging
        logger.info(`[getAllContacts] Found ${contacts.length} contacts (total: ${total}) for user: ${req.userId}`);
        if (contacts.length > 0) {
            logger.info(`[getAllContacts] Sample contacts:`, contacts.slice(0, 3).map(c => ({
                _id: c._id,
                firstName: c.firstName,
                lastName: c.lastName,
                email: c.email,
                type: c.type,
                status: c.status,
                createdAt: c.createdAt
            })));
        } else {
            logger.warn(`[getAllContacts] No contacts found for user: ${req.userId} with query:`, JSON.stringify(query));
        }

        return res.status(200).json({
            contacts,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        logger.error("Error getting contacts:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};

// Get a contact by ID
exports.getContactById = async (req, res) => {
    try {
        let contact = await Contact.findOne({
            _id: req.params.id,
            user: req.userId
        })
        .populate('platformUserId', 'username firstName lastName avatar accountId');
        
        if (!contact) {
            return res.status(404).send({ message: "Contact not found" });
        }

        // If contact doesn't have platformUserId but has email/phone, check if it matches a user
        if (!contact.platformUserId && (contact.email || contact.phone)) {
            let matchingUser = null;
            
            // Try to find user by email first
            if (contact.email) {
                matchingUser = await User.findOne({ 
                    email: contact.email.toLowerCase().trim() 
                }).select('_id username firstName lastName avatar accountId email phone');
            }
            
            // If no email match and phone exists, try phone match
            if (!matchingUser && contact.phone) {
                // Normalize phone for comparison (remove all non-digits)
                const normalizedPhone = contact.phone.replace(/\D/g, '');
                if (normalizedPhone && normalizedPhone.length >= 10) {
                    // Try to match by last 10 digits of phone
                    const phoneSuffix = normalizedPhone.slice(-10);
                    const users = await User.find({
                        phone: { $regex: phoneSuffix }
                    }).select('_id username firstName lastName avatar accountId email phone').limit(1);
                    
                    if (users.length > 0) {
                        matchingUser = users[0];
                    }
                }
            }
            
            // If we found a matching user, link the contact
            if (matchingUser) {
                contact.platformUserId = matchingUser._id;
                contact.isPlatformUser = true;
                await contact.save();
                // Re-populate after save
                await contact.populate('platformUserId', 'username firstName lastName avatar accountId');
                logger.info(`[getContactById] Linked contact ${contact._id} to platform user ${matchingUser._id} (${matchingUser.username || matchingUser.email})`);
            }
        }
        
        return res.status(200).send(contact);
    } catch (error) {
        logger.error("Error getting contact:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};

// Update a contact
exports.updateContact = async (req, res) => {
    try {
        const { firstName, lastName, email, phone, type, address, city, state, zip, country, notes, tags, categories, avatar } = req.body;
        const contact = await Contact.findOneAndUpdate({
            _id: req.params.id,
            user: req.userId
        }, {
            firstName,
            lastName,
            email,
            phone,
            type,
            address,
            city,
            state,
            zip,
            country,
            notes,
            tags: tags || [],
            categories: categories || [],
            avatar
        }, { new: true });
        if (!contact) {
            return res.status(404).send({ message: "Contact not found" });
        }
        return res.status(200).send(contact);
    } catch (error) {
        logger.error("Error updating contact:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};

// Delete a contact
exports.deleteContact = async (req, res) => {
    try {
        const contact = await Contact.findOneAndDelete({
            _id: req.params.id,
            user: req.userId
        });
        if (!contact) {
            return res.status(404).send({ message: "Contact not found" });
        }
        return res.status(200).send({ message: "Contact deleted successfully" });
    } catch (error) {
        logger.error("Error deleting contact:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};

// Bulk delete contacts
exports.bulkDeleteContacts = async (req, res) => {
    try {
        const { contactIds } = req.body;

        if (!Array.isArray(contactIds) || contactIds.length === 0) {
            return res.status(400).send({ message: "Contact IDs array is required" });
        }

        // Verify all contacts belong to the user and delete them
        const result = await Contact.deleteMany({
            _id: { $in: contactIds },
            user: req.userId
        });

        return res.status(200).send({
            message: `${result.deletedCount} contact(s) deleted successfully`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        logger.error("Error bulk deleting contacts:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};

// Export contacts to CSV
exports.exportContactsToCSV = async (req, res) => {
    try {
        const { contactIds } = req.query; // Optional: export specific contacts
        
        let query = { user: req.userId };
        
        // If contactIds provided, filter by them
        if (contactIds) {
            const ids = Array.isArray(contactIds) ? contactIds : contactIds.split(',');
            query._id = { $in: ids };
        }

        const contacts = await Contact.find(query).select('-__v -user');
        
        const { generateCSV } = require('../utils/csvProcessor');
        const csvContent = generateCSV(contacts);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="contacts-${Date.now()}.csv"`);
        res.status(200).send(csvContent);
    } catch (error) {
        logger.error("Error exporting contacts to CSV:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};

// Import contacts from CSV
exports.importContactsFromCSV = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send({ message: "CSV file is required" });
        }

        const csvContent = req.file.buffer.toString('utf-8');
        
        if (!csvContent || csvContent.trim().length === 0) {
            return res.status(400).send({ message: "CSV file is empty" });
        }

        const { parseCSVFile, validateCSVRow } = require('../utils/csvProcessor');
        
        // Parse CSV
        let parsedContacts;
        try {
            parsedContacts = parseCSVFile(csvContent);
        } catch (parseError) {
            logger.error("CSV parsing error:", parseError);
            return res.status(400).send({ 
                message: "Error parsing CSV file",
                errors: [parseError.message || "Invalid CSV format"]
            });
        }
        
        if (parsedContacts.length === 0) {
            return res.status(400).send({ 
                message: "No contacts found in CSV file",
                errors: ["CSV file must contain at least one data row after the header row"]
            });
        }

        // Validate all contacts
        const validationErrors = [];
        const validContacts = [];

        parsedContacts.forEach((contact) => {
            // Use the stored CSV row number for accurate error reporting
            const csvRowNumber = contact._csvRowNumber || (parsedContacts.indexOf(contact) + 2);
            const validation = validateCSVRow(contact, csvRowNumber - 1); // Pass 0-based index for validation function
            if (validation.valid) {
                // Remove the _csvRowNumber before adding to valid contacts
                const { _csvRowNumber, ...contactData } = contact;
                validContacts.push(contactData);
            } else {
                validationErrors.push(...validation.errors);
            }
        });

        if (validationErrors.length > 0) {
            return res.status(400).send({
                message: "Validation errors found in CSV",
                errors: validationErrors,
                validCount: validContacts.length,
                errorCount: validationErrors.length
            });
        }

        // Get user
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).send({ message: "User not found" });
        }

        // Create contacts
        const contactsToCreate = validContacts.map(contactData => ({
            ...contactData,
            user: user._id,
            email: contactData.email.toLowerCase().trim()
        }));

        const createdContacts = await Contact.insertMany(contactsToCreate);

        return res.status(201).send({
            message: `${createdContacts.length} contact(s) imported successfully`,
            importedCount: createdContacts.length
        });
    } catch (error) {
        logger.error("Error importing contacts from CSV:", error);
        const isDevelopment = process.env.NODE_ENV !== 'production';
        return res.status(500).send({
            message: isDevelopment ? (error.message || "Internal server error") : "Internal server error"
        });
    }
};

// Upload avatar for a contact
exports.uploadAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send({ message: "Avatar image is required" });
        }

        // Verify contact belongs to user
        const contact = await Contact.findOne({
            _id: req.params.id,
            user: req.userId
        });

        if (!contact) {
            // Delete uploaded file if contact not found
            const fs = require('fs');
            if (req.file.path) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(404).send({ message: "Contact not found" });
        }

        // Delete old avatar if exists
        if (contact.avatar) {
            const fs = require('fs');
            const path = require('path');
            const oldAvatarPath = path.join(__dirname, '../../', contact.avatar);
            if (fs.existsSync(oldAvatarPath)) {
                try {
                    fs.unlinkSync(oldAvatarPath);
                } catch (err) {
                    logger.warn("Could not delete old avatar:", err);
                }
            }
        }

        // Update contact with new avatar path
        // Store relative path from server root: /uploads/avatars/filename
        const avatarPath = `/uploads/avatars/${req.file.filename}`;
        contact.avatar = avatarPath;
        await contact.save();

        return res.status(200).send({
            message: "Avatar uploaded successfully",
            avatar: avatarPath,
            contact
        });
    } catch (error) {
        logger.error("Error uploading avatar:", error);
        // Delete uploaded file on error
        if (req.file && req.file.path) {
            const fs = require('fs');
            try {
                fs.unlinkSync(req.file.path);
            } catch (err) {
                logger.warn("Could not delete uploaded file on error:", err);
            }
        }
        return res.status(500).send({ message: "Internal server error" });
    }
};

