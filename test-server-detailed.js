/**
 * Test Server Endpoint with Detailed Error Logging
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testServerEndpointDetailed() {
  console.log('🧪 Testing Server Endpoint with Detailed Error Logging\n');
  
  const testUrl = 'https://www.zillow.com/homedetails/1014-Teal-Dr-Santa-Clara-CA-95051/19616696_zpid/';
  
  try {
    console.log('Making request to server...');
    const response = await fetch('http://localhost:3000/api/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: testUrl,
        maxImages: 3,
        analyzeWithBedrock: false
      })
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const result = await response.json();
    
    console.log('\nResponse body:');
    console.log(JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('\n✅ Success!');
      console.log('Images scraped:', result.scraping?.imagesFound);
      console.log('Images uploaded to S3:', result.s3Upload?.uploadedImages);
    } else {
      console.log('\n❌ Error occurred');
      console.log('Error message:', result.message);
      console.log('Error details:', result.details);
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testServerEndpointDetailed();
