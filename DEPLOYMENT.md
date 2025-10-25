# Accessibility Checker API - Deployment Guide

This guide explains how to deploy the Accessibility Checker API using AWS SAM (Serverless Application Model).

## Prerequisites

### 1. AWS CLI
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS credentials
aws configure
```

### 2. AWS SAM CLI
```bash
# Install SAM CLI
pip install aws-sam-cli

# Verify installation
sam --version
```

### 3. Docker (for local testing)
```bash
# Install Docker
# Follow instructions at: https://docs.docker.com/get-docker/
```

## Deployment Steps

### 1. Build the Application
```bash
# Build all Lambda functions
sam build

# Verify build output
ls .aws-sam/build/
```

### 2. Deploy to AWS
```bash
# Deploy with guided setup (first time)
sam deploy --guided

# Deploy with existing configuration
sam deploy

# Deploy to specific environment
sam deploy --config-env dev
sam deploy --config-env prod
```

### 3. Verify Deployment
```bash
# Check stack status
aws cloudformation describe-stacks --stack-name accessibility-checker-api

# List all resources
aws cloudformation list-stack-resources --stack-name accessibility-checker-api
```

## Configuration

### Environment Variables
The following environment variables are automatically configured:

- `S3_BUCKET_NAME`: S3 bucket for storing images
- `AWS_REGION`: AWS region
- `BEDROCK_MODEL_ID`: Bedrock model for LLM processing

### Parameters
You can customize deployment using parameters:

```bash
sam deploy --parameter-overrides \
  S3BucketName=my-custom-bucket \
  BedrockModelId=anthropic.claude-3-haiku-20240307-v1:0
```

## API Endpoints

After deployment, you'll get an API Gateway URL. The endpoints are:

### POST /presigned-url
Generate presigned S3 upload URLs for frontend.

**Request:**
```json
{
  "filename": "house1.jpg",
  "content_type": "image/jpeg"
}
```

**Response:**
```json
{
  "upload_url": "https://bucket.s3.amazonaws.com/",
  "fields": {...},
  "key": "uploads/uuid-filename.jpg",
  "expires_in": 300
}
```

### POST /analyze
Analyze multiple images for accessibility.

**Request:**
```json
{
  "images": [
    {"bucket": "bucket-name", "key": "image1.jpg"},
    {"bucket": "bucket-name", "key": "image2.jpg"}
  ]
}
```

**Response:**
```json
{
  "score": 85,
  "analyzed_images": 2,
  "positive_features": [...],
  "barriers": [...],
  "recommendations": [...]
}
```

## Local Development

### 1. Local API Testing
```bash
# Start local API Gateway
sam local start-api

# Test endpoints
curl -X POST http://localhost:3000/presigned-url \
  -H "Content-Type: application/json" \
  -d '{"filename": "test.jpg", "content_type": "image/jpeg"}'
```

### 2. Local Lambda Testing
```bash
# Test individual functions
sam local invoke PresignedUrlFunction --event events/presigned-url.json
sam local invoke OrchestratorFunction --event events/analyze.json
```

## Monitoring and Debugging

### CloudWatch Logs
```bash
# View logs for specific function
aws logs tail /aws/lambda/presigned-url-generator --follow
aws logs tail /aws/lambda/orchestrator-handler --follow
```

### CloudWatch Metrics
- Monitor function invocations, errors, and duration
- Set up alarms for error rates and latency
- Track S3 and Rekognition usage

## Cost Optimization

### 1. Lambda Configuration
- Memory: 512MB (configurable)
- Timeout: 60 seconds (configurable)
- Reserved concurrency for cost control

### 2. S3 Storage
- Enable S3 lifecycle policies for old images
- Use S3 Intelligent Tiering for cost optimization

### 3. API Gateway
- Consider API Gateway caching for repeated requests
- Monitor API Gateway usage and costs

## Security Considerations

### 1. IAM Permissions
- Least privilege access for all Lambda functions
- Separate roles for different functions
- Regular permission audits

### 2. S3 Security
- Bucket policies for access control
- CORS configuration for frontend access
- Encryption at rest and in transit

### 3. API Security
- Input validation in Lambda functions
- Rate limiting on API Gateway
- CORS configuration for allowed origins

## Troubleshooting

### Common Issues

1. **Deployment Fails**
   - Check AWS credentials and permissions
   - Verify S3 bucket name is unique
   - Check CloudFormation stack status

2. **Lambda Timeout**
   - Increase timeout in template.yaml
   - Optimize function code
   - Check external service dependencies

3. **Permission Errors**
   - Verify IAM roles and policies
   - Check S3 bucket permissions
   - Ensure Bedrock access is enabled

### Debug Commands
```bash
# Check stack events
aws cloudformation describe-stack-events --stack-name accessibility-checker-api

# View function logs
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/

# Test API endpoints
curl -X POST https://your-api-id.execute-api.region.amazonaws.com/prod/presigned-url
```

## Cleanup

To remove all resources:
```bash
# Delete the stack
aws cloudformation delete-stack --stack-name accessibility-checker-api

# Or use SAM
sam delete
```

## Support

For issues and questions:
1. Check CloudWatch logs for errors
2. Verify IAM permissions
3. Test individual Lambda functions
4. Check API Gateway configuration
