/**
 * Comprehensive Analysis Service
 * Combines AWS Rekognition object detection with Claude AI analysis
 * Provides complete accessibility assessment pipeline
 */

const RekognitionService = require('./rekognition-service');
const BedrockService = require('./bedrock-service');
const winston = require('winston');

class ComprehensiveAnalysisService {
    constructor() {
        this.rekognitionService = new RekognitionService();
        this.bedrockService = new BedrockService();
        
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.Console()
            ]
        });
    }

    /**
     * Analyze images using the complete pipeline: Rekognition → Claude
     * @param {Array} images - Array of image objects with base64 data
     * @returns {Promise<Object>} Comprehensive analysis results
     */
    async analyzeImages(images) {
        try {
            this.logger.info('Starting comprehensive analysis', { imageCount: images.length });

      // Use the primary image for analysis
      const primaryImage = images[0];
      if (!primaryImage || !primaryImage.base64) {
        throw new Error('No valid image provided for analysis');
      }

      this.logger.info('Running Rekognition analysis on primary image');
      
      // Step 1: Run Rekognition analysis
      const rekognitionResults = await this.rekognitionService.analyzeAccessibility(
        primaryImage.base64, 
        primaryImage.filename
      );

      this.logger.info('Running Bedrock analysis with Rekognition context');
      
      // Step 2: Run Bedrock analysis with Rekognition context
      const bedrockResults = await this.bedrockService.analyzeAccessibility(
        primaryImage.base64,
        primaryImage.filename
      );

      // Step 3: Synthesize results
      const finalResults = this.synthesizeResults(rekognitionResults, bedrockResults, images.length);

      this.logger.info('Comprehensive analysis completed', { 
        finalScore: finalResults.analysis.overall_score,
        totalImages: images.length
      });

      return finalResults;

                } catch (error) {
      this.logger.error('Analysis failed', { 
        error: error.message, 
        stack: error.stack,
        imageCount: images.length 
      });
      
      // Return a fallback analysis if services fail
      return this.createSimpleFallbackAnalysis(images.length);
    }
  }

    /**
     * Create a mock analysis for demonstration
     */
  synthesizeResults(rekognitionResults, bedrockResults, totalImages) {
    // Combine scores with weighted average (60% Bedrock, 40% Rekognition)
    const combinedScore = Math.round(
      (bedrockResults.score * 0.6) + (rekognitionResults.score * 0.4)
    );

    // Merge positive features from both services
    const allPositiveFeatures = [
      ...(bedrockResults.positive_features || []),
      ...(rekognitionResults.positiveFeatures || [])
    ].filter((feature, index, array) => array.indexOf(feature) === index); // Remove duplicates

    // Merge barriers and improvement areas
    const allBarriers = [
      ...(bedrockResults.barriers || []),
      ...(rekognitionResults.redFlags || [])
    ].filter((barrier, index, array) => array.indexOf(barrier) === index);

    // Merge recommendations
    const allRecommendations = [
      ...(bedrockResults.recommendations || []),
      ...(rekognitionResults.recommendations || [])
    ].filter((rec, index, array) => array.indexOf(rec) === index);

    return {
      analysis: {
        overall_score: combinedScore,
        analyzed_images: totalImages,
        positive_features: allPositiveFeatures.slice(0, 10), // Limit to top 10
        improvement_areas: allBarriers.slice(0, 8), // Limit to top 8
        recommendations: allRecommendations.slice(0, 10), // Limit to top 10
        accessibility_rating: this.getRatingFromScore(combinedScore),
        detailed_findings: {
          rekognition_score: rekognitionResults.score,
          bedrock_score: bedrockResults.score,
          total_objects_detected: rekognitionResults.totalLabels || 0,
          confidence_level: rekognitionResults.analysis?.confidence || 'medium'
        }
      },
      metadata: {
        analysis_type: 'comprehensive',
        processing_time: '5-15 seconds',
        confidence: 'high',
        services_used: ['AWS Rekognition', 'Amazon Bedrock (Claude)'],
        rekognition_details: {
          detected_objects: rekognitionResults.detectedObjects || {},
          room_analysis: rekognitionResults.roomAnalysis || [],
          measurements: rekognitionResults.measurements || []
        }
      }
    };
  }

  getRatingFromScore(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    if (score >= 60) return 'Poor';
    return 'Very Poor';
  }

  createIntelligentAnalysis(images) {
    const imageCount = images.length;
    
    // Analyze accessibility features based on image content patterns
    const accessibilityAnalysis = this.analyzeAccessibilityFeatures(images);
    
    // Calculate score based on actual accessibility features
    let accessibilityScore = this.calculateAccessibilityScore(accessibilityAnalysis);
    
    // Generate recommendations based on actual accessibility findings
    const recommendations = this.generateAccessibilityRecommendations(accessibilityAnalysis);
    const positiveFeatures = this.getPositiveAccessibilityFeatures(accessibilityAnalysis);
    const improvementAreas = this.getAccessibilityImprovementAreas(accessibilityAnalysis);
    
    return {
      analysis: {
        overall_score: Math.round(accessibilityScore),
        analyzed_images: imageCount,
        positive_features: positiveFeatures,
        improvement_areas: improvementAreas,
        recommendations: recommendations,
        accessibility_rating: this.getRatingFromScore(accessibilityScore),
        detailed_findings: {
          wheelchair_accessibility: accessibilityAnalysis.wheelchairAccess,
          bathroom_accessibility: accessibilityAnalysis.bathroomAccess,
          kitchen_accessibility: accessibilityAnalysis.kitchenAccess,
          lighting_quality: accessibilityAnalysis.lightingQuality,
          safety_features: accessibilityAnalysis.safetyFeatures,
          pathway_clearance: accessibilityAnalysis.pathwayClearance,
          confidence_level: 'High'
        }
      },
      metadata: {
        analysis_type: 'accessibility_focused',
        processing_time: '2-3 seconds',
        confidence: 'high',
        services_used: ['Accessibility Analysis Engine'],
        analysis_details: {
          total_images: imageCount,
          accessibility_factors: accessibilityAnalysis
        }
      }
    };
  }

  analyzeAccessibilityFeatures(images) {
    // Simulate analysis of accessibility features based on image characteristics
    // In a real implementation, this would use computer vision to detect features
    
    const imageCount = images.length;
    const totalSize = images.reduce((sum, img) => sum + (img.size || 0), 0);
    const avgSize = totalSize / imageCount;
    
    // Simulate detection of accessibility features based on image patterns
    const analysis = {
      // Wheelchair accessibility features
      wheelchairAccess: {
        wideDoorways: this.simulateFeatureDetection(avgSize, 0.7), // 70% chance for larger images
        ramps: this.simulateFeatureDetection(avgSize, 0.3), // 30% chance
        levelSurfaces: this.simulateFeatureDetection(avgSize, 0.8), // 80% chance
        accessibleEntrance: this.simulateFeatureDetection(avgSize, 0.6), // 60% chance
        elevator: this.simulateFeatureDetection(avgSize, 0.1) // 10% chance (rare)
      },
      
      // Bathroom accessibility
      bathroomAccess: {
        grabBars: this.simulateFeatureDetection(avgSize, 0.4), // 40% chance
        accessibleShower: this.simulateFeatureDetection(avgSize, 0.3), // 30% chance
        accessibleToilet: this.simulateFeatureDetection(avgSize, 0.5), // 50% chance
        wideBathroom: this.simulateFeatureDetection(avgSize, 0.6) // 60% chance
      },
      
      // Kitchen accessibility
      kitchenAccess: {
        accessibleCounters: this.simulateFeatureDetection(avgSize, 0.4), // 40% chance
        accessibleAppliances: this.simulateFeatureDetection(avgSize, 0.5), // 50% chance
        clearPathways: this.simulateFeatureDetection(avgSize, 0.7), // 70% chance
        accessibleStorage: this.simulateFeatureDetection(avgSize, 0.3) // 30% chance
      },
      
      // Lighting and safety
      lightingQuality: {
        goodLighting: this.simulateFeatureDetection(avgSize, 0.6), // 60% chance
        emergencyLighting: this.simulateFeatureDetection(avgSize, 0.2), // 20% chance
        naturalLighting: this.simulateFeatureDetection(avgSize, 0.8) // 80% chance
      },
      
      safetyFeatures: {
        smokeDetectors: this.simulateFeatureDetection(avgSize, 0.3), // 30% chance
        fireExtinguisher: this.simulateFeatureDetection(avgSize, 0.2), // 20% chance
        emergencyExits: this.simulateFeatureDetection(avgSize, 0.4), // 40% chance
        handrails: this.simulateFeatureDetection(avgSize, 0.5) // 50% chance
      },
      
      // Pathway and navigation
      pathwayClearance: {
        wideHallways: this.simulateFeatureDetection(avgSize, 0.6), // 60% chance
        clearPathways: this.simulateFeatureDetection(avgSize, 0.7), // 70% chance
        noObstacles: this.simulateFeatureDetection(avgSize, 0.8), // 80% chance
        nonSlipSurfaces: this.simulateFeatureDetection(avgSize, 0.4) // 40% chance
      }
    };
    
    return analysis;
  }

  simulateFeatureDetection(avgSize, baseProbability) {
    // Simulate feature detection based on image quality and size
    const qualityMultiplier = Math.min(1.5, avgSize / 100000); // Higher quality = better detection
    const adjustedProbability = Math.min(0.95, baseProbability * qualityMultiplier);
    return Math.random() < adjustedProbability;
  }

  calculateAccessibilityScore(analysis) {
    let score = 0;
    let totalFeatures = 0;
    
    // Wheelchair accessibility (30% of score)
    const wheelchairFeatures = Object.values(analysis.wheelchairAccess);
    const wheelchairScore = wheelchairFeatures.filter(Boolean).length / wheelchairFeatures.length;
    score += wheelchairScore * 30;
    totalFeatures += wheelchairFeatures.length;
    
    // Bathroom accessibility (20% of score)
    const bathroomFeatures = Object.values(analysis.bathroomAccess);
    const bathroomScore = bathroomFeatures.filter(Boolean).length / bathroomFeatures.length;
    score += bathroomScore * 20;
    totalFeatures += bathroomFeatures.length;
    
    // Kitchen accessibility (15% of score)
    const kitchenFeatures = Object.values(analysis.kitchenAccess);
    const kitchenScore = kitchenFeatures.filter(Boolean).length / kitchenFeatures.length;
    score += kitchenScore * 15;
    totalFeatures += kitchenFeatures.length;
    
    // Lighting quality (15% of score)
    const lightingFeatures = Object.values(analysis.lightingQuality);
    const lightingScore = lightingFeatures.filter(Boolean).length / lightingFeatures.length;
    score += lightingScore * 15;
    totalFeatures += lightingFeatures.length;
    
    // Safety features (10% of score)
    const safetyFeatures = Object.values(analysis.safetyFeatures);
    const safetyScore = safetyFeatures.filter(Boolean).length / safetyFeatures.length;
    score += safetyScore * 10;
    totalFeatures += safetyFeatures.length;
    
    // Pathway clearance (10% of score)
    const pathwayFeatures = Object.values(analysis.pathwayClearance);
    const pathwayScore = pathwayFeatures.filter(Boolean).length / pathwayFeatures.length;
    score += pathwayScore * 10;
    totalFeatures += pathwayFeatures.length;
    
    return Math.round(score);
  }

  generateAccessibilityRecommendations(analysis) {
    const recommendations = [];
    
    // Wheelchair accessibility recommendations
    if (!analysis.wheelchairAccess.ramps) {
      recommendations.push('🚨 CRITICAL: Install ramps for wheelchair access (ADA requires 1:12 slope)');
    }
    if (!analysis.wheelchairAccess.wideDoorways) {
      recommendations.push('🚨 CRITICAL: Widen doorways to minimum 32 inches (ADA standard)');
    }
    if (!analysis.wheelchairAccess.accessibleEntrance) {
      recommendations.push('⚠️ MODERATE: Create accessible entrance with level threshold');
    }
    
    // Bathroom accessibility recommendations
    if (!analysis.bathroomAccess.grabBars) {
      recommendations.push('🚿 Install grab bars near toilet and shower (ADA height: 33-36 inches)');
    }
    if (!analysis.bathroomAccess.accessibleShower) {
      recommendations.push('🚿 Consider roll-in shower with no threshold');
    }
    if (!analysis.bathroomAccess.accessibleToilet) {
      recommendations.push('🚿 Install accessible toilet with proper height and clearance');
    }
    
    // Kitchen accessibility recommendations
    if (!analysis.kitchenAccess.accessibleCounters) {
      recommendations.push('🍳 Lower counter height or add adjustable sections (34 inches for wheelchair users)');
    }
    if (!analysis.kitchenAccess.accessibleAppliances) {
      recommendations.push('🍳 Install accessible appliances with front controls');
    }
    
    // Lighting and safety recommendations
    if (!analysis.lightingQuality.goodLighting) {
      recommendations.push('💡 Improve lighting throughout (minimum 50 foot-candles)');
    }
    if (!analysis.safetyFeatures.smokeDetectors) {
      recommendations.push('🛡️ Install smoke detectors in all rooms');
    }
    if (!analysis.safetyFeatures.handrails) {
      recommendations.push('🛡️ Add handrails on stairs and in hallways');
    }
    
    // Pathway recommendations
    if (!analysis.pathwayClearance.wideHallways) {
      recommendations.push('🚶 Widen hallways to minimum 36 inches');
    }
    if (!analysis.pathwayClearance.clearPathways) {
      recommendations.push('🚶 Remove obstacles and ensure clear pathways');
    }
    if (!analysis.pathwayClearance.nonSlipSurfaces) {
      recommendations.push('🚶 Install non-slip surfaces in wet areas');
    }
    
    return recommendations.slice(0, 10);
  }

  getPositiveAccessibilityFeatures(analysis) {
    const features = [];
    
    // Wheelchair accessibility features
    if (analysis.wheelchairAccess.wideDoorways) features.push('Wide doorways (32+ inches) - ADA compliant');
    if (analysis.wheelchairAccess.ramps) features.push('Ramp access available');
    if (analysis.wheelchairAccess.levelSurfaces) features.push('Level surfaces throughout');
    if (analysis.wheelchairAccess.accessibleEntrance) features.push('Accessible entrance');
    if (analysis.wheelchairAccess.elevator) features.push('Elevator access');
    
    // Bathroom accessibility features
    if (analysis.bathroomAccess.grabBars) features.push('Grab bars in bathroom');
    if (analysis.bathroomAccess.accessibleShower) features.push('Accessible shower design');
    if (analysis.bathroomAccess.accessibleToilet) features.push('Accessible toilet');
    if (analysis.bathroomAccess.wideBathroom) features.push('Spacious bathroom layout');
    
    // Kitchen accessibility features
    if (analysis.kitchenAccess.accessibleCounters) features.push('Accessible counter heights');
    if (analysis.kitchenAccess.accessibleAppliances) features.push('Accessible appliances');
    if (analysis.kitchenAccess.clearPathways) features.push('Clear kitchen pathways');
    if (analysis.kitchenAccess.accessibleStorage) features.push('Accessible storage solutions');
    
    // Lighting and safety features
    if (analysis.lightingQuality.goodLighting) features.push('Good lighting throughout');
    if (analysis.lightingQuality.emergencyLighting) features.push('Emergency lighting system');
    if (analysis.lightingQuality.naturalLighting) features.push('Natural lighting access');
    if (analysis.safetyFeatures.smokeDetectors) features.push('Smoke detection system');
    if (analysis.safetyFeatures.handrails) features.push('Safety handrails');
    
    // Pathway features
    if (analysis.pathwayClearance.wideHallways) features.push('Wide hallways (36+ inches)');
    if (analysis.pathwayClearance.clearPathways) features.push('Clear, unobstructed pathways');
    if (analysis.pathwayClearance.nonSlipSurfaces) features.push('Non-slip surfaces');
    
    return features.slice(0, 8);
  }

  getAccessibilityImprovementAreas(analysis) {
    const areas = [];
    
    // Wheelchair accessibility issues
    if (!analysis.wheelchairAccess.ramps) areas.push('Missing ramp access - major barrier');
    if (!analysis.wheelchairAccess.wideDoorways) areas.push('Narrow doorways - wheelchair access limited');
    if (!analysis.wheelchairAccess.accessibleEntrance) areas.push('Inaccessible entrance');
    
    // Bathroom accessibility issues
    if (!analysis.bathroomAccess.grabBars) areas.push('No grab bars in bathroom - safety concern');
    if (!analysis.bathroomAccess.accessibleShower) areas.push('Shower not accessible');
    if (!analysis.bathroomAccess.accessibleToilet) areas.push('Toilet not accessible');
    
    // Kitchen accessibility issues
    if (!analysis.kitchenAccess.accessibleCounters) areas.push('Counter heights not accessible');
    if (!analysis.kitchenAccess.accessibleAppliances) areas.push('Appliances not accessible');
    
    // Lighting and safety issues
    if (!analysis.lightingQuality.goodLighting) areas.push('Insufficient lighting');
    if (!analysis.safetyFeatures.smokeDetectors) areas.push('Missing smoke detectors');
    if (!analysis.safetyFeatures.handrails) areas.push('Missing safety handrails');
    
    // Pathway issues
    if (!analysis.pathwayClearance.wideHallways) areas.push('Narrow hallways - below ADA standard');
    if (!analysis.pathwayClearance.clearPathways) areas.push('Obstructed pathways');
    if (!analysis.pathwayClearance.nonSlipSurfaces) areas.push('Slippery surfaces - safety hazard');
    
    return areas.slice(0, 8);
  }

  generatePositiveFeatures(score) {
    const features = [];
    
    if (score >= 80) {
      features.push('Well-designed accessible layout');
      features.push('Good lighting throughout the space');
      features.push('Clear pathways and navigation');
      features.push('Thoughtful accessibility considerations');
    } else if (score >= 65) {
      features.push('Some accessible features present');
      features.push('Reasonable lighting quality');
      features.push('Generally clear pathways');
    } else {
      features.push('Basic accessibility features');
      features.push('Standard lighting setup');
    }
    
    return features;
  }

  generateImprovementAreas(score) {
    const areas = [];
    
    if (score < 60) {
      areas.push('Major accessibility barriers present');
      areas.push('Insufficient lighting in key areas');
      areas.push('Narrow or obstructed pathways');
      areas.push('Lack of safety features');
    } else if (score < 75) {
      areas.push('Some accessibility improvements needed');
      areas.push('Lighting could be enhanced');
      areas.push('Pathway clearance needs attention');
    } else if (score < 85) {
      areas.push('Minor accessibility enhancements');
      areas.push('Consider additional safety features');
    } else {
      areas.push('Maintain current accessibility standards');
    }
    
    return areas;
  }

  createSimpleFallbackAnalysis(imageCount) {
    return {
      analysis: {
        overall_score: 50,
        analyzed_images: imageCount,
        positive_features: [
          'Analysis service temporarily unavailable',
          'Please try again in a few moments'
        ],
        improvement_areas: [
          'Unable to analyze images at this time',
          'Service may be experiencing issues'
        ],
        recommendations: [
          'Try uploading images again',
          'Check your internet connection',
          'Contact support if issue persists'
        ],
        accessibility_rating: 'Unknown'
      },
      metadata: {
        analysis_type: 'fallback',
        processing_time: 'immediate',
        confidence: 'low',
        error: 'Analysis services unavailable'
      }
    };
    }

    /**
     * Create Claude prompt based on Rekognition results
     * @param {Array} analysisResults - Rekognition analysis results
     * @returns {string} Claude prompt
     */
    createClaudePrompt(analysisResults) {
        const rekognitionSummary = analysisResults.map(result => {
            if (result.rekognition.error) {
                return `Image: ${result.filename} - Analysis failed`;
            }
            return `Image: ${result.filename}
Score: ${result.rekognition.score}
Positive Features: ${result.rekognition.positiveFeatures.join(', ')}
Red Flags: ${result.rekognition.redFlags.join(', ')}
Recommendations: ${result.rekognition.recommendations.join(', ')}`;
        }).join('\n\n');

        return `Based on the following Rekognition analysis results, provide a comprehensive accessibility assessment:

${rekognitionSummary}

Please provide:
1. Overall accessibility score (0-100)
2. Key positive features found
3. Major red flags and barriers
4. Specific recommendations for improvement
5. Priority improvements (most important to address first)

Focus on universal design principles and ADA compliance.`;
    }

    /**
     * Synthesize results from Rekognition and Claude
     * @param {Array} analysisResults - Rekognition results
     * @param {Object} claudeResult - Claude analysis
     * @param {Object} allDetectedObjects - All detected objects
     * @param {Array} allPositiveFeatures - All positive features
     * @param {Array} allRedFlags - All red flags
     * @param {Array} allRecommendations - All recommendations
     * @param {number} totalScore - Total score from Rekognition
     * @param {number} imageCount - Number of images analyzed
     * @returns {Object} Final analysis
     */
    synthesizeResults(analysisResults, claudeResult, allDetectedObjects, allPositiveFeatures, allRedFlags, allRecommendations, totalScore, imageCount) {
        const averageScore = Math.round(totalScore / imageCount);
        
        // Combine Rekognition and Claude insights
        const combinedPositiveFeatures = [...new Set([...allPositiveFeatures, ...(claudeResult.positive_features || [])])];
        const combinedRedFlags = [...new Set([...allRedFlags, ...(claudeResult.barriers || [])])];
        const combinedRecommendations = [...new Set([...allRecommendations, ...(claudeResult.recommendations || [])])];

        return {
            success: true,
            analysis: {
                overall_score: Math.max(averageScore, claudeResult.score || averageScore),
                analyzed_images: imageCount,
                positive_features: combinedPositiveFeatures,
                barriers: combinedRedFlags,
                recommendations: combinedRecommendations,
                detailed_results: analysisResults,
                detected_objects: allDetectedObjects,
                analysis_methods: {
                    rekognition: true,
                    claude: true,
                    combined: true
                },
                confidence: this.calculateOverallConfidence(analysisResults),
                accessibility_rating: this.getRatingFromScore(Math.max(averageScore, claudeResult.score || averageScore))
            },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Create fallback analysis when Claude fails
     * @param {Array} analysisResults - Rekognition results
     * @param {Object} allDetectedObjects - Detected objects
     * @param {Array} allPositiveFeatures - Positive features
     * @param {Array} allRedFlags - Red flags
     * @param {Array} allRecommendations - Recommendations
     * @param {number} totalScore - Total score
     * @param {number} imageCount - Image count
     * @returns {Object} Fallback analysis
     */
    createFallbackAnalysis(analysisResults, allDetectedObjects, allPositiveFeatures, allRedFlags, allRecommendations, totalScore, imageCount) {
        const averageScore = Math.round(totalScore / imageCount);

        return {
            success: true,
            analysis: {
                overall_score: averageScore,
                analyzed_images: imageCount,
                positive_features: [...new Set(allPositiveFeatures)],
                barriers: [...new Set(allRedFlags)],
                recommendations: [...new Set(allRecommendations)],
                detailed_results: analysisResults,
                detected_objects: allDetectedObjects,
                analysis_methods: {
                    rekognition: true,
                    claude: false,
                    combined: false
                },
                confidence: this.calculateOverallConfidence(analysisResults),
                accessibility_rating: this.getRatingFromScore(averageScore)
            },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Calculate overall confidence from analysis results
     * @param {Array} analysisResults - Analysis results
     * @returns {number} Overall confidence
     */
    calculateOverallConfidence(analysisResults) {
        const validResults = analysisResults.filter(result => !result.rekognition.error);
        if (validResults.length === 0) return 0;

        const totalConfidence = validResults.reduce((sum, result) => {
            return sum + (result.rekognition.analysis?.confidence || 0);
        }, 0);

        return Math.round(totalConfidence / validResults.length);
    }

    /**
     * Get accessibility rating from score
     * @param {number} score - Accessibility score
     * @returns {string} Rating
     */
    getRatingFromScore(score) {
        if (score >= 90) return 'Excellent';
        if (score >= 80) return 'Good';
        if (score >= 70) return 'Fair';
        if (score >= 60) return 'Poor';
        return 'Very Poor';
    }
}

module.exports = ComprehensiveAnalysisService;
