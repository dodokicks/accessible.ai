/**
 * Express.js Backend for Accessibility Checker
 * Hackathon Alternative - Much faster to implement and debug
 */

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const Joi = require('joi');
const winston = require('winston');

// Import services
const OpenAIService = require('./services/openai-service');
const ImageService = require('./services/image-service');
const ValidationService = require('./services/validation-service');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

// Logging middleware
app.use(morgan('combined', {
  stream: { write: message => logger.info(message.trim()) }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'tmp', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WebP) are allowed!'));
    }
  }
});

// Initialize services
const openaiService = new OpenAIService();
const imageService = new ImageService();
const validationService = new ValidationService();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Upload endpoint
app.post('/api/upload', upload.array('images', 5), async (req, res) => {
  try {
    logger.info('Upload request received', { 
      fileCount: req.files?.length || 0,
      ip: req.ip 
    });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'No images provided',
        message: 'Please upload at least one image'
      });
    }

    // Process and validate images
    const processedImages = [];
    for (const file of req.files) {
      try {
        // Optimize image
        const optimizedPath = await imageService.optimizeImage(file.path);
        
        // Convert to base64
        const base64Image = await imageService.convertToBase64(optimizedPath);
        
        processedImages.push({
          filename: file.originalname,
          base64: base64Image,
          size: file.size,
          mimetype: file.mimetype
        });

        // Clean up temporary files
        fs.unlinkSync(file.path);
        if (optimizedPath !== file.path) {
          fs.unlinkSync(optimizedPath);
        }
      } catch (error) {
        logger.error('Error processing image', { 
          filename: file.originalname, 
          error: error.message 
        });
        // Continue with other images
      }
    }

    if (processedImages.length === 0) {
      return res.status(400).json({
        error: 'No valid images processed',
        message: 'All uploaded images failed processing'
      });
    }

    res.json({
      success: true,
      message: 'Images uploaded successfully',
      images: processedImages.map(img => ({
        filename: img.filename,
        size: img.size,
        mimetype: img.mimetype
      })),
      count: processedImages.length
    });

  } catch (error) {
    logger.error('Upload error', { error: error.message, stack: error.stack });
    res.status(500).json({
      error: 'Upload failed',
      message: 'Internal server error during image upload'
    });
  }
});

// Analyze endpoint
app.post('/api/analyze', async (req, res) => {
  try {
    logger.info('Analysis request received', { ip: req.ip });

    // Validate request body
    const validationResult = validationService.validateAnalyzeRequest(req.body);
    if (validationResult.error) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validationResult.error.details
      });
    }

    const { images } = req.body;

    if (!images || images.length === 0) {
      return res.status(400).json({
        error: 'No images provided',
        message: 'Please provide images for analysis'
      });
    }

    // Process each image with OpenAI Vision
    const analysisResults = [];
    let totalScore = 0;
    let positiveFeatures = [];
    let barriers = [];
    let recommendations = [];

    for (const image of images) {
      try {
        const result = await openaiService.analyzeAccessibility(image.base64, image.filename);
        analysisResults.push(result);
        
        // Aggregate results
        totalScore += result.score || 0;
        positiveFeatures.push(...(result.positive_features || []));
        barriers.push(...(result.barriers || []));
        recommendations.push(...(result.recommendations || []));
      } catch (error) {
        logger.error('Analysis error for image', { 
          filename: image.filename, 
          error: error.message 
        });
        analysisResults.push({
          filename: image.filename,
          error: 'Analysis failed',
          score: 0
        });
      }
    }

    // Calculate overall score
    const averageScore = analysisResults.length > 0 
      ? Math.round(totalScore / analysisResults.length) 
      : 0;

    // Remove duplicates from aggregated results
    const uniquePositiveFeatures = [...new Set(positiveFeatures)];
    const uniqueBarriers = [...new Set(barriers)];
    const uniqueRecommendations = [...new Set(recommendations)];

    const finalResult = {
      success: true,
      analysis: {
        overall_score: averageScore,
        analyzed_images: analysisResults.length,
        positive_features: uniquePositiveFeatures,
        barriers: uniqueBarriers,
        recommendations: uniqueRecommendations,
        detailed_results: analysisResults
      },
      timestamp: new Date().toISOString(),
      processing_time: Date.now() - req.startTime
    };

    logger.info('Analysis completed', { 
      score: averageScore, 
      imageCount: analysisResults.length 
    });

    res.json(finalResult);

  } catch (error) {
    logger.error('Analysis error', { error: error.message, stack: error.stack });
    res.status(500).json({
      error: 'Analysis failed',
      message: 'Internal server error during analysis'
    });
  }
});

// Combined upload and analyze endpoint
app.post('/api/upload-and-analyze', upload.array('images', 5), async (req, res) => {
  try {
    logger.info('Upload and analyze request received', { 
      fileCount: req.files?.length || 0,
      ip: req.ip 
    });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'No images provided',
        message: 'Please upload at least one image'
      });
    }

    // Process images
    const processedImages = [];
    for (const file of req.files) {
      try {
        const optimizedPath = await imageService.optimizeImage(file.path);
        const base64Image = await imageService.convertToBase64(optimizedPath);
        
        processedImages.push({
          filename: file.originalname,
          base64: base64Image,
          size: file.size,
          mimetype: file.mimetype
        });

        // Clean up
        fs.unlinkSync(file.path);
        if (optimizedPath !== file.path) {
          fs.unlinkSync(optimizedPath);
        }
      } catch (error) {
        logger.error('Error processing image', { 
          filename: file.originalname, 
          error: error.message 
        });
      }
    }

    if (processedImages.length === 0) {
      return res.status(400).json({
        error: 'No valid images processed',
        message: 'All uploaded images failed processing'
      });
    }

    // Analyze images
    const analysisResults = [];
    let totalScore = 0;
    let positiveFeatures = [];
    let barriers = [];
    let recommendations = [];

    for (const image of processedImages) {
      try {
        const result = await openaiService.analyzeAccessibility(image.base64, image.filename);
        analysisResults.push(result);
        
        totalScore += result.score || 0;
        positiveFeatures.push(...(result.positive_features || []));
        barriers.push(...(result.barriers || []));
        recommendations.push(...(result.recommendations || []));
      } catch (error) {
        logger.error('Analysis error', { 
          filename: image.filename, 
          error: error.message 
        });
        analysisResults.push({
          filename: image.filename,
          error: 'Analysis failed',
          score: 0
        });
      }
    }

    const averageScore = analysisResults.length > 0 
      ? Math.round(totalScore / analysisResults.length) 
      : 0;

    const finalResult = {
      success: true,
      analysis: {
        overall_score: averageScore,
        analyzed_images: analysisResults.length,
        positive_features: [...new Set(positiveFeatures)],
        barriers: [...new Set(barriers)],
        recommendations: [...new Set(recommendations)],
        detailed_results: analysisResults
      },
      timestamp: new Date().toISOString()
    };

    res.json(finalResult);

  } catch (error) {
    logger.error('Upload and analyze error', { error: error.message, stack: error.stack });
    res.status(500).json({
      error: 'Processing failed',
      message: 'Internal server error during upload and analysis'
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error', { 
    error: error.message, 
    stack: error.stack,
    url: req.url,
    method: req.method
  });

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: 'File size must be less than 10MB'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files',
        message: 'Maximum 5 files allowed'
      });
    }
  }

  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested endpoint does not exist'
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Accessibility Checker API running on port ${PORT}`);
  logger.info(`📊 Health check: http://localhost:${PORT}/health`);
  logger.info(`🔍 API endpoints:`);
  logger.info(`   POST /api/upload - Upload images`);
  logger.info(`   POST /api/analyze - Analyze images`);
  logger.info(`   POST /api/upload-and-analyze - Upload and analyze in one request`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app;
