import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import { env } from '../env.js';
import { tokenStore } from '../../auth/tokenStore.js';
import { refreshClient } from './refreshClient.js';

// ── Singleton shared refresh promise ─────────────────────────────────────────
// Ensures multiple simultaneous 401 errors trigger exactly ONE refresh request.
let refreshPromise: Promise<string> | null = null;

interface ExtendedAxiosConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

/**
 * Primary Axios instance used by all application API calls.
 *
 * - withCredentials: true  → browser sends HttpOnly refresh cookie automatically
 * - Authorization header   → injected from in-memory tokenStore
 * - Response interceptor   → single-flight token refresh on 401
 */
export const apiClient = axios.create({
  baseURL: env.VITE_API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor ───────────────────────────────────────────────────────
// Attach the in-memory access token to every outgoing request if present.
apiClient.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// ── Response interceptor ──────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const config = error.config as ExtendedAxiosConfig | undefined;

    // Only attempt refresh on 401 responses that haven't already been retried
    if (error.response?.status !== 401 || !config || config._retried) {
      return Promise.reject(error);
    }

    // Mark this request so it is not retried again after a second 401
    config._retried = true;

    try {
      // ── Single-flight refresh ─────────────────────────────────────────────
      // All concurrent 401s share the same promise instead of firing multiple
      // refresh requests.
      if (!refreshPromise) {
        refreshPromise = refreshClient
          .post<{ success: boolean; data: { accessToken: string } }>(
            '/auth/refresh',
          )
          .then((res) => {
            const newToken = res.data.data.accessToken;
            tokenStore.set(newToken);
            return newToken;
          })
          .finally(() => {
            // Release the shared promise so the next genuine session expiry
            // can trigger a fresh refresh cycle.
            refreshPromise = null;
          });
      }

      const newToken = await refreshPromise;

      // Retry the original request with the new token
      config.headers.set('Authorization', `Bearer ${newToken}`);
      return apiClient(config);
    } catch {
      // Refresh failed — clear the access token.
      // AuthProvider will detect the unauthenticated state and redirect.
      tokenStore.clear();
      return Promise.reject(error);
    }
  },
);
