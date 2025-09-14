// Test file to generate contextual block names
// This should create a block named "Editing: context-test.ts"

export function testContextualNaming() {
  console.log('Testing contextual block naming');
  return {
    purpose: 'Verify that work blocks show specific file names',
    timestamp: new Date().toISOString(),
    expectedBlockName: 'Editing: context-test.ts'
  };
}

// This file change should appear with proper context