const {
    User, Quiz, Question, Result, QuestionAttempt, UserStats, UserAchievement,
    UserQuizLibrary, QuizReview, QuizLike, UserSocialStats, UserFollow,
    ActiveQuizSession, GroupMember, UserPermission
} = require('../models/sequelize');
const { sequelize } = require('../models/sequelize');
const logger = require('../utils/logger');

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
            logger.error('Failed to request account deletion', {
                error,
                context: { userId }
            });
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
            logger.error('Failed to cancel deletion request', {
                error,
                context: { userId }
            });
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
                        // Delete questions first (FK constraint)
                        await Question.destroy({
                            where: { quiz_id: quiz.id },
                            transaction
                        });
                        // Delete private quiz
                        await quiz.destroy({ transaction });
                    }
                }
            } else {
                // Delete questions for all user's quizzes first
                for (const quiz of userQuizzes) {
                    await Question.destroy({
                        where: { quiz_id: quiz.id },
                        transaction
                    });
                }
                // Delete all quizzes created by user
                await Quiz.destroy({
                    where: { creator_id: userId },
                    transaction
                });
            }

            // Delete user's question attempts FIRST (has FK to results)
            await QuestionAttempt.destroy({
                where: { user_id: userId },
                transaction
            });

            // Delete user's quiz results
            await Result.destroy({
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

            // Delete quiz likes by user
            await QuizLike.destroy({
                where: { user_id: userId },
                transaction
            });

            // Delete user social stats
            await UserSocialStats.destroy({
                where: { user_id: userId },
                transaction
            });

            // Delete user follows (both directions)
            await UserFollow.destroy({
                where: { follower_id: userId },
                transaction
            });
            await UserFollow.destroy({
                where: { following_id: userId },
                transaction
            });

            // Delete active quiz sessions
            await ActiveQuizSession.destroy({
                where: { user_id: userId },
                transaction
            });

            // Delete group memberships
            await GroupMember.destroy({
                where: { user_id: userId },
                transaction
            });

            // Delete direct user permissions
            await UserPermission.destroy({
                where: { user_id: userId },
                transaction
            });

            // Delete 1v1 challenge participants first (before challenges, since it references both)
            await sequelize.query(
                `DELETE FROM challenge_participants WHERE user_id = ?`,
                { replacements: [userId], transaction }
            );

            // Also delete participants from challenges where this user is creator/opponent
            await sequelize.query(
                `DELETE FROM challenge_participants WHERE challenge_id IN 
                 (SELECT id FROM challenges WHERE creator_id = ? OR opponent_id = ?)`,
                { replacements: [userId, userId], transaction }
            );

            // Delete 1v1 challenges (as creator, opponent, or winner)
            // Set winner_id to null first to avoid constraint issues
            await sequelize.query(
                `UPDATE challenges SET winner_id = NULL WHERE winner_id = ?`,
                { replacements: [userId], transaction }
            );
            await sequelize.query(
                `DELETE FROM challenges WHERE creator_id = ? OR opponent_id = ?`,
                { replacements: [userId, userId], transaction }
            );

            // Delete challenge stats
            await sequelize.query(
                `DELETE FROM challenge_stats WHERE user_id = ?`,
                { replacements: [userId], transaction }
            );

            // Delete group challenge participation and stats (handled by CASCADE, but ensure cleanup)
            await sequelize.query(
                `DELETE FROM group_challenge_participants WHERE user_id = ?`,
                { replacements: [userId], transaction }
            );
            await sequelize.query(
                `DELETE FROM group_challenge_stats WHERE user_id = ?`,
                { replacements: [userId], transaction }
            );

            // Handle group challenges where user is the leader - set leader to another participant or delete
            await sequelize.query(
                `DELETE FROM group_challenges WHERE leader_id = ?`,
                { replacements: [userId], transaction }
            );

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
            logger.error('Failed to permanently delete account', {
                error,
                context: { userId, preservePublicQuizzes }
            });
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
            logger.error('Failed to check deletion due date', {
                error,
                context: { userId }
            });
            return false;
        }
    }
}

module.exports = new AccountDeletionService();
