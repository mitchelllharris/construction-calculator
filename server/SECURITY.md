# Security Implementation

This document outlines the security measures implemented in the authentication system.

## Critical Security Fixes

### 1. JWT Secret Management
- JWT secret is now stored in environment variable `JWT_SECRET`
- Never commit secrets to version control
- Generate a strong secret (minimum 32 characters) for production

**To generate a secure secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Role Assignment Protection
- Users can no longer assign themselves roles during signup
- All new users are automatically assigned the "user" role
- Role assignment must be done by administrators through a separate endpoint (to be implemented)

### 3. Rate Limiting
- **Login**: Maximum 5 attempts per 15 minutes per IP
- **Signup**: Maximum 3 attempts per hour per IP
- **General API**: Maximum 100 requests per 15 minutes per IP

### 4. Information Disclosure Prevention
- Generic error messages prevent user enumeration
- "Invalid username or password" used for both invalid user and invalid password
- Internal error details only shown in development mode

### 5. Input Validation
- Username: 3-30 characters, alphanumeric and underscores only
- Email: Valid email format required
- Password: Minimum 8 characters, must contain uppercase, lowercase, and number

### 6. Security Headers
- Helmet.js configured with security headers
- Content Security Policy (CSP) enabled
- XSS protection enabled
- Frame options configured

### 7. CORS Configuration
- Environment-based CORS origins
- Configure via `CORS_ORIGINS` environment variable
- Supports multiple origins (comma-separated)

### 8. Token Verification
- Frontend verifies token validity on app load
- Invalid/expired tokens are automatically removed
- Token verification endpoint: `/api/auth/verify`

## Environment Variables Required

Create a `.env` file in the `server` directory with:

```env
JWT_SECRET=your-strong-random-secret-min-32-characters
CORS_ORIGINS=http://localhost:5173,http://localhost:8081
NODE_ENV=development
MONGODB_URI=your-mongodb-connection-string
```

For production:
- Set `NODE_ENV=production`
- Use strong, randomly generated `JWT_SECRET`
- Configure `CORS_ORIGINS` with your production domain(s)
- Never commit `.env` file to version control

## Security Best Practices

1. **Always use HTTPS in production**
2. **Regularly rotate JWT secrets**
3. **Monitor rate limit violations**
4. **Keep dependencies updated**
5. **Use strong MongoDB credentials**
6. **Restrict MongoDB network access**
7. **Implement proper logging and monitoring**

## Additional Security Enhancements (Implemented)

### 9. Password Security
- **Bcrypt rounds increased**: From 8 to 12 for stronger password hashing
- **Enhanced password requirements**: Now requires special characters (@$!%*?&) in addition to uppercase, lowercase, and numbers
- **Password validation**: Consistent across signup, password reset, and password change

### 10. JWT Security Hardening
- **Algorithm validation**: Explicitly rejects algorithms other than HS256 to prevent algorithm confusion attacks
- **Token versioning**: Tokens include version number that increments on password change, invalidating old tokens
- **Secret validation**: Validates JWT secret strength in production (minimum 32 characters, rejects common weak secrets)

### 11. Account Lockout Protection
- **Failed login tracking**: Tracks login attempts per user
- **Automatic lockout**: Account locked for 30 minutes after 5 failed login attempts
- **Lock status check**: Prevents login attempts while account is locked

### 12. NoSQL Injection Prevention
- **ObjectId validation**: All user ID parameters validated before database queries
- **Search sanitization**: Admin search queries sanitized to remove MongoDB operators
- **Role ID validation**: Role IDs validated before use in queries

### 13. Request Size Limits
- **URL-encoded limit**: Added 5MB limit for URL-encoded form data (prevents DoS)
- **JSON limit**: Already limited to 5MB

### 14. Error Message Security
- **Information leakage prevention**: Error messages don't expose internal details in production
- **Generic error messages**: Consistent error messages prevent user enumeration
- **Development vs Production**: Detailed errors only in development mode

## Remaining Considerations

- Consider implementing refresh tokens for better security (short-lived access tokens + long-lived refresh tokens)
- Add password history check to prevent reuse of recent passwords
- Consider using httpOnly cookies instead of localStorage for tokens (requires additional setup, better XSS protection)
- Implement rate limiting per user account (in addition to IP-based)
- Add security event logging and monitoring
- Consider implementing 2FA (Two-Factor Authentication) for sensitive accounts

