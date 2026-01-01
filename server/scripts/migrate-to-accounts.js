/**
 * Migration script to convert existing data to unified account system
 * 
 * This script:
 * 1. Generates accountId for all existing users
 * 2. Generates accountId for all existing businesses
 * 3. Creates pages for each user profile
 * 4. Creates pages for each business
 * 5. Updates all posts with pageId and authorAccountId
 * 
 * Run with: node server/scripts/migrate-to-accounts.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const dbConfig = require('../app/config/db.config');

// Use MongoDB URI from .env, or fall back to dbConfig
const MONGODB_URI = process.env.MONGODB_URI || `mongodb://${dbConfig.HOST}:${dbConfig.PORT}/${dbConfig.DB}`;

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    runMigration();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const db = require('../app/models');
const User = db.user;
const Business = db.business;
const Post = db.post;
const Page = db.page;
const { generateAccountId, generatePageId } = require('../app/utils/accountId');

async function runMigration() {
  try {
    console.log('Starting migration to unified account system...\n');

    // Step 1: Generate accountId for all users
    console.log('Step 1: Generating accountIds for users...');
    const users = await User.find({ accountId: { $exists: false } });
    let accountIdCounter = 1;
    
    // Find highest existing accountId
    const [highestUser, highestBusiness] = await Promise.all([
      User.findOne({ accountId: { $exists: true } }).sort({ accountId: -1 }).select('accountId').lean(),
      Business.findOne({ accountId: { $exists: true } }).sort({ accountId: -1 }).select('accountId').lean()
    ]);
    
    const highestAccountId = Math.max(
      highestUser?.accountId || 0,
      highestBusiness?.accountId || 0
    );
    accountIdCounter = highestAccountId + 1;

    for (const user of users) {
      user.accountId = accountIdCounter++;
      await user.save();
      console.log(`  - User ${user.username || user.email}: accountId ${user.accountId}`);
    }
    console.log(`  ✓ Generated accountIds for ${users.length} users\n`);

    // Step 2: Generate accountId for all businesses
    console.log('Step 2: Generating accountIds for businesses...');
    const businesses = await Business.find({ accountId: { $exists: false } });
    
    for (const business of businesses) {
      business.accountId = accountIdCounter++;
      await business.save();
      console.log(`  - Business ${business.businessName}: accountId ${business.accountId}`);
    }
    console.log(`  ✓ Generated accountIds for ${businesses.length} businesses\n`);

    // Step 3: Create pages for users
    console.log('Step 3: Creating pages for user profiles...');
    const allUsers = await User.find({ accountId: { $exists: true } });
    let pagesCreated = 0;
    
    for (const user of allUsers) {
      const pageId = generatePageId(user.accountId);
      
      // Check if page already exists
      const existingPage = await Page.findOne({ pageId });
      if (!existingPage) {
        const page = new Page({
          pageId,
          accountId: String(user.accountId),
          pageType: 'profile',
          accountRef: user._id,
          accountModel: 'User',
          activity: [],
          settings: {}
        });
        await page.save();
        pagesCreated++;
        console.log(`  - Created page ${pageId} for user ${user.username || user.email}`);
      } else {
        console.log(`  - Page ${pageId} already exists for user ${user.username || user.email}`);
      }
    }
    console.log(`  ✓ Created ${pagesCreated} pages for users\n`);

    // Step 4: Create pages for businesses
    console.log('Step 4: Creating pages for businesses...');
    const allBusinesses = await Business.find({ accountId: { $exists: true } });
    pagesCreated = 0;
    
    for (const business of allBusinesses) {
      const pageId = generatePageId(business.accountId);
      
      // Check if page already exists
      const existingPage = await Page.findOne({ pageId });
      if (!existingPage) {
        const page = new Page({
          pageId,
          accountId: String(business.accountId),
          pageType: 'business',
          accountRef: business._id,
          accountModel: 'Business',
          activity: [],
          settings: {}
        });
        await page.save();
        business.pageId = pageId;
        await business.save();
        pagesCreated++;
        console.log(`  - Created page ${pageId} for business ${business.businessName}`);
      } else {
        if (!business.pageId) {
          business.pageId = pageId;
          await business.save();
        }
        console.log(`  - Page ${pageId} already exists for business ${business.businessName}`);
      }
    }
    console.log(`  ✓ Created ${pagesCreated} pages for businesses\n`);

    // Step 5: Update posts with pageId and authorAccountId
    console.log('Step 5: Updating posts with pageId and authorAccountId...');
    const posts = await Post.find({});
    let postsUpdated = 0;
    
    for (const post of posts) {
      let updated = false;
      
      // Set pageId based on profileUserId or businessId
      if (!post.pageId) {
        if (post.profileUserId) {
          const user = await User.findById(post.profileUserId);
          if (user && user.accountId) {
            const pageId = generatePageId(user.accountId);
            const page = await Page.findOne({ pageId });
            if (page) {
              post.pageId = pageId;
              updated = true;
            }
          }
        } else if (post.businessId) {
          const business = await Business.findById(post.businessId);
          if (business && business.accountId) {
            const pageId = generatePageId(business.accountId);
            const page = await Page.findOne({ pageId });
            if (page) {
              post.pageId = pageId;
              updated = true;
            }
          }
        }
      }
      
      // Set authorAccountId
      if (!post.authorAccountId) {
        if (post.postedAsBusinessId) {
          // Post was made as a business
          const business = await Business.findById(post.postedAsBusinessId);
          if (business && business.accountId) {
            post.authorAccountId = business.accountId;
            updated = true;
          }
        } else if (post.authorUserId) {
          // Post was made as a user
          const user = await User.findById(post.authorUserId);
          if (user && user.accountId) {
            post.authorAccountId = user.accountId;
            updated = true;
          }
        }
      }
      
      if (updated) {
        await post.save();
        postsUpdated++;
      }
    }
    console.log(`  ✓ Updated ${postsUpdated} posts\n`);

    console.log('Migration completed successfully!');
    console.log('\nSummary:');
    console.log(`  - Users with accountId: ${await User.countDocuments({ accountId: { $exists: true } })}`);
    console.log(`  - Businesses with accountId: ${await Business.countDocuments({ accountId: { $exists: true } })}`);
    console.log(`  - Pages created: ${await Page.countDocuments({})}`);
    console.log(`  - Posts with pageId: ${await Post.countDocuments({ pageId: { $exists: true } })}`);
    console.log(`  - Posts with authorAccountId: ${await Post.countDocuments({ authorAccountId: { $exists: true } })}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

