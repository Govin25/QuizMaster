/**
 * Performance Test Script
 * Tests API response times for critical endpoints
 */

const http = require('http');

const API_BASE = 'http://localhost:3001';
let authToken = null;

// Helper function to make HTTP requests
function makeRequest(method, path, data = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, API_BASE);
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(url, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        data: JSON.parse(body),
                        headers: res.headers,
                    });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

// Measure response time
async function measureEndpoint(name, method, path, token = null) {
    const start = Date.now();
    try {
        const response = await makeRequest(method, path, null, token);
        const duration = Date.now() - start;

        const status = response.status === 200 ? '✅' : '❌';
        const speed = duration < 50 ? '🚀' : duration < 100 ? '⚡' : duration < 200 ? '✓' : '⚠️';

        console.log(`${status} ${speed} ${name.padEnd(40)} ${duration}ms`);
        return { name, duration, success: response.status === 200 };
    } catch (error) {
        console.log(`❌ ⚠️  ${name.padEnd(40)} ERROR: ${error.message}`);
        return { name, duration: -1, success: false, error: error.message };
    }
}

async function runTests() {
    console.log('\n🔍 Quainy Performance Test\n');
    console.log('='.repeat(70));

    // Test 1: Login to get auth token
    console.log('\n📝 Authentication:');
    try {
        const loginResponse = await makeRequest('POST', '/api/auth/login', {
            username: 'admin',
            password: 'admin123'
        });

        if (loginResponse.data && loginResponse.data.token) {
            authToken = loginResponse.data.token;
            console.log('✅ Login successful');
        } else {
            console.log('⚠️  Login failed - using test without auth where possible');
        }
    } catch (error) {
        console.log('⚠️  Login error:', error.message);
    }

    // Test 2: Public endpoints (no auth required)
    console.log('\n📊 Public Endpoints (First Request - No Cache):');
    const publicTests = [
        await measureEndpoint('GET /api/quizzes/public', 'GET', '/api/quizzes/public'),
        await measureEndpoint('GET /api/quizzes', 'GET', '/api/quizzes'),
    ];

    // Test 3: Same endpoints with cache
    console.log('\n📊 Public Endpoints (Second Request - With Cache):');
    const cachedTests = [
        await measureEndpoint('GET /api/quizzes/public (cached)', 'GET', '/api/quizzes/public'),
    ];

    // Test 4: Authenticated endpoints
    if (authToken) {
        console.log('\n🔐 Authenticated Endpoints (First Request):');
        const authTests = [
            await measureEndpoint('GET /api/quizzes/my-library', 'GET', '/api/quizzes/my-library', authToken),
            await measureEndpoint('GET /api/leaderboard', 'GET', '/api/leaderboard?page=1&limit=10', authToken),
            await measureEndpoint('GET /api/profile/stats/1', 'GET', '/api/profile/stats/1', authToken),
        ];

        console.log('\n🔐 Authenticated Endpoints (Second Request - With Cache):');
        const authCachedTests = [
            await measureEndpoint('GET /api/quizzes/my-library (cached)', 'GET', '/api/quizzes/my-library', authToken),
            await measureEndpoint('GET /api/leaderboard (cached)', 'GET', '/api/leaderboard?page=1&limit=10', authToken),
            await measureEndpoint('GET /api/profile/stats/1 (cached)', 'GET', '/api/profile/stats/1', authToken),
        ];
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('\n📈 Performance Summary:');
    console.log('   🚀 = < 50ms (Excellent)');
    console.log('   ⚡ = 50-100ms (Good)');
    console.log('   ✓  = 100-200ms (Acceptable)');
    console.log('   ⚠️  = > 200ms (Needs optimization)');
    console.log('\n💡 Tip: Cached responses should be significantly faster (< 50ms)');
    console.log('');
}

// Run the tests
runTests().catch(console.error);
