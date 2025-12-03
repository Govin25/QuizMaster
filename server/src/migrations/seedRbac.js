const {
    Role,
    Permission,
    RolePermission,
    sequelize
} = require('../models/sequelize');
const logger = require('../utils/logger');

const PERMISSIONS = [
    // Quiz Permissions
    { name: 'quiz:create', resource: 'quiz', action: 'create', description: 'Create new quizzes' },
    { name: 'quiz:edit:own', resource: 'quiz', action: 'edit:own', description: 'Edit own quizzes' },
    { name: 'quiz:edit:all', resource: 'quiz', action: 'edit:all', description: 'Edit any quiz' },
    { name: 'quiz:delete:own', resource: 'quiz', action: 'delete:own', description: 'Delete own quizzes' },
    { name: 'quiz:delete:all', resource: 'quiz', action: 'delete:all', description: 'Delete any quiz' },
    { name: 'quiz:view', resource: 'quiz', action: 'view', description: 'View quizzes' },
    { name: 'quiz:publish', resource: 'quiz', action: 'publish', description: 'Publish quizzes' },
    { name: 'quiz:moderate', resource: 'quiz', action: 'moderate', description: 'Moderate quizzes' },

    // Challenge Permissions
    { name: 'challenge:create', resource: 'challenge', action: 'create', description: 'Create challenges' },
    { name: 'challenge:view', resource: 'challenge', action: 'view', description: 'View challenges' },
    { name: 'challenge:delete:own', resource: 'challenge', action: 'delete:own', description: 'Delete own challenges' },
    { name: 'challenge:delete:all', resource: 'challenge', action: 'delete:all', description: 'Delete any challenge' },

    // Social Permissions
    { name: 'social:follow', resource: 'social', action: 'follow', description: 'Follow users' },
    { name: 'social:like', resource: 'social', action: 'like', description: 'Like quizzes' },
    { name: 'social:comment', resource: 'social', action: 'comment', description: 'Comment on quizzes' },

    // User Permissions
    { name: 'user:view_details', resource: 'user', action: 'view_details', description: 'View detailed user info' },
    { name: 'user:edit_profile', resource: 'user', action: 'edit_profile', description: 'Edit own profile' },
    { name: 'user:ban', resource: 'user', action: 'ban', description: 'Ban users' },
    { name: 'user:manage_roles', resource: 'user', action: 'manage_roles', description: 'Manage user roles' },

    // Admin Permissions
    { name: 'admin:access', resource: 'admin', action: 'access', description: 'Access admin panel' },
    { name: 'admin:manage_permissions', resource: 'admin', action: 'manage_permissions', description: 'Manage system permissions' }
];

const ROLES = [
    {
        name: 'admin',
        description: 'System Administrator',
        is_system: true,
        permissions: ['*'] // Special handling in service
    },
    {
        name: 'moderator',
        description: 'Content Moderator',
        is_system: true,
        permissions: [
            'quiz:view', 'quiz:edit:all', 'quiz:delete:all', 'quiz:moderate', 'quiz:publish',
            'challenge:view', 'challenge:delete:all',
            'user:view_details', 'user:ban',
            'social:follow', 'social:like', 'social:comment'
        ]
    },
    {
        name: 'user',
        description: 'Standard User',
        is_system: true,
        permissions: [
            'quiz:create', 'quiz:edit:own', 'quiz:delete:own', 'quiz:view',
            'challenge:create', 'challenge:view', 'challenge:delete:own',
            'social:follow', 'social:like', 'social:comment',
            'user:edit_profile'
        ]
    },
    {
        name: 'guest',
        description: 'Guest User',
        is_system: true,
        permissions: [
            'quiz:view', 'challenge:view'
        ]
    }
];

async function seedRbac() {
    // Ensure tables exist
    await sequelize.sync();

    const transaction = await sequelize.transaction();

    try {
        logger.info('Starting RBAC seeding...');

        // 1. Create Permissions
        logger.info('Seeding permissions...');
        const permissionMap = new Map();

        for (const perm of PERMISSIONS) {
            const [p] = await Permission.findOrCreate({
                where: { name: perm.name },
                defaults: perm,
                transaction
            });
            permissionMap.set(p.name, p);
        }

        // 2. Create Roles and Assign Permissions
        logger.info('Seeding roles...');

        for (const roleData of ROLES) {
            const [role] = await Role.findOrCreate({
                where: { name: roleData.name },
                defaults: {
                    description: roleData.description,
                    is_system: roleData.is_system
                },
                transaction
            });

            if (roleData.permissions.length > 0 && roleData.permissions[0] !== '*') {
                const permissionsToAdd = roleData.permissions
                    .map(name => permissionMap.get(name))
                    .filter(p => p); // Filter out undefined

                await role.setPermissions(permissionsToAdd, { transaction });
            }
        }

        await transaction.commit();
        logger.info('RBAC seeding completed successfully');
    } catch (err) {
        await transaction.rollback();
        logger.error('RBAC seeding failed:', err);
        throw err;
    }
}

// Allow running directly
if (require.main === module) {
    seedRbac()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = seedRbac;
