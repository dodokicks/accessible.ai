const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const path = require('path');

class OpenRouterImageAnalysisService {
  constructor() {
    require('dotenv').config({ path: path.join(__dirname, '../../.env') });

    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.baseUrl = 'https://openrouter.ai/api/v1';
    this.modelId = process.env.OPENROUTER_MODEL_ID || 'anthropic/claude-3.5-sonnet'; // Default to Claude 3.5 Sonnet
    
    console.log('OpenRouter Credentials Debug:');
    console.log('  OPENROUTER_API_KEY:', this.apiKey ? 'SET' : 'NOT SET');
    console.log('  OPENROUTER_MODEL_ID:', this.modelId);
    
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not found. Please set OPENROUTER_API_KEY in your .env file.');
    }

    console.log(`OpenRouter Service initialized with model: ${this.modelId}`);
  }

  async downloadImageAsBase64(imageUrl) {
    try {
      console.log(`📥 Downloading image: ${imageUrl}`);
      const response = await fetch(imageUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      
      return `data:${contentType};base64,${base64}`;
      
    } catch (error) {
      console.error(`Error downloading image ${imageUrl}:`, error);
      throw error;
    }
  }

  buildAccessibilityPrompt(imageDescription = '') {
    return `You are an expert accessibility consultant analyzing property images for accessibility compliance. 

${imageDescription ? `This is ${imageDescription}` : 'Analyze this property image'} and provide a comprehensive accessibility assessment.

Please analyze the following aspects:

1. **Wheelchair Accessibility** (0-100 score):
   - Doorway widths (minimum 32 inches)
   - Threshold heights
   - Flooring surfaces
   - Maneuvering space
   - Ramp availability

2. **Visual Accessibility** (0-100 score):
   - Lighting conditions
   - Color contrast
   - Signage visibility
   - Tactile indicators

3. **Mobility Features** (0-100 score):
   - Handrails and grab bars
   - Step heights and depths
   - Surface traction
   - Clear pathways

4. **Safety Features** (0-100 score):
   - Smoke detectors
   - Emergency exits
   - Lighting in corridors
   - Trip hazards

**Response Format (JSON only):**
{
  "accessibility_score": <overall_score_0_to_100>,
  "accessibility_features": {
    "wheelchair_accessibility": {
      "score": <score_0_to_100>,
      "details": "<detailed_analysis>",
      "issues": ["<issue1>", "<issue2>"],
      "recommendations": ["<recommendation1>", "<recommendation2>"]
    },
    "visual_accessibility": {
      "score": <score_0_to_100>,
      "details": "<detailed_analysis>",
      "issues": ["<issue1>", "<issue2>"],
      "recommendations": ["<recommendation1>", "<recommendation2>"]
    },
    "mobility_features": {
      "score": <score_0_to_100>,
      "details": "<detailed_analysis>",
      "issues": ["<issue1>", "<issue2>"],
      "recommendations": ["<recommendation1>", "<recommendation2>"]
    },
    "safety_features": {
      "score": <score_0_to_100>,
      "details": "<detailed_analysis>",
      "issues": ["<issue1>", "<issue2>"],
      "recommendations": ["<recommendation1>", "<recommendation2>"]
    }
  },
  "overall_assessment": "<comprehensive_summary>",
  "key_strengths": ["<strength1>", "<strength2>", "<strength3>"],
  "critical_issues": ["<issue1>", "<issue2>", "<issue3>"],
  "improvement_priority": "<low|medium|high>",
  "estimated_renovation_cost": "<cost_range>"
}

Focus on practical, actionable insights that property owners can implement.`;
  }

  parseAnalysisResponse(responseText) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback parsing if no JSON found
      return {
        accessibility_score: 50,
        overall_assessment: responseText,
        key_strengths: [],
        critical_issues: ['Unable to parse detailed analysis'],
        improvement_priority: 'medium',
        estimated_renovation_cost: 'Contact accessibility consultant'
      };
    } catch (error) {
      console.error('Error parsing analysis response:', error);
      return {
        accessibility_score: 50,
        overall_assessment: responseText,
        key_strengths: [],
        critical_issues: ['Analysis parsing failed'],
        improvement_priority: 'medium',
        estimated_renovation_cost: 'Contact accessibility consultant'
      };
    }
  }

  async analyzeImage(imageUrl, imageDescription = '') {
    try {
      console.log(`🔍 Analyzing image with OpenRouter: ${imageUrl}`);
      
      const base64Image = await this.downloadImageAsBase64(imageUrl);
      const prompt = this.buildAccessibilityPrompt(imageDescription);
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://accessible.ai', // Optional: for OpenRouter analytics
          'X-Title': 'Accessible AI Property Analysis' // Optional: for OpenRouter analytics
        },
        body: JSON.stringify({
          model: this.modelId,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: base64Image
                  }
                }
              ]
            }
          ],
          max_tokens: 2000,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const analysisText = data.choices[0].message.content;
      
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

  getImageDescription(index, totalImages) {
    const descriptions = [
      'the main exterior view of the property',
      'an interior room or space',
      'a bathroom or kitchen area',
      'a bedroom or living area',
      'the entrance or hallway',
      'a stairway or multi-level area',
      'the backyard or outdoor space',
      'a garage or utility area'
    ];
    
    return descriptions[index] || `image ${index + 1} of ${totalImages}`;
  }

  async analyzePropertyImages(imageUrls, propertyDetails = {}) {
    try {
      console.log(`🏠 Analyzing property with OpenRouter: ${imageUrls.length} images`);
      
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
            console.log('⏳ Waiting 1 second before next analysis...');
            await new Promise(resolve => setTimeout(resolve, 1000));
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
      
      const successfulAnalyses = imageAnalyses.filter(result => result.success);
      const failedAnalyses = imageAnalyses.filter(result => !result.success);
      
      console.log(`✅ Successfully analyzed ${successfulAnalyses.length}/${imageUrls.length} images`);
      
      console.log('🔍 Generating comprehensive analysis...');
      const comprehensiveAnalysis = await this.generateComprehensiveAnalysis(
        successfulAnalyses, 
        propertyDetails
      );
      
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

  async generateComprehensiveAnalysis(imageAnalyses, propertyDetails) {
    try {
      if (imageAnalyses.length === 0) {
        return {
          overall_score: 0,
          summary: 'No images could be analyzed',
          recommendations: ['Upload higher quality images for analysis']
        };
      }
      
      console.log('Image analyses structure:', JSON.stringify(imageAnalyses, null, 2));
      const scores = imageAnalyses.map(analysis => analysis.analysis?.accessibility_score || 50);
      const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      
      console.log('Scores:', scores);
      console.log('Average score:', averageScore);
      
      const allStrengths = imageAnalyses.flatMap(analysis => 
        analysis.analysis?.key_strengths || []
      );
      
      const allIssues = imageAnalyses.flatMap(analysis => 
        analysis.analysis?.critical_issues || []
      );
      
      const summaryPrompt = `Based on the following property image analyses, provide a comprehensive accessibility assessment:

Property Details: ${JSON.stringify(propertyDetails, null, 2)}

Image Analysis Results:
${imageAnalyses.map((analysis, index) => 
  `Image ${index + 1}: Score ${analysis.analysis?.accessibility_score || 50}/100 - ${analysis.analysis?.overall_assessment || 'No assessment available'}`
).join('\n')}

Please provide a comprehensive summary focusing on:
1. Overall accessibility rating
2. Key strengths across all images
3. Critical issues that need attention
4. Priority recommendations for improvement
5. Estimated renovation costs

Format as JSON with overall_score, summary, key_strengths, critical_issues, recommendations, and estimated_cost.`;

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://accessible.ai',
          'X-Title': 'Accessible AI Property Analysis'
        },
        body: JSON.stringify({
          model: this.modelId,
          messages: [
            {
              role: 'user',
              content: summaryPrompt
            }
          ],
          max_tokens: 1500,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const comprehensiveText = data.choices[0].message.content;
      
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
        overall_score: 0,
        summary: `Failed to generate comprehensive analysis: ${error.message}`,
        recommendations: ['Review individual image analyses for details'],
        estimated_cost: 'Unknown',
        average_image_score: 0,
        analyzed_images: imageAnalyses.length,
        property_details: propertyDetails
      };
    }
  }
}

module.exports = OpenRouterImageAnalysisService;
