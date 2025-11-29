const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');
const config = require('./database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(dbConfig);

// Test the connection
sequelize
    .authenticate()
    .then(() => {
        logger.info('Sequelize database connection established', {
            environment: env
        });
    })
    .catch((err) => {
        logger.error('Failed to connect to Sequelize database', {
            error: err,
            environment: env
        });
    });

module.exports = sequelize;
