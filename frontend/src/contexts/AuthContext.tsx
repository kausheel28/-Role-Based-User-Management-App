// AI-assisted: see ai-assist.md
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, LoginRequest } from '../types';
import { authApi, setAccessToken, clearAccessToken, usersApi, fetchCSRFToken } from '../services/api';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  permissions: Record<string, boolean>;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;

  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;
  console.log(user);
  console.log(permissions);
  const refreshUser = async () => {
    try {
      console.log('🔄 Attempting to refresh user...');
      
      // Check if we have a token first
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      if (!token) {
        console.log('❌ No token found, user not authenticated');
        setUser(null);
        setPermissions({});
        return;
      }
      
      // Set the token in axios headers if it exists
      console.log('🔑 Found token, setting in axios headers');
      setAccessToken(token);
      
      // Always get user info first
      const userResponse = await authApi.getMe();
      console.log('✅ User info loaded:', userResponse.data);
      setUser(userResponse.data);
      localStorage.setItem('user', JSON.stringify(userResponse.data));
      
      // Try to get permissions, but don't fail if unauthorized
      try {
        console.log('🔄 Attempting to load permissions...');
        const permissionsResponse = await usersApi.getMyPermissions();
        console.log('✅ Permissions loaded:', permissionsResponse.data.permissions);
        setPermissions(permissionsResponse.data.permissions);
      } catch (permError: any) {
        console.warn('⚠️ Could not load permissions:', permError.response?.status, permError.response?.data);
        // Set empty permissions but keep user logged in
        setPermissions({});
      }
    } catch (error: any) {
      console.error('❌ Failed to refresh user:', error.response?.status, error.response?.data);
      
      // Clear authentication state for 401 (Unauthorized) or 403 (Forbidden) errors
      // Both indicate authentication failure from the /auth/me endpoint
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('🔐 Authentication failed (401/403), logging out');
        setUser(null);
        setPermissions({});
        clearAccessToken();
      } else {
        console.log('⚠️ Non-authentication error, keeping user logged in but clearing permissions');
        // Keep user logged in but clear permissions for safety
        setPermissions({});
      }
    }
  };
  

  const login = async (credentials: LoginRequest) => {
    try {
      setIsLoading(true);
      
      // Fetch CSRF token before login
      try {
        await fetchCSRFToken();
      } catch (csrfError) {
        console.warn('Failed to fetch CSRF token:', csrfError);
      }
      
      const response = await authApi.login(credentials);
      const tokens = response.data;
      
      setAccessToken(tokens.access_token);
      await refreshUser();
      
      toast.success('Login successful!');
    } catch (error: any) {
      console.error('Login failed:', error);
      const message = error.response?.data?.detail || 'Login failed';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setPermissions({});
      clearAccessToken();
      toast.success('Logged out successfully');
    }
  };

  // Check for existing session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Try to get current user (this will trigger token refresh if needed)
        await refreshUser();
      } catch (error) {
        console.log('No existing session found');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    permissions,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
