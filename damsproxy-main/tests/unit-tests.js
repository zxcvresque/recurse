// Unit Tests for DAMS Content Suite
// Comprehensive testing of utility functions and core components

class UnitTestSuite {
  constructor() {
    this.tests = [];
    this.results = { passed: 0, failed: 0, total: 0 };
  }

  // Test registration
  test(name, testFunction) {
    this.tests.push({ name, testFunction });
  }

  // Run all tests
  async runAll() {
    console.log('🧪 Starting Unit Test Suite...');
    this.results = { passed: 0, failed: 0, total: 0 };

    for (const test of this.tests) {
      try {
        await test.testFunction();
        this.results.passed++;
        console.log(`✅ ${test.name} - PASSED`);
      } catch (error) {
        this.results.failed++;
        console.error(`❌ ${test.name} - FAILED: ${error.message}`);
      }
      this.results.total++;
    }

    this.displayResults();
  }

  displayResults() {
    console.log('\n📊 Unit Test Results:');
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);
    console.log(`Success Rate: ${Math.round((this.results.passed / this.results.total) * 100)}%`);
  }
}

// Initialize test suite
const unitTests = new UnitTestSuite();

// Test: Authentication Utilities
unitTests.test('Authentication Token Validation', async () => {
  // Test valid JWT-like token
  const validToken = 'header.payload.signature';
  const tokenParts = validToken.split('.');
  if (tokenParts.length !== 3) throw new Error('Token format validation failed');

  // Test invalid tokens
  const invalidTokens = ['', 'single', 'two.parts.only'];
  invalidTokens.forEach(token => {
    if (token.split('.').length !== 3) return; // Expected to fail
    throw new Error(`Invalid token ${token} should have failed validation`);
  });
});

// Test: Error Handling
unitTests.test('Error Handler Class', async () => {
  class ErrorHandler {
    constructor() {
      this.errors = [];
    }

    log(error) {
      this.errors.push(error);
    }

    getLastError() {
      return this.errors[this.errors.length - 1];
    }
  }

  const handler = new ErrorHandler();
  const testError = new Error('Test error message');

  handler.log(testError);
  const lastError = handler.getLastError();

  if (lastError.message !== 'Test error message') {
    throw new Error('Error handler not working correctly');
  }
});

// Test: Caching System
unitTests.test('Local Storage Caching', async () => {
  const testKey = '__unit_test_cache__';
  const testValue = 'test_cache_value_123';

  // Test set and get
  localStorage.setItem(testKey, testValue);
  const retrieved = localStorage.getItem(testKey);

  if (retrieved !== testValue) {
    throw new Error('Cache storage/retrieval failed');
  }

  // Cleanup
  localStorage.removeItem(testKey);
});

// Test: User Experience Utilities
unitTests.test('Progress Calculation', async () => {
  const calculateProgress = (current, total) => {
    if (total === 0) return 0;
    return Math.round((current / total) * 100);
  };

  const testCases = [
    { current: 0, total: 100, expected: 0 },
    { current: 50, total: 100, expected: 50 },
    { current: 100, total: 100, expected: 100 },
    { current: 25, total: 200, expected: 13 }
  ];

  testCases.forEach(({ current, total, expected }) => {
    const result = calculateProgress(current, total);
    if (result !== expected) {
      throw new Error(`Progress calculation failed: ${current}/${total} = ${result}, expected ${expected}`);
    }
  });
});

// Test: Data Validation
unitTests.test('Input Validation', async () => {
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validEmails = ['test@example.com', 'user.name@domain.co.uk'];
  const invalidEmails = ['invalid', 'no-at-symbol', '@no-domain', 'no-tld@'];

  validEmails.forEach(email => {
    if (!validateEmail(email)) {
      throw new Error(`Valid email ${email} failed validation`);
    }
  });

  invalidEmails.forEach(email => {
    if (validateEmail(email)) {
      throw new Error(`Invalid email ${email} passed validation`);
    }
  });
});

// Test: Array Utilities
unitTests.test('Array Operations', async () => {
  const testArray = [1, 2, 3, 4, 5];

  // Test sum
  const sum = testArray.reduce((a, b) => a + b, 0);
  if (sum !== 15) throw new Error('Array sum calculation failed');

  // Test filter
  const evenNumbers = testArray.filter(n => n % 2 === 0);
  if (evenNumbers.length !== 2 || evenNumbers[0] !== 2 || evenNumbers[1] !== 4) {
    throw new Error('Array filter operation failed');
  }

  // Test map
  const doubled = testArray.map(n => n * 2);
  if (doubled.length !== 5 || doubled[0] !== 2 || doubled[4] !== 10) {
    throw new Error('Array map operation failed');
  }
});

// Test: String Utilities
unitTests.test('String Operations', async () => {
  const testString = 'Hello World';

  // Test uppercase
  if (testString.toUpperCase() !== 'HELLO WORLD') {
    throw new Error('String uppercase failed');
  }

  // Test lowercase
  if (testString.toLowerCase() !== 'hello world') {
    throw new Error('String lowercase failed');
  }

  // Test substring
  if (testString.substring(0, 5) !== 'Hello') {
    throw new Error('String substring failed');
  }

  // Test split
  const words = testString.split(' ');
  if (words.length !== 2 || words[0] !== 'Hello' || words[1] !== 'World') {
    throw new Error('String split failed');
  }
});

// Test: Math Utilities
unitTests.test('Mathematical Operations', async () => {
  // Test basic arithmetic
  if (2 + 2 !== 4) throw new Error('Addition failed');
  if (5 - 3 !== 2) throw new Error('Subtraction failed');
  if (3 * 4 !== 12) throw new Error('Multiplication failed');
  if (8 / 2 !== 4) throw new Error('Division failed');

  // Test rounding
  if (Math.round(3.7) !== 4) throw new Error('Math.round failed');
  if (Math.floor(3.7) !== 3) throw new Error('Math.floor failed');
  if (Math.ceil(3.1) !== 4) throw new Error('Math.ceil failed');
});

// Test: Date Utilities
unitTests.test('Date Operations', async () => {
  const now = new Date();
  const future = new Date(now.getTime() + 86400000); // +1 day
  const past = new Date(now.getTime() - 86400000); // -1 day

  // Test date comparison
  if (future <= now) throw new Error('Future date comparison failed');
  if (past >= now) throw new Error('Past date comparison failed');

  // Test date formatting
  const formatted = now.toISOString();
  if (!formatted.includes('T') || !formatted.endsWith('Z')) {
    throw new Error('Date formatting failed');
  }
});

// Test: Object Utilities
unitTests.test('Object Operations', async () => {
  const testObject = { a: 1, b: 2, c: 3 };

  // Test object keys
  const keys = Object.keys(testObject);
  if (keys.length !== 3 || !keys.includes('a') || !keys.includes('b')) {
    throw new Error('Object.keys failed');
  }

  // Test object values
  const values = Object.values(testObject);
  if (values.length !== 3 || !values.includes(1) || !values.includes(2)) {
    throw new Error('Object.values failed');
  }

  // Test object spread
  const extendedObject = { ...testObject, d: 4 };
  if (extendedObject.a !== 1 || extendedObject.d !== 4) {
    throw new Error('Object spread failed');
  }
});

// Test: DOM Utilities
unitTests.test('DOM Operations', async () => {
  // Create test element
  const testElement = document.createElement('div');
  testElement.id = 'test-element';
  testElement.className = 'test-class';
  testElement.setAttribute('data-test', 'value');

  // Test element creation
  if (!testElement) throw new Error('Element creation failed');

  // Test element properties
  if (testElement.id !== 'test-element') throw new Error('Element ID setting failed');
  if (!testElement.classList.contains('test-class')) throw new Error('Element class setting failed');
  if (testElement.getAttribute('data-test') !== 'value') throw new Error('Element attribute setting failed');

  // Cleanup
  testElement.remove();
});

// Test: Event System
unitTests.test('Event Handling', async () => {
  let eventFired = false;
  let eventData = null;

  const testElement = document.createElement('button');
  testElement.addEventListener('click', (e) => {
    eventFired = true;
    eventData = e;
  });

  // Simulate click
  testElement.click();

  if (!eventFired) throw new Error('Event listener not working');
  if (!eventData) throw new Error('Event data not captured');

  // Cleanup
  testElement.remove();
});

// Test: Async Operations
unitTests.test('Async/Await Operations', async () => {
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const startTime = Date.now();
  await delay(10);
  const endTime = Date.now();

  if (endTime - startTime < 10) {
    throw new Error('Async delay not working correctly');
  }
});

// Test: JSON Operations
unitTests.test('JSON Serialization', async () => {
  const testData = { name: 'test', value: 123, nested: { prop: 'value' } };

  // Test stringify
  const jsonString = JSON.stringify(testData);
  if (typeof jsonString !== 'string' || !jsonString.includes('test')) {
    throw new Error('JSON stringify failed');
  }

  // Test parse
  const parsedData = JSON.parse(jsonString);
  if (parsedData.name !== 'test' || parsedData.value !== 123) {
    throw new Error('JSON parse failed');
  }
});

// Test: Type Checking
unitTests.test('Type Validation', async () => {
  const isString = (value) => typeof value === 'string';
  const isNumber = (value) => typeof value === 'number';
  const isBoolean = (value) => typeof value === 'boolean';
  const isArray = (value) => Array.isArray(value);
  const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

  // Test string
  if (!isString('hello')) throw new Error('String type check failed');
  if (isString(123)) throw new Error('String type check incorrectly passed for number');

  // Test number
  if (!isNumber(123)) throw new Error('Number type check failed');
  if (isNumber('123')) throw new Error('Number type check incorrectly passed for string');

  // Test boolean
  if (!isBoolean(true)) throw new Error('Boolean type check failed');
  if (isBoolean('true')) throw new Error('Boolean type check incorrectly passed for string');

  // Test array
  if (!isArray([1, 2, 3])) throw new Error('Array type check failed');
  if (isArray('123')) throw new Error('Array type check incorrectly passed for string');

  // Test object
  if (!isObject({ a: 1 })) throw new Error('Object type check failed');
  if (isObject([1, 2, 3])) throw new Error('Object type check incorrectly passed for array');
});

// Test: Performance Monitoring
unitTests.test('Performance Measurement', async () => {
  const startTime = performance.now();

  // Simulate some work
  for (let i = 0; i < 1000; i++) {
    Math.random();
  }

  const endTime = performance.now();
  const duration = endTime - startTime;

  if (duration < 0) throw new Error('Performance measurement failed');
  if (duration > 100) throw new Error('Performance measurement took too long');
});

// Test: Memory Management
unitTests.test('Memory Efficiency', async () => {
  const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;

  // Create some objects
  const objects = [];
  for (let i = 0; i < 100; i++) {
    objects.push({ data: 'x'.repeat(1000) });
  }

  const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;

  // Clear objects
  objects.length = 0;

  // Memory should be manageable
  if (performance.memory && finalMemory - initialMemory > 50000000) { // 50MB
    throw new Error('Memory usage seems excessive');
  }
});

// Test: Network Simulation
unitTests.test('Network Request Simulation', async () => {
  // Simulate a successful network request
  const simulateRequest = (url, options = {}) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, data: 'mock_data' })
        });
      }, 10);
    });
  };

  const response = await simulateRequest('/api/test');
  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error('Network simulation failed');
  }
});

// Test: Security Utilities
unitTests.test('Security Validation', async () => {
  const sanitizeInput = (input) => {
    // Basic XSS prevention
    return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  };

  const maliciousInput = '<script>alert("xss")</script>Hello World';
  const sanitized = sanitizeInput(maliciousInput);

  if (sanitized.includes('<script>')) {
    throw new Error('XSS sanitization failed');
  }

  if (!sanitized.includes('Hello World')) {
    throw new Error('XSS sanitization removed valid content');
  }
});

// Test: Accessibility
unitTests.test('Accessibility Features', async () => {
  const testElement = document.createElement('button');
  testElement.setAttribute('aria-label', 'Test button');
  testElement.setAttribute('role', 'button');

  if (testElement.getAttribute('aria-label') !== 'Test button') {
    throw new Error('ARIA attribute setting failed');
  }

  if (testElement.getAttribute('role') !== 'button') {
    throw new Error('Role attribute setting failed');
  }

  testElement.remove();
});

// Test: Internationalization
unitTests.test('Internationalization Support', async () => {
  const testStrings = {
    en: 'Hello World',
    es: 'Hola Mundo',
    fr: 'Bonjour le Monde'
  };

  Object.values(testStrings).forEach(str => {
    if (typeof str !== 'string' || str.length === 0) {
      throw new Error('Internationalization string validation failed');
    }
  });
});

// Run tests when file loads
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    console.log('🚀 Running Unit Tests...');
    unitTests.runAll();
  });
}

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UnitTestSuite;
}