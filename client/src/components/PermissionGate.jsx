import React from 'react';
import { usePermission } from '../context/RbacContext';

const PermissionGate = ({
    children,
    permission,
    permissions,
    requireAll = false,
    fallback = null
}) => {
    const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = usePermission();

    if (loading) return null; // Or a loading spinner if preferred

    let hasAccess = false;

    if (permission) {
        hasAccess = hasPermission(permission);
    } else if (permissions) {
        hasAccess = requireAll
            ? hasAllPermissions(permissions)
            : hasAnyPermission(permissions);
    }

    if (!hasAccess) {
        return fallback;
    }

    return <>{children}</>;
};

export default PermissionGate;
