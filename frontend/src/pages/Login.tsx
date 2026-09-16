/**
 * Login page – Phase 14 improvement
 * Uses React Hook Form + Zod + design system.
 * Security: No passwords or tokens are logged.
 */

import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../auth/AuthProvider.js';
import logoSrc from '../assets/logo.png';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof loginSchema>;

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState('');

  const searchParams = new URLSearchParams(location.search);
  const returnTo = searchParams.get('returnTo');
  
  const from = returnTo || (location.state as any)?.from?.pathname || '/';
  const justRegistered = (location.state as any)?.registered === true;

  // Redirect if already logged in, unless returning from 403
  useEffect(() => {
    if (isAuthenticated && !returnTo) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, from, navigate, returnTo]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: FormData) => {
    setServerError('');
    try {
      await login({ email: data.email, password: data.password });
      navigate(from, { replace: true });
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        'Invalid email or password. Please try again.';
      setServerError(msg);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <img src={logoSrc} alt="RoomSetu" />
        </div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to your RoomSetu account</p>

        {justRegistered && (
          <div className="success-card" role="status" aria-live="polite">
            Account created! Please sign in.
          </div>
        )}

        {serverError && (
          <div className="error-card" role="alert" aria-live="assertive">
            {serverError}
          </div>
        )}

        <form
          className="auth-form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          aria-label="Login form"
        >
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">
              Email Address
            </label>
            <input
              id="login-email"
              className="form-input"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              aria-describedby={errors.email ? 'login-email-err' : undefined}
              aria-invalid={!!errors.email}
              {...register('email')}
            />
            {errors.email && (
              <span id="login-email-err" className="error-text" role="alert">
                {errors.email.message}
              </span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              className="form-input"
              type="password"
              placeholder="Your password"
              autoComplete="current-password"
              aria-describedby={errors.password ? 'login-password-err' : undefined}
              aria-invalid={!!errors.password}
              {...register('password')}
            />
            {errors.password && (
              <span id="login-password-err" className="error-text" role="alert">
                {errors.password.message}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account?{' '}
          <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}
