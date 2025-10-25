"""
AWS Lambda handler for processing images with Amazon Rekognition
to detect accessibility features and barriers in home environments.
"""

import json
import boto3
import os
from typing import Dict, Any, List
from utils.image_processor import ImageProcessor
from utils.logger import get_logger

logger = get_logger(__name__)

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for image processing with Amazon Rekognition.
    
    Args:
        event: Lambda event containing image data
        context: Lambda context object
        
    Returns:
        Dict containing analysis results
    """
    try:
        # Initialize AWS clients
        rekognition = boto3.client('rekognition')
        s3 = boto3.client('s3')
        
        # Extract image data from event
        bucket_name = event.get('bucket')
        image_key = event.get('key')
        
        if not bucket_name or not image_key:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Missing bucket or key in event'})
            }
        
        # Initialize image processor
        processor = ImageProcessor(rekognition, s3)
        
        # Process the image
        results = processor.analyze_accessibility_features(
            bucket_name, 
            image_key
        )
        
        logger.info(f"Successfully processed image: {image_key}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'success': True,
                'results': results,
                'image_key': image_key
            })
        }
        
    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e)
            })
        }
