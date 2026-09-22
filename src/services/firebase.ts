import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
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
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token akses dari Google.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    // 1. Popup closed by user or cancelled is an intentional user cancellation, not a system error
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request' ||
      error?.message?.includes('popup-closed-by-user') ||
      error?.message?.includes('cancelled-popup-request')
    ) {
      console.warn('Login Google dibatalkan atau jendela popup ditutup oleh pengguna.');
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
