// SECURITY: Validate JWT secret strength
const validateJWTSecret = () => {
    const secret = process.env.JWT_SECRET;
    const isProduction = process.env.NODE_ENV === 'production';
    const logger = require('../utils/logger');
    
    if (!secret) {
        if (isProduction) {
            throw new Error('JWT_SECRET environment variable is required in production');
        }
        logger.warn('⚠️  WARNING: JWT_SECRET not set. Using weak default secret. This is UNSAFE for production!');
        return 'development-secret-key-change-in-production';
    }
    
    // Validate secret strength
    if (secret.length < 32) {
        if (isProduction) {
            throw new Error('JWT_SECRET must be at least 32 characters long in production');
        }
        logger.warn('⚠️  WARNING: JWT_SECRET is too short. Should be at least 32 characters.');
    }
    
    // Check for common weak secrets
    const weakSecrets = ['secret', 'password', '123456', 'development-secret-key-change-in-production'];
    if (weakSecrets.includes(secret.toLowerCase())) {
        if (isProduction) {
            throw new Error('JWT_SECRET cannot be a common weak secret in production');
        }
        logger.warn('⚠️  WARNING: JWT_SECRET appears to be a weak/default secret.');
    }
    
    return secret;
};

module.exports = {
    secret: validateJWTSecret()
};