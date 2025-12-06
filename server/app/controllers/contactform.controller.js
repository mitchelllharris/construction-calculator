const db = require("../models");
const ContactForm = db.contactForm;
const { sendContactFormEmail } = require("../services/email.service");
const logger = require("../utils/logger");

// Submit contact form
exports.submitContact = async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        // Create contact form entry
        const contactForm = new ContactForm({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            subject: subject.trim(),
            message: message.trim(),
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('user-agent')
        });

        const savedContactForm = await contactForm.save();

        // Send email notification (non-blocking)
        try {
            await sendContactFormEmail(savedContactForm);
        } catch (emailError) {
            logger.error("Failed to send contact form email:", emailError);
            // Don't fail the submission if email fails
        }

        return res.status(200).send({
            message: "Thank you for your message! We'll get back to you soon.",
            id: savedContactForm._id
        });
    } catch (err) {
        logger.error("Contact form submission error:", err);
        const isDevelopment = process.env.NODE_ENV !== 'production';
        return res.status(500).send({
            message: isDevelopment ? (err.message || "Failed to submit contact form.") : "Failed to submit contact form. Please try again."
        });
    }
};

// Get all contact submissions (admin only)
exports.getAllContacts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const statusFilter = req.query.status || '';

        const query = {};
        if (statusFilter) {
            query.status = statusFilter;
        }

        const contactForms = await ContactForm.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('-__v');

        const total = await ContactForm.countDocuments(query);

        return res.status(200).json({
            contactForms,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit),
                limit
            }
        });
    } catch (err) {
        logger.error("Get all contact forms error:", err);
        const isDevelopment = process.env.NODE_ENV !== 'production';
        return res.status(500).send({
            message: isDevelopment ? (err.message || "Failed to get contact forms.") : "Failed to get contact forms. Please try again."
        });
    }
};

// Get contact form by ID (admin only)
exports.getContactFormById = async (req, res) => {
    try {
        const contactFormId = req.params.id;
        const mongoose = require('mongoose');
        
        if (!mongoose.Types.ObjectId.isValid(contactFormId)) {
            return res.status(400).send({ message: 'Invalid contact form ID format' });
        }

        const contactForm = await ContactForm.findById(contactFormId).select('-__v');
        
        if (!contactForm) {
            return res.status(404).send({ message: "Contact form not found" });
        }

        return res.status(200).json(contactForm);
    } catch (err) {
        logger.error("Get contact form by ID error:", err);
        const isDevelopment = process.env.NODE_ENV !== 'production';
        return res.status(500).send({
            message: isDevelopment ? (err.message || "Failed to get contact form.") : "Failed to get contact form. Please try again."
        });
    }
};

// Update contact form status (admin only)
exports.updateContactFormStatus = async (req, res) => {
    try {
        const contactFormId = req.params.id;
        const { status } = req.body;
        const mongoose = require('mongoose');
        
        if (!mongoose.Types.ObjectId.isValid(contactFormId)) {
            return res.status(400).send({ message: 'Invalid contact form ID format' });
        }

        const validStatuses = ['new', 'read', 'replied', 'archived'];
        if (!validStatuses.includes(status)) {
            return res.status(400).send({ message: 'Invalid status. Must be one of: ' + validStatuses.join(', ') });
        }

        const contactForm = await ContactForm.findByIdAndUpdate(
            contactFormId,
            { status },
            { new: true }
        ).select('-__v');

        if (!contactForm) {
            return res.status(404).send({ message: "Contact form not found" });
        }

        return res.status(200).json({
            message: "Contact form status updated successfully",
            contactForm
        });
    } catch (err) {
        logger.error("Update contact form status error:", err);
        const isDevelopment = process.env.NODE_ENV !== 'production';
        return res.status(500).send({
            message: isDevelopment ? (err.message || "Failed to update contact form status.") : "Failed to update contact form status. Please try again."
        });
    }
};

// Delete contact form (admin only)
exports.deleteContactForm = async (req, res) => {
    try {
        const contactFormId = req.params.id;
        const mongoose = require('mongoose');
        
        if (!mongoose.Types.ObjectId.isValid(contactFormId)) {
            return res.status(400).send({ message: 'Invalid contact form ID format' });
        }

        const contactForm = await ContactForm.findByIdAndDelete(contactFormId);
        
        if (!contactForm) {
            return res.status(404).send({ message: "Contact form not found" });
        }

        return res.status(200).send({ message: "Contact form deleted successfully" });
    } catch (err) {
        logger.error("Delete contact form error:", err);
        const isDevelopment = process.env.NODE_ENV !== 'production';
        return res.status(500).send({
            message: isDevelopment ? (err.message || "Failed to delete contact form.") : "Failed to delete contact form. Please try again."
        });
    }
};

