import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import apiService from '../services/apiService';

const AuthContext = createContext();

// Set the base URL for axios
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
axios.defaults.baseURL = API_BASE_URL;

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Set up axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const result = await apiService.getProfile();
          if (result.success) {
            setUser(result.data.user);
          } else {
            console.error('Auth check failed:', result.error);
            logout();
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  // In your login function, make sure you're setting all necessary user properties
  const login = async (email, password) => {
    try {
      const result = await apiService.login(email, password);
      
      if (result.success) {
        const { user, session } = result.data;
        
        // Make sure to set clientId if the user is a client
        if (user.role === 'client' && user.client_id) {
          user.clientId = user.client_id; // Add this for backward compatibility
        }
        
        setUser(user);
        setToken(session.access_token);
        
        toast.success(`Login successful! ${result.source === 'supabase' ? '(Using direct connection)' : ''}`);
        return { success: true };
      } else {
        toast.error(result.error || 'Login failed');
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Login error:', error);
      const message = error.message || 'Login failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const register = async (userData) => {
    try {
      const result = await apiService.register(userData);
      
      if (result.success) {
        toast.success(`Registration successful! Please log in. ${result.source === 'supabase' ? '(Using direct connection)' : ''}`);
        return { success: true };
      } else {
        toast.error(result.error || 'Registration failed');
        return { success: false, error: result.error };
      }
    } catch (error) {
      const message = error.message || 'Registration failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    setUser(null);
    setToken(null);
    delete axios.defaults.headers.common['Authorization'];
    toast.success('Logged out successfully');
  };

  const updateProfile = async (profileData) => {
    try {
      const result = await apiService.updateUser(user.id, profileData);
      
      if (result.success) {
        setUser(result.data.user);
        toast.success(`Profile updated successfully! ${result.source === 'supabase' ? '(Using direct connection)' : ''}`);
        return { success: true };
      } else {
        toast.error(result.error || 'Profile update failed');
        return { success: false, error: result.error };
      }
    } catch (error) {
      const message = error.message || 'Profile update failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated: !!user,
    isManager: user?.role === 'manager',
    isEditor: user?.role === 'editor',
    isClient: user?.role === 'client'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};