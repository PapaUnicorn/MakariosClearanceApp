import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import defaultConfig from '../../firebase-applet-config.json';

const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || defaultConfig.projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || defaultConfig.appId,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || defaultConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || defaultConfig.authDomain,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || defaultConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultConfig.messagingSenderId,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Google Classroom Scopes
provider.addScope('https://www.googleapis.com/auth/classroom.courses.readonly');
provider.addScope('https://www.googleapis.com/auth/classroom.rosters.readonly');
provider.addScope('https://www.googleapis.com/auth/classroom.coursework.students.readonly');
provider.addScope('https://www.googleapis.com/auth/classroom.student-submissions.students.readonly');
provider.addScope('https://www.googleapis.com/auth/classroom.topics.readonly');
provider.addScope('https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly');
provider.addScope('https://www.googleapis.com/auth/classroom.announcements.readonly');
provider.addScope('https://www.googleapis.com/auth/classroom.profile.emails');
provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
provider.addScope('https://www.googleapis.com/auth/userinfo.email');
// Google Sheets Database & Drive Scopes
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

// Force prompt for accounts / consent if needed
provider.setCustomParameters({
  prompt: 'select_account',
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  // Check if returning from a redirect login flow
  getRedirectResult(auth)
    .then((result) => {
      if (result) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          cachedAccessToken = credential.accessToken;
          if (onAuthSuccess) onAuthSuccess(result.user, cachedAccessToken);
        }
      }
    })
    .catch((err) => {
      console.warn('Redirect sign-in check error:', err);
    });

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  const popupStartTime = Date.now();
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token akses dari Google. Pastikan izin akses Google Classroom telah disetujui.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    // 1. Popup closed by user or cancelled
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request' ||
      error?.message?.includes('popup-closed-by-user') ||
      error?.message?.includes('cancelled-popup-request')
    ) {
      const elapsedMs = Date.now() - popupStartTime;
      console.warn(`Login Google popup ditutup (${elapsedMs}ms):`, error?.code);
      if (elapsedMs > 3000) {
        throw new Error(
          'Jendela login Google tertutup sebelum sesi berhasil diterima aplikasi. Silakan coba login kembali atau buka aplikasi di tab baru.'
        );
      }
      return null;
    }

    // 2. Popup blocked by browser settings or iframe security
    if (
      error?.code === 'auth/popup-blocked' ||
      error?.message?.includes('popup-blocked')
    ) {
      console.warn('Popup login Google diblokir oleh browser.');
      const blockedError = new Error(
        'Jendela popup login diblokir oleh browser. Harap izinkan pop-up di browser Anda atau buka aplikasi di tab baru.'
      );
      (blockedError as any).code = 'auth/popup-blocked';
      throw blockedError;
    }

    // 3. Unauthorized domain helper
    if (error?.code === 'auth/unauthorized-domain' || error?.message?.includes('unauthorized-domain')) {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
      const enhancedError = new Error(
        `Firebase: Error (auth/unauthorized-domain). Domain "${currentHost}" belum didaftarkan di Authorized Domains Firebase Authentication.`
      );
      (enhancedError as any).code = 'auth/unauthorized-domain';
      (enhancedError as any).domain = currentHost;
      throw enhancedError;
    }

    // 4. Access Denied / Error 403 / Test users helper
    if (
      error?.code === 'auth/access-denied' ||
      error?.code === 'access_denied' ||
      error?.message?.includes('access_denied') ||
      error?.message?.includes('access-denied') ||
      error?.message?.includes('403')
    ) {
      console.warn('Akses ditolak oleh Google OAuth (Error 403: access_denied / Test users).');
      const deniedError = new Error(
        'Akses Google diblokir (Error 403: access_denied). Akun Google belum terdaftar di Test Users atau aplikasi belum dipublikasikan di Google Cloud Console.'
      );
      (deniedError as any).code = 'auth/access-denied';
      throw deniedError;
    }

    // 5. OAuth Client ID / Secret mismatch or invalid redirect URI
    if (
      error?.code === 'auth/invalid-credential' ||
      error?.code === 'auth/internal-error' ||
      error?.message?.includes('invalid_client') ||
      error?.message?.includes('Error getting access token') ||
      error?.message?.includes('redirect_uri_mismatch') ||
      error?.message?.includes('INVALID_IDP_RESPONSE')
    ) {
      console.error('OAuth Client configuration mismatch:', error);
      const oauthConfigError = new Error(
        `Konfigurasi Google OAuth Client ID / Secret di Firebase Authentication tidak cocok (${error?.code || 'oauth_config_error'}): ${error?.message || 'Gagal menukar token Google.'}`
      );
      (oauthConfigError as any).code = error?.code || 'auth/invalid-credential';
      throw oauthConfigError;
    }

    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};
