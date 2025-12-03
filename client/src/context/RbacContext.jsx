import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import API_URL from '../config';

const RbacContext = createContext(null);

export const RbacProvider = ({ children }) => {
    const { user, fetchWithAuth } = useAuth();
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchPermissions();
        } else {
            setPermissions([]);
            setLoading(false);
        }
    }, [user]);

    const fetchPermissions = async () => {
        try {
            // We need an endpoint to get current user's permissions
            // For now, let's assume we add this to auth routes or profile routes
            // Or we can use the admin endpoint if user has access, but regular users need their own permissions

            // Let's add a route /api/auth/permissions or /api/profile/permissions
            // For this implementation, I'll assume we add it to profile
            const response = await fetchWithAuth(`${API_URL}/api/profile/permissions`);
            if (response.ok) {
                const data = await response.json();
                setPermissions(data.permissions || []);
            }
        } catch (err) {
            console.error('Failed to fetch permissions', err);
        } finally {
            setLoading(false);
        }
    };

    const hasPermission = (permissionName) => {
        if (!user) return false;
        // Admin wildcard check
        if (permissions.includes('*:*')) return true;
        return permissions.includes(permissionName);
    };

    const hasAnyPermission = (permissionNames) => {
        if (!user) return false;
        if (permissions.includes('*:*')) return true;
        return permissionNames.some(p => permissions.includes(p));
    };

    const hasAllPermissions = (permissionNames) => {
        if (!user) return false;
        if (permissions.includes('*:*')) return true;
        return permissionNames.every(p => permissions.includes(p));
    };

    const hasRole = (roleName) => {
        return user?.role === roleName;
    };

    const isAdmin = () => {
        return hasRole('admin') || permissions.includes('*:*');
    };

    return (
        <RbacContext.Provider value={{
            permissions,
            loading,
            hasPermission,
            hasAnyPermission,
            hasAllPermissions,
            hasRole,
            isAdmin,
            refreshPermissions: fetchPermissions
        }}>
            {children}
        </RbacContext.Provider>
    );
};

export const usePermission = () => {
    const context = useContext(RbacContext);
    if (!context) {
        throw new Error('usePermission must be used within an RbacProvider');
    }
    return context;
};
