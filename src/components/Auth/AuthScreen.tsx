import React, { useState, useEffect } from 'react';
import './AuthScreen.css';

interface AuthScreenProps {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
  onSignInWithGoogle: () => Promise<void>;
  onResendVerification: () => Promise<void>;
  error: string | null;
  loading: boolean;
  pendingVerification: boolean;
}

declare global {
  interface Window {
    electronAPI?: {
      closePanel: () => void;
    };
  }
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onSignIn,
  onSignUp,
  onSignInWithGoogle,
  onResendVerification,
  error,
  loading,
  pendingVerification,
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Clear local error when auth error changes (e.g., when user retries)
  useEffect(() => {
    if (error) {
      setLocalError(null);
    }
  }, [error]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleResend = async () => {
    try {
      setResendSuccess(false);
      await onResendVerification();
      setResendCooldown(60);
      setResendSuccess(true);
    } catch {
      // error shown via hook
    }
  };

  const handleClosePanel = () => {
    if (window.electronAPI && window.electronAPI.closePanel) {
      window.electronAPI.closePanel();
    }
  };

  const validateForm = (): boolean => {
    setLocalError(null);

    if (!email.trim()) {
      setLocalError('Email is required');
      return false;
    }

    if (!email.includes('@')) {
      setLocalError('Please enter a valid email');
      return false;
    }

    if (!password) {
      setLocalError('Password is required');
      return false;
    }

    if (isSignUp && password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      if (isSignUp) {
        await onSignUp(email, password);
      } else {
        await onSignIn(email, password);
      }
    } catch (err) {
      // Error is handled by the hook and displayed via error prop
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLocalError(null);
      await onSignInWithGoogle();
    } catch (err) {
      // Error is handled by the hook and displayed via error prop
      // Loading state is already set to false in useAuth's finally block
    }
  };

  const displayError = error || localError;

  // ── Verification pending screen ──────────────────────────────────────────
  if (pendingVerification) {
    return (
      <div className="auth-screen">
        <button
          className="auth-screen__close-button"
          onClick={handleClosePanel}
          title="Close panel"
          aria-label="Close panel"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        <div className="auth-screen__container">
          <div className="auth-screen__verify-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="24" fill="var(--color-accent-light)"/>
              <path d="M12 16h24v20H12V16z" stroke="var(--color-accent)" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M12 16l12 13 12-13" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <div className="auth-screen__header">
            <h1 className="auth-screen__logo">Check your email</h1>
            <p className="auth-screen__tagline">
              We've sent a verification link to your email address. Click the link to activate your account.
            </p>
          </div>

          {resendSuccess && (
            <div className="auth-screen__verify-success">
              Verification email resent successfully!
            </div>
          )}

          {error && (
            <div className="auth-screen__error" style={{ marginBottom: 'var(--space-md)' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 5.33334V8.00001M8 10.6667H8.00667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {error}
            </div>
          )}

          <div className="auth-screen__form">
            <button
              type="button"
              className="auth-screen__button auth-screen__button--primary"
              onClick={handleResend}
              disabled={loading || resendCooldown > 0}
            >
              {resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : 'Resend verification email'}
            </button>

            <div className="auth-screen__verify-note">
              Once verified, come back and{' '}
              <button
                type="button"
                className="auth-screen__toggle-button"
                onClick={() => window.location.reload()}
              >
                sign in
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  // ────────────────────────────────────────────────────────────────────────

  return (
    <div className="auth-screen">
      <button 
        className="auth-screen__close-button" 
        onClick={handleClosePanel}
        title="Close panel"
        aria-label="Close panel"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
      
      <div className="auth-screen__container">
        <div className="auth-screen__header">
          <h1 className="auth-screen__logo">WorkBook</h1>
          <p className="auth-screen__tagline">
            Your tasks, synced across all devices
          </p>
        </div>

        <form className="auth-screen__form" onSubmit={handleSubmit}>
          <div className="auth-screen__field">
            <label htmlFor="email" className="auth-screen__label">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="auth-screen__input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="auth-screen__field">
            <label htmlFor="password" className="auth-screen__label">
              Password
            </label>
            <div className="auth-screen__input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="auth-screen__input auth-screen__input--with-icon"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignUp ? 'At least 6 characters' : 'Your password'}
                disabled={loading}
              />
              <button
                type="button"
                className="auth-screen__password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {displayError && (
            <div className="auth-screen__error">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8 5.33334V8.00001M8 10.6667H8.00667"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {displayError}
            </div>
          )}

          <button
            type="submit"
            className="auth-screen__button auth-screen__button--primary"
            disabled={loading}
          >
            {loading && (
              <svg className="auth-screen__button-spinner" width="16" height="16" viewBox="0 0 50 50">
                <circle
                  className="auth-screen__spinner-circle"
                  cx="25"
                  cy="25"
                  r="20"
                  fill="none"
                  strokeWidth="5"
                />
              </svg>
            )}
            {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>

          <div className="auth-screen__divider">
            <span>or</span>
          </div>

          <button
            type="button"
            className="auth-screen__button auth-screen__button--google"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
                fill="#4285F4"
              />
              <path
                d="M9.003 18c2.43 0 4.467-.806 5.956-2.18L12.05 13.56c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18z"
                fill="#34A853"
              />
              <path
                d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.96H.957C.347 6.175 0 7.55 0 9.002c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                fill="#FBBC05"
              />
              <path
                d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.428 0 9.002 0 5.485 0 2.44 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>

          <div className="auth-screen__toggle">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              className="auth-screen__toggle-button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setLocalError(null);
              }}
              disabled={loading}
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};