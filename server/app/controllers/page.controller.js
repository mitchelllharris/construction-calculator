const db = require('../models');
const Page = db.page;
const Post = db.post;
const User = db.user;
const Business = db.business;
const logger = require('../utils/logger');
const { generatePageId } = require('../utils/accountId');

// Create a page for an account
exports.createPage = async (req, res) => {
    try {
        const { accountId, pageType, accountRef, accountModel } = req.body;

        // Validate required fields
        if (!accountId || !pageType || !accountRef || !accountModel) {
            return res.status(400).send({ message: "accountId, pageType, accountRef, and accountModel are required" });
        }

        // Validate pageType
        const validPageTypes = ['profile', 'business', 'group'];
        if (!validPageTypes.includes(pageType)) {
            return res.status(400).send({ message: "Invalid pageType. Must be one of: profile, business, group" });
        }

        // Validate accountModel
        const validAccountModels = ['User', 'Business'];
        if (!validAccountModels.includes(accountModel)) {
            return res.status(400).send({ message: "Invalid accountModel. Must be one of: User, Business" });
        }

        // Check if account exists
        const AccountModel = accountModel === 'User' ? User : Business;
        const account = await AccountModel.findById(accountRef);
        if (!account) {
            return res.status(404).send({ message: `${accountModel} not found` });
        }

        // Check if page already exists for this account
        const existingPage = await Page.findOne({ accountId: String(accountId) });
        if (existingPage) {
            return res.status(400).send({ message: "Page already exists for this account" });
        }

        // Generate pageId
        const pageId = generatePageId(accountId);

        // Create page
        const page = new Page({
            pageId,
            accountId: String(accountId),
            pageType,
            accountRef,
            accountModel,
            activity: [],
            settings: {}
        });

        await page.save();

        // If this is a business, update the business with pageId
        if (accountModel === 'Business') {
            account.pageId = pageId;
            await account.save();
        }

        return res.status(201).send({
            message: "Page created successfully",
            page
        });
    } catch (error) {
        logger.error("Create page error:", error);
        return res.status(500).send({
            message: error.message || "Failed to create page"
        });
    }
};

// Get page details
exports.getPage = async (req, res) => {
    try {
        const { pageId } = req.params;

        const page = await Page.findOne({ pageId })
            .populate('accountRef')
            .populate('activity');

        if (!page) {
            return res.status(404).send({ message: "Page not found" });
        }

        return res.status(200).send({
            page
        });
    } catch (error) {
        logger.error("Get page error:", error);
        return res.status(500).send({
            message: error.message || "Failed to get page"
        });
    }
};

// Get posts for a page
exports.getPagePosts = async (req, res) => {
    try {
        const { pageId } = req.params;
        const viewerUserId = req.userId || null;

        // Check if page exists
        const page = await Page.findOne({ pageId });
        if (!page) {
            return res.status(404).send({ message: "Page not found" });
        }

        // Import helper functions from post controller
        const postController = require('./post.controller');
        const buildCommentTree = postController.buildCommentTree;
        const formatPostWithComments = postController.formatPostWithComments;
        const populateAuthorAccount = postController.populateAuthorAccount;

        // Get top-level posts for this page (no parentPostId or parentCommentId)
        const posts = await Post.find({
            $and: [
                { pageId: pageId },
                {
                    $or: [
                        { parentPostId: null },
                        { parentPostId: { $exists: false } }
                    ]
                },
                {
                    $or: [
                        { parentCommentId: null },
                        { parentCommentId: { $exists: false } }
                    ]
                },
                { isDeleted: false }
            ]
        })
        .populate('authorUserId', 'firstName lastName username avatar')
        .populate({
            path: 'postedAsBusinessId',
            select: 'businessName businessSlug avatar ownerId',
            populate: {
                path: 'ownerId',
                select: '_id'
            }
        })
        .populate('likes.userId', 'firstName lastName username')
        .sort({ createdAt: -1 })
        .limit(50);

        // Get all comments/replies for these posts (recursively)
        const postIds = posts.map(p => p._id);
        let allCommentIds = [...postIds];
        let allComments = [];
        let depth = 0;
        const maxDepth = 10;
        const fetchedIds = new Set();

        while (allCommentIds.length > 0 && depth < maxDepth) {
            const comments = await Post.find({
                $or: [
                    { parentPostId: { $in: allCommentIds } },
                    { parentCommentId: { $in: allCommentIds } }
                ],
                isDeleted: false,
                _id: { $nin: Array.from(fetchedIds) }
            })
            .populate('authorUserId', 'firstName lastName username avatar')
            .populate({
                path: 'postedAsBusinessId',
                select: 'businessName businessSlug avatar ownerId',
                populate: {
                    path: 'ownerId',
                    select: '_id'
                }
            })
            .populate('likes.userId', 'firstName lastName username')
            .sort({ createdAt: 1 });
            
            comments.forEach(c => fetchedIds.add(c._id));
            allComments = [...allComments, ...comments];
            allCommentIds = comments.map(c => c._id);
            depth++;
        }

        // Build comment trees for each post
        const postsWithComments = await Promise.all(posts.map(async (post) => {
            await populateAuthorAccount(post);
            const comments = await buildCommentTree(allComments, post._id);
            // Populate authorAccount for comments too
            for (const comment of comments) {
                await populateAuthorAccount(comment);
                if (comment.replies) {
                    for (const reply of comment.replies) {
                        await populateAuthorAccount(reply);
                    }
                }
            }
            return formatPostWithComments(post, comments);
        }));

        return res.status(200).send({
            posts: postsWithComments
        });
    } catch (error) {
        logger.error("Get page posts error:", error);
        return res.status(500).send({
            message: error.message || "Failed to get page posts"
        });
    }
};

