import { apiClient } from '../lib/api/client.js';
import { refreshClient } from '../lib/api/refreshClient.js';
import { tokenStore } from './tokenStore.js';
import type {
  ApiResponse,
  LoginPayload,
  LoginResponse,
  RefreshResponse,
  RegisterPayload,
  User,
} from '../types/auth.js';

// ── Register ──────────────────────────────────────────────────────────────────

export async function register(payload: RegisterPayload): Promise<User> {
  const res = await apiClient.post<ApiResponse<User>>('/auth/register', payload);
  return res.data.data;
}

// ── Login ─────────────────────────────────────────────────────────────────────

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const res = await apiClient.post<ApiResponse<LoginResponse>>(
    '/auth/login',
    payload,
  );
  const { accessToken, user } = res.data.data;
  // Store in memory only — never in localStorage/sessionStorage
  tokenStore.set(accessToken);
  return { accessToken, user };
}

// ── Refresh ───────────────────────────────────────────────────────────────────
// Uses the dedicated refresh client (no interceptors) to avoid infinite loops.

export async function refresh(): Promise<string> {
  const res = await refreshClient.post<ApiResponse<RefreshResponse>>(
    '/auth/refresh',
  );
  const { accessToken } = res.data.data;
  tokenStore.set(accessToken);
  return accessToken;
}

// ── Get current user ──────────────────────────────────────────────────────────

export async function getCurrentUser(): Promise<User> {
  const res = await apiClient.get<ApiResponse<User>>('/users/me');
  return res.data.data;
}

// ── Logout ────────────────────────────────────────────────────────────────────

export async function logout(): Promise<void> {
  try {
    await apiClient.post('/auth/logout');
  } finally {
    // Always clear the in-memory token, even if the backend request fails
    tokenStore.clear();
  }
}
