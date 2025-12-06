// Middleware to check if user is admin
// This is a convenience wrapper around authJwt.isAdmin
const authJwt = require('./authjwt');

const checkAdmin = [authJwt.verifyToken, authJwt.isAdmin];

module.exports = checkAdmin;

