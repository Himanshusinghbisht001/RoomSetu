import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useChangePassword } from '../hooks/useProfile.js';
import { useAuth } from '../../../auth/AuthProvider.js';
import { useNavigate } from 'react-router-dom';

const securitySchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SecurityFormData = z.infer<typeof securitySchema>;

export const SecuritySettings: React.FC = () => {
  const changePasswordMutation = useChangePassword();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [successMsg, setSuccessMsg] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<SecurityFormData>({
    resolver: zodResolver(securitySchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: SecurityFormData) => {
    setSuccessMsg('');
    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setSuccessMsg('Password changed successfully. Please log in again.');
      reset();
      
      // Since the backend revokes all sessions, we should log the user out on the frontend after a brief delay
      setTimeout(async () => {
        await logout();
        navigate('/login');
      }, 2500);

    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to change password.';
      setError('root', { message: msg });
    }
  };

  return (
    <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>Security Settings</h2>
      
      <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ maxWidth: '400px' }}>
        {errors.root && (
          <div className="error-card" role="alert" style={{ marginBottom: '1rem' }}>
            {errors.root.message}
          </div>
        )}
        {successMsg && (
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--success-light, rgba(34,197,94,0.1))', color: 'var(--success)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontWeight: 600 }}>
            {successMsg}
          </div>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="current-password">Current Password *</label>
          <input
            id="current-password"
            type="password"
            className="form-input"
            aria-invalid={!!errors.currentPassword}
            {...register('currentPassword')}
          />
          {errors.currentPassword && <span className="error-text">{errors.currentPassword.message}</span>}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="new-password">New Password *</label>
          <input
            id="new-password"
            type="password"
            className="form-input"
            aria-invalid={!!errors.newPassword}
            {...register('newPassword')}
          />
          {errors.newPassword && <span className="error-text">{errors.newPassword.message}</span>}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="confirm-password">Confirm New Password *</label>
          <input
            id="confirm-password"
            type="password"
            className="form-input"
            aria-invalid={!!errors.confirmPassword}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && <span className="error-text">{errors.confirmPassword.message}</span>}
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </form>
    </div>
  );
};
