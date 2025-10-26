# OpenRouter vs AWS Bedrock Integration

## 🎯 **Overview**

This document explains how to use OpenRouter instead of AWS Bedrock for image analysis in the Accessible AI system. Both services work seamlessly with S3-stored images.

## 🔄 **Service Comparison**

| Feature | AWS Bedrock | OpenRouter |
|---------|-------------|------------|
| **Setup Complexity** | Medium (AWS credentials) | Easy (API key only) |
| **Model Selection** | Limited to AWS models | 50+ models from multiple providers |
| **Rate Limits** | AWS-specific throttling | Provider-specific throttling |
| **Pricing** | AWS pricing | Competitive pricing |
| **S3 Integration** | ✅ Native | ✅ Via download + base64 |
| **Fallback Support** | ✅ Built-in | ✅ Built-in |

## 🚀 **Quick Setup**

### 1. **Get OpenRouter API Key**
1. Go to [OpenRouter.ai](https://openrouter.ai)
2. Sign up and get your API key
3. Add credits to your account

### 2. **Configure Environment**
```bash
# Add to your .env file
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL_ID=anthropic/claude-3.5-sonnet
AI_SERVICE_TYPE=openrouter
```

### 3. **Available Models**
```bash
# Claude 3.5 Sonnet (Recommended)
OPENROUTER_MODEL_ID=anthropic/claude-3.5-sonnet

# GPT-4 Vision
OPENROUTER_MODEL_ID=openai/gpt-4-vision-preview

# Gemini Pro Vision
OPENROUTER_MODEL_ID=google/gemini-pro-vision

# Claude 3 Haiku (Faster, cheaper)
OPENROUTER_MODEL_ID=anthropic/claude-3-haiku
```

## 🔧 **How It Works**

### **S3 Integration Flow:**
1. **Images uploaded to S3** → `zillow-images-kc` bucket
2. **OpenRouter service downloads** images from S3 URLs
3. **Converts to base64** for API compatibility
4. **Sends to chosen model** via OpenRouter API
5. **Returns structured analysis** with accessibility scores

### **Service Selection:**
```javascript
// Automatic fallback system
const AI_SERVICE_TYPE = process.env.AI_SERVICE_TYPE || 'openrouter';

// Try OpenRouter first, fallback to Bedrock if needed
try {
  openRouterImageAnalysisService = new OpenRouterImageAnalysisService();
} catch (error) {
  bedrockImageAnalysisService = new BedrockImageAnalysisService(); // Fallback
}
```

## 📊 **API Response Format**

Both services return the same structured format:

```json
{
  "success": true,
  "overallScore": 75,
  "analysisSummary": "Property shows good accessibility features...",
  "propertyDetails": { ... },
  "totalImages": 3,
  "analyzedImages": 3,
  "failedImages": 0,
  "imageAnalyses": [
    {
      "success": true,
      "imageUrl": "https://s3.../image_1.jpg",
      "analysis": {
        "accessibility_score": 75,
        "accessibility_features": {
          "wheelchair_accessibility": {
            "score": 70,
            "details": "Good doorway widths...",
            "issues": ["No ramp visible"],
            "recommendations": ["Install wheelchair ramp"]
          }
        },
        "overall_assessment": "Good accessibility...",
        "key_strengths": ["Wide doorways", "Good lighting"],
        "critical_issues": ["No ramp", "Steps without handrails"],
        "improvement_priority": "medium",
        "estimated_renovation_cost": "$10,000 - $20,000"
      }
    }
  ],
  "comprehensiveAnalysis": {
    "overall_score": 75,
    "summary": "Comprehensive analysis...",
    "key_strengths": [...],
    "critical_issues": [...],
    "recommendations": [...],
    "estimated_cost": "$15,000 - $25,000"
  }
}
```

## 🧪 **Testing**

### **Test OpenRouter Integration:**
```bash
node test-openrouter-integration.js
```

### **Test Service Selection:**
```bash
# Test with OpenRouter
AI_SERVICE_TYPE=openrouter node test-openrouter-integration.js

# Test with Bedrock
AI_SERVICE_TYPE=bedrock node test-openrouter-integration.js
```

## 💰 **Cost Comparison**

### **OpenRouter Pricing (per 1M tokens):**
- **Claude 3.5 Sonnet**: ~$3-15 (depending on input/output)
- **GPT-4 Vision**: ~$10-30
- **Gemini Pro Vision**: ~$1-5
- **Claude 3 Haiku**: ~$0.25-1.25

### **AWS Bedrock Pricing:**
- **Claude 3.5 Sonnet**: ~$3-15 (similar to OpenRouter)
- **Titan**: ~$0.8-4

## 🔄 **Migration Guide**

### **From Bedrock to OpenRouter:**
1. **Add OpenRouter credentials** to `.env`
2. **Set AI_SERVICE_TYPE=openrouter**
3. **Restart the server**
4. **Test with existing S3 images**

### **From OpenRouter to Bedrock:**
1. **Set AI_SERVICE_TYPE=bedrock**
2. **Ensure AWS credentials** are configured
3. **Restart the server**

## 🛠 **Advanced Configuration**

### **Custom Model Selection:**
```bash
# High-quality analysis
OPENROUTER_MODEL_ID=anthropic/claude-3.5-sonnet

# Fast, cost-effective
OPENROUTER_MODEL_ID=anthropic/claude-3-haiku

# Google's vision model
OPENROUTER_MODEL_ID=google/gemini-pro-vision
```

### **Rate Limiting:**
```javascript
// Built-in delays to avoid rate limits
await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
```

## 🚨 **Troubleshooting**

### **Common Issues:**

1. **"No AI service available"**
   - Check API keys in `.env`
   - Verify service initialization

2. **"OpenRouter API error: 401"**
   - Invalid API key
   - Check OpenRouter account credits

3. **"Failed to download image: 403"**
   - S3 bucket permissions issue
   - Check bucket policy

4. **Rate limiting errors**
   - Increase delays between requests
   - Check provider-specific limits

### **Debug Mode:**
```bash
LOG_LEVEL=debug npm start
```

## 📈 **Performance Tips**

1. **Use Claude 3 Haiku** for faster, cheaper analysis
2. **Implement caching** for repeated analyses
3. **Batch process** multiple images
4. **Monitor API usage** and costs

## 🔮 **Future Enhancements**

- **Model comparison** endpoint
- **Cost tracking** per analysis
- **Automatic model selection** based on image complexity
- **Caching layer** for repeated analyses

---

**Ready to test?** Run `node test-openrouter-integration.js` to see OpenRouter in action! 🚀
