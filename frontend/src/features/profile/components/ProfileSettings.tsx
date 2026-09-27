import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../../auth/AuthProvider.js';
import { FiUser } from 'react-icons/fi';
import { useUpdateProfile } from '../hooks/useProfile.js';
import { uploadImages } from '../../owner/api/uploadApi.js';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phoneNumber: z.string().optional(),
  bio: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export const ProfileSettings: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const updateProfileMutation = useUpdateProfile();
  
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(user?.avatar);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      phoneNumber: user?.phoneNumber || '',
      bio: user?.bio || '',
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        name: user.name,
        phoneNumber: user.phoneNumber || '',
        bio: user.bio || '',
      });
      setAvatarUrl(user.avatar);
    }
  }, [user, reset]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const file = files[0];
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image exceeds 5MB limit.');
      return;
    }
    
    setUploadError('');
    setIsUploading(true);
    setSuccessMsg('');
    
    try {
      const urls = await uploadImages([file]);
      setAvatarUrl(urls[0]);
    } catch (err: any) {
      setUploadError(err.response?.data?.error?.message || 'Failed to upload image.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    setSuccessMsg('');
    try {
      await updateProfileMutation.mutateAsync({
        ...data,
        avatar: avatarUrl,
      });
      setSuccessMsg('Profile updated successfully.');
      await refreshUser(); // Update AuthProvider context
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to update profile.';
      setError('root', { message: msg });
    }
  };

  return (
    <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>Profile Settings</h2>
      
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '2rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <div style={{ textAlign: 'center' }}>
          <div 
            style={{ 
              width: '120px', 
              height: '120px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--surface-hover)',
              backgroundImage: avatarUrl ? `url(${avatarUrl})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              border: '2px solid var(--border)'
            }}
          >
            {!avatarUrl && <FiUser style={{ fontSize: '2.5rem' }} aria-hidden="true" />}
          </div>
          <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
            {isUploading ? 'Uploading...' : 'Change Avatar'}
            <input 
              type="file" 
              ref={fileInputRef}
              accept="image/jpeg,image/jpg,image/png,image/webp" 
              style={{ display: 'none' }} 
              onChange={handleFileChange}
              disabled={isUploading || isSubmitting}
            />
          </label>
          {uploadError && <p className="error-text" style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>{uploadError}</p>}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ flex: 1, minWidth: '300px' }} noValidate>
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
            <label className="form-label" htmlFor="profile-name">Name *</label>
            <input
              id="profile-name"
              className="form-input"
              aria-invalid={!!errors.name}
              {...register('name')}
            />
            {errors.name && <span className="error-text">{errors.name.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="profile-phone">Phone Number</label>
            <input
              id="profile-phone"
              className="form-input"
              aria-invalid={!!errors.phoneNumber}
              {...register('phoneNumber')}
            />
            {errors.phoneNumber && <span className="error-text">{errors.phoneNumber.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="profile-bio">Bio</label>
            <textarea
              id="profile-bio"
              className="form-input"
              rows={3}
              aria-invalid={!!errors.bio}
              {...register('bio')}
            />
            {errors.bio && <span className="error-text">{errors.bio.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="text" value={user?.email || ''} disabled style={{ backgroundColor: 'var(--surface-hover)', cursor: 'not-allowed' }} />
            <span className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>Email cannot be changed here.</span>
          </div>
          
          <div className="form-group">
            <label className="form-label">Role</label>
            <input className="form-input" type="text" value={user?.role === 'owner' ? 'Owner' : 'Seeker'} disabled style={{ backgroundColor: 'var(--surface-hover)', cursor: 'not-allowed' }} />
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting || isUploading}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
