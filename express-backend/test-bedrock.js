const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
require('dotenv').config({ path: '../.env' });

async function testBedrock() {
  try {
    console.log('Testing AWS credentials...');
    console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET');
    console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET');
    console.log('BEDROCK_ACCESS_KEY_ID:', process.env.BEDROCK_ACCESS_KEY_ID ? 'SET' : 'NOT SET');
    console.log('BEDROCK_SECRET_ACCESS_KEY:', process.env.BEDROCK_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET');
    console.log('AWS_DEFAULT_REGION:', process.env.AWS_DEFAULT_REGION);
    
    const client = new BedrockRuntimeClient({
      region: process.env.AWS_DEFAULT_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.BEDROCK_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.BEDROCK_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY
      }
    });
    
    console.log('Bedrock client created successfully');
    
    // Test with a simple text prompt first
    const input = {
      modelId: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
      contentType: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 100,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: 'Hello, can you respond with "AWS Bedrock is working"?'
          }
        ]
      })
    };
    
    const command = new InvokeModelCommand(input);
    const response = await client.send(command);
    
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    console.log('Bedrock response:', responseBody.content[0].text);
    
  } catch (error) {
    console.error('Error testing Bedrock:', error.message);
    console.error('Stack:', error.stack);
  }
}

testBedrock();
