const path = require('path');

module.exports = {
    development: {
        dialect: 'sqlite',
        storage: path.resolve(__dirname, '../../quizmaster.db'),
        logging: false, // Set to console.log to see SQL queries
        define: {
            timestamps: false, // We'll manually define timestamps where needed
            underscored: true, // Use snake_case for auto-generated fields
        },
    },
    production: {
        dialect: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'quizmaster',
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        logging: false,
        define: {
            timestamps: false,
            underscored: true,
        },
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000,
        },
    },
};
