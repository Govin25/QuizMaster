const express = require('express');
const router = express.Router();
const rbacService = require('../services/rbacService');
const RbacRepository = require('../repositories/RbacRepository');
const { authenticateToken, requirePermission } = require('../middleware/authMiddleware');
const { handleError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

// Middleware to ensure admin access for all routes in this file
router.use(authenticateToken);
router.use(requirePermission('admin:access'));

// --- Roles Management ---

// Get all roles
router.get('/roles', async (req, res) => {
    try {
        const roles = await RbacRepository.getAllRoles();
        res.json(roles);
    } catch (err) {
        res.status(500).json(handleError(err, { userId: req.user.id }));
    }
});

// Create a new role
router.post('/roles', async (req, res) => {
    try {
        const { name, description, permissions } = req.body;
        if (!name) return res.status(400).json({ error: 'Role name is required' });

        const role = await rbacService.createRole(name, description, permissions);
        res.status(201).json(role);
    } catch (err) {
        res.status(500).json(handleError(err, { userId: req.user.id, action: 'createRole' }));
    }
});

// Update a role
router.put('/roles/:id', async (req, res) => {
    try {
        const { name, description, permissions } = req.body;
        const roleId = req.params.id;

        const role = await RbacRepository.updateRole(roleId, { name, description });

        if (permissions) {
            await RbacRepository.setRolePermissions(roleId, permissions);
        }

        // Fetch updated role
        const updatedRole = await RbacRepository.getRoleById(roleId);
        res.json(updatedRole);
    } catch (err) {
        res.status(500).json(handleError(err, { userId: req.user.id, action: 'updateRole' }));
    }
});

// Delete a role
router.delete('/roles/:id', async (req, res) => {
    try {
        await RbacRepository.deleteRole(req.params.id);
        res.json({ message: 'Role deleted successfully' });
    } catch (err) {
        res.status(500).json(handleError(err, { userId: req.user.id, action: 'deleteRole' }));
    }
});

// --- Permissions Management ---

// Get all permissions
router.get('/permissions', async (req, res) => {
    try {
        const permissions = await RbacRepository.getAllPermissions();
        res.json(permissions);
    } catch (err) {
        res.status(500).json(handleError(err, { userId: req.user.id }));
    }
});

// Create a new permission
router.post('/permissions', async (req, res) => {
    try {
        const { name, resource, action, description } = req.body;
        if (!name || !resource || !action) {
            return res.status(400).json({ error: 'Name, resource, and action are required' });
        }

        const permission = await RbacRepository.createPermission({ name, resource, action, description });
        res.status(201).json(permission);
    } catch (err) {
        res.status(500).json(handleError(err, { userId: req.user.id, action: 'createPermission' }));
    }
});

// --- Groups Management ---

// Get all groups
router.get('/groups', async (req, res) => {
    try {
        const groups = await RbacRepository.getAllGroups();
        res.json(groups);
    } catch (err) {
        res.status(500).json(handleError(err, { userId: req.user.id }));
    }
});

// Create a new group
router.post('/groups', async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) return res.status(400).json({ error: 'Group name is required' });

        const group = await RbacRepository.createGroup({ name, description });
        res.status(201).json(group);
    } catch (err) {
        res.status(500).json(handleError(err, { userId: req.user.id, action: 'createGroup' }));
    }
});

// Add user to group
router.post('/groups/:groupId/users', async (req, res) => {
    try {
        const { userId } = req.body;
        await RbacRepository.addUserToGroup(userId, req.params.groupId);
        res.json({ message: 'User added to group' });
    } catch (err) {
        res.status(500).json(handleError(err, { userId: req.user.id, action: 'addUserToGroup' }));
    }
});

// Remove user from group
router.delete('/groups/:groupId/users/:userId', async (req, res) => {
    try {
        await RbacRepository.removeUserFromGroup(req.params.userId, req.params.groupId);
        res.json({ message: 'User removed from group' });
    } catch (err) {
        res.status(500).json(handleError(err, { userId: req.user.id, action: 'removeUserFromGroup' }));
    }
});

// --- User Assignments ---

// Assign role to user
router.post('/users/:userId/role', async (req, res) => {
    try {
        const { roleName } = req.body;
        await rbacService.assignRoleToUser(req.params.userId, roleName);
        res.json({ message: 'Role assigned successfully' });
    } catch (err) {
        res.status(500).json(handleError(err, { userId: req.user.id, action: 'assignRole' }));
    }
});

// Grant direct permission to user (Whitelist)
router.post('/users/:userId/permissions/grant', async (req, res) => {
    try {
        const { permissionId } = req.body;
        await RbacRepository.grantPermissionToUser(req.params.userId, permissionId);
        res.json({ message: 'Permission granted to user' });
    } catch (err) {
        res.status(500).json(handleError(err, { userId: req.user.id, action: 'grantPermission' }));
    }
});

// Revoke direct permission from user (Blacklist)
router.post('/users/:userId/permissions/revoke', async (req, res) => {
    try {
        const { permissionId } = req.body;
        await RbacRepository.revokePermissionFromUser(req.params.userId, permissionId);
        res.json({ message: 'Permission revoked from user' });
    } catch (err) {
        res.status(500).json(handleError(err, { userId: req.user.id, action: 'revokePermission' }));
    }
});

// Reset user permission (remove direct assignment)
router.delete('/users/:userId/permissions/:permissionId', async (req, res) => {
    try {
        await RbacRepository.removeUserPermission(req.params.userId, req.params.permissionId);
        res.json({ message: 'User permission reset to default' });
    } catch (err) {
        res.status(500).json(handleError(err, { userId: req.user.id, action: 'resetPermission' }));
    }
});

module.exports = router;
