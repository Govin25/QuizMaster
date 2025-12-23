const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');

module.exports = (sequelize) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        role: {
            type: DataTypes.STRING,
            defaultValue: 'user',
        },
        level: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
        },
        xp: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        avatar_url: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        terms_accepted_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        privacy_accepted_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        account_deletion_requested_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        subscription_tier: {
            type: DataTypes.STRING,
            defaultValue: 'free',
        },
        subscription_status: {
            type: DataTypes.STRING,
            defaultValue: 'active',
        },
        subscription_start_date: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        subscription_end_date: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        stripe_customer_id: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        stripe_subscription_id: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    }, {
        tableName: 'users',
        timestamps: false,
        hooks: {
            beforeCreate: async (user) => {
                if (user.password) {
                    user.password = await bcrypt.hash(user.password, 10);
                }
            },
            beforeUpdate: async (user) => {
                if (user.changed('password')) {
                    user.password = await bcrypt.hash(user.password, 10);
                }
            },
        },
    });

    // Instance method to validate password
    User.prototype.validatePassword = async function (password) {
        return await bcrypt.compare(password, this.password);
    };

    return User;
};
