# S3 + Bedrock Integration Documentation

## Overview
The accessibility checker now includes full S3 integration with organized folder structures and Bedrock image analysis for comprehensive property accessibility assessment.

## Features Implemented

### 🪣 S3 Bucket Management
- **Automatic bucket creation**: Creates `accessible-ai-property-images` bucket if it doesn't exist
- **Organized folder structure**: `properties/YYYY-MM-DD/state/city/address-propertyId/`
- **Metadata storage**: Property details stored as JSON metadata in each folder
- **Image upload**: Downloads and uploads images from scraped URLs to S3

### 🤖 Bedrock Image Analysis
- **Claude Vision integration**: Uses Claude 3.5 Sonnet for image analysis
- **Comprehensive accessibility assessment**: Analyzes wheelchair accessibility, visual accessibility, mobility features, and safety
- **Structured scoring**: Provides 0-100 scores for different accessibility categories
- **Actionable recommendations**: Generates specific improvement suggestions and cost estimates

## API Endpoints

### 1. Complete Workflow: Scrape → S3 → Bedrock Analysis
```bash
POST /api/scrape
```

**Request Body:**
```json
{
  "url": "https://www.zillow.com/homedetails/123-Main-St-Anytown-CA-12345/123456789_zpid/",
  "maxImages": 20,
  "analyzeWithBedrock": true
}
```

**Response:**
```json
{
  "success": true,
  "propertyId": "uuid-generated-id",
  "propertyDetails": {
    "address": "123 Main St",
    "city": "Anytown",
    "state": "CA",
    "zipCode": "12345",
    "bedrooms": "3",
    "bathrooms": "2",
    "price": "$500,000"
  },
  "scraping": {
    "url": "https://www.zillow.com/...",
    "imagesFound": 15,
    "images": [...]
  },
  "s3Upload": {
    "bucketName": "accessible-ai-property-images",
    "folderPath": "properties/2025-10-26/ca/anytown/123-main-st-uuid",
    "uploadedImages": 15,
    "failedUploads": 0,
    "uploadedImageUrls": [...]
  },
  "bedrockAnalysis": {
    "success": true,
    "overallScore": 75,
    "analyzedImages": 15,
    "summary": "Property shows good accessibility features...",
    "keyStrengths": ["Wide doorways", "Ramp access"],
    "criticalIssues": ["Narrow bathroom door", "High countertops"],
    "recommendations": ["Install grab bars", "Lower counter height"],
    "estimatedCost": "$2,000 - $5,000"
  }
}
```

### 2. Analyze Existing S3 Images
```bash
POST /api/analyze-s3-images
```

**Request Body:**
```json
{
  "folderPath": "properties/2025-10-26/ca/anytown/123-main-st-uuid",
  "propertyDetails": {
    "address": "123 Main St",
    "city": "Anytown",
    "state": "CA"
  }
}
```

### 3. Health Check
```bash
GET /health
```

## S3 Folder Structure

```
accessible-ai-property-images/
├── properties/
│   └── 2025-10-26/
│       └── ca/
│           └── anytown/
│               └── 123-main-st-uuid/
│                   ├── property-metadata.json
│                   ├── image_1.jpg
│                   ├── image_2.jpg
│                   └── ...
```

## Configuration

### Environment Variables
```bash
# S3 Configuration
S3_BUCKET_NAME=accessible-ai-property-images
S3_ACCESS_KEY_ID=your_s3_access_key
S3_SECRET_ACCESS_KEY=your_s3_secret_key
AWS_DEFAULT_REGION=us-east-1

# Bedrock Configuration
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20240620-v1:0
BEDROCK_ACCESS_KEY_ID=your_bedrock_access_key
BEDROCK_SECRET_ACCESS_KEY=your_bedrock_secret_key
```

## Usage Examples

### 1. Complete Property Analysis
```bash
curl -X POST http://localhost:3000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.zillow.com/homedetails/123-Main-St-Anytown-CA-12345/123456789_zpid/",
    "maxImages": 10,
    "analyzeWithBedrock": true
  }'
```

### 2. Analyze Existing S3 Images
```bash
curl -X POST http://localhost:3000/api/analyze-s3-images \
  -H "Content-Type: application/json" \
  -d '{
    "folderPath": "properties/2025-10-26/ca/anytown/123-main-st-uuid",
    "propertyDetails": {
      "address": "123 Main St",
      "city": "Anytown",
      "state": "CA"
    }
  }'
```

## Bedrock Analysis Features

### Accessibility Categories Analyzed:
1. **Wheelchair Accessibility** (0-100 score)
   - Ramp access, wide doorways, accessible bathrooms
2. **Visual Accessibility** (0-100 score)
   - Good lighting, contrast, clear pathways
3. **Mobility Features** (0-100 score)
   - Handrails, non-slip surfaces, step-free access
4. **Safety Features** (0-100 score)
   - Smoke detectors, emergency exits, secure locks

### Output Format:
- Overall accessibility score (0-100)
- Detailed analysis for each category
- Specific issues identified
- Actionable recommendations
- Estimated renovation costs
- Priority level (high/medium/low)

## Error Handling

The system includes comprehensive error handling:
- S3 upload failures are logged and reported
- Bedrock analysis failures are handled gracefully
- Partial success scenarios are supported
- Detailed error messages for debugging

## Testing

Run the test script to verify the complete workflow:
```bash
cd express-backend
node test-complete-workflow.js
```

This will test:
- Health endpoint
- S3 bucket creation
- Complete scrape → S3 → Bedrock workflow
- Error handling
