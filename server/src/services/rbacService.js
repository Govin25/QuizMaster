const RbacRepository = require('../repositories/RbacRepository');
const logger = require('../utils/logger');

class RbacService {
    /**
     * Check if a user has a specific permission
     * @param {number} userId 
     * @param {string} permissionName - e.g., 'quiz:create'
     * @returns {Promise<boolean>}
     */
    async hasPermission(userId, permissionName) {
        try {
            const user = await RbacRepository.getUserPermissions(userId);
            if (!user) return false;

            // 1. Check for Admin role (wildcard access)
            if (user.userRole && user.userRole.name === 'admin') {
                return true;
            }

            // 2. Check Direct User Permissions (Whitelist/Blacklist)
            const directPermission = user.directPermissions.find(p => p.name === permissionName);
            if (directPermission) {
                // If found in direct permissions, the 'granted' flag is the absolute truth
                // granted=true (whitelist) -> Allow
                // granted=false (blacklist) -> Deny
                return directPermission.UserPermission.granted;
            }

            // 3. Check Role Permissions
            if (user.userRole && user.userRole.permissions) {
                const hasRolePermission = user.userRole.permissions.some(p => p.name === permissionName);
                if (hasRolePermission) return true;
            }

            // 4. Check Group Permissions
            if (user.groups && user.groups.length > 0) {
                for (const group of user.groups) {
                    if (group.permissions && group.permissions.some(p => p.name === permissionName)) {
                        return true;
                    }
                }
            }

            // Default deny
            return false;
        } catch (err) {
            logger.error('Error checking permission', { userId, permissionName, error: err });
            return false;
        }
    }

    /**
     * Get all permissions for a user (resolved)
     * @param {number} userId 
     * @returns {Promise<string[]>} List of permission names
     */
    async getUserPermissions(userId) {
        const user = await RbacRepository.getUserPermissions(userId);
        if (!user) return [];

        const permissions = new Set();
        const blacklisted = new Set();

        // 1. Admin gets everything (we'll return a wildcard or special indicator, 
        // but for specific lists, we might want to return all known permissions if needed.
        // For now, let's just return what's explicitly assigned + role/group perms)
        if (user.userRole && user.userRole.name === 'admin') {
            return ['*:*']; // Client can interpret this as "all access"
        }

        // 2. Process Direct Permissions
        user.directPermissions.forEach(p => {
            if (p.UserPermission.granted) {
                permissions.add(p.name);
            } else {
                blacklisted.add(p.name);
            }
        });

        // 3. Process Role Permissions
        if (user.userRole && user.userRole.permissions) {
            user.userRole.permissions.forEach(p => {
                if (!blacklisted.has(p.name)) {
                    permissions.add(p.name);
                }
            });
        }

        // 4. Process Group Permissions
        if (user.groups) {
            user.groups.forEach(group => {
                if (group.permissions) {
                    group.permissions.forEach(p => {
                        if (!blacklisted.has(p.name)) {
                            permissions.add(p.name);
                        }
                    });
                }
            });
        }

        return Array.from(permissions);
    }

    async createRole(name, description, permissionIds = []) {
        const role = await RbacRepository.createRole({ name, description });
        if (permissionIds.length > 0) {
            await RbacRepository.addPermissionsToRole(role.id, permissionIds);
        }
        return role;
    }

    async assignRoleToUser(userId, roleName) {
        return await RbacRepository.assignRoleToUser(userId, roleName);
    }

    // ... other passthrough methods can be added as needed
}

module.exports = new RbacService();
