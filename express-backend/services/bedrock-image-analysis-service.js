/**
 * Bedrock Image Analysis Service
 * Analyzes property images for accessibility features using Claude Vision
 */

const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

class BedrockImageAnalysisService {
  constructor() {
    // Load environment variables
    require('dotenv').config({ path: path.join(__dirname, '../../.env') });
    
    // Get credentials with fallbacks
    const accessKeyId = process.env.BEDROCK_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.BEDROCK_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_DEFAULT_REGION || 'us-east-1';
    
    // Debug credential loading
    console.log('Bedrock Credentials Debug:');
    console.log('  BEDROCK_ACCESS_KEY_ID:', accessKeyId ? 'SET' : 'NOT SET');
    console.log('  BEDROCK_SECRET_ACCESS_KEY:', secretAccessKey ? 'SET' : 'NOT SET');
    console.log('  AWS_DEFAULT_REGION:', region);
    
    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS Bedrock credentials not found. Please check your .env file.');
    }
    
    this.bedrockClient = new BedrockRuntimeClient({
      region: region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey
      }
    });
    
    this.modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20240620-v1:0';
    
    console.log(`Bedrock Service initialized with model: ${this.modelId}, region: ${region}`);
  }

  /**
   * Download image and convert to base64
   * @param {string} imageUrl - URL of the image to download
   * @returns {Promise<string>} - Base64 encoded image data
   */
  async downloadImageAsBase64(imageUrl) {
    try {
      console.log(`📥 Downloading image: ${imageUrl}`);
      const response = await fetch(imageUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      
      // Determine MIME type from response headers or URL
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      
      return `data:${contentType};base64,${base64}`;
      
    } catch (error) {
      console.error(`Error downloading image ${imageUrl}:`, error);
      throw error;
    }
  }

  /**
   * Analyze a single image for accessibility features
   * @param {string} imageUrl - URL of the image to analyze
   * @param {string} imageDescription - Optional description of the image
   * @returns {Promise<Object>} - Analysis result
   */
  async analyzeImage(imageUrl, imageDescription = '') {
    try {
      console.log(`🔍 Analyzing image: ${imageUrl}`);
      
      // Download image and convert to base64
      const base64Image = await this.downloadImageAsBase64(imageUrl);
      
      const prompt = this.buildAccessibilityPrompt(imageDescription);
      
      const input = {
        modelId: this.modelId,
        contentType: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 2000,
          temperature: 0.3,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt
                },
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/jpeg',
                    data: base64Image.split(',')[1] // Remove data:image/jpeg;base64, prefix
                  }
                }
              ]
            }
          ]
        })
      };
      
      const command = new InvokeModelCommand(input);
      const response = await this.bedrockClient.send(command);
      
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const analysisText = responseBody.content[0].text;
      
      // Parse the structured response
      const parsedAnalysis = this.parseAnalysisResponse(analysisText);
      
      return {
        success: true,
        imageUrl,
        analysis: parsedAnalysis,
        rawResponse: analysisText,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`Error analyzing image ${imageUrl}:`, error);
      return {
        success: false,
        imageUrl,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Analyze multiple images for a property
   * @param {Array} imageUrls - Array of image URLs
   * @param {Object} propertyDetails - Property details
   * @returns {Promise<Object>} - Comprehensive analysis result
   */
  async analyzePropertyImages(imageUrls, propertyDetails = {}) {
    try {
      console.log(`🏠 Analyzing property with ${imageUrls.length} images`);
      
      // Analyze each image sequentially to avoid rate limiting
      const imageAnalyses = [];
      for (let i = 0; i < imageUrls.length; i++) {
        const imageUrl = imageUrls[i];
        const description = this.getImageDescription(i, imageUrls.length);
        
        console.log(`🔍 Analyzing image ${i + 1}/${imageUrls.length}: ${imageUrl}`);
        
        try {
          const result = await this.analyzeImage(imageUrl, description);
          imageAnalyses.push(result);
          
          // Add delay between requests to avoid rate limiting
          if (i < imageUrls.length - 1) {
            console.log('⏳ Waiting 2 seconds before next analysis...');
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (error) {
          console.error(`Error analyzing image ${i + 1}:`, error);
          imageAnalyses.push({
            success: false,
            imageUrl,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      // Filter successful analyses
      const successfulAnalyses = imageAnalyses.filter(result => result.success);
      const failedAnalyses = imageAnalyses.filter(result => !result.success);
      
      console.log(`✅ Successfully analyzed ${successfulAnalyses.length}/${imageUrls.length} images`);
      
      // Generate comprehensive property analysis
      console.log('🔍 Generating comprehensive analysis...');
      console.log('Successful analyses:', successfulAnalyses.length);
      console.log('First analysis structure:', JSON.stringify(successfulAnalyses[0], null, 2));
      
      const comprehensiveAnalysis = await this.generateComprehensiveAnalysis(
        successfulAnalyses, 
        propertyDetails
      );
      
      console.log('Comprehensive analysis result:', JSON.stringify(comprehensiveAnalysis, null, 2));
      
      return {
        success: true,
        overallScore: comprehensiveAnalysis?.accessibility_score || 0,
        analysisSummary: comprehensiveAnalysis?.overall_assessment || 'Analysis completed',
        propertyDetails,
        totalImages: imageUrls.length,
        analyzedImages: successfulAnalyses.length,
        failedImages: failedAnalyses.length,
        imageAnalyses: successfulAnalyses,
        failedAnalyses,
        comprehensiveAnalysis,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error analyzing property images:', error);
      return {
        success: false,
        error: error.message,
        overallScore: 0,
        analysisSummary: 'Analysis failed',
        propertyDetails,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Build the accessibility analysis prompt
   * @param {string} imageDescription - Description of the image
   * @returns {string} - Formatted prompt
   */
  buildAccessibilityPrompt(imageDescription) {
    return `You are an accessibility expert analyzing property images for accessibility features. 

${imageDescription ? `Image Context: ${imageDescription}` : ''}

Please analyze this image and provide a detailed accessibility assessment in the following JSON format:

{
  "accessibility_score": <number from 0-100>,
  "accessibility_features": {
    "wheelchair_accessibility": {
      "score": <number from 0-100>,
      "details": "<detailed analysis>",
      "issues": ["<list of specific issues>"],
      "recommendations": ["<list of recommendations>"]
    },
    "visual_accessibility": {
      "score": <number from 0-100>,
      "details": "<detailed analysis>",
      "issues": ["<list of specific issues>"],
      "recommendations": ["<list of recommendations>"]
    },
    "mobility_features": {
      "score": <number from 0-100>,
      "details": "<detailed analysis>",
      "issues": ["<list of specific issues>"],
      "recommendations": ["<list of recommendations>"]
    },
    "safety_features": {
      "score": <number from 0-100>,
      "details": "<detailed analysis>",
      "issues": ["<list of specific issues>"],
      "recommendations": ["<list of recommendations>"]
    }
  },
  "overall_assessment": "<comprehensive assessment>",
  "key_strengths": ["<list of key strengths>"],
  "critical_issues": ["<list of critical issues>"],
  "improvement_priority": "<high/medium/low>",
  "estimated_renovation_cost": "<estimated cost range>"
}

Focus on:
1. Wheelchair accessibility (ramps, wide doorways, accessible bathrooms)
2. Visual accessibility (good lighting, contrast, clear pathways)
3. Mobility features (handrails, non-slip surfaces, step-free access)
4. Safety features (smoke detectors, emergency exits, secure locks)
5. General accessibility compliance (ADA standards, universal design)

Be specific and actionable in your recommendations.`;
  }

  /**
   * Get image description based on index and total count
   * @param {number} index - Image index
   * @param {number} total - Total image count
   * @returns {string} - Image description
   */
  getImageDescription(index, total) {
    const descriptions = [
      'Exterior view of the property',
      'Main entrance and front door',
      'Living room or main common area',
      'Kitchen area',
      'Bedroom',
      'Bathroom',
      'Backyard or outdoor space',
      'Additional interior space',
      'Garage or parking area',
      'Additional exterior view'
    ];
    
    return descriptions[index] || `Interior/exterior view ${index + 1}`;
  }

  /**
   * Parse the analysis response from Claude
   * @param {string} responseText - Raw response text
   * @returns {Object} - Parsed analysis object
   */
  parseAnalysisResponse(responseText) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // If no JSON found, create a structured response from the text
      return {
        accessibility_score: this.extractScore(responseText),
        overall_assessment: responseText,
        key_strengths: [],
        critical_issues: [],
        improvement_priority: 'medium',
        estimated_renovation_cost: 'Unknown'
      };
      
    } catch (error) {
      console.error('Error parsing analysis response:', error);
      return {
        accessibility_score: 50,
        overall_assessment: responseText,
        key_strengths: [],
        critical_issues: [],
        improvement_priority: 'medium',
        estimated_renovation_cost: 'Unknown'
      };
    }
  }

  /**
   * Extract accessibility score from text
   * @param {string} text - Response text
   * @returns {number} - Extracted score
   */
  extractScore(text) {
    const scoreMatch = text.match(/(?:score|rating|accessibility)[:\s]*(\d+)/i);
    return scoreMatch ? parseInt(scoreMatch[1]) : 50;
  }

  /**
   * Generate comprehensive analysis from individual image analyses
   * @param {Array} imageAnalyses - Array of successful image analyses
   * @param {Object} propertyDetails - Property details
   * @returns {Promise<Object>} - Comprehensive analysis
   */
  async generateComprehensiveAnalysis(imageAnalyses, propertyDetails) {
    try {
      if (imageAnalyses.length === 0) {
        return {
          overall_score: 0,
          summary: 'No images could be analyzed',
          recommendations: ['Upload higher quality images for analysis']
        };
      }
      
      // Calculate average scores
      console.log('Image analyses structure:', JSON.stringify(imageAnalyses, null, 2));
      const scores = imageAnalyses.map(analysis => analysis.analysis?.accessibility_score || 50);
      const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      
      console.log('Scores:', scores);
      console.log('Average score:', averageScore);
      
      // Aggregate features
      const allStrengths = imageAnalyses.flatMap(analysis => 
        analysis.analysis.key_strengths || []
      );
      
      const allIssues = imageAnalyses.flatMap(analysis => 
        analysis.analysis.critical_issues || []
      );
      
      // Generate comprehensive summary
      const summaryPrompt = `Based on the following property image analyses, provide a comprehensive accessibility assessment:

Property Details: ${JSON.stringify(propertyDetails, null, 2)}

Image Analysis Results:
${imageAnalyses.map((analysis, index) => 
  `Image ${index + 1}: Score ${analysis.analysis.accessibility_score || 50}/100 - ${analysis.analysis.overall_assessment || 'No assessment available'}`
).join('\n')}

Please provide a comprehensive summary focusing on:
1. Overall accessibility rating
2. Key strengths across all images
3. Critical issues that need attention
4. Priority recommendations for improvement
5. Estimated renovation costs

Format as JSON with overall_score, summary, key_strengths, critical_issues, recommendations, and estimated_cost.`;

      const input = {
        modelId: this.modelId,
        contentType: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 1500,
          temperature: 0.3,
          messages: [
            {
              role: 'user',
              content: summaryPrompt
            }
          ]
        })
      };
      
      const command = new InvokeModelCommand(input);
      const response = await this.bedrockClient.send(command);
      
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const comprehensiveText = responseBody.content[0].text;
      
      // Parse comprehensive analysis
      const jsonMatch = comprehensiveText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          ...parsed,
          average_image_score: Math.round(averageScore),
          analyzed_images: imageAnalyses.length,
          property_details: propertyDetails
        };
      }
      
      // Fallback if JSON parsing fails
      return {
        overall_score: Math.round(averageScore),
        summary: comprehensiveText,
        key_strengths: [...new Set(allStrengths)].slice(0, 5),
        critical_issues: [...new Set(allIssues)].slice(0, 5),
        recommendations: ['Schedule professional accessibility assessment'],
        estimated_cost: 'Contact accessibility consultant for detailed estimate',
        average_image_score: Math.round(averageScore),
        analyzed_images: imageAnalyses.length,
        property_details: propertyDetails
      };
      
    } catch (error) {
      console.error('Error generating comprehensive analysis:', error);
      return {
        overall_score: Math.round(averageScore),
        summary: 'Analysis completed with limited data',
        key_strengths: [...new Set(allStrengths)].slice(0, 3),
        critical_issues: [...new Set(allIssues)].slice(0, 3),
        recommendations: ['Professional accessibility assessment recommended'],
        estimated_cost: 'Contact accessibility consultant',
        average_image_score: Math.round(averageScore),
        analyzed_images: imageAnalyses.length,
        property_details: propertyDetails
      };
    }
  }
}

module.exports = BedrockImageAnalysisService;
