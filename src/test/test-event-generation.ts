// Test file to generate MCP events
// Created at: 2025-09-14T03:22:00Z
// Modified at: 2025-09-14T03:24:00Z

export function testEventGeneration() {
  console.log('Generating test events for MCP dashboard');

  // This file change should trigger:
  // 1. File watcher detection
  // 2. MCP server event broadcast
  // 3. Dashboard real-time update

  const timestamp = new Date().toISOString();
  return {
    message: 'Test event generated',
    timestamp,
    purpose: 'Verify real-time data flow from MCP to dashboard',
    version: 2,
    additionalData: {
      testRun: true,
      environment: 'development'
    }
  };
}

// Additional function to generate more events
export function generateMultipleEvents(count: number = 5) {
  const events = [];
  for (let i = 0; i < count; i++) {
    events.push({
      id: `event-${i}`,
      timestamp: new Date().toISOString(),
      type: 'test_event',
      message: `Test event number ${i + 1}`
    });
  }
  return events;
}

// Export for testing
export default testEventGeneration;