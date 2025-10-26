/**
 * Direct S3 Credential Test
 */

const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function testDirectS3Credentials() {
  console.log('🧪 Testing S3 Credentials Directly\n');
  
  try {
    // Get credentials
    const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_DEFAULT_REGION || 'us-east-1';
    
    console.log('Credentials Debug:');
    console.log('  S3_ACCESS_KEY_ID:', accessKeyId ? `${accessKeyId.substring(0, 8)}...` : 'NOT SET');
    console.log('  S3_SECRET_ACCESS_KEY:', secretAccessKey ? `${secretAccessKey.substring(0, 8)}...` : 'NOT SET');
    console.log('  AWS_DEFAULT_REGION:', region);
    
    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS credentials not found in environment variables');
    }
    
    // Create S3 client
    const s3Client = new S3Client({
      region: region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey
      }
    });
    
    console.log('\nTesting S3 connection...');
    
    // Test with ListBuckets command
    const command = new ListBucketsCommand({});
    const response = await s3Client.send(command);
    
    console.log('✅ S3 credentials are valid!');
    console.log(`Found ${response.Buckets.length} buckets:`);
    response.Buckets.forEach(bucket => {
      console.log(`  - ${bucket.Name} (created: ${bucket.CreationDate})`);
    });
    
  } catch (error) {
    console.error('❌ S3 credentials test failed:', error.message);
    console.error('Error details:', error);
  }
}

testDirectS3Credentials();
