const { authJwt } = require("../middlewares");
const controller = require("../controllers/page.controller");
const { apiLimiter } = require("../middlewares/rateLimiter");

module.exports = function(app) {
    // Create a page (protected - requires authentication)
    app.post(
        "/api/pages",
        apiLimiter,
        [authJwt.verifyToken],
        controller.createPage
    );

    // Get page details
    app.get(
        "/api/pages/:pageId",
        controller.getPage
    );

    // Get posts for a page
    app.get(
        "/api/pages/:pageId/posts",
        [authJwt.verifyTokenOptional],
        controller.getPagePosts
    );
};

