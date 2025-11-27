const { Sequelize } = require('sequelize');
const config = require('./database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(dbConfig);

// Test the connection
sequelize
    .authenticate()
    .then(() => {
        console.log('Sequelize: Database connection established successfully.');
    })
    .catch((err) => {
        console.error('Sequelize: Unable to connect to the database:', err);
    });

module.exports = sequelize;
