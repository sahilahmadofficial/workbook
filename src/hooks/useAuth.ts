import { useState, useEffect } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
} from 'firebase/auth';
import { auth } from '../config/firebase';

// Vite exposes .env variables on import.meta.env.
// Declare the shape here so TypeScript doesn't complain.
declare global {
  interface ImportMeta {
    env: Record<string, string | undefined>;
  }
}

// Detect packaged Electron: renderer runs under app:// or file://.
// In dev mode it runs on http://localhost, so the normal popup still works.
const isElectron = (): boolean =>
  typeof window !== 'undefined' &&
  (window.location.protocol === 'file:' ||
    window.location.protocol === 'app:' ||
    navigator.userAgent.toLowerCase().includes('electron'));

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
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
      await createUserWithEmailAndPassword(auth, email, password);
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
        // Dev / web: standard Firebase popup works on http://localhost
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

  const clearError = () => setError(null);

  return { user, loading, error, signIn, signUp, signInWithGoogle, signOut, clearError };
}

// ---------------------------------------------------------------------------
// Electron Google Sign-In  (PKCE loopback flow — RFC 8252)
// ---------------------------------------------------------------------------
//
// WHY TWO CLIENT IDs:
//   Firebase validates id_tokens by checking their "aud" (audience) claim
//   matches the Web OAuth client ID registered in the Firebase project.
//   A token minted for a Desktop client ID will always 400.
//
//   We therefore use the Web client ID for the OAuth request (so the token's
//   aud matches what Firebase expects), but we still need the desktop client's
//   secret for the code→token exchange because the Web client type doesn't
//   allow loopback redirect URIs.
//
//   Solution: use the Web client ID in the auth URL, but exchange the code
//   with a separate Desktop client (which Google allows to use loopback).
//   Actually the simplest correct approach: use ONE Desktop client for the
//   entire flow, then tell Firebase to also trust that client ID by adding it
//   as an additional OAuth client in the Firebase console.
//
//   EASIEST SETUP (no second client needed):
//   → In Google Cloud Console, edit your existing Desktop OAuth client and
//     also add the Web client ID as an additional "trusted audience" is not
//     possible. Instead, do this:
//
//   CORRECT SETUP:
//   1. Google Cloud Console → Credentials → your WEB OAuth 2.0 client
//      • Add http://127.0.0.1 to "Authorised redirect URIs"
//      (Web clients CAN use loopback — Google allows it for installed apps)
//   2. Use that same Web client ID + secret for everything
//   3. .env:
//        VITE_GOOGLE_CLIENT_ID=<web-client-id>.apps.googleusercontent.com
//        VITE_GOOGLE_CLIENT_SECRET=<web-client-secret>
//   4. Firebase Console → Authentication → Sign-in method → Google:
//      already uses this same web client, so tokens will be accepted.
// ---------------------------------------------------------------------------
async function signInWithGoogleElectron(): Promise<void> {
  const CLIENT_ID     = import.meta.env['VITE_GOOGLE_CLIENT_ID'];
  const CLIENT_SECRET = import.meta.env['VITE_GOOGLE_CLIENT_SECRET'];

  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw Object.assign(
      new Error(
        'Google Sign-In is not configured.\n' +
        'Add VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_CLIENT_SECRET to your .env file.\n' +
        'Use the WEB OAuth client from Google Cloud Console (not Desktop type).\n' +
        'Add http://127.0.0.1 to its Authorised redirect URIs.'
      ),
      { code: 'auth/google-not-configured' }
    );
  }

  const port        = Math.floor(Math.random() * 10000) + 40000;
  const redirectUri = `http://127.0.0.1:${port}`;

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

  // main.js intercepts the 127.0.0.1 redirect, extracts the code, posts it
  // back here via BroadcastChannel, and closes the popup window.
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

  // Exchange code for tokens using the same client credentials
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
      new Error('No id_token in token response — ensure "openid" scope is requested'),
      { code: 'auth/internal-error' }
    );
  }

  // Sign into Firebase. The id_token's "aud" must match the Web client ID
  // that Firebase knows about — this works because we used the Web client ID
  // for the OAuth request above.
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