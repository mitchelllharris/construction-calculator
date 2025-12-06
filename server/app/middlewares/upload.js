const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage for avatar images
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const userUploadsDir = path.join(uploadsDir, 'avatars');
        if (!fs.existsSync(userUploadsDir)) {
            fs.mkdirSync(userUploadsDir, { recursive: true });
        }
        cb(null, userUploadsDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: userId-timestamp-originalname
        const uniqueSuffix = `${req.userId}-${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const ext = path.extname(file.originalname);
        cb(null, `avatar-${uniqueSuffix}${ext}`);
    }
});

// Configure storage for CSV files (memory storage for parsing)
const csvStorage = multer.memoryStorage();

// File filter for images
const imageFilter = (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
        // Check if it's a valid image type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'), false);
        }
    } else {
        cb(new Error('File must be an image'), false);
    }
};

// File filter for CSV
const csvFilter = (req, file, cb) => {
    // Accept CSV files by extension or MIME type
    // Some systems don't set MIME type correctly, so we check extension first
    const isCSV = file.originalname.toLowerCase().endsWith('.csv') ||
                  file.mimetype === 'text/csv' || 
                  file.mimetype === 'application/csv' ||
                  file.mimetype === 'text/plain' ||
                  file.mimetype === 'application/vnd.ms-excel' ||
                  !file.mimetype; // Accept if no MIME type but has .csv extension
    
    if (isCSV) {
        cb(null, true);
    } else {
        cb(new Error('File must be a CSV file (.csv extension)'), false);
    }
};

// Avatar upload middleware
const uploadAvatar = multer({
    storage: avatarStorage,
    fileFilter: imageFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
}).single('avatar');

// CSV upload middleware
const uploadCSV = multer({
    storage: csvStorage,
    fileFilter: csvFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit for CSV
    }
}).single('csv');

// Wrapper to handle errors
const handleUploadError = (uploadMiddleware) => {
    return (req, res, next) => {
        uploadMiddleware(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).send({ message: 'File size too large. Maximum size is 5MB for images, 10MB for CSV.' });
                }
                return res.status(400).send({ message: err.message });
            } else if (err) {
                return res.status(400).send({ message: err.message });
            }
            next();
        });
    };
};

module.exports = {
    uploadAvatar: handleUploadError(uploadAvatar),
    uploadCSV: handleUploadError(uploadCSV)
};

