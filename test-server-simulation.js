/**
 * Complete Server Simulation Test
 */

const { spawn } = require('child_process');
const path = require('path');

function parseScraperOutput(output) {
  const imageUrls = [];
  const propertyDetails = {};
  const lines = output.split('\n');
  
  let inPropertyDetails = false;
  
  for (const line of lines) {
    // Look for lines that contain image URLs
    if (line.includes('https://photos.zillowstatic.com/')) {
      const urlMatch = line.match(/https:\/\/photos\.zillowstatic\.com\/[^\s]+/);
      if (urlMatch) {
        imageUrls.push(urlMatch[0]);
      }
    }
    
    // Look for property details section
    if (line.includes('Property Details:')) {
      inPropertyDetails = true;
      continue;
    }
    
    if (inPropertyDetails && line.includes(':')) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        
        if (key && value) {
          switch (key.toLowerCase()) {
            case 'address':
              propertyDetails.address = value;
              break;
            case 'city':
              propertyDetails.city = value;
              break;
            case 'state':
              propertyDetails.state = value;
              break;
            case 'zip':
              propertyDetails.zipCode = value;
              break;
            case 'type':
              propertyDetails.propertyType = value;
              break;
            case 'bedrooms':
              propertyDetails.bedrooms = value;
              break;
            case 'bathrooms':
              propertyDetails.bathrooms = value;
              break;
            case 'square feet':
              propertyDetails.squareFeet = value;
              break;
            case 'year built':
              propertyDetails.yearBuilt = value;
              break;
            case 'lot size':
              propertyDetails.lotSize = value;
              break;
            case 'price':
              propertyDetails.price = value;
              break;
          }
        }
      }
    }
  }
  
  return { imageUrls, propertyDetails };
}

async function testCompleteServerSimulation() {
  console.log('🧪 Complete Server Simulation Test\n');
  
  const url = 'https://www.zillow.com/homedetails/1014-Teal-Dr-Santa-Clara-CA-95051/19616696_zpid/';
  const maxImages = 3;
  const pythonPath = 'python3';
  const scraperPath = path.join(__dirname, 'zillow_image_scraper.py');
  
  console.log('Parameters:');
  console.log('  URL:', url);
  console.log('  Max Images:', maxImages);
  console.log('  Python Path:', pythonPath);
  console.log('  Scraper Path:', scraperPath);
  console.log('  Working Directory:', __dirname);
  
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn(pythonPath, [scraperPath, url], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      console.log(`\nPython process exited with code: ${code}`);
      console.log('STDERR:', stderr);
      console.log('STDOUT length:', stdout.length);
      console.log('STDOUT preview:', stdout.substring(0, 200));
      
      if (code === 0) {
        try {
          // Parse the output to extract image URLs and property details
          const { imageUrls, propertyDetails } = parseScraperOutput(stdout);
          
          // Limit images based on maxImages parameter
          const limitedImageUrls = maxImages ? imageUrls.slice(0, maxImages) : imageUrls;
          
          const processedImages = limitedImageUrls.map((url, index) => ({
            filename: `scraped_image_${index + 1}.jpg`,
            url: url,
            index: index
          }));
          
          console.log('✅ Success!');
          console.log('Total images found:', imageUrls.length);
          console.log('Limited images:', limitedImageUrls.length);
          console.log('Processed images:', processedImages.length);
          console.log('Property details:', propertyDetails);
          
          resolve({ images: processedImages, propertyDetails });
        } catch (error) {
          console.log('❌ Error parsing scraper output:', error.message);
          reject(error);
        }
      } else {
        console.log('❌ Python scraper failed');
        reject(new Error(`Python scraper failed with code ${code}`));
      }
    });

    pythonProcess.on('error', (error) => {
      console.log('❌ Failed to start Python process:', error.message);
      reject(error);
    });
  });
}

testCompleteServerSimulation().catch(console.error);
