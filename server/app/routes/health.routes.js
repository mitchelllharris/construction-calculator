const controller = require("../controllers/health.controller");

module.exports = function(app) {
    // Health check endpoint (public, no authentication required)
    app.get("/api/health", controller.healthCheck);
};

