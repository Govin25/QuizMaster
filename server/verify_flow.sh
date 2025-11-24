#!/bin/bash

BASE_URL="http://localhost:3001/api"

# 1. Signup/Login
echo "Creating User..."
USER_RESP=$(curl -s -X POST $BASE_URL/auth/signup -H "Content-Type: application/json" -d '{"username": "testuser_'$(date +%s)'", "password": "password123"}')
TOKEN=$(echo $USER_RESP | grep -o '"token":"[^"]*' | cut -d'"' -f4)
USER_ID=$(echo $USER_RESP | grep -o '"id":[0-9]*' | cut -d':' -f2)

if [ -z "$TOKEN" ]; then
    echo "Login failed. Response: $USER_RESP"
    exit 1
fi
echo "User created. Token: $TOKEN"

# 2. Create Private Quiz
echo "Creating Private Quiz..."
QUIZ_RESP=$(curl -s -X POST $BASE_URL/quizzes -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"title": "My Private Quiz", "category": "Test", "difficulty": "Beginner"}')
QUIZ_ID=$(echo $QUIZ_RESP | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

if [ -z "$QUIZ_ID" ]; then
    echo "Quiz creation failed. Response: $QUIZ_RESP"
    exit 1
fi
echo "Quiz created. ID: $QUIZ_ID"

# 3. Verify it's not public
echo "Verifying not public..."
PUBLIC_RESP=$(curl -s -X GET $BASE_URL/quizzes/public)
if echo "$PUBLIC_RESP" | grep -q "$QUIZ_ID"; then
    echo "FAIL: Quiz should not be public yet."
else
    echo "PASS: Quiz is not public."
fi

# 4. Publish (Request Review)
echo "Publishing Quiz..."
curl -s -X POST $BASE_URL/quizzes/$QUIZ_ID/publish -H "Authorization: Bearer $TOKEN"

# 5. Review (Approve)
echo "Approving Quiz..."
curl -s -X POST $BASE_URL/quizzes/$QUIZ_ID/review -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"status": "approved"}'

# 6. Verify it IS public
echo "Verifying public..."
PUBLIC_RESP_2=$(curl -s -X GET $BASE_URL/quizzes/public)
if echo "$PUBLIC_RESP_2" | grep -q "My Private Quiz"; then
    echo "PASS: Quiz is now public."
else
    echo "FAIL: Quiz should be public. Response: $PUBLIC_RESP_2"
fi

# 7. AI Generation
echo "Testing AI Generation..."
AI_RESP=$(curl -s -X POST $BASE_URL/quizzes/generate -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"topic": "Space", "difficulty": "Beginner"}')
if echo "$AI_RESP" | grep -q "AI Generated: Space"; then
    echo "PASS: AI Quiz generated."
else
    echo "FAIL: AI Generation failed. Response: $AI_RESP"
fi

echo "Verification Complete."
