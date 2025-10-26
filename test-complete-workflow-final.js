/**
 * Test Complete S3 + Bedrock Workflow
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testCompleteWorkflow() {
  console.log('🧪 Testing Complete S3 + Bedrock Workflow\n');
  
  const testUrl = 'https://www.zillow.com/homedetails/1014-Teal-Dr-Santa-Clara-CA-95051/19616696_zpid/';
  
  try {
    console.log('Making request with Bedrock analysis enabled...');
    const response = await fetch('http://localhost:3000/api/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: testUrl,
        maxImages: 3,
        analyzeWithBedrock: true  // Enable Bedrock analysis
      })
    });
    
    const result = await response.json();
    
    console.log('\nResponse Status:', response.status);
    console.log('Response OK:', response.ok);
    
    if (response.ok) {
      console.log('\n✅ Complete workflow successful!');
      console.log('Property ID:', result.propertyId);
      console.log('Property Details:', result.propertyDetails);
      console.log('Images scraped:', result.scraping?.imagesFound);
      console.log('Images uploaded to S3:', result.s3Upload?.uploadedImages);
      console.log('S3 Bucket:', result.s3Upload?.bucketName);
      console.log('S3 Folder:', result.s3Upload?.folderPath);
      
      if (result.bedrockAnalysis) {
        console.log('\n🤖 Bedrock Analysis Results:');
        console.log('  Success:', result.bedrockAnalysis.success);
        console.log('  Overall Score:', result.bedrockAnalysis.overallScore);
        console.log('  Analysis Summary:', result.bedrockAnalysis.summary);
        
        if (result.bedrockAnalysis.comprehensiveAnalysis) {
          console.log('  Key Strengths:', result.bedrockAnalysis.comprehensiveAnalysis.key_strengths);
          console.log('  Critical Issues:', result.bedrockAnalysis.comprehensiveAnalysis.critical_issues);
          console.log('  Recommendations:', result.bedrockAnalysis.comprehensiveAnalysis.recommendations);
          console.log('  Estimated Cost:', result.bedrockAnalysis.comprehensiveAnalysis.estimated_cost);
        }
      } else {
        console.log('\n⚠️ No Bedrock analysis results found');
      }
      
      console.log('\n📁 S3 Image URLs:');
      result.s3Upload.uploadedImageUrls.forEach((img, index) => {
        console.log(`  ${index + 1}. ${img.filename} (${img.size} bytes)`);
        console.log(`     URL: ${img.s3Url}`);
      });
      
    } else {
      console.log('\n❌ Workflow failed');
      console.log('Error:', result.message || result.error);
      console.log('Details:', result.details);
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testCompleteWorkflow();
