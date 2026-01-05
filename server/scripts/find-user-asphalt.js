/**
 * Script to find user with email containing "asphalt" or "theasphalt"
 * This script will delete itself after execution
 * 
 * Run with: node server/scripts/find-user-asphalt.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const dbConfig = require('../app/config/db.config');

// Use MongoDB URI from .env, or fall back to dbConfig
const MONGODB_URI = process.env.MONGODB_URI || `mongodb://${dbConfig.HOST}:${dbConfig.PORT}/${dbConfig.DB}`;

// Get the script file path for self-deletion
const scriptPath = __filename;

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    findUser();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const db = require('../app/models');
const User = db.user;
const Contact = db.contact;

async function findUser() {
  try {
    console.log('Searching for users with email containing "asphalt"...\n');
    
    // Search for users with email containing "asphalt" (case-insensitive)
    const users = await User.find({
      $or: [
        { email: { $regex: /asphalt/i } },
        { username: { $regex: /asphalt/i } }
      ]
    }).select('username email _id');
    
    if (users.length === 0) {
      console.log('No users found with "asphalt" in email or username.\n');
      await mongoose.connection.close();
      deleteScript();
      process.exit(0);
    }
    
    console.log(`Found ${users.length} user(s):\n`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. Username: ${user.username || 'N/A'}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   ID: ${user._id}\n`);
    });
    
    // If we found the user, delete their contacts
    const targetUser = users.find(u => 
      u.email && u.email.toLowerCase().includes('theasphaltingcompany')
    ) || users.find(u => 
      u.email && u.email.toLowerCase().includes('theasphaltcompany')
    ) || users[0]; // Use first match if exact not found
    
    if (targetUser) {
      console.log(`\nDeleting contacts for: ${targetUser.username || targetUser.email} (ID: ${targetUser._id})\n`);
      
      const contactCount = await Contact.countDocuments({ user: targetUser._id });
      console.log(`Found ${contactCount} contact(s) to delete\n`);
      
      if (contactCount > 0) {
        const result = await Contact.deleteMany({ user: targetUser._id });
        console.log(`✓ Successfully deleted ${result.deletedCount} contact(s)\n`);
      } else {
        console.log('No contacts found. Nothing to delete.\n');
      }
    }
    
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed\n');
    
    // Delete the script
    deleteScript();
    
    console.log('Script execution completed and script file deleted.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
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
