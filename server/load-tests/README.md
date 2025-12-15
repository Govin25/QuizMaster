# Quainy Load Testing Suite

Comprehensive load testing infrastructure for the Quainy application using Artillery and custom Node.js scripts.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Test Scenarios](#test-scenarios)
- [Running Tests](#running-tests)
- [Understanding Results](#understanding-results)
- [Performance Benchmarks](#performance-benchmarks)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

This load testing suite provides:

- **Artillery-based load tests** for HTTP/REST APIs and WebSocket connections
- **Stress testing** to find system breaking points
- **Quick benchmarking** with autocannon
- **Comprehensive HTML reports** with performance metrics
- **Full user journey simulations** for realistic testing

## ✅ Prerequisites

- Node.js 14+ installed
- Quainy server running on `http://localhost:3001`
- Database seeded with test data (optional but recommended)

## 📦 Installation

Install load testing dependencies:

```bash
cd server
npm install
```

This will install:
- `artillery` - Main load testing framework
- `autocannon` - Fast HTTP benchmarking
- `artillery-plugin-metrics-by-endpoint` - Detailed endpoint metrics

## 🚀 Quick Start

### 1. Start Your Server

```bash
npm start
```

### 2. Run a Quick Benchmark

```bash
npm run benchmark
```

This runs fast benchmarks on key endpoints using autocannon.

### 3. Run Baseline Test

```bash
npm run load-test:baseline
```

Establishes performance baseline with low load.

### 4. Generate HTML Report

```bash
npm run load-test:report
```

Creates a beautiful HTML report from test results.

## 🧪 Test Scenarios

### Authentication Tests
**Command:** `npm run load-test:auth`

Tests:
- User signup with concurrent registrations
- User login with valid credentials
- Invalid login attempts
- Rate limiting on auth endpoints

**Load:** 5-10 users/sec for 120 seconds

### Quiz Endpoint Tests
**Command:** `npm run load-test:quiz`

Tests:
- Browse public quizzes
- Retrieve specific quiz details
- Add/remove quizzes from library
- Search and filter operations

**Load:** 10-20 users/sec for 150 seconds

### Leaderboard Tests
**Command:** `npm run load-test:leaderboard`

Tests:
- View leaderboard with different filters (first, all)
- Pagination under load
- Search by player/quiz
- Cache effectiveness

**Load:** 8-15 users/sec for 120 seconds

### Profile Tests
**Command:** `npm run load-test:profile`

Tests:
- Profile stats retrieval
- Activity heatmap generation
- Achievement system
- Performance trends
- Recommendations

**Load:** 6-12 users/sec for 120 seconds

### WebSocket Tests
**Command:** `npm run load-test:websocket`

Tests:
- Concurrent game sessions
- Real-time answer submission
- Score updates
- Result saving

**Load:** 5 users/sec for 60 seconds

### Full User Journey
**Command:** `npm run load-test:journey`

Simulates complete user flow:
1. Sign up
2. Browse quizzes
3. Add to library
4. View leaderboard
5. Check profile
6. View achievements

**Load:** 3 users/sec for 120 seconds

## 🏃 Running Tests

### Individual Tests

```bash
# Run specific test scenario
npm run load-test:auth
npm run load-test:quiz
npm run load-test:leaderboard
npm run load-test:profile
npm run load-test:websocket
npm run load-test:journey
```

### All Tests

```bash
# Run all test scenarios sequentially
npm run load-test:all
```

### Stress Test

```bash
# Progressive stress test to find breaking points
npm run load-test:stress
```

This gradually increases load from 5 to 100 users/sec to find your system's limits.

### Quick Benchmark

```bash
# Fast HTTP benchmarking
npm run benchmark
```

## 📊 Understanding Results

### Console Output

Artillery provides real-time metrics:

- **Scenarios launched:** Number of virtual users created
- **Scenarios completed:** Successfully finished scenarios
- **Requests completed:** Total HTTP requests
- **RPS (Requests Per Second):** Throughput
- **Latency:** Response time percentiles (p50, p95, p99)
- **Errors:** Failed requests

### JSON Reports

Raw data saved in `load-tests/reports/*.json`

### HTML Reports

Generate visual reports:

```bash
npm run load-test:report
```

Open `load-tests/reports/load-test-report.html` in your browser.

The report includes:
- Overall summary statistics
- Per-scenario metrics
- Latency distributions
- Error details

## 📈 Performance Benchmarks

### Expected Performance (Baseline)

| Endpoint | Avg Latency | P95 Latency | Throughput |
|----------|-------------|-------------|------------|
| GET /api/quizzes/public | < 50ms | < 100ms | 100+ req/s |
| GET /api/leaderboard | < 100ms | < 200ms | 50+ req/s |
| POST /api/auth/login | < 150ms | < 300ms | 30+ req/s |
| GET /api/profile/stats | < 80ms | < 150ms | 60+ req/s |

### Rate Limits

- **Auth endpoints:** 5 requests per 15 minutes per IP
- **General API:** 100 requests per 15 minutes per IP

### Recommended Thresholds

- **P95 Latency:** < 500ms (acceptable), < 200ms (good)
- **Error Rate:** < 1% (acceptable), < 0.1% (good)
- **Throughput:** > 50 req/s (acceptable), > 100 req/s (good)

## 🔧 Troubleshooting

### Server Not Running

**Error:** `ECONNREFUSED`

**Solution:** Start your server first:
```bash
npm start
```

### Rate Limiting Errors

**Error:** 429 Too Many Requests

**Solution:** This is expected behavior. Rate limiting is working correctly. Adjust test load or increase rate limits in production.

### Database Locked

**Error:** `SQLITE_BUSY`

**Solution:** SQLite has limited concurrent write capacity. Consider:
- Using PostgreSQL for production
- Reducing concurrent users in tests
- Adding delays between operations

### Out of Memory

**Error:** `JavaScript heap out of memory`

**Solution:**
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run load-test:stress
```

### No Test Results

**Issue:** No JSON files in reports directory

**Solution:** Tests may have failed. Check:
- Server is running
- Artillery is installed: `npm install`
- Run with verbose output: `artillery run -e test scenario.yml`

## 🎯 Best Practices

1. **Start Small:** Begin with baseline tests before stress testing
2. **Monitor Resources:** Watch CPU, memory, and database during tests
3. **Use Realistic Data:** Seed database with representative data
4. **Test Incrementally:** Test individual endpoints before full journeys
5. **Document Baselines:** Record baseline performance for comparison
6. **Regular Testing:** Run load tests before major releases

## 🔄 CI/CD Integration

Add to your CI/CD pipeline:

```yaml
# Example GitHub Actions
- name: Run Load Tests
  run: |
    npm start &
    sleep 5
    npm run load-test:baseline
    npm run load-test:report
```

## 📝 Customization

### Modify Load Levels

Edit scenario files in `load-tests/scenarios/*.yml`:

```yaml
phases:
  - duration: 60        # Test duration in seconds
    arrivalRate: 10     # Users per second
    name: "Custom Load"
```

### Add New Endpoints

Create new scenario file or add to existing:

```yaml
- get:
    url: "/api/your-endpoint"
    expect:
      - statusCode: 200
```

### Change Target URL

Set environment variable:

```bash
BASE_URL=http://your-server:3000 npm run load-test:baseline
```

## 📚 Additional Resources

- [Artillery Documentation](https://www.artillery.io/docs)
- [Autocannon GitHub](https://github.com/mcollina/autocannon)
- [Load Testing Best Practices](https://www.artillery.io/docs/guides/guides/test-script-reference)

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section
2. Review Artillery logs in console output
3. Examine JSON reports in `load-tests/reports/`

---

**Happy Load Testing! 🚀**
