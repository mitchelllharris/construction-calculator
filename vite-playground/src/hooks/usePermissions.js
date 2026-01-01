import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProfileSwitcher } from '../contexts/ProfileSwitcherContext';

/**
 * Hook to check permissions based on active account context
 * 
 * Rules:
 * - Permissions are tied to both role (admin vs member) and active account context
 * - No cross-account editing or deleting
 * - Default behavior is restrictive (deny by default unless explicitly allowed)
 */
export const usePermissions = () => {
  const { user } = useAuth();
  const { activeProfile, activeUserId, isUserProfile, isBusinessProfile } = useProfileSwitcher();

  /**
   * Check if the active account can edit a post
   * - Post author can always edit their own posts
   * - Business admins can edit posts on their business page (when active as that business)
   * - User can edit posts on their own profile (when active as that user)
   */
  const canEditPost = useMemo(() => {
    return (post) => {
      if (!user || !activeProfile) {
        return { allowed: false, reason: 'You must be logged in to edit posts' };
      }

      const postAuthorAccountId = post?.authorAccountId || post?.authorAccount?.accountId;

      // Author can always edit their own posts - this is the ONLY way to edit
      // You must be actively operating as the account that created the post
      // Strict check: authorAccountId must match activeUserId exactly
      if (postAuthorAccountId && activeUserId && Number(postAuthorAccountId) === Number(activeUserId)) {
        return { allowed: true };
      }

      // No legacy support - you MUST be operating as the authoring account

      // Determine what account context is needed
      if (post?.authorAccount?.type === 'business') {
        return {
          allowed: false,
          reason: `Switch to ${post.authorAccount.name || 'this business'} to edit this post`
        };
      }

      if (post?.authorAccount?.type === 'user') {
        return {
          allowed: false,
          reason: `Switch to your personal account to edit this post`
        };
      }

      return {
        allowed: false,
        reason: 'You do not have permission to edit this post'
      };
    };
  }, [user, activeProfile, activeUserId, isUserProfile, isBusinessProfile]);

  /**
   * Check if the active account can delete a post
   * Same rules as canEditPost
   */
  const canDeletePost = useMemo(() => {
    return (post) => {
      if (!user || !activeProfile) {
        return { allowed: false, reason: 'You must be logged in to delete posts' };
      }

      const postAuthorAccountId = post?.authorAccountId || post?.authorAccount?.accountId;

      // If we don't have authorAccountId, deny by default (safety first)
      if (!postAuthorAccountId || !activeUserId) {
        // Determine what account context is needed for better error message
        if (post?.authorAccount?.type === 'business') {
          return {
            allowed: false,
            reason: `Switch to ${post.authorAccount.name || 'this business'} to delete this post`
          };
        }
        if (post?.authorAccount?.type === 'user') {
          return {
            allowed: false,
            reason: `Switch to your personal account to delete this post`
          };
        }
        return {
          allowed: false,
          reason: 'You do not have permission to delete this post'
        };
      }

      // Author can always delete their own posts - this is the ONLY way to delete
      // You must be actively operating as the account that created the post
      // Strict check: authorAccountId must match activeUserId exactly
      if (Number(postAuthorAccountId) === Number(activeUserId)) {
        return { allowed: true };
      }

      // No legacy support - you MUST be operating as the authoring account

      // Determine what account context is needed
      if (post?.authorAccount?.type === 'business') {
        return {
          allowed: false,
          reason: `Switch to ${post.authorAccount.name || 'this business'} to delete this post`
        };
      }

      if (post?.authorAccount?.type === 'user') {
        return {
          allowed: false,
          reason: `Switch to your personal account to delete this post`
        };
      }

      return {
        allowed: false,
        reason: 'You do not have permission to delete this post'
      };
    };
  }, [user, activeProfile, activeUserId, isUserProfile, isBusinessProfile]);

  /**
   * Check if the active account can edit a profile
   * - User can only edit their own profile when active as that user
   * - Business owner can edit business when active as that business
   */
  const canEditProfile = useMemo(() => {
    return (profile) => {
      if (!user || !activeProfile) {
        return { allowed: false, reason: 'You must be logged in to edit profiles' };
      }

      if (profile?.type === 'user') {
        const profileUserId = profile.id || profile._id;
        const currentUserId = user.id || user._id;
        const activeProfileId = activeProfile.id;

        if (profileUserId?.toString() === currentUserId?.toString() && 
            activeProfileId?.toString() === currentUserId?.toString() && 
            isUserProfile) {
          return { allowed: true };
        }

        return {
          allowed: false,
          reason: 'Switch to your personal account to edit this profile'
        };
      }

      if (profile?.type === 'business') {
        const businessId = profile.id || profile._id;
        const activeBusinessId = activeProfile.id;

        if (businessId?.toString() === activeBusinessId?.toString() && isBusinessProfile) {
          // Check if user owns the business
          const ownerId = profile.ownerId || profile.owner?._id || profile.owner?.id;
          const currentUserId = user.id || user._id;
          
          if (ownerId?.toString() === currentUserId?.toString()) {
            return { allowed: true };
          }

          return {
            allowed: false,
            reason: 'You do not have admin access to this business'
          };
        }

        return {
          allowed: false,
          reason: `Switch to ${profile.name || 'this business'} to edit this profile`
        };
      }

      return {
        allowed: false,
        reason: 'You do not have permission to edit this profile'
      };
    };
  }, [user, activeProfile, isUserProfile, isBusinessProfile]);

  /**
   * Check if the active account can delete a business
   * - Only business owner can delete (when active as that business)
   */
  const canDeleteBusiness = useMemo(() => {
    return (business) => {
      if (!user || !activeProfile) {
        return { allowed: false, reason: 'You must be logged in to delete businesses' };
      }

      if (!isBusinessProfile) {
        return {
          allowed: false,
          reason: `Switch to ${business.businessName || 'this business'} to delete it`
        };
      }

      const businessId = business.id || business._id;
      const activeBusinessId = activeProfile.id;

      if (businessId?.toString() !== activeBusinessId?.toString()) {
        return {
          allowed: false,
          reason: `Switch to ${business.businessName || 'this business'} to delete it`
        };
      }

      const ownerId = business.ownerId || business.owner?._id || business.owner?.id;
      const currentUserId = user.id || user._id;

      if (ownerId?.toString() === currentUserId?.toString()) {
        return { allowed: true };
      }

      return {
        allowed: false,
        reason: 'You do not have permission to delete this business'
      };
    };
  }, [user, activeProfile, isBusinessProfile]);

  /**
   * Check if the active account can manage a business
   * - Business owner can manage (when active as that business)
   */
  const canManageBusiness = useMemo(() => {
    return (business) => {
      if (!user || !activeProfile) {
        return { allowed: false, reason: 'You must be logged in to manage businesses' };
      }

      if (!isBusinessProfile) {
        return {
          allowed: false,
          reason: `Switch to ${business.businessName || 'this business'} to manage it`
        };
      }

      const businessId = business.id || business._id;
      const activeBusinessId = activeProfile.id;

      if (businessId?.toString() !== activeBusinessId?.toString()) {
        return {
          allowed: false,
          reason: `Switch to ${business.businessName || 'this business'} to manage it`
        };
      }

      const ownerId = business.ownerId || business.owner?._id || business.owner?.id;
      const currentUserId = user.id || user._id;

      if (ownerId?.toString() === currentUserId?.toString()) {
        return { allowed: true };
      }

      return {
        allowed: false,
        reason: 'You do not have admin access to this business'
      };
    };
  }, [user, activeProfile, isBusinessProfile]);

  /**
   * Check if the active account can edit a comment
   * - Comment author can edit their own comments
   */
  const canEditComment = useMemo(() => {
    return (comment) => {
      if (!user || !activeProfile) {
        return { allowed: false, reason: 'You must be logged in to edit comments' };
      }

      const commentAuthorAccountId = comment?.authorAccountId || comment?.authorAccount?.accountId;

      if (commentAuthorAccountId && activeUserId && commentAuthorAccountId === activeUserId) {
        return { allowed: true };
      }

      // Legacy support
      if (comment?.authorUserId) {
        const authorUserId = comment.authorUserId._id || comment.authorUserId;
        const currentUserId = user.id || user._id;
        if (authorUserId?.toString() === currentUserId?.toString() && isUserProfile) {
          return { allowed: true };
        }
      }

      return {
        allowed: false,
        reason: 'You can only edit your own comments'
      };
    };
  }, [user, activeProfile, activeUserId, isUserProfile]);

  /**
   * Check if the active account can delete a comment
   * Same rules as canEditComment, plus page owners can delete comments on their page
   */
  const canDeleteComment = useMemo(() => {
    return (comment, post) => {
      const editCheck = canEditComment(comment);
      if (editCheck.allowed) {
        return { allowed: true };
      }

      // Page owners can delete comments on their page
      if (post && activeProfile) {
        const postPageId = post.pageId;
        if (isBusinessProfile && postPageId === activeProfile.pageId) {
          return { allowed: true };
        }
        if (isUserProfile && postPageId === activeProfile.pageId) {
          return { allowed: true };
        }
      }

      return editCheck;
    };
  }, [canEditComment, activeProfile, isUserProfile, isBusinessProfile]);

  return {
    canEditPost,
    canDeletePost,
    canEditProfile,
    canDeleteBusiness,
    canManageBusiness,
    canEditComment,
    canDeleteComment,
    activeProfile,
    isUserProfile,
    isBusinessProfile,
  };
};
