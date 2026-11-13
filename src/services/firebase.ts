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

export const GOOGLE_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.rosters.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.students.readonly',
  'https://www.googleapis.com/auth/classroom.student-submissions.students.readonly',
  'https://www.googleapis.com/auth/classroom.topics.readonly',
  'https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly',
  'https://www.googleapis.com/auth/classroom.announcements.readonly',
  'https://www.googleapis.com/auth/classroom.profile.emails',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

const provider = new GoogleAuthProvider();
GOOGLE_OAUTH_SCOPES.forEach((scope) => provider.addScope(scope));

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
      if (elapsedMs > 1200) {
        throw new Error(
          'Jendela login Google tertutup sebelum sesi diterima aplikasi (kemungkinan komunikasi popup terputus atau konfigurasi Firebase OAuth belum sinkron). Silakan coba tombol "Login Alternatif (Google OAuth Langsung)" di bawah.'
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

function loadGsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const win = window as any;
    if (win.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Gagal memuat Google Identity Services.')), { once: true });
      // Fallback poll in case already loaded before listener attached
      const checkTimer = setInterval(() => {
        if (win.google?.accounts?.oauth2) {
          clearInterval(checkTimer);
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(checkTimer);
        if (win.google?.accounts?.oauth2) resolve();
      }, 4000);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Gagal memuat Google Identity Services.'));
    document.head.appendChild(script);
  });
}

/**
 * Direct OAuth2 sign-in via Google Identity Services (does not depend on Firebase /__/auth/handler or Client Secret).
 * Uses only Authorized JavaScript Origins and Client ID.
 */
export const googleDirectSignIn = async (): Promise<{ user: User; accessToken: string }> => {
  const clientId =
    import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID ||
    (defaultConfig as any).oAuthClientId;

  if (!clientId) {
    throw new Error('Google OAuth Client ID tidak ditemukan di konfigurasi aplikasi.');
  }

  const win = window as any;
  if (!win.google?.accounts?.oauth2) {
    await loadGsiScript();
  }

  if (!win.google?.accounts?.oauth2) {
    throw new Error('Layanan Google Identity Services belum siap. Silakan muat ulang halaman lalu coba kembali.');
  }

  return new Promise((resolve, reject) => {
    try {
      const tokenClient = win.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: GOOGLE_OAUTH_SCOPES.join(' '),
        callback: async (tokenResponse: any) => {
          if (tokenResponse?.error) {
            if (tokenResponse.error === 'access_denied') {
              reject(
                new Error(
                  'Akses Google diblokir (Error 403: access_denied). Pastikan akun sudah ditambahkan ke Test Users di Google Cloud Console.'
                )
              );
              return;
            }
            reject(new Error(`Login Google OAuth gagal (${tokenResponse.error}): ${tokenResponse.error_description || ''}`));
            return;
          }

          const accessToken = tokenResponse?.access_token;
          if (!accessToken) {
            reject(new Error('Token akses Google tidak diterima. Silakan coba kembali.'));
            return;
          }

          try {
            const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            const profile = profileRes.ok ? await profileRes.json() : {};

            cachedAccessToken = accessToken;
            const userObj = {
              uid: profile.sub || `gis_${Date.now()}`,
              email: profile.email || '',
              displayName: profile.name || profile.email || 'Pengguna Google',
              photoURL: profile.picture || null,
            } as unknown as User;

            resolve({ user: userObj, accessToken });
          } catch (profileErr) {
            console.warn('Gagal mengambil profil userinfo, tetap lanjut dengan token:', profileErr);
            cachedAccessToken = accessToken;
            const fallbackUser = {
              uid: `gis_${Date.now()}`,
              email: '',
              displayName: 'Pengguna Google',
              photoURL: null,
            } as unknown as User;
            resolve({ user: fallbackUser, accessToken });
          }
        },
        error_callback: (err: any) => {
          if (err?.type === 'popup_closed') {
            reject(new Error('Jendela login Google ditutup sebelum selesai.'));
          } else if (err?.type === 'popup_failed_to_open') {
            reject(new Error('Popup login diblokir oleh browser. Harap izinkan pop-up atau buka aplikasi di tab baru.'));
          } else {
            reject(new Error(err?.message || 'Gagal membuka jendela OAuth Google.'));
          }
        },
      });

      tokenClient.requestAccessToken({ prompt: 'select_account' });
    } catch (err: any) {
      reject(new Error(err?.message || 'Gagal menginisialisasi Google OAuth Langsung.'));
    }
  });
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch {
    // ignore if signed in via GIS direct flow
  }
  cachedAccessToken = null;
};
