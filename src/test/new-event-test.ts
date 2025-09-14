// Test file to generate a file_change event
// Created at: ${new Date().toISOString()}

export function testFileChangeEvent() {
  console.log('This file change should appear as an event in the dashboard');
  return {
    status: 'success',
    message: 'File change event generated',
    timestamp: new Date().toISOString()
  };
}

// This modification should trigger the file watcher
export default testFileChangeEvent;