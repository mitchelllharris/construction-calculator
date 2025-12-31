const { authJwt } = require("../middlewares");
const { apiLimiter } = require("../middlewares/rateLimiter");
const controller = require("../controllers/business.controller");

module.exports = function(app) {
    app.use(function(req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "x-access-token, Origin, Content-Type, Accept"
        );
        next();
    });

    // Create a new business
    app.post(
        "/api/businesses",
        apiLimiter,
        [authJwt.verifyToken],
        controller.createBusiness
    );

    // Search businesses - MUST come before /api/businesses/:id to avoid route conflict
    app.get(
        "/api/businesses/search",
        [authJwt.verifyToken],
        controller.searchBusinesses
    );

    // Get business by slug - MUST come before /api/businesses/:id
    app.get(
        "/api/businesses/slug/:slug",
        [authJwt.verifyTokenOptional],
        controller.getBusiness
    );

    // Get business by ID
    app.get(
        "/api/businesses/:id",
        [authJwt.verifyTokenOptional],
        controller.getBusiness
    );

    // Get all businesses owned by user
    app.get(
        "/api/user/businesses",
        [authJwt.verifyToken],
        controller.getUserBusinesses
    );

    // Update business
    app.put(
        "/api/businesses/:id",
        apiLimiter,
        [authJwt.verifyToken],
        controller.updateBusiness
    );

    // Delete business
    app.delete(
        "/api/businesses/:id",
        apiLimiter,
        [authJwt.verifyToken],
        controller.deleteBusiness
    );

    // Get posts for a business
    app.get(
        "/api/businesses/:id/posts",
        [authJwt.verifyTokenOptional],
        controller.getBusinessPosts
    );
};

