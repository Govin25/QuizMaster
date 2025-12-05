const API_URL = 'http://127.0.0.1:3001';
const CREDENTIALS = {
    username: 'test',
    password: 'Test1234'
};
const CHALLENGE_ID = 31;

async function runTest() {
    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(CREDENTIALS)
        });

        if (!loginRes.ok) {
            throw new Error(`Login failed: ${loginRes.status} ${loginRes.statusText}`);
        }

        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('Login successful. Token obtained.');

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        // 2. Start Session (Attempt 1)
        console.log('\nStarting session (Attempt 1)...');
        const startRes1 = await fetch(`${API_URL}/api/quiz-sessions/start`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ challengeId: CHALLENGE_ID })
        });

        const data1 = await startRes1.json();
        console.log('Attempt 1 Response:', JSON.stringify(data1, null, 2));

        // 3. Start Session (Attempt 2 - Should Resume)
        console.log('\nStarting session (Attempt 2 - Expecting Resume)...');
        const startRes2 = await fetch(`${API_URL}/api/quiz-sessions/start`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ challengeId: CHALLENGE_ID })
        });

        const data2 = await startRes2.json();
        console.log('Attempt 2 Response:', JSON.stringify(data2, null, 2));

    } catch (err) {
        console.error('Test Failed:', err);
    }
}

runTest();
