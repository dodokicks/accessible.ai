/**
 * S3 Service for managing buckets and image uploads
 */

const { S3Client, CreateBucketCommand, PutObjectCommand, ListObjectsV2Command, HeadBucketCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

class S3Service {
  constructor() {
    // Load environment variables
    require('dotenv').config({ path: path.join(__dirname, '../../.env') });
    
    // Get credentials with fallbacks
    const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_DEFAULT_REGION || 'us-east-1';
    
    // Debug credential loading
    console.log('S3 Credentials Debug:');
    console.log('  S3_ACCESS_KEY_ID:', accessKeyId ? 'SET' : 'NOT SET');
    console.log('  S3_SECRET_ACCESS_KEY:', secretAccessKey ? 'SET' : 'NOT SET');
    console.log('  AWS_DEFAULT_REGION:', region);
    
    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS credentials not found. Please check your .env file.');
    }
    
    this.s3Client = new S3Client({
      region: region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey
      }
    });
    
    this.bucketName = process.env.S3_BUCKET_NAME || 'accessible-ai-property-images';
    this.region = region;
    
    console.log(`S3 Service initialized with bucket: ${this.bucketName}, region: ${this.region}`);
  }

  /**
   * Ensure S3 bucket exists, create if it doesn't
   */
  async ensureBucketExists() {
    try {
      // Check if bucket exists
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
      console.log(`✅ Bucket ${this.bucketName} exists and is accessible`);
      return true;
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        // Bucket doesn't exist, try to create it
        try {
          console.log(`Creating S3 bucket: ${this.bucketName}`);
          const createBucketParams = {
            Bucket: this.bucketName,
            CreateBucketConfiguration: {
              LocationConstraint: this.region === 'us-east-1' ? undefined : this.region
            }
          };
          
          await this.s3Client.send(new CreateBucketCommand(createBucketParams));
          console.log(`✅ Created S3 bucket: ${this.bucketName}`);
          return true;
        } catch (createError) {
          if (createError.$metadata?.httpStatusCode === 403) {
            // Access denied for bucket creation - try to use bucket anyway
            console.log(`⚠️ Cannot create bucket ${this.bucketName} due to access restrictions, attempting to use existing bucket`);
            return true;
          } else {
            console.error('Error creating bucket:', createError);
            throw createError;
          }
        }
      } else if (error.$metadata?.httpStatusCode === 403) {
        // Access denied - bucket might exist but we can't check it
        console.log(`⚠️ Cannot verify bucket ${this.bucketName} due to access restrictions, assuming it exists`);
        return true;
      } else {
        console.error('Error checking bucket:', error);
        throw error;
      }
    }
  }

  /**
   * Create folder structure for a property listing
   * @param {string} propertyId - Unique identifier for the property
   * @param {Object} propertyDetails - Property details object
   * @returns {string} - Folder path
   */
  createPropertyFolder(propertyId, propertyDetails = {}) {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const address = propertyDetails.address || 'unknown-address';
    const city = propertyDetails.city || 'unknown-city';
    const state = propertyDetails.state || 'unknown-state';
    
    // Clean address for folder name (remove special characters)
    const cleanAddress = address.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').toLowerCase();
    const cleanCity = city.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').toLowerCase();
    const cleanState = state.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').toLowerCase();
    
    const folderPath = `properties/${timestamp}/${cleanState}/${cleanCity}/${cleanAddress}-${propertyId}`;
    return folderPath;
  }

  /**
   * Upload image to S3
   * @param {string} imageUrl - URL of the image to download and upload
   * @param {string} folderPath - S3 folder path
   * @param {string} filename - Filename for the image
   * @returns {Promise<Object>} - Upload result with S3 key and URL
   */
  async uploadImageFromUrl(imageUrl, folderPath, filename) {
    try {
      // Download image from URL
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }
      
      const imageBuffer = await response.arrayBuffer();
      const imageData = Buffer.from(imageBuffer);
      
      // Create S3 key
      const s3Key = `${folderPath}/${filename}`;
      
      // Upload to S3
      const uploadParams = {
        Bucket: this.bucketName,
        Key: s3Key,
        Body: imageData,
        ContentType: 'image/jpeg',
        Metadata: {
          'original-url': imageUrl,
          'upload-timestamp': new Date().toISOString(),
          'property-folder': folderPath
        }
      };
      
      await this.s3Client.send(new PutObjectCommand(uploadParams));
      
      const s3Url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${s3Key}`;
      
      return {
        success: true,
        s3Key,
        s3Url,
        filename,
        size: imageData.length,
        originalUrl: imageUrl
      };
      
    } catch (error) {
      console.error(`Error uploading image ${filename}:`, error);
      return {
        success: false,
        error: error.message,
        filename,
        originalUrl: imageUrl
      };
    }
  }

  /**
   * Upload multiple images for a property listing
   * @param {Array} imageUrls - Array of image URLs
   * @param {string} propertyId - Property identifier
   * @param {Object} propertyDetails - Property details
   * @returns {Promise<Object>} - Upload results
   */
  async uploadPropertyImages(imageUrls, propertyId, propertyDetails = {}) {
    try {
      // Ensure bucket exists
      await this.ensureBucketExists();
      
      // Create folder structure
      const folderPath = this.createPropertyFolder(propertyId, propertyDetails);
      
      console.log(`📁 Creating property folder: ${folderPath}`);
      
      // Upload property details as metadata
      const metadataKey = `${folderPath}/property-metadata.json`;
      const metadataContent = {
        propertyId,
        folderPath,
        uploadTimestamp: new Date().toISOString(),
        imageCount: imageUrls.length,
        propertyDetails,
        imageUrls: imageUrls.map((url, index) => ({
          index,
          url,
          filename: `image_${index + 1}.jpg`
        }))
      };
      
      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucketName,
        Key: metadataKey,
        Body: JSON.stringify(metadataContent, null, 2),
        ContentType: 'application/json'
      }));
      
      console.log(`📄 Uploaded property metadata: ${metadataKey}`);
      
      // Upload images
      const uploadPromises = imageUrls.map(async (imageUrl, index) => {
        const filename = `image_${index + 1}.jpg`;
        return await this.uploadImageFromUrl(imageUrl, folderPath, filename);
      });
      
      const uploadResults = await Promise.all(uploadPromises);
      
      const successfulUploads = uploadResults.filter(result => result.success);
      const failedUploads = uploadResults.filter(result => !result.success);
      
      console.log(`✅ Successfully uploaded ${successfulUploads.length}/${imageUrls.length} images`);
      
      if (failedUploads.length > 0) {
        console.log(`❌ Failed uploads:`, failedUploads.map(f => f.filename));
      }
      
      return {
        success: true,
        propertyId,
        folderPath,
        totalImages: imageUrls.length,
        successfulUploads: successfulUploads.length,
        failedUploads: failedUploads.length,
        uploadedImages: successfulUploads,
        failedImages: failedUploads,
        metadataKey,
        bucketName: this.bucketName
      };
      
    } catch (error) {
      console.error('Error uploading property images:', error);
      return {
        success: false,
        error: error.message,
        propertyId,
        folderPath: null
      };
    }
  }

  /**
   * List images in a property folder
   * @param {string} folderPath - S3 folder path
   * @returns {Promise<Array>} - List of images
   */
  async listPropertyImages(folderPath) {
    try {
      const listParams = {
        Bucket: this.bucketName,
        Prefix: folderPath,
        Delimiter: '/'
      };
      
      const response = await this.s3Client.send(new ListObjectsV2Command(listParams));
      
      const images = response.Contents
        ?.filter(obj => obj.Key.endsWith('.jpg') || obj.Key.endsWith('.jpeg') || obj.Key.endsWith('.png'))
        .map(obj => ({
          key: obj.Key,
          url: `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${obj.Key}`,
          size: obj.Size,
          lastModified: obj.LastModified
        })) || [];
      
      return images;
      
    } catch (error) {
      console.error('Error listing property images:', error);
      return [];
    }
  }

  /**
   * Get S3 URL for an object
   * @param {string} s3Key - S3 object key
   * @returns {string} - S3 URL
   */
  getS3Url(s3Key) {
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${s3Key}`;
  }
}

module.exports = S3Service;
