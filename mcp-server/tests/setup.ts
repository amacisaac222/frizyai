import { config } from 'dotenv';
import { beforeAll, afterAll, beforeEach } from 'vitest';

// Load test environment variables
config({ path: '.env.test' });

// Mock console methods in tests
const originalConsole = { ...console };
const mockConsole = {
  log: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn()
};

beforeAll(() => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests
  
  // Mock console for cleaner test output
  Object.assign(console, mockConsole);
});

afterAll(() => {
  // Restore console
  Object.assign(console, originalConsole);
});

beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();
});