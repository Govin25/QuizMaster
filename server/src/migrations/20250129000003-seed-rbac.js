'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
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
                permissions: ['*']
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

        const transaction = await queryInterface.sequelize.transaction();

        try {
            // 1. Fetch existing permissions
            const [existingPermissions] = await queryInterface.sequelize.query(
                "SELECT name FROM permissions",
                { transaction }
            );
            const existingPermissionNames = new Set(existingPermissions.map(p => p.name));

            const timestamp = new Date();
            const permissionsData = PERMISSIONS
                .filter(p => !existingPermissionNames.has(p.name))
                .map(p => ({
                    ...p,
                    created_at: timestamp
                }));

            if (permissionsData.length > 0) {
                await queryInterface.bulkInsert('permissions', permissionsData, { transaction });
            }

            // 2. Fetch existing roles
            const [existingRoles] = await queryInterface.sequelize.query(
                "SELECT name FROM roles",
                { transaction }
            );
            const existingRoleNames = new Set(existingRoles.map(r => r.name));

            const rolesData = ROLES
                .filter(r => !existingRoleNames.has(r.name))
                .map(r => ({
                    name: r.name,
                    description: r.description,
                    is_system: r.is_system,
                    created_at: timestamp
                }));

            if (rolesData.length > 0) {
                await queryInterface.bulkInsert('roles', rolesData, { transaction });
            }

            // 3. Fetch all IDs to map them (re-fetch all to ensure we have IDs for both new and existing)
            const [allPermissions] = await queryInterface.sequelize.query(
                "SELECT id, name FROM permissions",
                { transaction }
            );

            const [allRoles] = await queryInterface.sequelize.query(
                "SELECT id, name FROM roles",
                { transaction }
            );

            const permissionMap = new Map(allPermissions.map(p => [p.name, p.id]));
            const roleMap = new Map(allRoles.map(r => [r.name, r.id]));

            // 4. Prepare RolePermissions
            // We need to avoid duplicate role_permissions too.
            const [existingRolePermissions] = await queryInterface.sequelize.query(
                "SELECT role_id, permission_id FROM role_permissions",
                { transaction }
            );
            const existingRolePermSet = new Set(
                existingRolePermissions.map(rp => `${rp.role_id}:${rp.permission_id}`)
            );

            const rolePermissionsData = [];

            for (const roleDef of ROLES) {
                const roleId = roleMap.get(roleDef.name);
                if (!roleId) continue;

                if (roleDef.permissions.includes('*')) {
                    // Assign all permissions
                    for (const perm of allPermissions) {
                        if (!existingRolePermSet.has(`${roleId}:${perm.id}`)) {
                            rolePermissionsData.push({
                                role_id: roleId,
                                permission_id: perm.id,
                                created_at: timestamp
                            });
                            // Add to set to prevent duplicates within this loop if logic is flawed
                            existingRolePermSet.add(`${roleId}:${perm.id}`);
                        }
                    }
                } else {
                    for (const permName of roleDef.permissions) {
                        const permId = permissionMap.get(permName);
                        if (permId && !existingRolePermSet.has(`${roleId}:${permId}`)) {
                            rolePermissionsData.push({
                                role_id: roleId,
                                permission_id: permId,
                                created_at: timestamp
                            });
                            existingRolePermSet.add(`${roleId}:${permId}`);
                        }
                    }
                }
            }

            if (rolePermissionsData.length > 0) {
                await queryInterface.bulkInsert('role_permissions', rolePermissionsData, { transaction });
            }

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            console.error('RBAC Seeding Failed:', error);
            throw error;
        }
    },

    async down(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            // We can just truncate these tables or delete the specific rows.
            // Since this is a seed migration, clearing the tables is likely what we want if we revert it,
            // assuming these tables are only for RBAC.

            await queryInterface.bulkDelete('role_permissions', null, { transaction });
            await queryInterface.bulkDelete('roles', null, { transaction });
            await queryInterface.bulkDelete('permissions', null, { transaction });

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
};
