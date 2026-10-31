import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api/endpoints';
import { ROLES } from '../utils/constants';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('brightloop_user');
    const token = localStorage.getItem('brightloop_access_token');
    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('brightloop_user');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    setError(null);
    try {
      const { data } = await authAPI.login({ email, password });
      const userData = {
        id: data.user.id,
        email: data.user.email,
        first_name: data.user.first_name,
        last_name: data.user.last_name,
        role: data.user.role,
        is_active: data.user.is_active,
      };
      localStorage.setItem('brightloop_access_token', data.access);
      localStorage.setItem('brightloop_refresh_token', data.refresh);
      localStorage.setItem('brightloop_user', JSON.stringify(userData));
      setUser(userData);
      return userData;
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.error || 'Login failed. Please check your credentials.';
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const register = useCallback(async (formData) => {
    setError(null);
    try {
      const { data } = await authAPI.register(formData);
      return data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.error || 'Registration failed.';
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch {
      // Ignore logout API errors
    }
    localStorage.removeItem('brightloop_access_token');
    localStorage.removeItem('brightloop_refresh_token');
    localStorage.removeItem('brightloop_user');
    setUser(null);
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('brightloop_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const isAdmin = user?.role === ROLES.ADMIN;
  const isStaff = user?.role === ROLES.STAFF;
  const isCustomer = user?.role === ROLES.CUSTOMER;
  const isAuthenticated = !!user;

  const hasPermission = useCallback(
    (requiredRole) => {
      if (!user) return false;
      if (user.role === ROLES.ADMIN) return true;
      if (requiredRole === ROLES.STAFF && (user.role === ROLES.STAFF || user.role === ROLES.ADMIN)) return true;
      return user.role === requiredRole;
    },
    [user]
  );

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated,
    isAdmin,
    isStaff,
    isCustomer,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
