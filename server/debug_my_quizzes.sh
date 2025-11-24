#!/bin/bash

BASE_URL="http://localhost:3001/api"

# Login
echo "Logging in..."
USER_RESP=$(curl -s -X POST $BASE_URL/auth/login -H "Content-Type: application/json" -d '{"username": "testuser_1764023774", "password": "password123"}')
# Note: I'm reusing the user from previous run if possible, or I'll just create a new one if that fails.
# Actually, let's just create a new one to be safe.
USER_RESP=$(curl -s -X POST $BASE_URL/auth/signup -H "Content-Type: application/json" -d '{"username": "debug_user_'$(date +%s)'", "password": "password123"}')

TOKEN=$(echo $USER_RESP | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "Login failed. Response: $USER_RESP"
    exit 1
fi
echo "Token: $TOKEN"

# Test My Quizzes
echo "Fetching My Quizzes..."
curl -v -X GET $BASE_URL/quizzes/my-quizzes -H "Authorization: Bearer $TOKEN"
