const db = require("../models");
const ContactList = db.contactList;
const Contact = db.contact;
const Business = db.business;
const logger = require("../utils/logger");

// Create a new contact list
exports.createContactList = async (req, res) => {
    try {
        const { name, description, type, filterCriteria, businessId } = req.body;
        const userId = req.userId;

        if (!name || !name.trim()) {
            return res.status(400).send({ message: "List name is required" });
        }

        if (!type || !['manual', 'filter'].includes(type)) {
            return res.status(400).send({ message: "List type must be 'manual' or 'filter'" });
        }

        // Validate businessId if provided
        if (businessId) {
            const business = await Business.findOne({ _id: businessId, ownerId: userId });
            if (!business) {
                return res.status(403).send({ message: "Business not found or you don't have permission" });
            }
        }

        // Check for duplicate name
        const existingList = await ContactList.findOne({
            user: userId,
            businessId: businessId || null,
            name: name.trim()
        });

        if (existingList) {
            return res.status(400).send({ message: "A list with this name already exists" });
        }

        const contactList = new ContactList({
            user: userId,
            businessId: businessId || null,
            name: name.trim(),
            description: description ? description.trim() : '',
            type,
            filterCriteria: type === 'filter' ? filterCriteria || {} : undefined,
            contactIds: type === 'manual' ? [] : undefined
        });

        const savedList = await contactList.save();
        return res.status(201).send(savedList);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).send({ message: "A list with this name already exists" });
        }
        logger.error("Error creating contact list:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};

// Get all contact lists for a user
exports.getAllContactLists = async (req, res) => {
    try {
        const userId = req.userId;
        const businessId = req.query.businessId || null;

        const query = { user: userId };
        if (businessId) {
            query.businessId = businessId;
        } else {
            // For personal lists, businessId should be null
            query.businessId = null;
        }

        const lists = await ContactList.find(query)
            .sort({ order: 1, createdAt: -1 })
            .select('-__v');

        return res.status(200).json({ lists });
    } catch (error) {
        logger.error("Error getting contact lists:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};

// Get a single contact list by ID
exports.getContactListById = async (req, res) => {
    try {
        const listId = req.params.id;
        const userId = req.userId;

        const list = await ContactList.findOne({ _id: listId, user: userId });
        if (!list) {
            return res.status(404).send({ message: "Contact list not found" });
        }

        return res.status(200).json(list);
    } catch (error) {
        logger.error("Error getting contact list:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};

// Get contacts for a contact list
exports.getContactsForList = async (req, res) => {
    try {
        const listId = req.params.id;
        const userId = req.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const list = await ContactList.findOne({ _id: listId, user: userId });
        if (!list) {
            return res.status(404).send({ message: "Contact list not found" });
        }

        let contacts = [];
        let total = 0;

        if (list.type === 'manual') {
            // Get manually added contacts
            const query = {
                _id: { $in: list.contactIds },
                user: userId
            };

            total = await Contact.countDocuments(query);
            contacts = await Contact.find(query)
                .populate('platformUserId', 'username firstName lastName avatar accountId')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select('-__v');
        } else if (list.type === 'filter') {
            // Get contacts matching filter criteria
            const query = { user: userId };

            // Apply filter criteria
            if (list.filterCriteria) {
                const criteria = list.filterCriteria;
                if (criteria.type) query.type = criteria.type;
                if (criteria.status) query.status = criteria.status;
                if (criteria.city) query.city = new RegExp(criteria.city, 'i');
                if (criteria.state) query.state = new RegExp(criteria.state, 'i');
                if (criteria.country) query.country = new RegExp(criteria.country, 'i');
                if (criteria.tags && criteria.tags.length > 0) {
                    query.tags = { $in: criteria.tags };
                }
            }

            total = await Contact.countDocuments(query);
            contacts = await Contact.find(query)
                .populate('platformUserId', 'username firstName lastName avatar accountId')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select('-__v');
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
    } catch (error) {
        logger.error("Error getting contacts for list:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};

// Update a contact list
exports.updateContactList = async (req, res) => {
    try {
        const listId = req.params.id;
        const userId = req.userId;
        const { name, description, filterCriteria, order } = req.body;

        const list = await ContactList.findOne({ _id: listId, user: userId });
        if (!list) {
            return res.status(404).send({ message: "Contact list not found" });
        }

        if (name && name.trim() && name.trim() !== list.name) {
            // Check for duplicate name
            const existingList = await ContactList.findOne({
                user: userId,
                businessId: list.businessId,
                name: name.trim(),
                _id: { $ne: listId }
            });

            if (existingList) {
                return res.status(400).send({ message: "A list with this name already exists" });
            }
            list.name = name.trim();
        }

        if (description !== undefined) {
            list.description = description ? description.trim() : '';
        }

        if (filterCriteria !== undefined && list.type === 'filter') {
            list.filterCriteria = filterCriteria || {};
        }

        if (order !== undefined) {
            list.order = order;
        }

        list.updatedAt = new Date();
        await list.save();

        return res.status(200).json(list);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).send({ message: "A list with this name already exists" });
        }
        logger.error("Error updating contact list:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};

// Add contact to manual list
exports.addContactToList = async (req, res) => {
    try {
        const listId = req.params.id;
        const contactId = req.params.contactId;
        const userId = req.userId;

        const list = await ContactList.findOne({ _id: listId, user: userId, type: 'manual' });
        if (!list) {
            return res.status(404).send({ message: "Contact list not found or is not a manual list" });
        }

        // Verify contact belongs to user
        const contact = await Contact.findOne({ _id: contactId, user: userId });
        if (!contact) {
            return res.status(404).send({ message: "Contact not found" });
        }

        // Check if contact is already in list
        if (list.contactIds.includes(contactId)) {
            return res.status(400).send({ message: "Contact is already in this list" });
        }

        list.contactIds.push(contactId);
        list.updatedAt = new Date();
        await list.save();

        return res.status(200).json(list);
    } catch (error) {
        logger.error("Error adding contact to list:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};

// Remove contact from manual list
exports.removeContactFromList = async (req, res) => {
    try {
        const listId = req.params.id;
        const contactId = req.params.contactId;
        const userId = req.userId;

        const list = await ContactList.findOne({ _id: listId, user: userId, type: 'manual' });
        if (!list) {
            return res.status(404).send({ message: "Contact list not found or is not a manual list" });
        }

        list.contactIds = list.contactIds.filter(id => id.toString() !== contactId);
        list.updatedAt = new Date();
        await list.save();

        return res.status(200).json(list);
    } catch (error) {
        logger.error("Error removing contact from list:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};

// Delete a contact list
exports.deleteContactList = async (req, res) => {
    try {
        const listId = req.params.id;
        const userId = req.userId;

        const list = await ContactList.findOneAndDelete({ _id: listId, user: userId });
        if (!list) {
            return res.status(404).send({ message: "Contact list not found" });
        }

        return res.status(200).send({ message: "Contact list deleted successfully" });
    } catch (error) {
        logger.error("Error deleting contact list:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};
