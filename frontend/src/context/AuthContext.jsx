import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { mockStore } from '../services/mockData';

const AuthContext = createContext({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  isAuthModalOpen: false,
  authModalMode: 'signin',
  openAuthModal: () => {},
  closeAuthModal: () => {},
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('signin');

  // Verify and hydrate existing token on load
  useEffect(() => {
    const hydrateUser = async () => {
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken) {
        try {
          const profile = await api.getMe();
          if (profile) {
            setUser(profile);
            setToken(storedToken);
          }
        } catch (err) {
          console.warn('Backend unavailable, using cached profile:', err.message);
          const mockUser = mockStore.getMe();
          setUser(mockUser);
          setToken(storedToken);
        }
      }
      setIsLoading(false);
    };

    hydrateUser();
  }, []);

  const openAuthModal = (mode = 'signin') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const login = async (email, password) => {
    const emailClean = email.trim().toLowerCase();
    try {
      const res = await api.login({ email: emailClean, password });
      if (res && res.access_token) {
        localStorage.setItem('auth_token', res.access_token);
        setToken(res.access_token);
        setUser(res.user);
        return res;
      }
      throw new Error('No token returned');
    } catch (err) {
      console.warn('Network call failed, executing standalone login:', err.message);
      const res = mockStore.login(emailClean, password);
      localStorage.setItem('auth_token', res.access_token);
      setToken(res.access_token);
      setUser(res.user);
      return res;
    }
  };

  const register = async (userData) => {
    try {
      return await api.register(userData);
    } catch (err) {
      console.warn('Network call failed, registering in local store:', err.message);
      return mockStore.register(userData);
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('demo_current_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        isAuthModalOpen,
        authModalMode,
        setAuthModalMode,
        openAuthModal,
        closeAuthModal,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
