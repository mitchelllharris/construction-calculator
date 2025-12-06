// Load environment variables first
require('dotenv').config();

// load the express package
const express = require('express');

// load the CORS middleware package
const cors = require('cors');

// load security headers package
const helmet = require('helmet');

// load rate limiting
const { apiLimiter } = require('./app/middlewares/rateLimiter');

// load logger
const logger = require('./app/utils/logger');

// create an Express application instance
const app = express();

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    crossOriginEmbedderPolicy: false, // Allow embedding if needed
}));

// configure CORS options (which origins are allowed)
// Read from environment variable or use defaults for development
const corsOrigins = process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:5173', 'http://localhost:8081'];

var corsOptions = {
    origin: corsOrigins,
    credentials: true,
    optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

// register the CORS middleware with those options
app.use(cors(corsOptions));

// Apply general rate limiting to all API routes
app.use('/api', apiLimiter);

// built-in middleware to parse incoming JSON bodies
// (replaces the older body-parser package for JSON)
app.use(express.json({ limit: '5mb'}));

// built-in middleware to parse URL-encoded form data
// extended: true allows nested objects; false uses querystring library
// SECURITY: Limit URL-encoded payload size to prevent DoS attacks
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

const dbConfig = require('./app/config/db.config');
const db = require('./app/models');
const Role = db.role;

// Use MongoDB URI from .env, or fall back to dbConfig
const MONGODB_URI = process.env.MONGODB_URI || `mongodb://${dbConfig.HOST}:${dbConfig.PORT}/${dbConfig.DB}`;

// Check if it's an Atlas connection (mongodb+srv:// or standard mongodb:// with ssl=true)
const isAtlas = MONGODB_URI.includes('mongodb+srv://') || (MONGODB_URI.includes('mongodb://') && MONGODB_URI.includes('ssl=true'));

// Production-ready connection options
const connectionOptions = {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
};

// For Atlas connections
if (isAtlas) {
    // For SRV connections, TLS is required and handled automatically by Mongoose
    // On Windows with Node.js v24+, explicit TLS may help with OpenSSL compatibility
    if (MONGODB_URI.includes('mongodb+srv://')) {
        connectionOptions.tls = true;
    }
    connectionOptions.retryWrites = true;
    connectionOptions.w = 'majority';
}

// Handle MongoDB connection events for production resilience
db.mongoose.connection.on('connected', () => {
    logger.info('MongoDB connection established.');
});

db.mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error:', err.message);
});

db.mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected. Attempting to reconnect...');
});

// Handle process termination gracefully
process.on('SIGINT', async () => {
    await db.mongoose.connection.close();
    logger.info('MongoDB connection closed through app termination.');
    process.exit(0);
});

db.mongoose
    .connect(MONGODB_URI, connectionOptions)
    .then(() => {
        logger.info('Successfully connected to MongoDB.');
        initial();
    })
    .catch(err => {
        logger.error('MongoDB connection error:');
        logger.error(`  Error: ${err.name}`);
        logger.error(`  Message: ${err.message}`);
        if (err.code) {
            logger.error(`  Code: ${err.code}`);
        }
        if (err.codeName) {
            logger.error(`  Code Name: ${err.codeName}`);
        }
        logger.error('  Please check your MongoDB connection string and network access settings.');
        process.exit(1);
    })

// import routes
require('./app/routes/health.routes')(app);
require('./app/routes/auth.routes')(app);
require('./app/routes/user.routes')(app);
require('./app/routes/verification.routes')(app);
require('./app/routes/passwordReset.routes')(app);
require('./app/routes/profile.routes')(app);
require('./app/routes/admin.routes')(app);
require('./app/routes/contactform.routes')(app);

// define a simple GET route on the root path
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the application.' });
});

// choose port from environment, fall back to 8080
const PORT = process.env.PORT || 8080;

// start the server and listen for connections
app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}.`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Retry helper for database operations (handles transient SSL errors)
async function retryOperation(operation, maxRetries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (err) {
            const isSSLError = err.code === 'ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR' || 
                             err.message?.includes('SSL') || 
                             err.message?.includes('TLS');
            
            if (isSSLError && attempt < maxRetries) {
                logger.warn(`SSL error on attempt ${attempt}, retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
                continue;
            }
            throw err;
        }
    }
}

async function initial() {
    try {
        const count = await retryOperation(() => Role.estimatedDocumentCount());
        if (count === 0) {
            try {
                await retryOperation(() => new Role({ name: "user" }).save());
                logger.info("added 'user' to roles collection");
            } catch (err) {
                logger.error("Error adding 'user' role:", err.message);
            }

            try {
                await retryOperation(() => new Role({ name: "moderator" }).save());
                logger.info("added 'moderator' to roles collection");
            } catch (err) {
                logger.error("Error adding 'moderator' role:", err.message);
            }

            try {
                await retryOperation(() => new Role({ name: "admin" }).save());
                logger.info("added 'admin' to roles collection");
            } catch (err) {
                logger.error("Error adding 'admin' role:", err.message);
            }
        }
    } catch (err) {
        logger.error("Error initializing roles:", err.message);
    }
}