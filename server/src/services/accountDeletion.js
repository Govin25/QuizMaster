const { User, Quiz, Result, QuestionAttempt, UserStats, UserAchievement, UserQuizLibrary, QuizReview } = require('../models/sequelize');
const { sequelize } = require('../models/sequelize');

/**
 * Service to handle account deletion requests and permanent deletion
 */
class AccountDeletionService {
    /**
     * Mark account for deletion (soft delete with grace period)
     * @param {number} userId - ID of the user requesting deletion
     * @returns {Promise<Object>} Deletion request confirmation
     */
    async requestAccountDeletion(userId) {
        try {
            const user = await User.findByPk(userId);

            if (!user) {
                throw new Error('User not found');
            }

            // Mark account for deletion
            user.account_deletion_requested_at = new Date();
            await user.save();

            return {
                message: 'Account deletion requested',
                deletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                gracePeriodDays: 30
            };
        } catch (error) {
            console.error('Account deletion request error:', error);
            throw new Error('Failed to request account deletion');
        }
    }

    /**
     * Cancel a pending account deletion request
     * @param {number} userId - ID of the user
     * @returns {Promise<Object>} Cancellation confirmation
     */
    async cancelDeletionRequest(userId) {
        try {
            const user = await User.findByPk(userId);

            if (!user) {
                throw new Error('User not found');
            }

            user.account_deletion_requested_at = null;
            await user.save();

            return {
                message: 'Account deletion request cancelled'
            };
        } catch (error) {
            console.error('Cancel deletion error:', error);
            throw new Error('Failed to cancel deletion request');
        }
    }

    /**
     * Permanently delete user account and associated data
     * @param {number} userId - ID of the user to delete
     * @param {boolean} preservePublicQuizzes - Whether to preserve public quizzes (anonymize instead of delete)
     * @returns {Promise<Object>} Deletion confirmation
     */
    async permanentlyDeleteAccount(userId, preservePublicQuizzes = true) {
        const transaction = await sequelize.transaction();

        try {
            const user = await User.findByPk(userId);

            if (!user) {
                throw new Error('User not found');
            }

            // Handle quizzes created by user
            const userQuizzes = await Quiz.findAll({
                where: { creator_id: userId },
                transaction
            });

            if (preservePublicQuizzes) {
                // Anonymize public quizzes instead of deleting
                for (const quiz of userQuizzes) {
                    if (quiz.is_public) {
                        quiz.creator_id = null; // Anonymize
                        await quiz.save({ transaction });
                    } else {
                        // Delete private quizzes and their questions
                        await quiz.destroy({ transaction });
                    }
                }
            } else {
                // Delete all quizzes created by user
                await Quiz.destroy({
                    where: { creator_id: userId },
                    transaction
                });
            }

            // Delete user's quiz results
            await Result.destroy({
                where: { user_id: userId },
                transaction
            });

            // Delete user's question attempts
            await QuestionAttempt.destroy({
                where: { user_id: userId },
                transaction
            });

            // Delete user statistics
            await UserStats.destroy({
                where: { user_id: userId },
                transaction
            });

            // Delete user achievements
            await UserAchievement.destroy({
                where: { user_id: userId },
                transaction
            });

            // Delete quiz reviews created by user
            await QuizReview.destroy({
                where: { reviewer_id: userId },
                transaction
            });

            // Delete user quiz library entries
            await UserQuizLibrary.destroy({
                where: { user_id: userId },
                transaction
            });

            // Finally, delete the user account
            await user.destroy({ transaction });

            await transaction.commit();

            return {
                message: 'Account permanently deleted',
                deletedAt: new Date().toISOString(),
                publicQuizzesPreserved: preservePublicQuizzes
            };
        } catch (error) {
            await transaction.rollback();
            console.error('Permanent deletion error:', error);
            throw new Error('Failed to permanently delete account');
        }
    }

    /**
     * Check if user has a pending deletion request past grace period
     * @param {number} userId - ID of the user
     * @returns {Promise<boolean>} True if deletion should proceed
     */
    async isDeletionDue(userId) {
        try {
            const user = await User.findByPk(userId);

            if (!user || !user.account_deletion_requested_at) {
                return false;
            }

            const gracePeriodMs = 30 * 24 * 60 * 60 * 1000; // 30 days
            const deletionDueDate = new Date(user.account_deletion_requested_at.getTime() + gracePeriodMs);

            return new Date() >= deletionDueDate;
        } catch (error) {
            console.error('Check deletion due error:', error);
            return false;
        }
    }
}

module.exports = new AccountDeletionService();
