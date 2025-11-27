const { User } = require('../models/sequelize');

class UserRepository {
    /**
     * Create a new user
     * @param {string} username 
     * @param {string} password - Will be hashed automatically by model hook
     * @param {string} role 
     * @returns {Promise<Object>}
     */
    async create(username, password, role = 'user') {
        const user = await User.create({
            username,
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
}

module.exports = new UserRepository();
