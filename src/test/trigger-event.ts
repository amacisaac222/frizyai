// File to trigger MCP event
// This should appear in the dashboard events
export const triggerTimestamp = new Date().toISOString();
console.log('Event triggered at:', triggerTimestamp);

// Additional trigger to generate more events
export function generateTestEvent() {
  return {
    timestamp: new Date().toISOString(),
    type: 'test',
    message: 'Testing MCP real-time events with persistence',
    version: 2,
    persistent: true
  };
}

// Test persistence after refresh
export const persistenceTest = {
  message: 'Events should persist after page refresh',
  timestamp: new Date().toISOString()
};