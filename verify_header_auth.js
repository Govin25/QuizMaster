// Native fetch is available in Node 20

const API_URL = 'http://localhost:3001'; // Server running on 3001

async function testHeaderAuth() {
    console.log('1. Testing Login...');

    // 1. Login to get token
    const loginRes = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: 'testuser', // Ensure this user exists or use a valid one
            password: 'Password123!'
        })
    });

    if (!loginRes.ok) {
        // If testuser doesn't exist, try to signup first
        console.log('Login failed, trying signup...');
        const signupRes = await fetch(`${API_URL}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: `testuser_${Date.now()}`,
                password: 'Password123!',
                acceptedTerms: true,
                acceptedPrivacy: true
            })
        });

        if (!signupRes.ok) {
            console.error('Signup failed:', await signupRes.text());
            return;
        }

        const signupData = await signupRes.json();
        console.log('Signup successful. Token received:', !!signupData.token);
        verifyToken(signupData.token);
        return;
    }

    const loginData = await loginRes.json();
    console.log('Login successful. Token received:', !!loginData.token);

    if (loginData.token) {
        await verifyToken(loginData.token);
    } else {
        console.error('No token returned in login response!');
    }
}

async function verifyToken(token) {
    console.log('\n2. Testing Protected Route with Header...');

    // 2. Use token in header to access protected route (no cookies)
    const verifyRes = await fetch(`${API_URL}/api/auth/verify`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (verifyRes.ok) {
        const verifyData = await verifyRes.json();
        console.log('✅ SUCCESS: Protected route accessed via Header Auth!');
        console.log('User:', verifyData.user.username);
    } else {
        console.error('❌ FAILED: Could not access protected route with header.');
        console.error('Status:', verifyRes.status);
        console.error('Response:', await verifyRes.text());
    }
}

testHeaderAuth().catch(console.error);
