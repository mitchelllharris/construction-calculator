# API Documentation

Complete API reference for the Production-Ready Boilerplate backend.

## Base URL

```
http://localhost:8080/api
```

Production: `https://api.yourdomain.com/api`

## Authentication

Most endpoints require authentication via JWT token. Include the token in the request header:

```
x-access-token: <your-jwt-token>
```

## Rate Limiting

- **Login**: 5 attempts per 15 minutes per IP
- **Signup**: 3 attempts per hour per IP
- **Contact Form**: 5 submissions per hour per IP
- **General API**: 100 requests per 15 minutes per IP

## Endpoints

### Authentication

#### POST `/api/auth/signup`

Register a new user account.

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response (201):**
```json
{
  "message": "User was registered successfully! Please check your email to verify your account."
}
```

**Validation Rules:**
- `username`: 3-30 characters, alphanumeric and underscores only
- `email`: Valid email format with TLD of 3+ characters
- `password`: 8+ characters, must contain uppercase, lowercase, number, and special character (@$!%*?&)

**Errors:**
- `400`: Validation error or duplicate username/email
- `429`: Too many signup attempts

---

#### POST `/api/auth/signin`

Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "username": "johndoe",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "username": "johndoe",
  "email": "john@example.com",
  "roles": ["user"],
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**
- `401`: Invalid credentials or account locked
- `429`: Too many login attempts

---

#### GET `/api/auth/verify`

Verify JWT token validity.

**Headers:**
```
x-access-token: <jwt-token>
```

**Response (200):**
```json
{
  "valid": true,
  "userId": "507f1f77bcf86cd799439011"
}
```

**Errors:**
- `401`: Invalid or expired token

---

#### POST `/api/auth/verify-email`

Verify email address with token from email.

**Request Body:**
```json
{
  "token": "verification-token-from-email"
}
```

**Response (200):**
```json
{
  "message": "Email verified successfully"
}
```

**Errors:**
- `400`: Invalid or expired token
- `404`: User not found

---

#### POST `/api/auth/resend-verification`

Resend email verification link.

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response (200):**
```json
{
  "message": "Verification email sent"
}
```

**Rate Limit:** 3 requests per hour per IP

---

#### POST `/api/auth/forgot-password`

Request password reset email.

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response (200):**
```json
{
  "message": "If an account exists with this email, a password reset link has been sent."
}
```

**Rate Limit:** 3 requests per hour per IP

---

#### POST `/api/auth/reset-password`

Reset password with token from email.

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "password": "NewSecurePass123!"
}
```

**Response (200):**
```json
{
  "message": "Password reset successfully"
}
```

**Errors:**
- `400`: Invalid or expired token
- `400`: Password validation failed

---

### User Profile

#### GET `/api/user/profile`

Get current user's profile information.

**Headers:**
```
x-access-token: <jwt-token>
```

**Response (200):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "username": "johndoe",
  "email": "john@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "emailVerified": true,
  "roles": ["user"],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Errors:**
- `401`: Not authenticated

---

#### PUT `/api/user/profile`

Update user profile.

**Headers:**
```
x-access-token: <jwt-token>
```

**Request Body:**
```json
{
  "username": "newusername",
  "email": "newemail@example.com",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Validation:**
- `username`: Optional, 3-30 characters if provided
- `email`: Optional, valid email format if provided
- `firstName`: Required, 1-50 characters
- `lastName`: Required, 1-50 characters

**Response (200):**
```json
{
  "message": "Profile updated successfully",
  "user": { ... }
}
```

**Note:** Changing email will reset `emailVerified` to `false` and send a new verification email.

---

#### PUT `/api/user/change-password`

Change user password.

**Headers:**
```
x-access-token: <jwt-token>
```

**Request Body:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewSecurePass123!"
}
```

**Response (200):**
```json
{
  "message": "Password changed successfully"
}
```

**Errors:**
- `400`: Current password incorrect
- `400`: New password validation failed

**Note:** Changing password invalidates all existing JWT tokens.

---

#### GET `/api/user/verification-status`

Check email verification status.

**Headers:**
```
x-access-token: <jwt-token>
```

**Response (200):**
```json
{
  "emailVerified": true
}
```

---

### Contact Form

#### POST `/api/contact-form`

Submit contact form (public endpoint).

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "subject": "Question about service",
  "message": "I have a question about..."
}
```

**Validation:**
- `name`: Required, 2-100 characters
- `email`: Required, valid email format
- `subject`: Required, 3-200 characters
- `message`: Required, 10-5000 characters

**Response (200):**
```json
{
  "message": "Thank you for your message! We'll get back to you soon.",
  "id": "507f1f77bcf86cd799439011"
}
```

**Rate Limit:** 5 submissions per hour per IP

---

### Admin Endpoints

All admin endpoints require admin role.

#### GET `/api/admin/users`

Get all users with pagination and filtering.

**Headers:**
```
x-access-token: <admin-jwt-token>
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `status`: Filter by status
- `search`: Search by username or email

**Response (200):**
```json
{
  "users": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "pages": 10,
    "limit": 10
  }
}
```

---

#### GET `/api/admin/users/:id`

Get user by ID.

**Response (200):**
```json
{
  "id": "...",
  "username": "johndoe",
  "email": "john@example.com",
  ...
}
```

---

#### PUT `/api/admin/users/:id`

Update user (admin).

**Request Body:**
```json
{
  "username": "newusername",
  "email": "newemail@example.com",
  "firstName": "John",
  "lastName": "Doe"
}
```

---

#### PUT `/api/admin/users/:id/role`

Assign roles to user.

**Request Body:**
```json
{
  "roles": ["user", "moderator"]
}
```

**Valid roles:** `user`, `moderator`, `admin`

---

#### DELETE `/api/admin/users/:id`

Delete user.

**Response (200):**
```json
{
  "message": "User deleted successfully"
}
```

---

#### POST `/api/admin/users/:id/verify-email`

Manually verify user email.

**Response (200):**
```json
{
  "message": "Email verified successfully"
}
```

---

#### GET `/api/admin/stats`

Get user statistics.

**Response (200):**
```json
{
  "totalUsers": 100,
  "verifiedUsers": 85,
  "unverifiedUsers": 15,
  "usersByRole": {
    "user": 90,
    "moderator": 5,
    "admin": 5
  }
}
```

---

#### GET `/api/admin/contact-forms`

Get all contact form submissions.

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `status`: Filter by status (new, read, replied, archived)

---

#### GET `/api/admin/contact-forms/:id`

Get contact form by ID.

---

#### PUT `/api/admin/contact-forms/:id/status`

Update contact form status.

**Request Body:**
```json
{
  "status": "read"
}
```

**Valid statuses:** `new`, `read`, `replied`, `archived`

---

#### DELETE `/api/admin/contact-forms/:id`

Delete contact form submission.

---

### Health Check

#### GET `/api/health`

Server health check endpoint (public).

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "uptimeFormatted": "1h",
  "database": {
    "status": "connected",
    "connected": true
  },
  "server": {
    "environment": "production",
    "nodeVersion": "v18.0.0"
  }
}
```

**Response (503):** Server unhealthy (database disconnected)

---

## Error Responses

All errors follow this format:

```json
{
  "message": "Error description"
}
```

### Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized (authentication required or failed)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `429`: Too Many Requests (rate limit exceeded)
- `500`: Internal Server Error

### Error Examples

**Validation Error (400):**
```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address"
    }
  ]
}
```

**Unauthorized (401):**
```json
{
  "message": "Unauthorized! Access Token was missing or invalid!"
}
```

**Rate Limit (429):**
```json
{
  "message": "Too many login attempts from this IP, please try again after 15 minutes."
}
```

---

## Authentication Flow

1. User registers via `/api/auth/signup`
2. User receives verification email
3. User verifies email via `/api/auth/verify-email`
4. User logs in via `/api/auth/signin` and receives JWT token
5. User includes token in `x-access-token` header for protected endpoints
6. Token expires after 24 hours (default)
7. User can refresh by logging in again

---

## Security Notes

- All passwords are hashed using bcrypt (12 rounds)
- JWT tokens include version number (invalidated on password change)
- Rate limiting prevents brute force attacks
- Input validation prevents XSS and NoSQL injection
- CORS is configured for specific origins only
- Security headers are set via Helmet.js

---

## Testing

Use the health check endpoint to verify API availability:

```bash
curl http://localhost:8080/api/health
```

For authenticated endpoints, include the JWT token:

```bash
curl -H "x-access-token: <your-token>" http://localhost:8080/api/user/profile
```

---

For more information, see:
- `README.md` - Setup and configuration
- `DEPLOYMENT.md` - Deployment instructions
- `server/SECURITY.md` - Security documentation

