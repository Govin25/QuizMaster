const io = require('./client/node_modules/socket.io-client');

const API_URL = 'http://localhost:3001';

async function login(username, password) {
    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'http://localhost:5173'
            },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            const err = await response.text();
            console.error(`Login error details: Status ${response.status} ${response.statusText}, Body: ${err}`);
            throw new Error(err);
        }
        return await response.json();
    } catch (error) {
        console.error(`Login failed for ${username}:`, error.message);
        process.exit(1);
    }
}

async function createChallenge(token, opponentUsername, quizId) {
    try {
        const response = await fetch(`${API_URL}/api/challenges/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Origin': 'http://localhost:5173'
            },
            body: JSON.stringify({ opponentUsername, quizId })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(err);
        }
        const data = await response.json();
        return data.challenge;
    } catch (error) {
        console.error('Create challenge failed:', error.message);
        process.exit(1);
    }
}

async function createQuiz(token) {
    try {
        const response = await fetch(`${API_URL}/api/quizzes/save-document-quiz`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Origin': 'http://localhost:5173'
            },
            body: JSON.stringify({
                title: `Test Quiz ${Date.now()}`,
                category: 'General Knowledge',
                difficulty: 'easy',
                questions: [
                    {
                        text: "Is this a test?",
                        type: "true_false",
                        correctAnswer: "true"
                    },
                    {
                        text: "What is 2+2?",
                        type: "multiple_choice",
                        options: ["3", "4", "5", "6"],
                        correctAnswer: "4"
                    },
                    {
                        text: "Is the sky blue?",
                        type: "true_false",
                        correctAnswer: "true"
                    },
                    {
                        text: "What is 1+1?",
                        type: "multiple_choice",
                        options: ["1", "2", "3", "4"],
                        correctAnswer: "2"
                    },
                    {
                        text: "Is water wet?",
                        type: "true_false",
                        correctAnswer: "true"
                    }
                ]
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(err);
        }
        const quiz = await response.json();
        return quiz;
    } catch (error) {
        console.error('Create quiz failed:', error.message);
        process.exit(1);
    }
}

async function runTest() {
    console.log('Starting test...');

    // 1. Login
    const user1 = await login('test', 'Test1234');
    const user2 = await login('test1', 'Test1234');
    console.log(`Logged in: ${user1.user.username} (${user1.user.id}) and ${user2.user.username} (${user2.user.id})`);

    // 2. Create a challenge (User 1 challenges User 2)
    const quiz = await createQuiz(user1.token);
    const quizId = quiz.id;
    console.log(`Using Quiz ID: ${quizId}`);

    const challenge = await createChallenge(user1.token, user2.user.username, quizId);
    console.log(`Challenge created: ${challenge.id}`);

    // 3. Connect Sockets
    const socket1 = io(API_URL);
    const socket2 = io(API_URL);

    const setupSocket = (socket, name, userId) => {
        const onConnect = () => {
            console.log(`${name} connected (socket: ${socket.id})`);

            // Emit join immediately upon connection
            console.log(`${name} joining challenge ${challenge.id}...`);
            socket.emit('join_challenge', {
                userId: userId,
                challengeId: challenge.id,
                username: name
            });
        };

        if (socket.connected) {
            onConnect();
        } else {
            socket.on('connect', onConnect);
        }

        socket.on('opponent_joined', (data) => {
            console.log(`[${name}] received opponent_joined:`, data);
        });

        socket.on('both_players_ready', () => {
            console.log(`[${name}] received both_players_ready ✅`);
        });

        socket.on('challenge_start', () => {
            console.log(`[${name}] received challenge_start 🚀`);
        });

        socket.on('waiting_for_opponent', () => {
            console.log(`[${name}] received waiting_for_opponent ⏳`);
        });
    };

    setupSocket(socket1, 'User1', user1.user.id);

    // Delay User 2 joining slightly to simulate real scenario
    setTimeout(() => {
        setupSocket(socket2, 'User2', user2.user.id);
    }, 2000);

    // Keep alive for a bit
    setTimeout(() => {
        console.log('Test finished, closing sockets.');
        socket1.close();
        socket2.close();
        process.exit(0);
    }, 10000);
}

runTest();
