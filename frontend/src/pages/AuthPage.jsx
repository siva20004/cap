import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { CheckCircle2, AlertCircle, Eye, EyeOff, ArrowUpRight, Sun, Moon } from 'lucide-react';

export const AuthPage = () => {
  const { login, register } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Mode: 'signin' or 'signup'
  const [mode, setMode] = useState('signin');

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [country, setCountry] = useState('United States');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignUp = mode === 'signup';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // Validation
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address (e.g. yourname@gmail.com).');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (isSignUp) {
      if (!firstName.trim()) {
        setError('Please enter your first name.');
        return;
      }
      if (!lastName.trim()) {
        setError('Please enter your last name.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (isSignUp) {
        // 1. Create account
        await register({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim().toLowerCase(),
          password,
          country,
        });

        // Prompt user to log in with email and password as requested
        setSuccessMsg('Account successfully created! Please sign in with your email and password.');
        setPassword('');
        setMode('signin');
      } else {
        // 2. Sign in & auto-redirects to main page via AuthContext
        await login(email.trim().toLowerCase(), password);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`auth-page-container ${theme === 'light' ? 'light-mode' : 'dark-mode'}`}>
      {/* Top Bar with Brand and Theme Switcher */}
      <div className="auth-page-topbar">
        <div className="auth-page-logo-group">
          <div className="brand-badge">AGY</div>
          <span className="auth-brand-text">AI Orchestrator</span>
        </div>
        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? (
            <Moon size={18} className="theme-icon moon-icon" />
          ) : (
            <Sun size={18} className="theme-icon sun-icon" />
          )}
        </button>
      </div>

      {/* Centered Auth Card */}
      <div className="auth-page-card-wrapper">
        <div className="apple-modal-card auth-page-card">
          {/* Brand Emblem (No Apple icon, clean AGY Platform badge) */}
          <div className="apple-brand-icon-wrapper">
            <div className="brand-badge auth-center-badge">AGY</div>
          </div>

          {/* Heading */}
          <h2 className="apple-modal-title">
            {isSignUp ? 'Create Your Account' : 'Sign In with Email'}
          </h2>

          {/* Subtitle with Switch Link */}
          <p className="apple-modal-subtitle">
            {isSignUp ? (
              <>
                One Account to access all AI pipeline orchestration services.
                <br />
                Already have an account?{' '}
                <button
                  type="button"
                  className="apple-link-btn"
                  onClick={() => {
                    setError(null);
                    setMode('signin');
                  }}
                >
                  Sign In <ArrowUpRight size={13} style={{ display: 'inline' }} />
                </button>
              </>
            ) : (
              <>
                Self-Diagnosing AI Orchestrator with Data Contracts & Backfill.
                <br />
                Don't have an account?{' '}
                <button
                  type="button"
                  className="apple-link-btn"
                  onClick={() => {
                    setError(null);
                    setMode('signup');
                  }}
                >
                  Create yours now <ArrowUpRight size={13} style={{ display: 'inline' }} />
                </button>
              </>
            )}
          </p>

          {/* Alert / Feedback */}
          {error && (
            <div className="apple-alert apple-alert-error">
              <AlertCircle size={16} className="alert-icon" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="apple-alert apple-alert-success">
              <CheckCircle2 size={16} className="alert-icon" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="apple-form">
            {isSignUp && (
              <>
                {/* First Name & Last Name */}
                <div className="apple-input-row">
                  <div className="apple-field-container">
                    <input
                      type="text"
                      className="apple-input"
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      autoComplete="given-name"
                      required
                    />
                  </div>
                  <div className="apple-field-container">
                    <input
                      type="text"
                      className="apple-input"
                      placeholder="Last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      autoComplete="family-name"
                      required
                    />
                  </div>
                </div>

                {/* Country / Region */}
                <div className="apple-field-container apple-select-wrapper">
                  <label className="apple-floating-label">Country/Region</label>
                  <select
                    className="apple-input apple-select"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  >
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Canada">Canada</option>
                    <option value="Germany">Germany</option>
                    <option value="France">France</option>
                    <option value="India">India</option>
                    <option value="Japan">Japan</option>
                    <option value="Australia">Australia</option>
                  </select>
                </div>
              </>
            )}

            {/* Email / Gmail */}
            <div className="apple-field-container">
              <input
                type="email"
                className="apple-input"
                placeholder={isSignUp ? "name@example.com / Gmail" : "Gmail or Email address"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            {/* Password */}
            <div className="apple-field-container apple-password-container">
              <input
                type={showPassword ? 'text' : 'password'}
                className="apple-input"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                required
              />
              <button
                type="button"
                className="apple-pw-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Actions */}
            <div className="apple-actions-row" style={{ justifyContent: 'flex-end' }}>
              <button
                type="submit"
                className="apple-btn apple-btn-continue"
                style={{ width: '100%', borderRadius: '12px' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="apple-spinner"></span>
                ) : isSignUp ? (
                  'Create Account'
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
