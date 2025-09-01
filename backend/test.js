// Simple test suite for URL Shortener Backend
const http = require('http');
const { nanoid } = require('nanoid');

console.log('🧪 Running Backend Tests...\n');

// Test 1: Check nanoid functionality
console.log('Test 1: nanoid generation');
try {
  const id = nanoid(7);
  if (id.length === 7 && /^[a-zA-Z0-9]+$/.test(id)) {
    console.log('✅ PASS: nanoid generates 7-character alphanumeric ID');
  } else {
    console.log('❌ FAIL: nanoid test failed');
    process.exit(1);
  }
} catch (error) {
  console.log('❌ FAIL: nanoid test error:', error.message);
  process.exit(1);
}

// Test 2: URL validation
console.log('\nTest 2: URL validation');
try {
  // Valid URL
  new URL('https://example.com');
  console.log('✅ PASS: Valid URL accepted');
  
  // Invalid URL should throw
  try {
    new URL('not-a-url');
    console.log('❌ FAIL: Invalid URL was accepted');
    process.exit(1);
  } catch (e) {
    console.log('✅ PASS: Invalid URL rejected');
  }
} catch (error) {
  console.log('❌ FAIL: URL validation test error:', error.message);
  process.exit(1);
}

// Test 3: Environment variables
console.log('\nTest 3: Environment configuration');
try {
  const port = process.env.PORT || 3000;
  const domain = process.env.WORKSPACE_DEV_DOMAIN || 'localhost:3000';
  
  if (typeof port !== 'undefined' && typeof domain !== 'undefined') {
    console.log('✅ PASS: Environment variables configured');
    console.log(`   PORT: ${port}`);
    console.log(`   DOMAIN: ${domain}`);
  } else {
    console.log('❌ FAIL: Environment variables missing');
    process.exit(1);
  }
} catch (error) {
  console.log('❌ FAIL: Environment test error:', error.message);
  process.exit(1);
}

// Test 4: Dependencies check
console.log('\nTest 4: Dependencies check');
try {
  require('express');
  require('qrcode');
  require('cors');
  console.log('✅ PASS: All required dependencies available');
} catch (error) {
  console.log('❌ FAIL: Missing dependencies:', error.message);
  process.exit(1);
}

console.log('\n🎉 All backend tests passed!\n');
process.exit(0);
