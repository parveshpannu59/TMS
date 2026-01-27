// Mobile-capable auth storage and helpers (Capacitor-ready fallback to localStorage)
// If later you add @capacitor/preferences, you can swap implementations here.

export type AuthTokens = {
  accessToken: string;
  refreshToken?: string;
  user?: any;
  role?: string;
};

const STORAGE_KEY = 'driver_mobile_auth_v1';

export function saveAuth(tokens: AuthTokens) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  } catch (e) {
    // No-op for environments without localStorage
  }
}

export function getAuth(): AuthTokens | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthTokens) : null;
  } catch (e) {
    return null;
  }
}

export function clearAuth() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // ignore
  }
}

export function isDriverAuthenticated() {
  const data = getAuth();
  return !!(data && data.accessToken && (data.role === 'driver' || (data.user && (data.user.role === 'driver' || data.user.userType === 'driver'))));
}
