const User = require('../models/user.model');
const Business = require('../models/business.model');
const Post = require('../models/post.model');

/**
 * Check if the active account (authorAccountId) can perform an action on a resource
 * 
 * Rules:
 * - Permissions are tied to both role (admin vs member) and active account context
 * - No cross-account editing or deleting
 * - Default behavior is restrictive (deny by default unless explicitly allowed)
 */

/**
 * Check if user can edit/delete a post
 * @param {Object} post - The post object
 * @param {Number} activeAccountId - The accountId of the active profile making the request
 * @param {String} activePageId - The pageId of the active profile (optional)
 * @returns {Object} { allowed: boolean, reason?: string }
 */
async function canModifyPost(post, activeAccountId, activePageId = null) {
  if (!post) {
    return { allowed: false, reason: 'Post not found' };
  }

  if (!activeAccountId) {
    return { allowed: false, reason: 'You must be logged in to modify posts' };
  }

  const postAuthorAccountId = post.authorAccountId;

  // Author can always modify their own posts - this is the ONLY way to modify
  // You must be actively operating as the account that created the post
  // Strict check: authorAccountId must match activeAccountId exactly
  if (postAuthorAccountId && activeAccountId && Number(postAuthorAccountId) === Number(activeAccountId)) {
    return { allowed: true };
  }

  // Determine what account context is needed
  if (postAuthorAccountId) {
    // Try to find the account to get its name
    const user = await User.findOne({ accountId: postAuthorAccountId });
    if (user) {
      return {
        allowed: false,
        reason: `Switch to your personal account to modify this post`
      };
    }

    const business = await Business.findOne({ accountId: postAuthorAccountId });
    if (business) {
      return {
        allowed: false,
        reason: `Switch to ${business.businessName || 'this business'} to modify this post`
      };
    }
  }

  return {
    allowed: false,
    reason: 'You do not have permission to modify this post'
  };
}

/**
 * Check if user can edit/delete a comment
 * @param {Object} comment - The comment object (which is also a Post)
 * @param {Number} activeAccountId - The accountId of the active profile making the request
 * @param {String} activePageId - The pageId of the active profile (optional)
 * @param {Object} parentPost - The parent post (optional, for page owner checks)
 * @returns {Object} { allowed: boolean, reason?: string }
 */
async function canModifyComment(comment, activeAccountId, activePageId = null, parentPost = null) {
  if (!comment) {
    return { allowed: false, reason: 'Comment not found' };
  }

  if (!activeAccountId) {
    return { allowed: false, reason: 'You must be logged in to modify comments' };
  }

  const commentAuthorAccountId = comment.authorAccountId;

  // Author can always modify their own comments
  if (commentAuthorAccountId && commentAuthorAccountId === activeAccountId) {
    return { allowed: true };
  }

  // Page owners can delete comments on their page
  if (parentPost && activePageId && parentPost.pageId === activePageId) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: 'You can only modify your own comments'
  };
}

/**
 * Check if user can edit a profile
 * @param {Object} profile - The profile object (User or Business)
 * @param {String} profileType - 'user' or 'business'
 * @param {String} userId - The logged-in user's ID
 * @param {Number} activeAccountId - The accountId of the active profile
 * @param {String} activePageId - The pageId of the active profile
 * @returns {Object} { allowed: boolean, reason?: string }
 */
async function canEditProfile(profile, profileType, userId, activeAccountId, activePageId) {
  if (!userId || !activeAccountId) {
    return { allowed: false, reason: 'You must be logged in to edit profiles' };
  }

  if (profileType === 'user') {
    const user = await User.findById(profile._id || profile.id);
    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    // User can only edit their own profile when active as that user
    if (user._id.toString() !== userId.toString()) {
      return { allowed: false, reason: 'You can only edit your own profile' };
    }

    if (user.accountId !== activeAccountId) {
      return {
        allowed: false,
        reason: 'Switch to your personal account to edit this profile'
      };
    }

    if (user.pageId !== activePageId) {
      return {
        allowed: false,
        reason: 'Switch to your personal account to edit this profile'
      };
    }

    return { allowed: true };
  }

  if (profileType === 'business') {
    const business = await Business.findById(profile._id || profile.id);
    if (!business) {
      return { allowed: false, reason: 'Business not found' };
    }

    // Check if user owns the business
    if (business.ownerId.toString() !== userId.toString()) {
      return { allowed: false, reason: 'You do not have admin access to this business' };
    }

    // Check if active account is the business account
    if (business.accountId !== activeAccountId) {
      return {
        allowed: false,
        reason: `Switch to ${business.businessName || 'this business'} to edit this profile`
      };
    }

    if (business.pageId !== activePageId) {
      return {
        allowed: false,
        reason: `Switch to ${business.businessName || 'this business'} to edit this profile`
      };
    }

    return { allowed: true };
  }

  return { allowed: false, reason: 'Invalid profile type' };
}

/**
 * Check if user can delete a business
 * @param {Object} business - The business object
 * @param {String} userId - The logged-in user's ID
 * @param {Number} activeAccountId - The accountId of the active profile
 * @param {String} activePageId - The pageId of the active profile
 * @returns {Object} { allowed: boolean, reason?: string }
 */
async function canDeleteBusiness(business, userId, activeAccountId, activePageId) {
  if (!userId || !activeAccountId) {
    return { allowed: false, reason: 'You must be logged in to delete businesses' };
  }

  if (!business) {
    return { allowed: false, reason: 'Business not found' };
  }

  // Check if user owns the business
  if (business.ownerId.toString() !== userId.toString()) {
    return { allowed: false, reason: 'You do not have permission to delete this business' };
  }

  // Check if active account is the business account
  if (business.accountId !== activeAccountId) {
    return {
      allowed: false,
      reason: `Switch to ${business.businessName || 'this business'} to delete it`
    };
  }

  if (business.pageId !== activePageId) {
    return {
      allowed: false,
      reason: `Switch to ${business.businessName || 'this business'} to delete it`
    };
  }

  return { allowed: true };
}

/**
 * Get the active account context from request
 * Extracts authorAccountId and pageId from request body or headers
 * @param {Object} req - Express request object
 * @returns {Object} { activeAccountId: Number, activePageId: String }
 */
function getActiveAccountContext(req) {
  // Try to get from request body first (for POST/PUT requests)
  const activeAccountId = req.body?.authorAccountId || req.body?.activeAccountId;
  const activePageId = req.body?.pageId || req.body?.activePageId;

  // Try to get from headers (for GET/DELETE requests)
  const headerAccountId = req.headers['x-active-account-id'];
  const headerPageId = req.headers['x-active-page-id'];

  return {
    activeAccountId: activeAccountId || (headerAccountId ? parseInt(headerAccountId) : null),
    activePageId: activePageId || headerPageId || null,
  };
}

module.exports = {
  canModifyPost,
  canModifyComment,
  canEditProfile,
  canDeleteBusiness,
  getActiveAccountContext,
};
