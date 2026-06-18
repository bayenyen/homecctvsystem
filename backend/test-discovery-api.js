require('dotenv').config();
const axios = require('axios');

(async () => {
  try {
    // Login as admin first to get token
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin',
      password: 'Admin@123'
    });

    const token = loginRes.data.token;
    console.log('✓ Logged in as admin');

    // Call discovery endpoint
    const discoveryRes = await axios.get('http://localhost:5000/api/cameras/discover', {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('\n✓ Discovery API Response:');
    console.log(JSON.stringify(discoveryRes.data, null, 2));
  } catch (err) {
    console.error('✗ Error:', err.response?.data || err.message);
    process.exit(1);
  }
})();
