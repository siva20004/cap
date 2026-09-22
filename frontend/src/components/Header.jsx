import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Database, ShieldCheck, Sun, Moon, User, LogOut, LogIn, ChevronDown } from 'lucide-react';

export const Header = () => {
  const [health, setHealth] = useState(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, openAuthModal, logout } = useAuth();

  useEffect(() => {
    const checkHealth = () => {
      api.getHealth()
        .then((data) => setHealth(data))
        .catch(() => setHealth({ status: 'OFFLINE' }));
    };
    checkHealth();
    const timer = setInterval(checkHealth, 10000);
    return () => clearInterval(timer);
  }, []);

  const isHealthy = health?.status === 'HEALTHY';

  const getUserInitials = () => {
    if (!user) return 'U';
    const first = user.first_name ? user.first_name[0].toUpperCase() : '';
    const last = user.last_name ? user.last_name[0].toUpperCase() : '';
    return first + last || 'U';
  };

  return (
    <header className="header">
      <div className="header-title">
        Self-Diagnosing AI Pipeline Orchestrator
      </div>

      <div className="header-status">
        {/* System Health Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: isHealthy ? '#34d399' : '#f87171' }}>
          <div className="pulse-dot" style={{ backgroundColor: isHealthy ? '#10b981' : '#ef4444' }} />
          <span>Backend: {health ? health.status : 'Connecting...'}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
          <Database size={14} color="#38bdf8" />
          <span>PostgreSQL 18 : 5433</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
          <ShieldCheck size={14} color="#10b981" />
          <span>Zero-Mock Verified</span>
        </div>

        {/* Theme Switcher Button */}
        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun size={17} className="theme-icon sun-icon" />
          ) : (
            <Moon size={17} className="theme-icon moon-icon" />
          )}
        </button>

        {/* User Account / Sign In */}
        {isAuthenticated && user ? (
          <div className="user-profile-menu-container">
            <button
              className="user-profile-btn"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              aria-label="User menu"
            >
              <div className="user-avatar-chip">{getUserInitials()}</div>
              <div className="user-profile-name">
                <span className="user-name-text">{user.first_name} {user.last_name}</span>
                <span className="user-role-badge">{user.role || 'ENGINEER'}</span>
              </div>
              <ChevronDown size={14} className={`chevron-icon ${isUserMenuOpen ? 'open' : ''}`} />
            </button>

            {isUserMenuOpen && (
              <div className="user-dropdown-card">
                <div className="user-dropdown-header">
                  <div className="user-dropdown-fullname">{user.first_name} {user.last_name}</div>
                  <div className="user-dropdown-email">{user.email}</div>
                  <div className="user-dropdown-country">{user.country || 'United States'}</div>
                </div>
                <div className="user-dropdown-divider" />
                <button
                  className="user-dropdown-logout-btn"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    logout();
                  }}
                >
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="auth-header-buttons">
            <button
              className="header-signin-btn"
              onClick={() => openAuthModal('signin')}
            >
              <LogIn size={15} />
              <span>Sign In</span>
            </button>
            <button
              className="header-create-btn"
              onClick={() => openAuthModal('signup')}
            >
              Create Account
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
