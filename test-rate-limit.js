/**
 * Rate Limit Test Script
 *
 * This script tests the API rate limiting by making multiple requests
 * to verify that the 100 requests per 15 minutes limit works correctly.
 */

const BASE_URL = 'http://localhost:3000';

async function testRateLimit() {
  console.log('🧪 Starting Rate Limit Test...\n');
  console.log('Configuration: 100 requests per 15 minutes per IP\n');

  let successCount = 0;
  let blockedCount = 0;

  // Make 105 requests to test the limit
  for (let i = 1; i <= 105; i++) {
    try {
      const response = await fetch(`${BASE_URL}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 429) {
        blockedCount++;
        console.log(`❌ Request ${i}: BLOCKED (429 Too Many Requests)`);

        // Get rate limit headers
        const retryAfter = response.headers.get('Retry-After');
        const rateLimitRemaining = response.headers.get('RateLimit-Remaining');

        console.log(`   └─ Rate Limit Remaining: ${rateLimitRemaining}`);
        console.log(`   └─ Retry After: ${retryAfter} seconds\n`);

        if (blockedCount === 1) {
          console.log('✅ Rate limiting is working correctly!\n');
          console.log('📊 Test Summary:');
          console.log(`   - Successful requests: ${successCount}`);
          console.log(`   - Blocked requests: ${blockedCount}`);
          console.log(`   - Total requests made: ${i}`);
          break;
        }
      } else {
        successCount++;

        // Show progress every 25 requests
        if (i % 25 === 0) {
          console.log(`✓ Request ${i}: Success (${successCount} total)`);
        }
      }

    } catch (error) {
      console.error(`❌ Request ${i} failed:`, error.message);
    }

    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  console.log('\n🎯 Test Complete!');
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/`);
    if (response.ok) {
      console.log('✅ Server is running\n');
      return true;
    }
  } catch (error) {
    console.error('❌ Server is not running. Please start the server first:');
    console.error('   npm start\n');
    return false;
  }
}

// Run the test
(async () => {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await testRateLimit();
  }
})();
