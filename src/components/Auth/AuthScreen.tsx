import React, { useState } from 'react';
import './AuthScreen.css';

interface AuthScreenProps {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
  onSignInWithGoogle: () => Promise<void>;
  error: string | null;
  loading: boolean;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onSignIn,
  onSignUp,
  onSignInWithGoogle,
  error,
  loading,
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

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
      // Error is handled by the hook
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLocalError(null);
      await onSignInWithGoogle();
    } catch (err) {
      // Error is handled by the hook
    }
  };

  const displayError = error || localError;

  return (
    <div className="auth-screen">
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
            <input
              id="password"
              type="password"
              className="auth-screen__input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSignUp ? 'At least 6 characters' : 'Your password'}
              disabled={loading}
            />
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