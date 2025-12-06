const db = require("../models");
const mongoose = require('mongoose');
const logger = require("../utils/logger");

// Track server start time for uptime calculation
const serverStartTime = Date.now();

exports.healthCheck = async (req, res) => {
    try {
        const uptime = Math.floor((Date.now() - serverStartTime) / 1000); // Uptime in seconds
        
        // Check database connection
        const dbStatus = mongoose.connection.readyState;
        const dbStates = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
        };
        
        const isHealthy = dbStatus === 1; // 1 = connected
        
        const healthStatus = {
            status: isHealthy ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            uptime: uptime,
            uptimeFormatted: formatUptime(uptime),
            database: {
                status: dbStates[dbStatus] || 'unknown',
                connected: dbStatus === 1
            },
            server: {
                environment: process.env.NODE_ENV || 'development',
                nodeVersion: process.version
            }
        };

        const statusCode = isHealthy ? 200 : 503;
        return res.status(statusCode).json(healthStatus);
    } catch (err) {
        logger.error("Health check error:", err);
        return res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: process.env.NODE_ENV === 'development' ? err.message : 'Health check failed'
        });
    }
};

// Helper function to format uptime
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    
    return parts.join(' ');
}

