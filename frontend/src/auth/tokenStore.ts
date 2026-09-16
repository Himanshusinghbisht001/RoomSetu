/**
 * In-memory access token store.
 *
 * Security invariants:
 * - Token is stored ONLY in a module-level variable (JS heap).
 * - Never written to localStorage, sessionStorage, or any cookie.
 * - Never logged to the console.
 * - Cleared on logout and on failed refresh.
 */

let _token: string | null = null;

export const tokenStore = {
  get: (): string | null => _token,
  set: (token: string): void => {
    _token = token;
  },
  clear: (): void => {
    _token = null;
  },
};
