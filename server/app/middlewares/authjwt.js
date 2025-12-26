const jwt = require('jsonwebtoken');
const config = require("../config/auth.config.js");
const db = require("../models");
const User = db.user;
const Role = db.role;
const logger = require("../utils/logger");

verifyToken = async (req, res, next) => {
    let token = req.headers['x-access-token'];

    if (!token) {
        return res.status(403).send({ message: 'No token provided!' });
    }

    // SECURITY: Explicitly specify algorithm to prevent algorithm confusion attacks
    jwt.verify(token, config.secret, { algorithms: ['HS256'] }, async (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'Unauthorized!' });
        }
        
        // SECURITY: Verify token version to invalidate tokens after password change
        try {
            const user = await User.findById(decoded.id).select('tokenVersion');
            if (!user) {
                return res.status(401).send({ message: 'User not found!' });
            }
            
            // Check if token version matches (prevents use of old tokens after password change)
            const tokenVersion = decoded.tokenVersion || 0;
            if (user.tokenVersion !== tokenVersion) {
                return res.status(401).send({ message: 'Token has been invalidated. Please login again.' });
            }
            
            req.userId = decoded.id;
            next();
        } catch (dbErr) {
            logger.error('Token verification error:', dbErr);
            return res.status(500).send({ message: 'Internal server error' });
        }
    });
};

// Optional token verification - doesn't fail if no token provided
verifyTokenOptional = async (req, res, next) => {
    let token = req.headers['x-access-token'];

    if (!token) {
        // No token provided, continue without setting userId
        req.userId = null;
        return next();
    }

    // SECURITY: Explicitly specify algorithm to prevent algorithm confusion attacks
    jwt.verify(token, config.secret, { algorithms: ['HS256'] }, async (err, decoded) => {
        if (err) {
            // Invalid token, continue without setting userId
            req.userId = null;
            return next();
        }
        
        // SECURITY: Verify token version to invalidate tokens after password change
        try {
            const user = await User.findById(decoded.id).select('tokenVersion');
            if (!user) {
                req.userId = null;
                return next();
            }
            
            // Check if token version matches (prevents use of old tokens after password change)
            const tokenVersion = decoded.tokenVersion || 0;
            if (user.tokenVersion !== tokenVersion) {
                req.userId = null;
                return next();
            }
            
            req.userId = decoded.id;
            next();
        } catch (dbErr) {
            logger.error('Token verification error:', dbErr);
            req.userId = null;
            return next();
        }
    });
};

isAdmin = async (req, res, next) => {
    try {
        // SECURITY: Sanitize userId to prevent NoSQL injection
        if (!req.userId || !/^[a-f\d]{24}$/i.test(req.userId.toString())) {
            return res.status(400).send({ message: 'Invalid user ID format' });
        }

        const user = await User.findById(req.userId);
        
        if (!user) {
            return res.status(404).send({ message: 'User not found!' });
        }

        // SECURITY: Use $in with validated ObjectIds to prevent NoSQL injection
        const roleIds = user.roles.filter(id => /^[a-f\d]{24}$/i.test(id.toString()));
        const roles = await Role.find({
            _id: { $in: roleIds }
        });

        for (let i = 0; i < roles.length; i++) {
            if (roles[i].name === 'admin') {
                return next();
            }
        }

        res.status(403).send({ message: "Require Admin Role!" });
    } catch (err) {
        logger.error('Admin check error:', err);
        const isDevelopment = process.env.NODE_ENV !== 'production';
        res.status(500).send({ 
            message: isDevelopment ? (err.message || 'Internal server error') : 'Internal server error' 
        });
    }
};

isModerator = async (req, res, next) => {
    try {
        // SECURITY: Sanitize userId to prevent NoSQL injection
        if (!req.userId || !/^[a-f\d]{24}$/i.test(req.userId.toString())) {
            return res.status(400).send({ message: 'Invalid user ID format' });
        }

        const user = await User.findById(req.userId);
        
        if (!user) {
            return res.status(404).send({ message: 'User not found!' });
        }

        // SECURITY: Use $in with validated ObjectIds to prevent NoSQL injection
        const roleIds = user.roles.filter(id => /^[a-f\d]{24}$/i.test(id.toString()));
        const roles = await Role.find({
            _id: { $in: roleIds }
        });

        for (let i = 0; i < roles.length; i++) {
            if (roles[i].name === 'moderator') {
                return next();
            }
        }
        
        res.status(403).send({ message: 'Require Moderator Role!' });
    } catch (err) {
        logger.error('Moderator check error:', err);
        const isDevelopment = process.env.NODE_ENV !== 'production';
        res.status(500).send({ 
            message: isDevelopment ? (err.message || 'Internal server error') : 'Internal server error' 
        });
    }
};

const authJwt = {
    verifyToken: verifyToken,
    verifyTokenOptional: verifyTokenOptional,
    isAdmin: isAdmin,
    isModerator: isModerator
};

module.exports = authJwt;