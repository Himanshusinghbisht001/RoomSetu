// ── Shared API response wrapper ───────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  };
}

// ── User ──────────────────────────────────────────────────────────────────────

export type Role = 'seeker' | 'owner';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

// ── Auth API shapes ───────────────────────────────────────────────────────────

export interface LoginResponse {
  user: User;
  /** Access token — store in memory only, never in localStorage */
  accessToken: string;
}

export interface RefreshResponse {
  /** New access token from POST /auth/refresh */
  accessToken: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export interface LoginPayload {
  email: string;
  password: string;
}
