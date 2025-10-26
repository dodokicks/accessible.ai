/**
 * Debug Python Scraper Call
 */

const { spawn } = require('child_process');
const path = require('path');

async function debugPythonScraper() {
  console.log('🐍 Debugging Python Scraper Call\n');
  
  const url = 'https://www.zillow.com/homedetails/1014-Teal-Dr-Santa-Clara-CA-95051/19616696_zpid/';
  const maxImages = 3;
  const pythonPath = 'python3';
  const scraperPath = path.join(__dirname, 'zillow_image_scraper.py');
  
  console.log('Parameters:');
  console.log('  URL:', url);
  console.log('  Max Images:', maxImages);
  console.log('  Python Path:', pythonPath);
  console.log('  Scraper Path:', scraperPath);
  
  return new Promise((resolve, reject) => {
    const args = [scraperPath, url, '--max-images', maxImages.toString()];
    console.log('\nExecuting command:', pythonPath, args.join(' '));
    
    const pythonProcess = spawn(pythonPath, args, {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log('STDOUT:', data.toString());
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.log('STDERR:', data.toString());
    });
    
    pythonProcess.on('close', (code) => {
      console.log(`\nPython process exited with code: ${code}`);
      
      if (code === 0) {
        try {
          // Parse the JSON output
          const lines = stdout.split('\n');
          const jsonLine = lines.find(line => line.trim().startsWith('{'));
          
          if (jsonLine) {
            const result = JSON.parse(jsonLine);
            console.log('✅ Success! Parsed result:', result);
            resolve(result);
          } else {
            console.log('❌ No JSON output found in stdout');
            reject(new Error('No JSON output found'));
          }
        } catch (parseError) {
          console.log('❌ Failed to parse JSON:', parseError.message);
          reject(parseError);
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

debugPythonScraper().catch(console.error);
