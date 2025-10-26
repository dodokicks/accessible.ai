/**
 * Test Bedrock Analysis Directly
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testBedrockDirectly() {
  console.log('🧪 Testing Bedrock Analysis Directly\n');
  
  // Test with existing S3 URLs
  const testS3Urls = [
    'https://zillow-images-kc.s3.us-east-1.amazonaws.com/properties/2025-10-26/ca/clara/1014-teal-dr-santa-dc72f013-14fa-4bed-8284-023d74627d4a/image_1.jpg',
    'https://zillow-images-kc.s3.us-east-1.amazonaws.com/properties/2025-10-26/ca/clara/1014-teal-dr-santa-dc72f013-14fa-4bed-8284-023d74627d4a/image_2.jpg',
    'https://zillow-images-kc.s3.us-east-1.amazonaws.com/properties/2025-10-26/ca/clara/1014-teal-dr-santa-dc72f013-14fa-4bed-8284-023d74627d4a/image_3.jpg'
  ];
  
  try {
    console.log('Testing Bedrock analysis with existing S3 URLs...');
    const response = await fetch('http://localhost:3000/api/analyze-images-by-urls', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageUrls: testS3Urls,
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

testBedrockDirectly();
