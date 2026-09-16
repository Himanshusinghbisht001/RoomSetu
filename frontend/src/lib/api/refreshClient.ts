import axios from 'axios';
import { env } from '../env.js';

/**
 * Dedicated Axios instance for the token refresh request ONLY.
 *
 * Security invariant:
 * - This client has NO request or response interceptors.
 * - It NEVER adds an Authorization header from tokenStore.
 * - It NEVER attempts another refresh on 401.
 * - Using this separate instance prevents infinite refresh loops.
 *
 * The refresh token is sent automatically by the browser via the
 * HttpOnly cookie (credentials: 'include' / withCredentials: true).
 */
export const refreshClient = axios.create({
  baseURL: env.VITE_API_BASE_URL,
  withCredentials: true,
});
