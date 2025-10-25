# Home Accessibility Checker - AWS Lambda Backend

A Python-based AWS Lambda backend system for analyzing home environments and providing accessibility recommendations using Amazon Rekognition and Amazon Bedrock.

## Architecture Overview

This backend system consists of two main Lambda functions that work together to analyze home images and generate accessibility recommendations:

### 1. Rekognition Handler (`/lambdas/rekognition_handler/`)
- **Purpose**: Processes images using Amazon Rekognition to detect objects, labels, and accessibility features
- **Input**: S3 bucket and key for image location
- **Output**: Analysis results including detected objects, accessibility features, and potential barriers
- **Key Features**:
  - Object detection and labeling
  - Accessibility feature identification
  - Barrier detection
  - Accessibility scoring

### 2. LLM Handler (`/lambdas/llm_handler/`)
- **Purpose**: Uses Amazon Bedrock to generate intelligent recommendations based on Rekognition analysis
- **Input**: Rekognition analysis results and image metadata
- **Output**: Structured recommendations and improvement suggestions
- **Key Features**:
  - AI-powered accessibility recommendations
  - Improvement suggestions with priority levels
  - Cost and implementation difficulty estimates

## Project Structure

```
aws/
├── lambdas/
│   ├── rekognition_handler/
│   │   └── lambda_function.py      # Rekognition Lambda handler
│   └── llm_handler/
│       └── lambda_function.py     # LLM Lambda handler
├── utils/
│   ├── __init__.py
│   ├── logger.py                   # Logging utility
│   ├── image_processor.py        # Image processing utilities
│   └── bedrock_client.py           # Bedrock LLM client
├── tests/
│   ├── __init__.py
│   ├── test_rekognition_handler.py
│   ├── test_llm_handler.py
│   ├── test_image_processor.py
│   └── test_bedrock_client.py
├── requirements.txt                # Python dependencies
├── env.example                     # Environment variables template
└── README.md                       # This file
```

## Dependencies

- **Python 3.11**: Required Python version
- **boto3**: AWS SDK for Python
- **requests**: HTTP library for external API calls
- **python-dotenv**: Environment variable management

## Environment Configuration

Copy `env.example` to `.env` and configure the following variables:

```bash
# AWS Configuration
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-accessibility-checker-bucket
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0

# Optional: Additional configuration
LOG_LEVEL=INFO
MAX_IMAGE_SIZE_MB=10
```

## AWS Services Used

### Amazon Rekognition
- **Object Detection**: Identifies furniture, fixtures, and architectural elements
- **Label Detection**: Recognizes accessibility-related features and barriers
- **Custom Analysis**: Analyzes images for accessibility compliance

### Amazon Bedrock
- **Claude 3 Sonnet**: Large Language Model for generating recommendations
- **Structured Output**: JSON-formatted recommendations and suggestions
- **Context-Aware**: Uses Rekognition results to provide relevant advice

### Amazon S3
- **Image Storage**: Stores uploaded home images for analysis
- **Lambda Integration**: Provides images to Lambda functions

## Lambda Function Details

### Rekognition Handler

**Trigger**: API Gateway, S3 Event, or direct invocation
**Input Format**:
```json
{
  "bucket": "your-s3-bucket",
  "key": "path/to/image.jpg"
}
```

**Output Format**:
```json
{
  "statusCode": 200,
  "body": {
    "success": true,
    "results": {
      "objects": [...],
      "labels": [...],
      "accessibility_analysis": {
        "accessibility_features": [...],
        "potential_barriers": [...],
        "summary": {
          "accessibility_score": 75.0
        }
      }
    }
  }
}
```

### LLM Handler

**Trigger**: Rekognition Handler output or direct invocation
**Input Format**:
```json
{
  "rekognition_results": {...},
  "image_metadata": {...}
}
```

**Output Format**:
```json
{
  "statusCode": 200,
  "body": {
    "success": true,
    "recommendations": [
      {
        "title": "Install Grab Bars",
        "description": "Add grab bars in the bathroom...",
        "priority": "high",
        "category": "safety",
        "estimated_cost": "low"
      }
    ],
    "improvements": [
      {
        "title": "Widen Doorways",
        "description": "Consider widening doorways...",
        "implementation_difficulty": "complex",
        "category": "structural",
        "estimated_impact": "high"
      }
    ]
  }
}
```

## Utility Modules

### ImageProcessor (`utils/image_processor.py`)
- Handles Amazon Rekognition API calls
- Analyzes images for accessibility features
- Calculates accessibility scores
- Identifies potential barriers

### BedrockClient (`utils/bedrock_client.py`)
- Manages Amazon Bedrock API interactions
- Generates structured recommendations
- Provides improvement suggestions
- Handles LLM response parsing

### Logger (`utils/logger.py`)
- Centralized logging configuration
- Environment-based log levels
- Structured log formatting

## Testing

Run tests using pytest:

```bash
# Install test dependencies
pip install pytest pytest-mock

# Run all tests
pytest tests/

# Run specific test file
pytest tests/test_rekognition_handler.py

# Run with verbose output
pytest -v tests/
```

## Deployment

### Prerequisites
1. AWS CLI configured with appropriate permissions
2. Python 3.11 runtime available
3. Required AWS services enabled (Rekognition, Bedrock, S3)

### Lambda Deployment
1. Package each Lambda function separately
2. Upload to AWS Lambda
3. Configure environment variables
4. Set up appropriate IAM roles

### IAM Permissions Required
- **Rekognition**: `rekognition:DetectObjects`, `rekognition:DetectLabels`
- **Bedrock**: `bedrock:InvokeModel`
- **S3**: `s3:GetObject` (for image access)
- **CloudWatch**: `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`

## Usage Flow

1. **Image Upload**: User uploads home image to S3
2. **Rekognition Analysis**: First Lambda processes image with Amazon Rekognition
3. **LLM Processing**: Second Lambda generates recommendations using Bedrock
4. **Response**: Structured recommendations returned to client

## Error Handling

- **Graceful Degradation**: System continues to function even if some services fail
- **Comprehensive Logging**: All operations are logged for debugging
- **User-Friendly Errors**: Clear error messages for different failure scenarios
- **Retry Logic**: Built-in retry mechanisms for transient failures

## Performance Considerations

- **Cold Start Optimization**: Minimal dependencies and fast initialization
- **Memory Management**: Efficient image processing and response handling
- **Timeout Configuration**: Appropriate timeout settings for different operations
- **Concurrent Processing**: Support for multiple simultaneous requests

## Security

- **IAM Roles**: Least privilege access for Lambda functions
- **Environment Variables**: Secure configuration management
- **Input Validation**: Comprehensive input sanitization
- **Error Sanitization**: No sensitive information in error responses

## Monitoring and Observability

- **CloudWatch Logs**: Comprehensive logging for all operations
- **Metrics**: Custom metrics for accessibility scores and processing times
- **Alarms**: Automated alerts for errors and performance issues
- **Tracing**: Distributed tracing for request flow analysis

## Future Enhancements

- **Multi-language Support**: Support for different languages in recommendations
- **Custom Models**: Fine-tuned models for specific accessibility requirements
- **Batch Processing**: Support for analyzing multiple images simultaneously
- **Integration APIs**: RESTful APIs for external system integration
