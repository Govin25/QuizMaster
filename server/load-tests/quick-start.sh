#!/bin/bash

# Quainy Load Testing - Quick Start Script
# This script helps you get started with load testing

set -e

echo "=========================================="
echo "Quainy Load Testing - Quick Start"
echo "=========================================="
echo ""

# Check if server is running
echo "Checking if server is running..."
if curl -s http://localhost:3001/api/quizzes/public > /dev/null 2>&1; then
    echo "✓ Server is running on http://localhost:3001"
    echo ""
else
    echo "✗ Server is not running"
    echo ""
    echo "Please start your server first:"
    echo "  cd /home/govind/Desktop/QuizMaster/server"
    echo "  npm start"
    echo ""
    echo "Then run this script again."
    exit 1
fi

# Check if dependencies are installed
echo "Checking dependencies..."
if [ -d "node_modules/artillery" ]; then
    echo "✓ Dependencies installed"
    echo ""
else
    echo "Installing dependencies..."
    npm install
    echo ""
fi

# Run baseline test
echo "Running baseline performance test..."
echo "This will take about 30 seconds..."
echo ""
npm run load-test:baseline

echo ""
echo "=========================================="
echo "Baseline test complete!"
echo "=========================================="
echo ""

# Analyze results
echo "Analyzing results..."
echo ""
npm run load-test:analyze

echo ""
echo "=========================================="
echo "Next Steps:"
echo "=========================================="
echo ""
echo "1. Review the analysis above"
echo "2. Generate HTML report:"
echo "   npm run load-test:report"
echo ""
echo "3. Run more comprehensive tests:"
echo "   npm run load-test:auth      # Test authentication"
echo "   npm run load-test:quiz      # Test quiz endpoints"
echo "   npm run load-test:all       # Run all tests"
echo ""
echo "4. Find breaking points:"
echo "   npm run load-test:stress"
echo ""
echo "5. Quick benchmark:"
echo "   npm run benchmark"
echo ""
echo "See load-tests/README.md for full documentation"
echo ""
