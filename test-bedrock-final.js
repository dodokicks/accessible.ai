/**
 * Test Bedrock Analysis with Latest S3 URLs
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testBedrockFinal() {
  console.log('🧪 Testing Bedrock Analysis with Latest S3 URLs\n');
  
  // Test with the latest S3 URLs from the successful upload
  const testS3Urls = [
    'https://zillow-images-kc.s3.us-east-1.amazonaws.com/properties/2025-10-26/ca/clara/1014-teal-dr-santa-f28031fb-6619-4638-a740-5fa2600e5c6c/image_1.jpg',
    'https://zillow-images-kc.s3.us-east-1.amazonaws.com/properties/2025-10-26/ca/clara/1014-teal-dr-santa-f28031fb-6619-4638-a740-5fa2600e5c6c/image_2.jpg',
    'https://zillow-images-kc.s3.us-east-1.amazonaws.com/properties/2025-10-26/ca/clara/1014-teal-dr-santa-f28031fb-6619-4638-a740-5fa2600e5c6c/image_3.jpg'
  ];
  
  try {
    console.log('Testing Bedrock analysis with latest S3 URLs...');
    const response = await fetch('http://localhost:3000/api/analyze-s3-images', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        folderPath: 'properties/2025-10-26/ca/clara/1014-teal-dr-santa-f28031fb-6619-4638-a740-5fa2600e5c6c',
        propertyDetails: {
          address: '1014 Teal Dr Santa',
          city: 'Clara',
          state: 'CA',
          zipCode: '95050',
          propertyType: 'Single Family Residence',
          bedrooms: 'N/A',
          bathrooms: 'N/A',
          squareFeet: '1658',
          yearBuilt: 'N/A',
          lotSize: 'N/A',
          price: '$2,388,000'
        }
      })
    });
    
    const result = await response.json();
    
    console.log('\nResponse Status:', response.status);
    console.log('Response OK:', response.ok);
    
    if (response.ok) {
      console.log('\n✅ Bedrock analysis successful!');
      console.log('Analysis Result:', JSON.stringify(result, null, 2));
    } else {
      console.error('❌ Bedrock analysis failed');
      console.error('Error message:', result.message);
      console.error('Error details:', result.details);
    }
  } catch (error) {
    console.error('❌ An unexpected error occurred:', error);
  }
}

testBedrockFinal();
