import React, { useState, useEffect } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../config/firebase';

declare global {
  interface ImportMeta {
    env: Record<string, string | undefined>;
  }
}

const isElectron = (): boolean =>
  typeof window !== 'undefined' &&
  (window.location.protocol === 'file:' ||
    window.location.protocol === 'app:' ||
    navigator.userAgent.toLowerCase().includes('electron'));

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
  pendingVerification: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  clearError: () => void;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser]                           = useState<User | null>(null);
  const [loading, setLoading]                     = useState(true);
  const [error, setError]                         = useState<string | null>(null);
  const [pendingVerification, setPendingVerification] = useState(false);
  // Hold a reference to the unverified user so we can resend the email
  const unverifiedUserRef = React.useRef<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // Only admit fully verified (or Google/non-email) users into the app
      if (firebaseUser && !firebaseUser.emailVerified &&
          firebaseUser.providerData[0]?.providerId === 'password') {
        // Email/password user who hasn't verified yet — keep them out
        unverifiedUserRef.current = firebaseUser;
        setUser(null);
      } else {
        setUser(firebaseUser);
        if (firebaseUser) {
          // Verified — clear any pending state
          setPendingVerification(false);
          unverifiedUserRef.current = null;
        }
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      const result = await signInWithEmailAndPassword(auth, email, password);
      if (!result.user.emailVerified) {
        // Send a fresh verification email and block access
        await sendEmailVerification(result.user);
        unverifiedUserRef.current = result.user;
        await firebaseSignOut(auth);
        setPendingVerification(true);
        setError('Please verify your email before signing in. A new verification link has been sent.');
      }
    } catch (err: any) {
      const msg = getErrorMessage(err.code);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      // Send verification email immediately after account creation
      await sendEmailVerification(result.user);
      unverifiedUserRef.current = result.user;
      // Sign them out so they can't access the app until verified
      await firebaseSignOut(auth);
      setPendingVerification(true);
    } catch (err: any) {
      const msg = getErrorMessage(err.code);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setError(null);
      setLoading(true);
      if (isElectron()) {
        await signInWithGoogleElectron();
      } else {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      }
    } catch (err: any) {
      const msg = getErrorMessage(err.code);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      await firebaseSignOut(auth);
    } catch (err: any) {
      const msg = getErrorMessage(err.code);
      setError(msg);
      throw new Error(msg);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setError(null);
      setLoading(true);
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      const msg = getErrorMessage(err.code);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    try {
      setError(null);
      if (unverifiedUserRef.current) {
        await sendEmailVerification(unverifiedUserRef.current);
      } else {
        setError('No pending verification. Please sign up again.');
      }
    } catch (err: any) {
      const msg = getErrorMessage(err.code);
      setError(msg);
      throw new Error(msg);
    }
  };

  const clearError = () => setError(null);

  return { user, loading, error, pendingVerification, signIn, signUp, signInWithGoogle, signOut, resetPassword, resendVerification, clearError };
}

// ---------------------------------------------------------------------------
// Electron Google Sign-In (PKCE loopback flow) - unchanged
// ---------------------------------------------------------------------------
async function signInWithGoogleElectron(): Promise<void> {
  const CLIENT_ID     = import.meta.env['VITE_GOOGLE_CLIENT_ID'];
  const CLIENT_SECRET = import.meta.env['VITE_GOOGLE_CLIENT_SECRET'];

  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw Object.assign(
      new Error(
        'Google Sign-In is not configured.\n' +
        'Add VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_CLIENT_SECRET to your .env file.'
      ),
      { code: 'auth/google-not-configured' }
    );
  }

  const redirectUri = 'http://127.0.0.1';

  const codeVerifier  = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id',             CLIENT_ID);
  authUrl.searchParams.set('redirect_uri',          redirectUri);
  authUrl.searchParams.set('response_type',         'code');
  authUrl.searchParams.set('scope',                 'openid email profile');
  authUrl.searchParams.set('code_challenge',        codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('access_type',           'offline');
  authUrl.searchParams.set('prompt',                'select_account');

  const code = await new Promise<string>((resolve, reject) => {
    const channel = new BroadcastChannel('google-oauth');

    const timeout = setTimeout(() => {
      channel.close();
      reject(Object.assign(new Error('Sign in timed out'), { code: 'auth/timeout' }));
    }, 120_000);

    channel.onmessage = (event: MessageEvent) => {
      clearTimeout(timeout);
      channel.close();
      if (event.data?.code) {
        resolve(event.data.code as string);
      } else {
        reject(Object.assign(
          new Error(event.data?.error || 'Sign in failed'),
          { code: 'auth/popup-closed-by-user' }
        ));
      }
    };

    window.open(authUrl.toString(), '_blank');
  });

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri:  redirectUri,
      grant_type:    'authorization_code',
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.json().catch(() => ({}));
    throw Object.assign(
      new Error(errBody.error_description || `Token exchange failed (${tokenRes.status})`),
      { code: 'auth/internal-error' }
    );
  }

  const tokens = await tokenRes.json();

  if (!tokens.id_token) {
    throw Object.assign(
      new Error('No id_token returned — ensure "openid" scope is present'),
      { code: 'auth/internal-error' }
    );
  }

  const credential = GoogleAuthProvider.credential(tokens.id_token as string);
  await signInWithCredential(auth, credential);
}

// ---------------------------------------------------------------------------
// PKCE helpers
// ---------------------------------------------------------------------------
function generateCodeVerifier(): string {
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data   = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(new Uint8Array(digest));
}

function base64URLEncode(array: Uint8Array): string {
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g,  '');
}

// ---------------------------------------------------------------------------
// Firebase error messages
// ---------------------------------------------------------------------------
function getErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-email':          return 'Invalid email address';
    case 'auth/user-disabled':          return 'This account has been disabled';
    case 'auth/user-not-found':         return 'No account found with this email';
    case 'auth/wrong-password':         return 'Incorrect password';
    case 'auth/email-already-in-use':   return 'Email already in use';
    case 'auth/weak-password':          return 'Password should be at least 6 characters';
    case 'auth/network-request-failed': return 'Network error. Please check your connection';
    case 'auth/too-many-requests':      return 'Too many attempts. Please try again later';
    case 'auth/popup-closed-by-user':   return 'Sign in cancelled';
    case 'auth/google-not-configured':  return 'Google Sign-In is not configured. See .env setup.';
    case 'auth/timeout':                return 'Sign in timed out. Please try again.';
    default:                            return 'Authentication failed. Please try again';
  }
}