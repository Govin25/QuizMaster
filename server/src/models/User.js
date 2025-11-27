const UserRepository = require('../repositories/UserRepository');

class User {
    static async create(username, password, role = 'user') {
        return await UserRepository.create(username, password, role);
    }

    static async findByUsername(username) {
        return await UserRepository.findByUsername(username);
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
