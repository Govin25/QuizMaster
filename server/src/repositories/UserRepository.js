const { User } = require('../models/sequelize');

class UserRepository {
    /**
     * Generate a unique username from name
     * Uses first name or last name + random suffix
     * @param {string} name - Full name
     * @returns {Promise<string>} - Unique username
     */
    async generateUniqueUsername(name) {
        // Split name and get first or last name (whichever is shorter for cleaner usernames)
        const nameParts = name.trim().split(/\s+/);
        let baseName;

        if (nameParts.length > 1) {
            // Use whichever is shorter between first and last name
            const firstName = nameParts[0];
            const lastName = nameParts[nameParts.length - 1];
            baseName = firstName.length <= lastName.length ? firstName : lastName;
        } else {
            baseName = nameParts[0];
        }

        // Clean and limit the base name
        baseName = baseName.toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .substring(0, 12);

        // If baseName is too short, use 'user'
        if (baseName.length < 2) {
            baseName = 'user';
        }

        // Try to generate a unique username with random suffix
        let username;
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
            const suffix = Math.random().toString(36).substring(2, 6);
            username = `${baseName}_${suffix}`;

            // Check if username exists
            const existingUser = await User.findOne({ where: { username } });
            if (!existingUser) {
                return username;
            }
            attempts++;
        }

        // Fallback: use timestamp-based suffix
        const timestamp = Date.now().toString(36);
        return `${baseName}_${timestamp}`;
    }

    /**
     * Create a new user with email-based signup
     * @param {string} name - User's display name
     * @param {string} email - User's email address
     * @param {string} password - Will be hashed automatically by model hook
     * @param {string} role 
     * @returns {Promise<Object>}
     */
    async create(name, email, password, role = 'user') {
        // Auto-generate unique username from name
        const username = await this.generateUniqueUsername(name);

        const user = await User.create({
            username,
            email: email.toLowerCase().trim(),
            name: name.trim(),
            password,
            role,
        });

        // Return plain object without password
        const { password: _, ...userWithoutPassword } = user.toJSON();
        return userWithoutPassword;
    }

    /**
     * Find user by username
     * @param {string} username 
     * @returns {Promise<Object|null>}
     */
    async findByUsername(username) {
        return await User.findOne({
            where: { username },
        });
    }

    /**
     * Find user by email
     * @param {string} email 
     * @returns {Promise<Object|null>}
     */
    async findByEmail(email) {
        return await User.findOne({
            where: { email: email.toLowerCase().trim() },
        });
    }

    /**
     * Find user by email or username (for flexible login)
     * @param {string} identifier - Can be email or username
     * @returns {Promise<Object|null>}
     */
    async findByEmailOrUsername(identifier) {
        const { Op } = require('sequelize');
        const normalizedIdentifier = identifier.toLowerCase().trim();

        return await User.findOne({
            where: {
                [Op.or]: [
                    { email: normalizedIdentifier },
                    { username: normalizedIdentifier }
                ]
            }
        });
    }

    /**
     * Find user by ID
     * @param {number} id 
     * @returns {Promise<Object|null>}
     */
    async findById(id) {
        return await User.findByPk(id);
    }

    /**
     * Update user avatar
     * @param {number} userId 
     * @param {string} avatarUrl 
     * @returns {Promise<boolean>}
     */
    async updateAvatar(userId, avatarUrl) {
        const [affectedRows] = await User.update(
            { avatar_url: avatarUrl },
            { where: { id: userId } }
        );
        return affectedRows > 0;
    }

    /**
     * Get public user data (excludes sensitive information)
     * @param {number} userId 
     * @returns {Promise<Object|null>}
     */
    async getPublicUserData(userId) {
        const user = await User.findByPk(userId, {
            attributes: ['id', 'username', 'level', 'xp', 'avatar_url', 'created_at']
        });

        if (!user) {
            return null;
        }

        return user.toJSON();
    }

    /**
     * Delete user and all related data
     * @param {number} userId 
     * @returns {Promise<boolean>}
     */
    async deleteUser(userId) {
        const {
            Quiz,
            Question,
            Result,
            QuestionAttempt,
            UserStats,
            UserAchievement,
            UserQuizLibrary,
            sequelize
        } = require('../models/sequelize');

        const transaction = await sequelize.transaction();

        try {
            // Delete in order to respect foreign key constraints
            await QuestionAttempt.destroy({ where: { user_id: userId }, transaction });
            await Result.destroy({ where: { user_id: userId }, transaction });
            await UserStats.destroy({ where: { user_id: userId }, transaction });
            await UserAchievement.destroy({ where: { user_id: userId }, transaction });
            await UserQuizLibrary.destroy({ where: { user_id: userId }, transaction });

            // Delete questions from user's quizzes
            const userQuizzes = await Quiz.findAll({ where: { creator_id: userId }, transaction });
            const quizIds = userQuizzes.map(q => q.id);
            if (quizIds.length > 0) {
                await Question.destroy({ where: { quiz_id: quizIds }, transaction });
            }

            // Delete user's quizzes
            await Quiz.destroy({ where: { creator_id: userId }, transaction });

            // Finally delete the user
            const deleted = await User.destroy({ where: { id: userId }, transaction });

            await transaction.commit();
            return deleted > 0;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Find user by Google ID
     * @param {string} googleId 
     * @returns {Promise<Object|null>}
     */
    async findByGoogleId(googleId) {
        return await User.findOne({
            where: { google_id: googleId }
        });
    }

    /**
     * Create a new user from Google OAuth
     * @param {string} name - User's display name from Google
     * @param {string} email - User's email from Google
     * @param {string} googleId - Google's unique user ID
     * @param {string} avatarUrl - Profile picture URL from Google
     * @returns {Promise<Object>}
     */
    async createGoogleUser(name, email, googleId, avatarUrl = null) {
        const username = await this.generateUniqueUsername(name);

        const user = await User.create({
            username,
            email: email.toLowerCase().trim(),
            name: name.trim(),
            password: null, // No password for OAuth users
            google_id: googleId,
            auth_provider: 'google',
            avatar_url: avatarUrl,
            terms_accepted_at: new Date(),
            privacy_accepted_at: new Date(),
        });

        const { password: _, ...userWithoutPassword } = user.toJSON();
        return userWithoutPassword;
    }

    /**
     * Link Google account to existing user
     * @param {number} userId 
     * @param {string} googleId 
     * @returns {Promise<boolean>}
     */
    async linkGoogleAccount(userId, googleId) {
        const [affectedRows] = await User.update(
            {
                google_id: googleId,
                auth_provider: 'google' // Update to google as primary
            },
            { where: { id: userId } }
        );
        return affectedRows > 0;
    }
}

module.exports = new UserRepository();
