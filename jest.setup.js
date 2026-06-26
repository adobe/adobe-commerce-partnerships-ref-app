import '@testing-library/jest-dom';

// Mock environment variables for testing
process.env.APP_CLIENT_ID = 'test_client_id';
process.env.APP_ENV = 'test';

// Mock fetch globally
global.fetch = jest.fn();

// Mock console to reduce noise in tests (but allow assertions)
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  // Restore console for debugging if needed
  global.console.log.mockClear();
  global.console.error.mockClear();
  global.console.warn.mockClear();
  // Clean up sessionStorage
  global.deleteSessionStorageSafely();
});

// Helper to delete window property safely
global.deleteWindowSafely = () => {
  try {
    delete global.window;
  } catch (e) {
    // Ignore if window can't be deleted
  }

  // Also clean up global sessionStorage
  global.deleteSessionStorageSafely();
};

// Helper to mock window safely
global.mockWindowSafely = windowMock => {
  try {
    global.deleteWindowSafely();
    global.window = windowMock;

    // Also mock global sessionStorage if provided in windowMock
    if (windowMock.sessionStorage) {
      global.sessionStorage = windowMock.sessionStorage;
    }
  } catch (e) {
    // Ignore if window can't be set
  }
};

// Helper to clean up global sessionStorage
global.deleteSessionStorageSafely = () => {
  try {
    delete global.sessionStorage;
  } catch (e) {
    // Ignore if sessionStorage can't be deleted
  }
};
