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

// Configure storage for portfolio images
const portfolioStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const portfolioDir = path.join(uploadsDir, 'portfolio');
        if (!fs.existsSync(portfolioDir)) {
            fs.mkdirSync(portfolioDir, { recursive: true });
        }
        cb(null, portfolioDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: userId-timestamp-originalname
        const uniqueSuffix = `${req.userId}-${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const ext = path.extname(file.originalname);
        cb(null, `portfolio-${uniqueSuffix}${ext}`);
    }
});

// Configure storage for post media (images and videos)
const postStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const postDir = path.join(uploadsDir, 'posts');
        if (!fs.existsSync(postDir)) {
            fs.mkdirSync(postDir, { recursive: true });
        }
        cb(null, postDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${req.userId}-${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const ext = path.extname(file.originalname);
        cb(null, `post-${uniqueSuffix}${ext}`);
    }
});

// Configure storage for certification PDFs
const certificationStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const certificationDir = path.join(uploadsDir, 'certifications');
        if (!fs.existsSync(certificationDir)) {
            fs.mkdirSync(certificationDir, { recursive: true });
        }
        cb(null, certificationDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: userId-timestamp-originalname
        const uniqueSuffix = `${req.userId}-${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const ext = path.extname(file.originalname);
        cb(null, `cert-${uniqueSuffix}${ext}`);
    }
});

// Configure storage for CSV files (memory storage for parsing)
const csvStorage = multer.memoryStorage();

// File filter for images
const imageFilter = (req, file, cb) => {
    // Allowed image MIME types
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    // Allowed file extensions (case-insensitive)
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const fileExtension = require('path').extname(file.originalname).toLowerCase();
    
    // Check if MIME type is allowed OR if file extension is allowed (fallback for systems with incorrect MIME types)
    const isValidMimeType = file.mimetype && allowedMimeTypes.includes(file.mimetype.toLowerCase());
    const isValidExtension = allowedExtensions.includes(fileExtension);
    const isImageMimeType = file.mimetype && file.mimetype.startsWith('image/');
    
    if (isValidMimeType || (isImageMimeType && isValidExtension)) {
        cb(null, true);
    } else {
        cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'), false);
    }
};

// File filter for videos
const videoFilter = (req, file, cb) => {
    const allowedMimeTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    const allowedExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mpeg'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    const isValidMimeType = file.mimetype && allowedMimeTypes.includes(file.mimetype.toLowerCase());
    const isValidExtension = allowedExtensions.includes(fileExtension);
    
    if (isValidMimeType || isValidExtension) {
        cb(null, true);
    } else {
        cb(new Error('Only MP4, MOV, AVI, WebM, and MPEG videos are allowed'), false);
    }
};

// File filter for PDFs
const pdfFilter = (req, file, cb) => {
    // Accept PDF files by extension or MIME type
    const isPDF = file.originalname.toLowerCase().endsWith('.pdf') ||
                  file.mimetype === 'application/pdf';
    
    if (isPDF) {
        cb(null, true);
    } else {
        cb(new Error('File must be a PDF file (.pdf extension)'), false);
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

// Portfolio image upload middleware
const uploadPortfolioImage = multer({
    storage: portfolioStorage,
    fileFilter: imageFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit for portfolio images
    }
}).single('image');

// Certification PDF upload middleware
const uploadCertificationPDF = multer({
    storage: certificationStorage,
    fileFilter: pdfFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit for PDFs
    }
}).single('pdf');

// Post media upload middleware (images and videos)
const uploadPostMedia = multer({
    storage: postStorage,
    fileFilter: (req, file, cb) => {
        // Check if it's an image or video
        if (file.mimetype.startsWith('image/')) {
            imageFilter(req, file, cb);
        } else if (file.mimetype.startsWith('video/')) {
            videoFilter(req, file, cb);
        } else {
            cb(new Error('File must be an image or video'), false);
        }
    },
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit for post media
    }
}).array('media', 10); // Allow up to 10 files

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
    uploadPortfolioImage: handleUploadError(uploadPortfolioImage),
    uploadCertificationPDF: handleUploadError(uploadCertificationPDF),
    uploadCSV: handleUploadError(uploadCSV),
    uploadPostMedia: handleUploadError(uploadPostMedia)
};

