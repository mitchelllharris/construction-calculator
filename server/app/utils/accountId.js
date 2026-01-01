/**
 * Utility functions for generating and managing accountIds
 * AccountIds are unique identifiers for all account types (users, businesses, groups, etc.)
 */

/**
 * Generate a unique accountId
 * Uses auto-incrementing approach: find the highest existing accountId and increment
 * @param {Object} db - Database connection object with models
 * @returns {Promise<Number>} - The next available accountId
 */
async function generateAccountId(db) {
    const User = db.user;
    const Business = db.business;
    
    // Find the highest accountId from both User and Business collections
    const [highestUser, highestBusiness] = await Promise.all([
        User.findOne({ accountId: { $exists: true } }).sort({ accountId: -1 }).select('accountId').lean(),
        Business.findOne({ accountId: { $exists: true } }).sort({ accountId: -1 }).select('accountId').lean()
    ]);
    
    const userAccountId = highestUser?.accountId || 0;
    const businessAccountId = highestBusiness?.accountId || 0;
    
    // Return the next available accountId (highest + 1)
    return Math.max(userAccountId, businessAccountId) + 1;
}

/**
 * Generate a unique pageId
 * Format: page-{accountId}-{timestamp} or simpler: page-{accountId}
 * @param {String|Number} accountId - The accountId that owns this page
 * @returns {String} - A unique pageId
 */
function generatePageId(accountId) {
    // Simple format: page-{accountId}
    // This ensures one page per account initially, but can be extended
    return `page-${accountId}`;
}

/**
 * Ensure an account has an accountId (for migration)
 * @param {Object} account - User or Business document
 * @param {Object} db - Database connection object
 * @returns {Promise<Number>} - The accountId (existing or newly generated)
 */
async function ensureAccountId(account, db) {
    if (account.accountId) {
        return account.accountId;
    }
    
    // Generate new accountId
    const accountId = await generateAccountId(db);
    account.accountId = accountId;
    await account.save();
    
    return accountId;
}

module.exports = {
    generateAccountId,
    generatePageId,
    ensureAccountId
};

