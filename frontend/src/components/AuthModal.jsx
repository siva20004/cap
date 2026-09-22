import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { CheckCircle2, AlertCircle, Eye, EyeOff, X, ArrowUpRight } from 'lucide-react';

export const AuthModal = () => {
  const { isAuthModalOpen, closeAuthModal, authModalMode, setAuthModalMode, login, register } = useAuth();
  const { theme } = useTheme();

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [country, setCountry] = useState('United States');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status states
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens or mode changes
  useEffect(() => {
    if (isAuthModalOpen) {
      setError(null);
      // Keep success message if we just switched after registration
    }
  }, [isAuthModalOpen, authModalMode]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // Validation
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address (e.g. user@gmail.com).');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (authModalMode === 'signup') {
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
      if (authModalMode === 'signup') {
        // 1. Create account
        await register({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim().toLowerCase(),
          password,
          country,
        });

        // Prompt user to log in with mail & password as requested
        setSuccessMsg('Account created successfully! Please sign in with your email and password.');
        setPassword('');
        setAuthModalMode('signin');
      } else {
        // 2. Sign In
        await login(email.trim().toLowerCase(), password);
        closeAuthModal();
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSignUp = authModalMode === 'signup';

  return (
    <div className="apple-modal-overlay" onClick={closeAuthModal}>
      <div
        className={`apple-modal-card ${theme === 'light' ? 'light-mode' : 'dark-mode'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close X Button top right */}
        <button className="apple-close-btn" onClick={closeAuthModal} aria-label="Close modal">
          <X size={18} />
        </button>

        {/* Brand Emblem */}
        <div className="apple-brand-icon-wrapper">
          <div className="brand-badge auth-center-badge">AGY</div>
        </div>


        {/* Title */}
        <h2 className="apple-modal-title">
          {isSignUp ? 'Create Your Account' : 'Sign in with your Email'}
        </h2>

        {/* Subtitle & Switch Mode Link */}
        <p className="apple-modal-subtitle">
          {isSignUp ? (
            <>
              One Account is all you need to access all AI services.
              <br />
              Already have an account?{' '}
              <button
                type="button"
                className="apple-link-btn"
                onClick={() => {
                  setError(null);
                  setAuthModalMode('signin');
                }}
              >
                Sign In <ArrowUpRight size={13} style={{ display: 'inline' }} />
              </button>
            </>
          ) : (
            <>
              Manage pipelines, automated root-cause diagnoses, and backfill.
              <br />
              Don't have an account?{' '}
              <button
                type="button"
                className="apple-link-btn"
                onClick={() => {
                  setError(null);
                  setAuthModalMode('signup');
                }}
              >
                Create yours now <ArrowUpRight size={13} style={{ display: 'inline' }} />
              </button>
            </>
          )}
        </p>

        {/* Alert Notifications */}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="apple-form">
          {isSignUp && (
            <>
              {/* First Name / Last Name Grid */}
              <div className="apple-input-row">
                <div className="apple-field-container">
                  <input
                    type="text"
                    id="firstName"
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
                    id="lastName"
                    className="apple-input"
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete="family-name"
                    required
                  />
                </div>
              </div>

              {/* Country / Region Selector */}
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

          {/* Email Address */}
          <div className="apple-field-container">
            <input
              type="email"
              id="email"
              className="apple-input"
              placeholder={isSignUp ? "name@example.com / Gmail" : "Email or Gmail"}
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
              id="password"
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

          {/* Form Actions (Cancel & Continue) */}
          <div className="apple-actions-row">
            <button
              type="button"
              className="apple-btn apple-btn-cancel"
              onClick={closeAuthModal}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="apple-btn apple-btn-continue"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="apple-spinner"></span>
              ) : (
                'Continue'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
