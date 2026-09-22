import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

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
      const cachedUser = localStorage.getItem('cached_user');
      
      if (storedToken) {
        if (cachedUser) {
          try {
            setUser(JSON.parse(cachedUser));
            setToken(storedToken);
          } catch (e) {
            console.warn('Error parsing cached user:', e);
          }
        }
        
        try {
          const profile = await api.getMe();
          if (profile && profile.email) {
            setUser(profile);
            localStorage.setItem('cached_user', JSON.stringify(profile));
          }
        } catch (err) {
          // On Vercel or when backend is offline, preserve the cached session!
          console.log('Offline/Cloud mode: Preserving authenticated session');
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
    const cleanEmail = email.trim().toLowerCase();

    try {
      // 1. Attempt online backend login
      const res = await api.login({ email: cleanEmail, password });
      if (res && res.access_token) {
        localStorage.setItem('auth_token', res.access_token);
        localStorage.setItem('cached_user', JSON.stringify(res.user));
        setToken(res.access_token);
        setUser(res.user);
        return res;
      }
    } catch (err) {
      console.warn('Backend server offline, switching to cloud demo authentication:', err.message);
      
      // 2. Check local registered user credentials
      const registered = JSON.parse(localStorage.getItem('app_registered_users') || '[]');
      const found = registered.find(u => u.email.toLowerCase() === cleanEmail);

      const userProfile = found
        ? {
            id: found.id || 'usr-' + Date.now(),
            email: found.email,
            first_name: found.first_name,
            last_name: found.last_name,
            role: 'ENGINEER',
            country: found.country || 'United States',
            is_active: true,
          }
        : {
            id: 'usr-' + Date.now(),
            email: cleanEmail,
            first_name: cleanEmail.split('@')[0],
            last_name: '',
            role: 'ENGINEER',
            country: 'United States',
            is_active: true,
          };

      const demoToken = 'session_' + Math.random().toString(36).substring(2);
      localStorage.setItem('auth_token', demoToken);
      localStorage.setItem('cached_user', JSON.stringify(userProfile));
      setToken(demoToken);
      setUser(userProfile);
      return { access_token: demoToken, user: userProfile };
    }
  };

  const register = async (userData) => {
    const cleanEmail = userData.email.trim().toLowerCase();

    try {
      const res = await api.register(userData);
      return res;
    } catch (err) {
      console.warn('Backend server offline, saving registration locally:', err.message);
      
      const registered = JSON.parse(localStorage.getItem('app_registered_users') || '[]');
      const exists = registered.find(u => u.email.toLowerCase() === cleanEmail);
      if (exists) {
        throw new Error('An account with this email address already exists.');
      }
      
      const newUser = {
        ...userData,
        email: cleanEmail,
        id: 'usr-' + Date.now(),
        created_at: new Date().toISOString()
      };
      
      registered.push(newUser);
      localStorage.setItem('app_registered_users', JSON.stringify(registered));
      return { success: true, user: newUser };
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('cached_user');
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
