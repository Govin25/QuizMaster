const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'secret_key';

const authenticateToken = (req, res, next) => {
    // Try to get token from cookie first (more secure)
    let token = req.cookies?.auth_token;

    // Fallback to Authorization header for API clients
    if (!token) {
        const authHeader = req.headers['authorization'];
        token = authHeader && authHeader.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};



const optionalAuthenticateToken = (req, res, next) => {
    // Try to get token from cookie first
    let token = req.cookies?.auth_token;

    // Fallback to Authorization header
    if (!token) {
        const authHeader = req.headers['authorization'];
        token = authHeader && authHeader.split(' ')[1];
    }

    if (!token) {
        return next();
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (!err) {
            req.user = user;
        }
        next();
    });
};


const rbacService = require('../services/rbacService');
const { handleError } = require('../utils/errorHandler');

const requirePermission = (permission) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            const hasAccess = await rbacService.hasPermission(req.user.id, permission);
            if (!hasAccess) {
                return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
            }

            next();
        } catch (err) {
            res.status(500).json(handleError(err, { userId: req.user?.id, permission }));
        }
    };
};

const requireAnyPermission = (permissions) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            for (const permission of permissions) {
                const hasAccess = await rbacService.hasPermission(req.user.id, permission);
                if (hasAccess) {
                    return next();
                }
            }

            return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
        } catch (err) {
            res.status(500).json(handleError(err, { userId: req.user?.id, permissions }));
        }
    };
};

const requireAllPermissions = (permissions) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            for (const permission of permissions) {
                const hasAccess = await rbacService.hasPermission(req.user.id, permission);
                if (!hasAccess) {
                    return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
                }
            }

            next();
        } catch (err) {
            res.status(500).json(handleError(err, { userId: req.user?.id, permissions }));
        }
    };
};

const requireRole = (roleName) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            // We need to fetch the full user with role to check this properly
            // But for now, let's assume we can check permissions or use rbacService
            // Actually, rbacService doesn't have a direct hasRole method exposed yet, 
            // but we can check if the user has a permission that only that role has, 
            // or better, let's add a check in rbacService or just fetch user role here.

            // A better way is to rely on permissions, but if we must check role:
            const userPermissions = await rbacService.getUserPermissions(req.user.id);
            // This returns a list of permission strings. It doesn't tell us the role name directly.

            // Let's use the repository directly or add a method to service.
            // For now, let's skip strict role check and encourage permission check.
            // But if we really need it, we can query the DB.

            // Let's implement a simple version that checks if the user has the 'admin' role
            // if roleName is admin, otherwise we might need to fetch user.

            // Actually, let's just use requirePermission for everything. 
            // Role checks are often anti-patterns in RBAC.
            // But for backward compatibility or simple checks:

            const { User, Role } = require('../models/sequelize');
            const user = await User.findByPk(req.user.id, {
                include: [{ model: Role, as: 'userRole' }]
            });

            if (!user || !user.userRole || user.userRole.name !== roleName) {
                return res.status(403).json({ error: `Access denied: Requires ${roleName} role` });
            }

            next();
        } catch (err) {
            res.status(500).json(handleError(err, { userId: req.user?.id, roleName }));
        }
    };
};

module.exports = {
    authenticateToken,
    optionalAuthenticateToken,
    requirePermission,
    requireAnyPermission,
    requireAllPermissions,
    requireRole
};
