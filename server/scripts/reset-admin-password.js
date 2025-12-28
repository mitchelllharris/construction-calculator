require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const db = require('../app/models');

const User = db.user;
const Role = db.role;

const newPassword = 'Test1234!';

async function resetAdminPassword() {
    try {
        // Connect to MongoDB using the same connection method as server.js
        const dbConfig = require('../app/config/db.config');
        const MONGODB_URI = process.env.MONGODB_URI || 
            `mongodb://${dbConfig.HOST}:${dbConfig.PORT}/${dbConfig.DB}`;
        
        // Production-ready connection options (same as server.js)
        const connectionOptions = {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 30000,
        };

        // For Atlas connections
        const isAtlas = MONGODB_URI.includes('mongodb+srv://') || (MONGODB_URI.includes('mongodb://') && MONGODB_URI.includes('ssl=true'));
        if (isAtlas) {
            if (MONGODB_URI.includes('mongodb+srv://')) {
                connectionOptions.tls = true;
            }
            connectionOptions.retryWrites = true;
            connectionOptions.w = 'majority';
        }

        await mongoose.connect(MONGODB_URI, connectionOptions);
        console.log('Connected to MongoDB');

        // Find admin role
        const adminRole = await Role.findOne({ name: 'admin' });
        if (!adminRole) {
            console.error('Admin role not found. Please create the admin role first.');
            process.exit(1);
        }

        // Find user with admin role
        const adminUser = await User.findOne({ roles: adminRole._id })
            .populate('roles');

        if (!adminUser) {
            console.error('No admin user found. Please create an admin user first.');
            process.exit(1);
        }

        console.log(`Found admin user: ${adminUser.username} (${adminUser.email})`);

        // Hash the new password
        const hashedPassword = bcrypt.hashSync(newPassword, 12);

        // Update password and reset lockout
        adminUser.password = hashedPassword;
        adminUser.loginAttempts = 0;
        adminUser.lockUntil = undefined;
        adminUser.tokenVersion = (adminUser.tokenVersion || 0) + 1; // Invalidate existing tokens

        await adminUser.save();

        console.log(`\n✅ Password reset successful!`);
        console.log(`Username: ${adminUser.username}`);
        console.log(`Email: ${adminUser.email}`);
        console.log(`New password: ${newPassword}`);
        console.log(`\n⚠️  All existing tokens have been invalidated. Please log in again.`);

        process.exit(0);
    } catch (error) {
        console.error('Error resetting password:', error);
        process.exit(1);
    }
}

resetAdminPassword();

