/**
 * Test S3 + Bedrock Integration Directly
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testS3BedrockDirectly() {
  console.log('🧪 Testing S3 + Bedrock Integration Directly\n');
  
  try {
    console.log('Testing Bedrock analysis with S3 folder path...');
    const response = await fetch('http://localhost:3000/api/analyze-s3-images', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        folderPath: 'properties/2025-10-26/ca/clara/1014-teal-dr-santa-b002277d-69e1-47f1-822e-a3f914d53743',
        propertyDetails: {
          address: '1014 Teal Dr Santa Clara',
          city: 'Clara',
          state: 'CA',
          zipCode: '95050',
          propertyType: 'Single Family Residence',
          price: '$2,388,000'
        }
      })
    });
    
    const result = await response.json();
    
    console.log('\nResponse Status:', response.status);
    console.log('Response OK:', response.ok);
    
    if (response.ok) {
      console.log('\n✅ Bedrock analysis successful!');
      console.log('Total Images:', result.totalImages);
      console.log('Analyzed Images:', result.analyzedImages);
      console.log('Failed Images:', result.failedImages);
      
      if (result.comprehensiveAnalysis) {
        console.log('\n🤖 Comprehensive Analysis:');
        console.log('  Overall Score:', result.comprehensiveAnalysis.overall_score);
        console.log('  Summary:', result.comprehensiveAnalysis.summary);
        console.log('  Key Strengths:', result.comprehensiveAnalysis.key_strengths);
        console.log('  Critical Issues:', result.comprehensiveAnalysis.critical_issues);
        console.log('  Recommendations:', result.comprehensiveAnalysis.recommendations);
        console.log('  Estimated Cost:', result.comprehensiveAnalysis.estimated_cost);
      }
      
      if (result.imageAnalyses && result.imageAnalyses.length > 0) {
        console.log('\n📸 Individual Image Analyses:');
        result.imageAnalyses.forEach((analysis, index) => {
          console.log(`  Image ${index + 1}:`);
          console.log(`    Success: ${analysis.success}`);
          console.log(`    Score: ${analysis.analysis?.accessibility_score || 'N/A'}`);
          console.log(`    Assessment: ${analysis.analysis?.overall_assessment?.substring(0, 100) || 'N/A'}...`);
        });
      }
      
    } else {
      console.log('\n❌ Bedrock analysis failed');
      console.log('Error:', result.message || result.error);
      console.log('Details:', result.details);
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testS3BedrockDirectly();
