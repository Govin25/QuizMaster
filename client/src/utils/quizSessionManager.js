import API_URL from '../config';

/**
 * Quiz Session Manager
 * Manages quiz sessions across browsers and devices using server-side API
 */

class QuizSessionManager {
    constructor() {
        this.sessionToken = null;
        this.heartbeatInterval = null;
        this.currentQuizId = null;
        this.currentChallengeId = null;
    }

    /**
     * Check if a quiz can be started and create session
     * @param {number} quizId - The quiz ID
     * @param {Function} fetchWithAuth - Authenticated fetch function
     * @returns {Promise<boolean>} - True if quiz can be started
     */
    async canStartQuiz(quizId, fetchWithAuth) {
        try {
            const response = await fetchWithAuth(`${API_URL}/api/quiz-sessions/start`, {
                method: 'POST',
                body: JSON.stringify({ quizId })
            });

            const data = await response.json();

            if (response.ok && data.canStart) {
                this.sessionToken = data.sessionToken;
                this.currentQuizId = quizId;
                this.startHeartbeat(quizId, null, fetchWithAuth);
                return true;
            }

            // Session already active elsewhere
            return false;
        } catch (err) {
            console.error('Failed to start session:', err);
            return false;
        }
    }

    /**
     * Start heartbeat to keep session alive
     * @param {number} quizId - The quiz ID (optional)
     * @param {number} challengeId - The challenge ID (optional)
     * @param {Function} fetchWithAuth - Authenticated fetch function
     */
    startHeartbeat(quizId, challengeId, fetchWithAuth) {
        // Send heartbeat every 60 seconds
        this.heartbeatInterval = setInterval(async () => {
            try {
                const body = { sessionToken: this.sessionToken };
                if (challengeId) {
                    body.challengeId = challengeId;
                } else {
                    body.quizId = quizId;
                }

                const response = await fetchWithAuth(`${API_URL}/api/quiz-sessions/heartbeat`, {
                    method: 'POST',
                    body: JSON.stringify(body)
                });

                const data = await response.json();

                // If session is no longer active, stop heartbeat
                if (!data.active) {
                    console.warn('Session no longer active, stopping heartbeat');
                    this.stopHeartbeat();
                }
            } catch (err) {
                console.error('Heartbeat failed:', err);
            }
        }, 60000); // 60 seconds
    }

    /**
     * Stop heartbeat
     */
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * Release quiz session
     * @param {number} quizId - The quiz ID
     * @param {Function} fetchWithAuth - Authenticated fetch function
     */
    async releaseQuiz(quizId, fetchWithAuth) {
        this.stopHeartbeat();

        if (this.sessionToken && this.currentQuizId === quizId) {
            try {
                await fetchWithAuth(`${API_URL}/api/quiz-sessions/end`, {
                    method: 'POST',
                    body: JSON.stringify({
                        quizId,
                        sessionToken: this.sessionToken
                    })
                });
            } catch (err) {
                console.error('Failed to end session:', err);
            }

            this.sessionToken = null;
            this.currentQuizId = null;
        }
    }

    /**
     * Check if a challenge can be started and create session
     * @param {number} challengeId - The challenge ID
     * @param {Function} fetchWithAuth - Authenticated fetch function
     * @returns {Promise<boolean>} - True if challenge can be started
     */
    async canStartChallenge(challengeId, fetchWithAuth) {
        try {
            const response = await fetchWithAuth(`${API_URL}/api/quiz-sessions/start`, {
                method: 'POST',
                body: JSON.stringify({ challengeId })
            });

            const data = await response.json();

            if (response.ok && data.canStart) {
                this.sessionToken = data.sessionToken;
                this.currentChallengeId = challengeId;
                this.startHeartbeat(null, challengeId, fetchWithAuth);
                return true;
            }

            // Session already active elsewhere
            return false;
        } catch (err) {
            console.error('Failed to start challenge session:', err);
            return false;
        }
    }

    /**
     * Release challenge session
     * @param {number} challengeId - The challenge ID
     * @param {Function} fetchWithAuth - Authenticated fetch function
     */
    async releaseChallenge(challengeId, fetchWithAuth) {
        this.stopHeartbeat();

        if (this.sessionToken && this.currentChallengeId === challengeId) {
            try {
                await fetchWithAuth(`${API_URL}/api/quiz-sessions/end`, {
                    method: 'POST',
                    body: JSON.stringify({
                        challengeId,
                        sessionToken: this.sessionToken
                    })
                });
            } catch (err) {
                console.error('Failed to end challenge session:', err);
            }

            this.sessionToken = null;
            this.currentChallengeId = null;
        }
    }

    /**
     * Notify other tabs that quiz is completed
     * Uses localStorage for same-browser cross-tab communication
     * @param {number} quizId - The quiz ID
     */
    notifyQuizCompleted(quizId) {
        const eventKey = 'quiz_completed_event';
        const eventData = {
            quizId,
            timestamp: Date.now()
        };

        // Set the value to trigger storage event in other tabs
        localStorage.setItem(eventKey, JSON.stringify(eventData));

        // Remove immediately
        setTimeout(() => {
            localStorage.removeItem(eventKey);
        }, 100);
    }
}

// Export singleton instance
export default new QuizSessionManager();
