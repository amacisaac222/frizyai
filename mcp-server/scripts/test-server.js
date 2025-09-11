#!/usr/bin/env node

// Simple test script to verify MCP server functionality
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serverPath = join(__dirname, '../dist/index.js');

console.log('Testing Frizy MCP Server...');
console.log('Server path:', serverPath);

// Test 1: Server starts without errors
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, NODE_ENV: 'test', LOG_LEVEL: 'error' }
});

let output = '';
let errorOutput = '';

server.stdout.on('data', (data) => {
  output += data.toString();
});

server.stderr.on('data', (data) => {
  errorOutput += data.toString();
});

// Test MCP protocol - send list tools request
setTimeout(() => {
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list'
  };
  
  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
}, 100);

// Test tool call
setTimeout(() => {
  const toolCallRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'frizy_progress',
      arguments: {
        blockId: 'test-block',
        progress: 50
      }
    }
  };
  
  server.stdin.write(JSON.stringify(toolCallRequest) + '\n');
}, 200);

// Clean shutdown after tests
setTimeout(() => {
  server.kill('SIGTERM');
}, 1000);

server.on('close', (code) => {
  console.log('\n=== Test Results ===');
  console.log(`Server exited with code: ${code}`);
  
  if (errorOutput.includes('error') || errorOutput.includes('Error')) {
    console.log('\n❌ Errors detected:');
    console.log(errorOutput);
  } else {
    console.log('\n✅ Server started successfully');
  }
  
  if (output.includes('"tools"') || output.includes('frizy_')) {
    console.log('✅ MCP protocol responding');
  } else {
    console.log('❌ MCP protocol not responding properly');
  }
  
  console.log('\n=== Server Output ===');
  console.log(output);
  
  if (errorOutput) {
    console.log('\n=== Error Output ===');
    console.log(errorOutput);
  }
  
  console.log('\n=== Test Complete ===');
});