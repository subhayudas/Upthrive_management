const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000';

async function testAPI() {
  try {
    console.log('🧪 Testing API Endpoints...\n');
    
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${API_BASE_URL}/api/health`);
    console.log('✅ Health check:', healthResponse.data.status);
    
    // Test 2: Try to get clients (this will fail without auth, but we can see the error)
    console.log('\n2. Testing clients endpoint (without auth)...');
    try {
      const clientsResponse = await axios.get(`${API_BASE_URL}/api/users/clients`);
      console.log('✅ Clients endpoint working:', clientsResponse.data);
    } catch (error) {
      console.log('❌ Clients endpoint error (expected without auth):', error.response?.data?.error || error.message);
    }
    
    // Test 3: Try to get CC list (this will fail without auth, but we can see the error)
    console.log('\n3. Testing CC list endpoint (without auth)...');
    try {
      const ccListResponse = await axios.get(`${API_BASE_URL}/api/cc-list/test-client-id`);
      console.log('✅ CC list endpoint working:', ccListResponse.data);
    } catch (error) {
      console.log('❌ CC list endpoint error (expected without auth):', error.response?.data?.error || error.message);
    }
    
    console.log('\n🎉 API endpoint tests completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Make sure you are logged in to the application');
    console.log('2. Check the browser console for any JavaScript errors');
    console.log('3. Check the server logs for any API errors');
    console.log('4. Verify that the client is making requests to the correct endpoints');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAPI();
