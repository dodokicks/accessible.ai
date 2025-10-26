/**
 * Test S3 Credentials
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testS3Credentials() {
  console.log('🧪 Testing S3 Credentials\n');
  
  try {
    // Test with a simple scrape request that will trigger S3 operations
    const testUrl = 'https://example.com/test';
    
    console.log('Testing S3 credential loading...');
    
    const response = await fetch('http://localhost:3000/api/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: testUrl,
        maxImages: 1,
        analyzeWithBedrock: false
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ S3 credentials are working!');
      console.log('Response:', result);
    } else {
      console.log('❌ S3 credentials issue:', result.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testS3Credentials();
