const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const QuizCommentUpvote = sequelize.define('QuizCommentUpvote', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
            onDelete: 'CASCADE',
        },
        comment_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'quiz_comments',
                key: 'id',
            },
            onDelete: 'CASCADE',
        },
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    }, {
        tableName: 'quiz_comment_upvotes',
        timestamps: false,
        indexes: [
            {
                unique: true,
                fields: ['user_id', 'comment_id'],
            },
            { fields: ['comment_id'] },
        ],
    });

    return QuizCommentUpvote;
};
