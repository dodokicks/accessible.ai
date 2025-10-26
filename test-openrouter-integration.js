const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const API_BASE_URL = 'http://localhost:3000';

async function testOpenRouterIntegration() {
  console.log('🧪 Testing OpenRouter Integration\n');
  
  // Test with existing S3 images
  const testS3Urls = [
    'https://zillow-images-kc.s3.us-east-1.amazonaws.com/properties/2025-10-26/ca/clara/1014-teal-dr-santa-dc72f013-14fa-4bed-8284-023d74627d4a/image_1.jpg',
    'https://zillow-images-kc.s3.us-east-1.amazonaws.com/properties/2025-10-26/ca/clara/1014-teal-dr-santa-dc72f013-14fa-4bed-8284-023d74627d4a/image_2.jpg',
    'https://zillow-images-kc.s3.us-east-1.amazonaws.com/properties/2025-10-26/ca/clara/1014-teal-dr-santa-dc72f013-14fa-4bed-8284-023d74627d4a/image_3.jpg'
  ];
  
  try {
    console.log('Testing OpenRouter analysis with existing S3 URLs...');
    const response = await fetch(`${API_BASE_URL}/api/analyze-images-by-urls`, {
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
      console.log('\n✅ OpenRouter analysis successful!');
      console.log('Analysis Result:', JSON.stringify(result, null, 2));
      
      if (result.analysis && result.analysis.comprehensiveAnalysis) {
        console.log('\n📊 Summary:');
        console.log(`Overall Score: ${result.analysis.overallScore}/100`);
        console.log(`Analysis Summary: ${result.analysis.analysisSummary}`);
        console.log(`Images Analyzed: ${result.analysis.analyzedImages}/${result.analysis.totalImages}`);
      }
    } else {
      console.error('❌ OpenRouter analysis failed');
      console.error('Error message:', result.message);
      console.error('Error details:', result.details);
    }
  } catch (error) {
    console.error('❌ An unexpected error occurred:', error);
  }
}

async function testServiceSelection() {
  console.log('\n🔧 Testing Service Selection\n');
  
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const health = await response.json();
    
    console.log('Health Check:', health);
    
    // Test a simple analysis to see which service is being used
    console.log('\nTesting service selection with single image...');
    const testResponse = await fetch(`${API_BASE_URL}/api/analyze-images-by-urls`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageUrls: ['https://zillow-images-kc.s3.us-east-1.amazonaws.com/properties/2025-10-26/ca/clara/1014-teal-dr-santa-dc72f013-14fa-4bed-8284-023d74627d4a/image_1.jpg'],
        propertyDetails: {
          address: 'Test Property',
          city: 'Test City',
          state: 'CA'
        }
      })
    });
    
    const testResult = await testResponse.json();
    
    if (testResponse.ok) {
      console.log('✅ Service selection test successful');
      console.log('Service used:', process.env.AI_SERVICE_TYPE || 'openrouter (default)');
    } else {
      console.log('⚠️ Service selection test failed - this might indicate configuration issues');
      console.log('Error:', testResult.message);
    }
    
  } catch (error) {
    console.error('❌ Service selection test error:', error);
  }
}

async function main() {
  console.log('🚀 OpenRouter Integration Test Suite\n');
  console.log('=====================================\n');
  
  await testServiceSelection();
  await testOpenRouterIntegration();
  
  console.log('\n✨ Test suite completed!');
  console.log('\n📝 Notes:');
  console.log('- Make sure OPENROUTER_API_KEY is set in your .env file');
  console.log('- Set AI_SERVICE_TYPE=openrouter in your .env file');
  console.log('- Available models: anthropic/claude-3.5-sonnet, openai/gpt-4-vision-preview, google/gemini-pro-vision');
}

main().catch(console.error);
