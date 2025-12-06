module.exports = {
    HOST: process.env.DB_HOST || "0.0.0.0",
    PORT: process.env.DB_PORT || 27017,
    DB: process.env.DB_NAME || "appdatabase"  // Update to match your new database name
};