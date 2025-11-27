const sequelize = require('../../config/sequelize');

// Import model definitions
const UserModel = require('./User.model');
const QuizModel = require('./Quiz.model');
const QuestionModel = require('./Question.model');
const ResultModel = require('./Result.model');
const QuestionAttemptModel = require('./QuestionAttempt.model');
const QuizReviewModel = require('./QuizReview.model');
const UserQuizLibraryModel = require('./UserQuizLibrary.model');
const UserAchievementModel = require('./UserAchievement.model');
const UserStatsModel = require('./UserStats.model');

// Initialize models
const User = UserModel(sequelize);
const Quiz = QuizModel(sequelize);
const Question = QuestionModel(sequelize);
const Result = ResultModel(sequelize);
const QuestionAttempt = QuestionAttemptModel(sequelize);
const QuizReview = QuizReviewModel(sequelize);
const UserQuizLibrary = UserQuizLibraryModel(sequelize);
const UserAchievement = UserAchievementModel(sequelize);
const UserStats = UserStatsModel(sequelize);

// Define associations

// User associations
User.hasMany(Quiz, { foreignKey: 'creator_id', as: 'createdQuizzes' });
User.hasMany(Result, { foreignKey: 'user_id', as: 'results' });
User.hasMany(QuestionAttempt, { foreignKey: 'user_id', as: 'questionAttempts' });
User.hasMany(QuizReview, { foreignKey: 'reviewer_id', as: 'reviews' });
User.hasMany(UserAchievement, { foreignKey: 'user_id', as: 'achievements' });
User.hasOne(UserStats, { foreignKey: 'user_id', as: 'stats' });
User.belongsToMany(Quiz, { through: UserQuizLibrary, foreignKey: 'user_id', as: 'library' });

// Quiz associations
Quiz.belongsTo(User, { foreignKey: 'creator_id', as: 'creator' });
Quiz.hasMany(Question, { foreignKey: 'quiz_id', as: 'questions' });
Quiz.hasMany(Result, { foreignKey: 'quiz_id', as: 'results' });
Quiz.hasMany(QuestionAttempt, { foreignKey: 'quiz_id', as: 'questionAttempts' });
Quiz.hasMany(QuizReview, { foreignKey: 'quiz_id', as: 'reviews' });
Quiz.belongsToMany(User, { through: UserQuizLibrary, foreignKey: 'quiz_id', as: 'usersInLibrary' });

// Question associations
Question.belongsTo(Quiz, { foreignKey: 'quiz_id', as: 'quiz' });
Question.hasMany(QuestionAttempt, { foreignKey: 'question_id', as: 'attempts' });

// Result associations
Result.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Result.belongsTo(Quiz, { foreignKey: 'quiz_id', as: 'quiz' });
Result.hasMany(QuestionAttempt, { foreignKey: 'result_id', as: 'questionAttempts' });

// QuestionAttempt associations
QuestionAttempt.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
QuestionAttempt.belongsTo(Quiz, { foreignKey: 'quiz_id', as: 'quiz' });
QuestionAttempt.belongsTo(Question, { foreignKey: 'question_id', as: 'question' });
QuestionAttempt.belongsTo(Result, { foreignKey: 'result_id', as: 'result' });

// QuizReview associations
QuizReview.belongsTo(Quiz, { foreignKey: 'quiz_id', as: 'quiz' });
QuizReview.belongsTo(User, { foreignKey: 'reviewer_id', as: 'reviewer' });

// UserQuizLibrary associations
UserQuizLibrary.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
UserQuizLibrary.belongsTo(Quiz, { foreignKey: 'quiz_id', as: 'quiz' });

// UserAchievement associations
UserAchievement.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// UserStats associations
UserStats.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Export models and sequelize instance
module.exports = {
    sequelize,
    User,
    Quiz,
    Question,
    Result,
    QuestionAttempt,
    QuizReview,
    UserQuizLibrary,
    UserAchievement,
    UserStats,
};
