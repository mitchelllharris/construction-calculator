const nodemailer = require('nodemailer');
const crypto = require('crypto');
const logger = require('../utils/logger');

// Email service configuration
const getEmailConfig = () => {
    const service = process.env.EMAIL_SERVICE || 'console';
    
    if (service === 'console') {
        // Development mode - log to console
        return {
            service: 'console',
            transporter: null
        };
    }
    
    if (service === 'gmail') {
        return {
            service: 'gmail',
            transporter: nodemailer.createTransport({
                service: 'gmail',
                host: process.env.EMAIL_HOST || 'smtp.gmail.com',
                port: parseInt(process.env.EMAIL_PORT || '587'),
                secure: false,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD
                }
            })
        };
    }
    
    // Add support for other services as needed
    throw new Error(`Email service ${service} not configured`);
};

// Generate secure random token
const generateToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

// Email templates
const getVerificationEmailTemplate = (verificationUrl, username) => {
    return {
        subject: 'Verify Your Email Address',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0;">Email Verification</h1>
                </div>
                <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                    <p>Hi ${username},</p>
                    <p>Thank you for signing up! Please verify your email address by clicking the button below:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verificationUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
                    </div>
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
                    <p style="color: #666; font-size: 12px; margin-top: 30px;">This link will expire in 24 hours.</p>
                    <p style="color: #666; font-size: 12px;">If you didn't create an account, please ignore this email.</p>
                </div>
            </body>
            </html>
        `,
        text: `
            Hi ${username},
            
            Thank you for signing up! Please verify your email address by visiting this link:
            ${verificationUrl}
            
            This link will expire in 24 hours.
            
            If you didn't create an account, please ignore this email.
        `
    };
};

const getPasswordResetEmailTemplate = (resetUrl, username) => {
    return {
        subject: 'Reset Your Password',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0;">Password Reset</h1>
                </div>
                <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                    <p>Hi ${username},</p>
                    <p>You requested to reset your password. Click the button below to reset it:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" style="background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
                    </div>
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #f5576c;">${resetUrl}</p>
                    <p style="color: #666; font-size: 12px; margin-top: 30px;">This link will expire in 1 hour.</p>
                    <p style="color: #666; font-size: 12px;">If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
                </div>
            </body>
            </html>
        `,
        text: `
            Hi ${username},
            
            You requested to reset your password. Visit this link to reset it:
            ${resetUrl}
            
            This link will expire in 1 hour.
            
            If you didn't request a password reset, please ignore this email.
        `
    };
};

// Send email
const sendEmail = async (to, subject, html, text) => {
    const config = getEmailConfig();
    const from = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@example.com';
    
    if (config.service === 'console') {
        // Development mode - log to console
        logger.info('\n=== EMAIL (Console Mode) ===');
        logger.info(`To: ${to}`);
        logger.info(`From: ${from}`);
        logger.info(`Subject: ${subject}`);
        logger.info(`Text: ${text}`);
        logger.info('===========================\n');
        return { success: true, message: 'Email logged to console' };
    }
    
    try {
        const info = await config.transporter.sendMail({
            from: from,
            to: to,
            subject: subject,
            html: html,
            text: text
        });
        
        return { success: true, messageId: info.messageId };
    } catch (error) {
        logger.error('Email sending error:', error);
        throw error;
    }
};

// Send verification email
const sendVerificationEmail = async (user, token) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;
    
    const template = getVerificationEmailTemplate(verificationUrl, user.username);
    
    return await sendEmail(
        user.email,
        template.subject,
        template.html,
        template.text
    );
};

// Send password reset email
const sendPasswordResetEmail = async (user, token) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
    
    const template = getPasswordResetEmailTemplate(resetUrl, user.username);
    
    return await sendEmail(
        user.email,
        template.subject,
        template.html,
        template.text
    );
};

// Contact form email template
const getContactFormEmailTemplate = (contactForm) => {
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER || 'admin@example.com';
    
    return {
        subject: `New Contact Form Submission: ${contactForm.subject}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0;">New Contact Form Submission</h1>
                </div>
                <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #667eea; margin-top: 0;">${contactForm.subject}</h2>
                    <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>From:</strong> ${contactForm.name} (${contactForm.email})</p>
                        <p><strong>Date:</strong> ${new Date(contactForm.createdAt).toLocaleString()}</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                        <p><strong>Message:</strong></p>
                        <p style="white-space: pre-wrap; background: #f5f5f5; padding: 15px; border-radius: 5px;">${contactForm.message}</p>
                    </div>
                    <p style="color: #666; font-size: 12px;">Contact Form ID: ${contactForm._id}</p>
                </div>
            </body>
            </html>
        `,
        text: `
New Contact Form Submission

Subject: ${contactForm.subject}
From: ${contactForm.name} (${contactForm.email})
Date: ${new Date(contactForm.createdAt).toLocaleString()}

Message:
${contactForm.message}

Contact Form ID: ${contactForm._id}
        `
    };
};

// Send contact form notification email
const sendContactFormEmail = async (contactForm) => {
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
    
    if (!adminEmail) {
        logger.warn('ADMIN_EMAIL not configured. Contact form email will not be sent.');
        return { success: false, message: 'Admin email not configured' };
    }
    
    const template = getContactFormEmailTemplate(contactForm);
    
    return await sendEmail(
        adminEmail,
        template.subject,
        template.html,
        template.text
    );
};

module.exports = {
    generateToken,
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendContactFormEmail,
    sendEmail
};

