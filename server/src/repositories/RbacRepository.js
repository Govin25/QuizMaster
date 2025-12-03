const {
    Role,
    Permission,
    RolePermission,
    UserGroup,
    GroupMember,
    GroupPermission,
    UserPermission,
    User,
    sequelize
} = require('../models/sequelize');
const { Op } = require('sequelize');

class RbacRepository {
    // Role Operations
    async createRole(data) {
        return await Role.create(data);
    }

    async getRoleByName(name) {
        return await Role.findOne({ where: { name } });
    }

    async getRoleById(id) {
        return await Role.findByPk(id, {
            include: [{ model: Permission, as: 'permissions' }]
        });
    }

    async getAllRoles() {
        return await Role.findAll({
            include: [{ model: Permission, as: 'permissions' }]
        });
    }

    async updateRole(id, data) {
        const role = await Role.findByPk(id);
        if (!role) throw new Error('Role not found');
        if (role.is_system && data.name && data.name !== role.name) {
            throw new Error('Cannot rename system roles');
        }
        return await role.update(data);
    }

    async deleteRole(id) {
        const role = await Role.findByPk(id);
        if (!role) throw new Error('Role not found');
        if (role.is_system) throw new Error('Cannot delete system roles');
        return await role.destroy();
    }

    // Permission Operations
    async createPermission(data) {
        return await Permission.create(data);
    }

    async getPermissionByName(name) {
        return await Permission.findOne({ where: { name } });
    }

    async getAllPermissions() {
        return await Permission.findAll();
    }

    // Role-Permission Associations
    async addPermissionsToRole(roleId, permissionIds) {
        const role = await Role.findByPk(roleId);
        if (!role) throw new Error('Role not found');
        return await role.addPermissions(permissionIds);
    }

    async removePermissionsFromRole(roleId, permissionIds) {
        const role = await Role.findByPk(roleId);
        if (!role) throw new Error('Role not found');
        return await role.removePermissions(permissionIds);
    }

    async setRolePermissions(roleId, permissionIds) {
        const role = await Role.findByPk(roleId);
        if (!role) throw new Error('Role not found');
        return await role.setPermissions(permissionIds);
    }

    // User Operations
    async assignRoleToUser(userId, roleName) {
        // In our schema, role is a column on the User table, referencing Role.name
        // We need to ensure the role exists first
        const role = await this.getRoleByName(roleName);
        if (!role) throw new Error(`Role ${roleName} not found`);

        return await User.update({ role: roleName }, { where: { id: userId } });
    }

    async getUserPermissions(userId) {
        const user = await User.findByPk(userId, {
            include: [
                // 1. Role permissions
                {
                    model: Role,
                    as: 'userRole',
                    include: [{ model: Permission, as: 'permissions' }]
                },
                // 2. Group permissions
                {
                    model: UserGroup,
                    as: 'groups',
                    include: [{ model: Permission, as: 'permissions' }]
                },
                // 3. Direct user permissions (whitelist/blacklist)
                {
                    model: Permission,
                    as: 'directPermissions',
                    through: { attributes: ['granted'] }
                }
            ]
        });

        if (!user) throw new Error('User not found');
        return user;
    }

    // Group Operations
    async createGroup(data) {
        return await UserGroup.create(data);
    }

    async getGroupById(id) {
        return await UserGroup.findByPk(id, {
            include: [
                { model: Permission, as: 'permissions' },
                { model: User, as: 'members', attributes: ['id', 'username'] }
            ]
        });
    }

    async getAllGroups() {
        return await UserGroup.findAll({
            include: [{ model: Permission, as: 'permissions' }]
        });
    }

    async addUserToGroup(userId, groupId) {
        const group = await UserGroup.findByPk(groupId);
        if (!group) throw new Error('Group not found');
        return await group.addMember(userId);
    }

    async removeUserFromGroup(userId, groupId) {
        const group = await UserGroup.findByPk(groupId);
        if (!group) throw new Error('Group not found');
        return await group.removeMember(userId);
    }

    async addPermissionsToGroup(groupId, permissionIds) {
        const group = await UserGroup.findByPk(groupId);
        if (!group) throw new Error('Group not found');
        return await group.addPermissions(permissionIds);
    }

    // Direct User Permissions
    async grantPermissionToUser(userId, permissionId) {
        // granted: true = whitelist
        const [userPermission, created] = await UserPermission.findOrCreate({
            where: { user_id: userId, permission_id: permissionId },
            defaults: { granted: true }
        });

        if (!created && !userPermission.granted) {
            await userPermission.update({ granted: true });
        }
        return userPermission;
    }

    async revokePermissionFromUser(userId, permissionId) {
        // granted: false = blacklist
        const [userPermission, created] = await UserPermission.findOrCreate({
            where: { user_id: userId, permission_id: permissionId },
            defaults: { granted: false }
        });

        if (!created && userPermission.granted) {
            await userPermission.update({ granted: false });
        }
        return userPermission;
    }

    async removeUserPermission(userId, permissionId) {
        // Remove entry entirely (reset to default inheritance)
        return await UserPermission.destroy({
            where: { user_id: userId, permission_id: permissionId }
        });
    }
}

module.exports = new RbacRepository();
