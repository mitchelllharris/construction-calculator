# Email Service Setup Guide

## Overview
The application supports email verification and password reset functionality. This guide explains how to configure the email service.

## Email Service Options

### 1. Console Mode (Development - Default)
In development, emails are logged to the console instead of being sent.

**Configuration:**
```env
EMAIL_SERVICE=console
```

### 2. Gmail SMTP
For Gmail, you need to use an App Password (not your regular password).

**Steps to set up Gmail:**
1. Enable 2-Step Verification on your Google Account
2. Go to Google Account → Security → App passwords
3. Generate an app password for "Mail"
4. Use the generated password in your `.env` file

**Configuration:**
```env
EMAIL_SERVICE=gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password-here
EMAIL_FROM=noreply@yourapp.com
```

### 3. SendGrid (Recommended for Production)
1. Sign up at [SendGrid](https://sendgrid.com)
2. Create an API key
3. Verify your sender email/domain

**Configuration:**
```env
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM=verified-sender@yourdomain.com
```

### 4. Mailgun
1. Sign up at [Mailgun](https://www.mailgun.com)
2. Verify your domain
3. Get your API key

**Configuration:**
```env
EMAIL_SERVICE=mailgun
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=your-domain.com
EMAIL_FROM=noreply@your-domain.com
```

## Required Environment Variables

Add to `server/.env`:

```env
# Email Service Configuration
EMAIL_SERVICE=console  # Options: console, gmail, sendgrid, mailgun
EMAIL_FROM=noreply@yourapp.com

# For Gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# For SendGrid
SENDGRID_API_KEY=your-api-key

# For Mailgun
MAILGUN_API_KEY=your-api-key
MAILGUN_DOMAIN=your-domain.com

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:5173
```

## Testing Email Functionality

### Development Mode (Console)
- Emails are logged to the server console
- Check your terminal output when testing

### Production Mode
- Configure a real email service (SendGrid recommended)
- Test with a real email address
- Check spam folder if emails don't arrive

## Email Templates

The application includes HTML email templates for:
- Email verification
- Password reset

Templates are automatically generated with your frontend URL and user information.

## Troubleshooting

### Emails not sending
1. Check email service configuration in `.env`
2. Verify credentials are correct
3. Check server logs for errors
4. For Gmail: Ensure App Password is used (not regular password)
5. For SendGrid/Mailgun: Verify API key and domain

### Links not working
1. Verify `FRONTEND_URL` is set correctly
2. Ensure frontend is running on the specified URL
3. Check CORS configuration allows the frontend URL

