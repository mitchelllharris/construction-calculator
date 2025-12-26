const db = require("../models");
const mongoose = require('mongoose');
const logger = require("../utils/logger");
const User = db.user;
const Contact = db.contact;
const Interaction = db.interaction;

// Create a new interaction
exports.createInteraction = async (req, res) => {
    try {
        const { contactId, type, direction, subject, description, duration, date, status } = req.body;
        
        // Verify contact belongs to user
        const contact = await Contact.findOne({
            _id: contactId,
            user: req.userId
        });
        
        if (!contact) {
            return res.status(404).send({ message: "Contact not found" });
        }

        const interaction = new Interaction({
            user: req.userId,
            contact: contactId,
            type,
            direction,
            subject,
            description,
            duration,
            date: date || new Date(),
            status: status || 'completed'
        });

        const savedInteraction = await interaction.save();
        return res.status(201).send(savedInteraction);
    } catch (error) {
        logger.error("Error creating interaction:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};

// Get all interactions for a contact
exports.getContactInteractions = async (req, res) => {
    try {
        const { contactId } = req.params;

        // Verify contact belongs to user
        const contact = await Contact.findOne({
            _id: contactId,
            user: req.userId
        });

        if (!contact) {
            return res.status(404).send({ message: "Contact not found" });
        }

        const interactions = await Interaction.find({
            contact: contactId,
            user: req.userId
        })
        .sort({ date: -1 })
        .select('-__v');

        return res.status(200).json(interactions);
    } catch (error) {
        logger.error("Error getting interactions:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};

// Get a single interaction by ID
exports.getInteractionById = async (req, res) => {
    try {
        const interaction = await Interaction.findOne({
            _id: req.params.id,
            user: req.userId
        });

        if (!interaction) {
            return res.status(404).send({ message: "Interaction not found" });
        }

        return res.status(200).send(interaction);
    } catch (error) {
        logger.error("Error getting interaction:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};

// Update an interaction
exports.updateInteraction = async (req, res) => {
    try {
        const { type, direction, subject, description, duration, date, status } = req.body;

        const interaction = await Interaction.findOneAndUpdate(
            {
                _id: req.params.id,
                user: req.userId
            },
            {
                type,
                direction,
                subject,
                description,
                duration,
                date,
                status,
                updatedAt: new Date()
            },
            { new: true }
        );

        if (!interaction) {
            return res.status(404).send({ message: "Interaction not found" });
        }

        return res.status(200).send(interaction);
    } catch (error) {
        logger.error("Error updating interaction:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};

// Delete an interaction
exports.deleteInteraction = async (req, res) => {
    try {
        const interaction = await Interaction.findOneAndDelete({
            _id: req.params.id,
            user: req.userId
        });

        if (!interaction) {
            return res.status(404).send({ message: "Interaction not found" });
        }

        return res.status(200).send({ message: "Interaction deleted successfully" });
    } catch (error) {
        logger.error("Error deleting interaction:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
};

