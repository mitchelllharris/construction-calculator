# Production-Ready Web Application Boilerplate

A secure, production-ready full-stack web application boilerplate with authentication, user management, and essential features. Built with React, Node.js, Express, and MongoDB.

## Features

### Authentication & Security
- **Secure JWT-based authentication** with token versioning
- **Email verification** system
- **Password reset** functionality with secure token handling
- **Account lockout protection** (5 failed attempts = 30min lockout)
- **Rate limiting** on all endpoints (login, signup, API)
- **Input validation & sanitization** (XSS, NoSQL injection prevention)
- **Security headers** (Helmet.js)
- **CORS** configuration
- **Password requirements**: 8+ chars, uppercase, lowercase, number, special character

### User Management
- **User registration** with email verification
- **Profile management** (username, email, first name, last name)
- **Password change** functionality
- **Role-based access control** (User, Moderator, Admin)
- **Admin dashboard** with user management
- **User statistics** and filtering

### Frontend Features
- **React 19** with Vite
- **React Router** for navigation
- **Toast notifications** system
- **Form validation** with real-time feedback
- **Loading states** and skeleton loaders
- **Responsive design** with Tailwind CSS
- **Protected routes** with authentication checks

### Additional Features
- **Contact form** with email notifications
- **Error boundaries** for graceful error handling
- **404 Not Found** page
- **Landing pages** (Home, About, Pricing)
- **Footer component** with navigation

## Tech Stack

### Frontend
- React 19
- Vite
- React Router DOM
- Tailwind CSS
- React Icons

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT (jsonwebtoken)
- Bcryptjs for password hashing
- Express Validator
- Helmet.js for security
- Express Rate Limit
- Nodemailer for emails

## Quick Start

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd playground
   ```

2. **Install server dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../vite-playground
   npm install
   ```

4. **Configure environment variables**

   Copy the example environment files:
   ```bash
   # Server
   cd ../server
   cp .env.example .env
   
   # Frontend
   cd ../vite-playground
   cp .env.example .env
   ```

   Edit the `.env` files with your configuration (see [Environment Setup](#environment-setup))

5. **Start the development servers**

   Terminal 1 - Backend:
   ```bash
   cd server
   npm run dev
   ```

   Terminal 2 - Frontend:
   ```bash
   cd vite-playground
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8080

## Environment Setup

### Server Environment Variables (`server/.env`)

```env
# Database
MONGODB_URI=mongodb://localhost:27017/your-database-name
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database-name

# Authentication
JWT_SECRET=your-strong-random-secret-minimum-32-characters

# CORS Configuration
CORS_ORIGINS=http://localhost:5173,http://localhost:8081

# Node Environment
NODE_ENV=development

# Email Service Configuration
EMAIL_SERVICE=console
EMAIL_FROM=noreply@yourapp.com

# For Gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:5173

# Admin Email (for contact form notifications)
ADMIN_EMAIL=admin@yourapp.com
```

### Frontend Environment Variables (`vite-playground/.env`)

```env
VITE_API_BASE_URL=http://localhost:8080
```

**Important**: 
- Generate a strong JWT_SECRET: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Never commit `.env` files to version control
- See `server/SECURITY.md` and `server/EMAIL_SETUP.md` for detailed configuration

## Project Structure

```
playground/
├── server/                 # Backend application
│   ├── app/
│   │   ├── config/         # Configuration files
│   │   ├── controllers/    # Route controllers
│   │   ├── middlewares/    # Custom middlewares
│   │   ├── models/         # Mongoose models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic services
│   │   └── utils/          # Utility functions
│   ├── .env.example        # Environment variables template
│   ├── server.js          # Express server entry point
│   ├── package.json
│   ├── SECURITY.md        # Security documentation
│   └── EMAIL_SETUP.md     # Email configuration guide
│
├── vite-playground/        # Frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── contexts/      # React contexts (Auth, Toast)
│   │   ├── hooks/         # Custom React hooks
│   │   ├── layouts/       # Layout components
│   │   ├── pages/         # Page components
│   │   ├── utils/         # Utility functions
│   │   ├── config/        # Configuration files
│   │   └── App.jsx        # Main App component
│   ├── public/            # Static assets
│   ├── .env.example       # Environment variables template
│   ├── package.json
│   └── vite.config.js
│
└── README.md              # This file
```

## Development Workflow

### Running in Development

1. **Start MongoDB** (if using local instance)
2. **Start backend server**: `cd server && npm run dev`
3. **Start frontend**: `cd vite-playground && npm run dev`

### Building for Production

**Frontend:**
```bash
cd vite-playground
npm run build
```

The built files will be in `vite-playground/dist/`

**Backend:**
```bash
cd server
npm start
```

## API Documentation

See [API.md](API.md) for complete API documentation including:
- All endpoints with request/response examples
- Authentication requirements
- Error handling
- Rate limiting information
- Security notes

## API Endpoints Summary

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login
- `GET /api/auth/verify` - Verify JWT token
- `POST /api/auth/verify-email` - Verify email with token
- `POST /api/auth/resend-verification` - Resend verification email
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

### User Profile
- `GET /api/user/profile` - Get user profile (authenticated)
- `PUT /api/user/profile` - Update user profile (authenticated)
- `PUT /api/user/change-password` - Change password (authenticated)
- `GET /api/user/verification-status` - Check email verification status

### Contact Form
- `POST /api/contact-form` - Submit contact form (public)

### Admin (Admin only)
- `GET /api/admin/users` - Get all users with pagination
- `GET /api/admin/users/:id` - Get user by ID
- `PUT /api/admin/users/:id` - Update user
- `PUT /api/admin/users/:id/role` - Assign roles
- `DELETE /api/admin/users/:id` - Delete user
- `POST /api/admin/users/:id/verify-email` - Manually verify email
- `GET /api/admin/stats` - Get user statistics
- `GET /api/admin/contact-forms` - Get all contact form submissions
- `GET /api/admin/contact-forms/:id` - Get contact form by ID
- `PUT /api/admin/contact-forms/:id/status` - Update contact form status
- `DELETE /api/admin/contact-forms/:id` - Delete contact form

### Health Check
- `GET /api/health` - Server health status

## Security Features

This boilerplate includes comprehensive security measures:

- **JWT Secret Validation** - Enforces strong secrets in production
- **Password Hashing** - Bcrypt with 12 rounds
- **Rate Limiting** - Prevents brute force attacks
- **Input Validation** - Prevents XSS and NoSQL injection
- **Account Lockout** - Protects against brute force
- **Token Versioning** - Invalidates tokens on password change
- **Security Headers** - Helmet.js configuration
- **CORS Protection** - Environment-based origin whitelist

See `server/SECURITY.md` for detailed security documentation.

## Email Configuration

The application supports multiple email service providers:
- Console (development - logs to console)
- Gmail (SMTP)
- SendGrid (recommended for production)
- Mailgun

See `server/EMAIL_SETUP.md` for detailed email configuration.

## Testing

The application includes testing infrastructure for both frontend and backend.

### Frontend Tests

Frontend tests use **Vitest** with React Testing Library.

**Run tests:**
```bash
cd vite-playground
npm test
```

**Run tests in watch mode:**
```bash
npm test -- --watch
```

**Run tests with UI:**
```bash
npm run test:ui
```

**Generate coverage report:**
```bash
npm run test:coverage
```

**Example test location:** `vite-playground/src/components/__tests__/Button.test.jsx`

### Backend Tests

Backend tests use **Jest** with Supertest for API testing.

**Run tests:**
```bash
cd server
npm test
```

**Run tests in watch mode:**
```bash
npm run test:watch
```

**Generate coverage report:**
```bash
npm run test:coverage
```

**Example test location:** `server/app/__tests__/auth.test.js`

### Test Coverage Goals

- **Frontend:** Aim for 80%+ coverage on components and utilities
- **Backend:** Aim for 70%+ coverage on controllers and services
- Critical paths (authentication, user management) should have higher coverage

### Writing Tests

- Frontend: Use React Testing Library for component testing
- Backend: Use Jest and Supertest for API endpoint testing
- Follow existing test patterns in example test files

## Docker Deployment

The project includes Docker configuration for easy local development and deployment.

### Using Docker Compose (Recommended for Local Development)

1. **Start all services:**
   ```bash
   docker-compose up -d
   ```

2. **View logs:**
   ```bash
   docker-compose logs -f
   ```

3. **Stop services:**
   ```bash
   docker-compose down
   ```

4. **Rebuild after changes:**
   ```bash
   docker-compose up -d --build
   ```

### Individual Docker Builds

**Backend:**
```bash
cd server
docker build -t boilerplate-backend .
docker run -p 8080:8080 --env-file .env boilerplate-backend
```

**Frontend:**
```bash
cd vite-playground
docker build -t boilerplate-frontend .
docker run -p 3000:80 boilerplate-frontend
```

See `docker-compose.yml` for environment variable configuration.

## Pre-Production Checklist

Before deploying to production, ensure you've completed the following:

### 1. Environment Variables

**Generate a strong JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Required environment variables:**
- ✅ `NODE_ENV=production`
- ✅ `JWT_SECRET` - Strong random secret (32+ characters)
- ✅ `CORS_ORIGINS` - Your production domain(s), comma-separated
- ✅ `MONGODB_URI` - Production MongoDB connection string
- ✅ `FRONTEND_URL` - Your production frontend URL
- ✅ `EMAIL_SERVICE` - Email service provider (Gmail, SendGrid, etc.)
- ✅ `EMAIL_USER` - Email service username
- ✅ `EMAIL_PASSWORD` - Email service password/app password
- ✅ `ADMIN_EMAIL` - Admin email for notifications

### 2. HTTPS/SSL Configuration

- ✅ **Use HTTPS in production** (required for JWT security)
- ✅ Configure SSL certificates (Let's Encrypt, Cloudflare, etc.)
- ✅ Ensure MongoDB Atlas uses TLS/SSL
- ✅ Redirect HTTP to HTTPS

### 3. Database Security

- ✅ Use strong MongoDB credentials
- ✅ Restrict MongoDB network access to your server IPs only
- ✅ Enable MongoDB Atlas IP whitelist
- ✅ Use MongoDB Atlas connection string with authentication
- ✅ Enable MongoDB Atlas audit logging (optional but recommended)

### 4. Security Hardening

- ✅ Review and update `CORS_ORIGINS` with production domains only
- ✅ Verify rate limiting is appropriate for your use case
- ✅ Ensure `.env` files are in `.gitignore` and never committed
- ✅ Review `server/SECURITY.md` for all security features
- ✅ Test authentication flows in production-like environment

### 5. Monitoring & Logging

- ✅ Set up error tracking (e.g., Sentry, LogRocket)
- ✅ Configure uptime monitoring (e.g., UptimeRobot, Pingdom)
- ✅ Set up log aggregation (e.g., Loggly, Papertrail)
- ✅ Monitor rate limit violations
- ✅ Set up alerts for critical errors

### 6. Dependencies & Updates

- ✅ Run `npm audit` to check for vulnerabilities
- ✅ Update all dependencies to latest stable versions
- ✅ Review security advisories for your dependencies
- ✅ Test after dependency updates

### 7. Testing

- ✅ Run all tests: `npm test` (frontend and backend)
- ✅ Test authentication flows (signup, login, password reset)
- ✅ Test email verification
- ✅ Test admin functionality
- ✅ Test contact form submission
- ✅ Verify health check endpoint: `/api/health`

### 8. Performance

- ✅ Test API response times
- ✅ Verify database query performance
- ✅ Test with expected load
- ✅ Configure CDN for frontend assets (if applicable)

### 9. Documentation

- ✅ Update `README.md` with your project-specific information
- ✅ Update `API.md` if you've modified endpoints
- ✅ Document any custom environment variables
- ✅ Update deployment instructions if needed

### 10. Backup & Recovery

- ✅ Set up MongoDB Atlas automated backups
- ✅ Document recovery procedures
- ✅ Test backup restoration process
- ✅ Document rollback procedures

## Deployment

See `DEPLOYMENT.md` for comprehensive deployment instructions including:
- Environment setup
- Build instructions
- Server deployment
- Frontend deployment
- Database configuration
- SSL/HTTPS setup

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:
- Code style and conventions
- How to submit pull requests
- Testing requirements
- Commit message format

## License

This project is licensed under the MIT License - see the `LICENSE` file for details.

## Additional Resources

- [API Documentation](API.md) - Complete API reference
- [Deployment Guide](DEPLOYMENT.md) - Deployment instructions
- [Contributing Guide](CONTRIBUTING.md) - How to contribute
- [Security Documentation](server/SECURITY.md) - Security features
- [Email Setup Guide](server/EMAIL_SETUP.md) - Email configuration

## Support

For issues, questions, or contributions, please open an issue on GitHub.

## Acknowledgments

- Built with modern web technologies
- Security best practices from OWASP
- Production-ready architecture patterns

---

**Note**: This is a boilerplate template. Customize it for your specific needs and always review security settings before deploying to production.

