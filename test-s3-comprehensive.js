/**
 * Comprehensive S3 Test
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testS3Comprehensive() {
  console.log('🧪 Comprehensive S3 Test\n');
  
  try {
    // Test with a real Zillow URL that should work
    const testUrl = 'https://www.zillow.com/homedetails/1014-Teal-Dr-Santa-Clara-CA-95051/19616696_zpid/';
    
    console.log('Testing with real Zillow URL...');
    console.log('URL:', testUrl);
    
    const response = await fetch('http://localhost:3000/api/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: testUrl,
        maxImages: 3,  // Limit to 3 images for testing
        analyzeWithBedrock: false  // Disable Bedrock for now to focus on S3
      })
    });
    
    const result = await response.json();
    
    console.log('\nResponse Status:', response.status);
    console.log('Response OK:', response.ok);
    
    if (response.ok) {
      console.log('✅ S3 upload successful!');
      console.log('Results:');
      console.log('  Property ID:', result.propertyId);
      console.log('  Images scraped:', result.scraping?.imagesFound);
      console.log('  Images uploaded to S3:', result.s3Upload?.uploadedImages);
      console.log('  S3 Bucket:', result.s3Upload?.bucketName);
      console.log('  S3 Folder:', result.s3Upload?.folderPath);
      
      if (result.s3Upload?.failedUploads > 0) {
        console.log('  Failed uploads:', result.s3Upload.failedUploads);
      }
    } else {
      console.log('❌ S3 upload failed');
      console.log('Error:', result.message || result.error);
      console.log('Details:', result.details);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testS3Comprehensive();
