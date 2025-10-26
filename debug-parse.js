/**
 * Debug Parsing Function
 */

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

// Test with sample output
const sampleOutput = `Zillow Image Scraper
==================================================
Fetching page: https://www.zillow.com/homedetails/1014-Teal-Dr-Santa-Clara-CA-95051/19616696_zpid/
Extracting property details...
Extracting property images from page...

Found 73 image(s):
--------------------------------------------------
 1. https://photos.zillowstatic.com/fp/9679f5db96e7fd3d25c1b2af45d3867f-cc_ft_1536.webp
 2. https://photos.zillowstatic.com/fp/4146f99f88fa4b629804c2a28c6fd87c-cc_ft_1536.webp
 3. https://photos.zillowstatic.com/fp/ba1a8b1e34516f713bf91af9d256c68d-cc_ft_1536.webp
--------------------------------------------------

Property Details:
Address: 1014 Teal Dr Santa
City: Clara
State: CA
ZIP: 95050
Type: Single Family Residence
Bedrooms: N/A
Bathrooms: N/A
Square Feet: 1658
Year Built: N/A
Lot Size: N/A
Price: $2,388,000

Scraping completed!`;

console.log('🧪 Testing Parse Function\n');

try {
  const result = parseScraperOutput(sampleOutput);
  console.log('✅ Parsing successful!');
  console.log('Image URLs found:', result.imageUrls.length);
  console.log('First 3 URLs:', result.imageUrls.slice(0, 3));
  console.log('Property Details:', result.propertyDetails);
} catch (error) {
  console.log('❌ Parsing failed:', error.message);
}
