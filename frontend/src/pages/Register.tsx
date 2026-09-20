/**
 * Register page – Phase 14
 * Uses React Hook Form + Zod + existing /auth/register API.
 * Security: No tokens/passwords are logged.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { register as apiRegister } from '../auth/authApi.js';
import logoSrc from '../assets/logo.jpg';

const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(60, 'Name must be under 60 characters'),
    email: z.string().email('Please enter a valid email address'),
    role: z.enum(['seeker', 'owner'], {
      error: 'Please select a role',
    }),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password too long'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof registerSchema>;

export default function Register() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'seeker' },
  });

  const onSubmit = async (data: FormData) => {
    setServerError('');
    try {
      await apiRegister({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
      });
      // Redirect to login after successful registration
      navigate('/login', {
        state: { registered: true },
        replace: true,
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        'Registration failed. Please try again.';
      setServerError(msg);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <img src={logoSrc} alt="RoomSetu" />
        </div>
        <h1 className="auth-title">Create an account</h1>
        <p className="auth-subtitle">Join RoomSetu to find or list rooms</p>

        {serverError && (
          <div className="error-card" role="alert" aria-live="assertive">
            {serverError}
          </div>
        )}

        <form
          className="auth-form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          aria-label="Registration form"
        >
          {/* Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-name">
              Full Name
            </label>
            <input
              id="reg-name"
              className="form-input"
              type="text"
              placeholder="Your full name"
              autoComplete="name"
              aria-describedby={errors.name ? 'reg-name-err' : undefined}
              aria-invalid={!!errors.name}
              {...register('name')}
            />
            {errors.name && (
              <span id="reg-name-err" className="error-text" role="alert">
                {errors.name.message}
              </span>
            )}
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">
              Email Address
            </label>
            <input
              id="reg-email"
              className="form-input"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              aria-describedby={errors.email ? 'reg-email-err' : undefined}
              aria-invalid={!!errors.email}
              {...register('email')}
            />
            {errors.email && (
              <span id="reg-email-err" className="error-text" role="alert">
                {errors.email.message}
              </span>
            )}
          </div>

          {/* Role */}
          <fieldset className="form-group" aria-describedby={errors.role ? 'reg-role-err' : undefined}>
            <legend className="form-label">I am a</legend>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.35rem' }}>
              <label className="checkbox-label">
                <input
                  type="radio"
                  value="seeker"
                  {...register('role')}
                />
                Room Seeker
              </label>
              <label className="checkbox-label">
                <input
                  type="radio"
                  value="owner"
                  {...register('role')}
                />
                Room Owner
              </label>
            </div>
            {errors.role && (
              <span id="reg-role-err" className="error-text" role="alert">
                {errors.role.message}
              </span>
            )}
          </fieldset>

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">
              Password
            </label>
            <input
              id="reg-password"
              className="form-input"
              type="password"
              placeholder="Min 8 characters"
              autoComplete="new-password"
              aria-describedby={errors.password ? 'reg-password-err' : undefined}
              aria-invalid={!!errors.password}
              {...register('password')}
            />
            {errors.password && (
              <span id="reg-password-err" className="error-text" role="alert">
                {errors.password.message}
              </span>
            )}
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-confirm">
              Confirm Password
            </label>
            <input
              id="reg-confirm"
              className="form-input"
              type="password"
              placeholder="Repeat your password"
              autoComplete="new-password"
              aria-describedby={errors.confirmPassword ? 'reg-confirm-err' : undefined}
              aria-invalid={!!errors.confirmPassword}
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <span id="reg-confirm-err" className="error-text" role="alert">
                {errors.confirmPassword.message}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
