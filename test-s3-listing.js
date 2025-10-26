/**
 * Test S3 Listing Directly
 */

const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function testS3Listing() {
  console.log('🧪 Testing S3 Listing Directly\n');
  
  try {
    const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_DEFAULT_REGION || 'us-east-1';
    const bucketName = process.env.S3_BUCKET_NAME || 'zillow-images-kc';

    const s3Client = new S3Client({
      region: region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey
      }
    });

    console.log(`Listing objects in bucket: ${bucketName}`);
    console.log(`Looking for prefix: properties/2025-10-26/ca/clara/1014-teal-dr-santa-b002277d-69e1-47f1-822e-a3f914d53743`);
    
    const listParams = {
      Bucket: bucketName,
      Prefix: 'properties/2025-10-26/ca/clara/1014-teal-dr-santa-b002277d-69e1-47f1-822e-a3f914d53743',
      Delimiter: '/'
    };
    
    const response = await s3Client.send(new ListObjectsV2Command(listParams));
    
    console.log('\nRaw S3 Response:');
    console.log('Contents:', response.Contents?.length || 0, 'objects');
    
    if (response.Contents) {
      response.Contents.forEach((obj, index) => {
        console.log(`  ${index + 1}. Key: ${obj.Key}`);
        console.log(`     Size: ${obj.Size} bytes`);
        console.log(`     Last Modified: ${obj.LastModified}`);
        console.log(`     Ends with .jpg: ${obj.Key.endsWith('.jpg')}`);
        console.log(`     Ends with .jpeg: ${obj.Key.endsWith('.jpeg')}`);
        console.log(`     Ends with .png: ${obj.Key.endsWith('.png')}`);
        console.log('');
      });
    }
    
    // Test the filtering logic
    const images = response.Contents
      ?.filter(obj => obj.Key.endsWith('.jpg') || obj.Key.endsWith('.jpeg') || obj.Key.endsWith('.png'))
      .map(obj => ({
        key: obj.Key,
        url: `https://${bucketName}.s3.${region}.amazonaws.com/${obj.Key}`,
        size: obj.Size,
        lastModified: obj.LastModified
      })) || [];
    
    console.log(`\nFiltered Images: ${images.length}`);
    images.forEach((img, index) => {
      console.log(`  ${index + 1}. ${img.key} (${img.size} bytes)`);
    });
    
  } catch (error) {
    console.error('❌ S3 listing failed:', error.message);
    console.error('Error details:', error);
  }
}

testS3Listing();
