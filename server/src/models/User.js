const UserRepository = require('../repositories/UserRepository');

class User {
    static async create(name, email, password, role = 'user') {
        return await UserRepository.create(name, email, password, role);
    }

    static async findByUsername(username) {
        return await UserRepository.findByUsername(username);
    }

    static async findByEmail(email) {
        return await UserRepository.findByEmail(email);
    }

    static async findByEmailOrUsername(identifier) {
        return await UserRepository.findByEmailOrUsername(identifier);
    }

    static async validatePassword(user, password) {
        if (!user || !user.validatePassword) {
            // Fallback for plain user objects from repository
            const bcrypt = require('bcrypt');
            return await bcrypt.compare(password, user.password);
        }
        return await user.validatePassword(password);
    }
}

module.exports = User;
