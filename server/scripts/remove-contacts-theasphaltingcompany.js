/**
 * Script to remove all contacts from user with email "theasphaltingcompany@gmail.com"
 * This script will delete itself after execution
 * 
 * Run with: node server/scripts/remove-contacts-theasphaltingcompany.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dbConfig = require('../app/config/db.config');

// Use MongoDB URI from .env, or fall back to dbConfig
const MONGODB_URI = process.env.MONGODB_URI || `mongodb://${dbConfig.HOST}:${dbConfig.PORT}/${dbConfig.DB}`;

// Get the script file path for self-deletion
const scriptPath = __filename;

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    removeContacts();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const db = require('../app/models');
const User = db.user;
const Contact = db.contact;

async function removeContacts() {
  try {
    console.log('Finding user with email "theasphaltingcompany@gmail.com"...\n');
    
    // Find the user by email (case-insensitive)
    const user = await User.findOne({ 
      email: 'theasphaltingcompany@gmail.com'.toLowerCase().trim() 
    });
    
    if (!user) {
      console.error('User with email "theasphaltingcompany@gmail.com" not found!');
      await mongoose.connection.close();
      deleteScript();
      process.exit(1);
    }
    
    console.log(`Found user: ${user.username || user.email} (ID: ${user._id})\n`);
    
    // Count contacts before deletion
    const contactCount = await Contact.countDocuments({ user: user._id });
    console.log(`Found ${contactCount} contact(s) to delete\n`);
    
    if (contactCount === 0) {
      console.log('No contacts found. Nothing to delete.\n');
      await mongoose.connection.close();
      deleteScript();
      process.exit(0);
    }
    
    // Delete all contacts for this user
    const result = await Contact.deleteMany({ user: user._id });
    
    console.log(`✓ Successfully deleted ${result.deletedCount} contact(s)\n`);
    
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed\n');
    
    // Delete the script
    deleteScript();
    
    console.log('Script execution completed and script file deleted.');
    process.exit(0);
  } catch (error) {
    console.error('Error removing contacts:', error);
    await mongoose.connection.close();
    deleteScript();
    process.exit(1);
  }
}

function deleteScript() {
  try {
    if (fs.existsSync(scriptPath)) {
      fs.unlinkSync(scriptPath);
      console.log('Script file deleted successfully.');
    }
  } catch (error) {
    console.error('Error deleting script file:', error);
  }
}
