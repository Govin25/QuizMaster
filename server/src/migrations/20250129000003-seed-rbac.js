'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // ========================================
        // PHASE 1: CREATE RBAC TABLES
        // ========================================

        // Create permissions table
        await queryInterface.createTable('permissions', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            name: {
                type: Sequelize.STRING(100),
                allowNull: false,
                unique: true,
            },
            resource: {
                type: Sequelize.STRING(50),
                allowNull: false,
            },
            action: {
                type: Sequelize.STRING(50),
                allowNull: false,
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
            },
        });

        await queryInterface.addIndex('permissions', ['resource', 'action'], {
            name: 'permissions_resource_action',
        });

        // Create roles table
        await queryInterface.createTable('roles', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            name: {
                type: Sequelize.STRING(50),
                allowNull: false,
                unique: true,
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            is_system: {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
            },
        });

        // Create role_permissions junction table
        await queryInterface.createTable('role_permissions', {
            role_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'roles',
                    key: 'id',
                },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE',
                primaryKey: true,
            },
            permission_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'permissions',
                    key: 'id',
                },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE',
                primaryKey: true,
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
            },
        });

        await queryInterface.addConstraint('role_permissions', {
            fields: ['role_id', 'permission_id'],
            type: 'unique',
            name: 'role_permissions_role_id_permission_id',
        });

        // Create user_groups table
        await queryInterface.createTable('user_groups', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            name: {
                type: Sequelize.STRING(100),
                allowNull: false,
                unique: true,
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
            },
        });

        // Create group_members junction table
        await queryInterface.createTable('group_members', {
            group_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'user_groups',
                    key: 'id',
                },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE',
                primaryKey: true,
            },
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE',
                primaryKey: true,
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
            },
        });

        await queryInterface.addConstraint('group_members', {
            fields: ['group_id', 'user_id'],
            type: 'unique',
            name: 'group_members_group_id_user_id',
        });

        // Create group_permissions junction table
        await queryInterface.createTable('group_permissions', {
            group_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'user_groups',
                    key: 'id',
                },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE',
                primaryKey: true,
            },
            permission_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'permissions',
                    key: 'id',
                },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE',
                primaryKey: true,
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
            },
        });

        await queryInterface.addConstraint('group_permissions', {
            fields: ['group_id', 'permission_id'],
            type: 'unique',
            name: 'group_permissions_group_id_permission_id',
        });

        // Create user_permissions junction table
        await queryInterface.createTable('user_permissions', {
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE',
                primaryKey: true,
            },
            permission_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'permissions',
                    key: 'id',
                },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE',
                primaryKey: true,
            },
            granted: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
            },
        });

        await queryInterface.addConstraint('user_permissions', {
            fields: ['user_id', 'permission_id'],
            type: 'unique',
            name: 'user_permissions_user_id_permission_id',
        });

        // ========================================
        // PHASE 2: SEED RBAC DATA
        // ========================================

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

        const timestamp = new Date();

        // Insert permissions
        const permissionsData = PERMISSIONS.map(p => ({
            ...p,
            created_at: timestamp
        }));
        await queryInterface.bulkInsert('permissions', permissionsData);

        // Insert roles
        const rolesData = ROLES.map(r => ({
            name: r.name,
            description: r.description,
            is_system: r.is_system,
            created_at: timestamp
        }));
        await queryInterface.bulkInsert('roles', rolesData);

        // Fetch IDs for mapping
        const [allPermissions] = await queryInterface.sequelize.query(
            "SELECT id, name FROM permissions"
        );
        const [allRoles] = await queryInterface.sequelize.query(
            "SELECT id, name FROM roles"
        );

        const permissionMap = new Map(allPermissions.map(p => [p.name, p.id]));
        const roleMap = new Map(allRoles.map(r => [r.name, r.id]));

        // Create role-permission mappings
        const rolePermissionsData = [];
        for (const roleDef of ROLES) {
            const roleId = roleMap.get(roleDef.name);
            if (!roleId) continue;

            if (roleDef.permissions.includes('*')) {
                // Admin gets all permissions
                for (const perm of allPermissions) {
                    rolePermissionsData.push({
                        role_id: roleId,
                        permission_id: perm.id,
                        created_at: timestamp
                    });
                }
            } else {
                for (const permName of roleDef.permissions) {
                    const permId = permissionMap.get(permName);
                    if (permId) {
                        rolePermissionsData.push({
                            role_id: roleId,
                            permission_id: permId,
                            created_at: timestamp
                        });
                    }
                }
            }
        }

        if (rolePermissionsData.length > 0) {
            await queryInterface.bulkInsert('role_permissions', rolePermissionsData);
        }
    },

    async down(queryInterface, Sequelize) {
        // Drop tables in reverse order
        await queryInterface.dropTable('user_permissions');
        await queryInterface.dropTable('group_permissions');
        await queryInterface.dropTable('group_members');
        await queryInterface.dropTable('user_groups');
        await queryInterface.dropTable('role_permissions');
        await queryInterface.dropTable('roles');
        await queryInterface.dropTable('permissions');
    }
};
