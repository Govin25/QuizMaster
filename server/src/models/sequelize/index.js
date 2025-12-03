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
const UserFollowModel = require('./UserFollow.model');
const QuizLikeModel = require('./QuizLike.model');
const UserSocialStatsModel = require('./UserSocialStats.model');
const RoleModel = require('./Role.model');
const PermissionModel = require('./Permission.model');
const RolePermissionModel = require('./RolePermission.model');
const UserGroupModel = require('./UserGroup.model');
const GroupMemberModel = require('./GroupMember.model');
const GroupPermissionModel = require('./GroupPermission.model');
const UserPermissionModel = require('./UserPermission.model');

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
const UserFollow = UserFollowModel(sequelize);
const QuizLike = QuizLikeModel(sequelize);
const UserSocialStats = UserSocialStatsModel(sequelize);
const Role = RoleModel(sequelize);
const Permission = PermissionModel(sequelize);
const RolePermission = RolePermissionModel(sequelize);
const UserGroup = UserGroupModel(sequelize);
const GroupMember = GroupMemberModel(sequelize);
const GroupPermission = GroupPermissionModel(sequelize);
const UserPermission = UserPermissionModel(sequelize);

// Define associations

// User associations
User.hasMany(Quiz, { foreignKey: 'creator_id', as: 'createdQuizzes' });
User.hasMany(Result, { foreignKey: 'user_id', as: 'results' });
User.hasMany(QuestionAttempt, { foreignKey: 'user_id', as: 'questionAttempts' });
User.hasMany(QuizReview, { foreignKey: 'reviewer_id', as: 'reviews' });
User.hasMany(UserAchievement, { foreignKey: 'user_id', as: 'achievements' });
User.hasOne(UserStats, { foreignKey: 'user_id', as: 'stats' });
User.hasOne(UserSocialStats, { foreignKey: 'user_id', as: 'socialStats' });
User.belongsToMany(Quiz, { through: UserQuizLibrary, foreignKey: 'user_id', as: 'library' });
User.hasMany(UserFollow, { foreignKey: 'follower_id', as: 'following' });
User.hasMany(UserFollow, { foreignKey: 'following_id', as: 'followers' });
User.hasMany(QuizLike, { foreignKey: 'user_id', as: 'likedQuizzes' });

// Quiz associations
Quiz.belongsTo(User, { foreignKey: 'creator_id', as: 'creator' });
Quiz.hasMany(Question, { foreignKey: 'quiz_id', as: 'questions' });
Quiz.hasMany(Result, { foreignKey: 'quiz_id', as: 'results' });
Quiz.hasMany(QuestionAttempt, { foreignKey: 'quiz_id', as: 'questionAttempts' });
Quiz.hasMany(QuizReview, { foreignKey: 'quiz_id', as: 'reviews' });
Quiz.belongsToMany(User, { through: UserQuizLibrary, foreignKey: 'quiz_id', as: 'usersInLibrary' });
Quiz.hasMany(QuizLike, { foreignKey: 'quiz_id', as: 'likes' });

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

// UserFollow associations
UserFollow.belongsTo(User, { foreignKey: 'follower_id', as: 'follower' });
UserFollow.belongsTo(User, { foreignKey: 'following_id', as: 'followingUser' });

// QuizLike associations
QuizLike.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
QuizLike.belongsTo(Quiz, { foreignKey: 'quiz_id', as: 'quiz' });

// UserSocialStats associations
UserSocialStats.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// RBAC associations

// User-Role association (via role field in users table)
User.belongsTo(Role, { foreignKey: 'role', targetKey: 'name', as: 'userRole' });
Role.hasMany(User, { foreignKey: 'role', sourceKey: 'name', as: 'users' });

// Role-Permission many-to-many
Role.belongsToMany(Permission, { through: RolePermission, foreignKey: 'role_id', as: 'permissions' });
Permission.belongsToMany(Role, { through: RolePermission, foreignKey: 'permission_id', as: 'roles' });

// User-Group many-to-many
User.belongsToMany(UserGroup, { through: GroupMember, foreignKey: 'user_id', as: 'groups' });
UserGroup.belongsToMany(User, { through: GroupMember, foreignKey: 'group_id', as: 'members' });

// Group-Permission many-to-many
UserGroup.belongsToMany(Permission, { through: GroupPermission, foreignKey: 'group_id', as: 'permissions' });
Permission.belongsToMany(UserGroup, { through: GroupPermission, foreignKey: 'permission_id', as: 'groups' });

// User-Permission many-to-many (direct permissions)
User.belongsToMany(Permission, { through: UserPermission, foreignKey: 'user_id', as: 'directPermissions' });
Permission.belongsToMany(User, { through: UserPermission, foreignKey: 'permission_id', as: 'usersWithPermission' });

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
    UserFollow,
    QuizLike,
    UserSocialStats,
    Role,
    Permission,
    RolePermission,
    UserGroup,
    GroupMember,
    GroupPermission,
    UserPermission,
};
