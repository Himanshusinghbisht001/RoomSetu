import React from 'react';
import { FiHeart } from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/AuthProvider';
import { useFavoriteStatus, useToggleFavorite } from '../hooks/useFavorites';

interface FavoriteButtonProps {
  roomId: string;
  /** If true, renders a larger button suitable for detail pages */
  size?: 'sm' | 'md';
  className?: string;
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({ roomId, size = 'sm', className = '' }) => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const isSeeker = isAuthenticated && user?.role === 'seeker';

  const { data: isFavorite, isLoading } = useFavoriteStatus(roomId);
  const { addMutation, removeMutation } = useToggleFavorite(roomId);

  const isPending = addMutation.isPending || removeMutation.isPending;

  const iconSize = size === 'md' ? 22 : 18;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated || !isSeeker) {
      navigate('/login');
      return;
    }

    if (isPending || isLoading) return;

    if (isFavorite) {
      removeMutation.mutate();
    } else {
      addMutation.mutate();
    }
  };

  // Don't render for owners or non-authenticated users in SM mode (card context)
  // In 'md' mode (detail page) still render so seekers know to log in
  if (isAuthenticated && !isSeeker) return null;

  const label = isFavorite ? 'Remove from favorites' : 'Save to favorites';

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      title={label}
      disabled={isPending}
      className={`favorite-btn favorite-btn--${size} ${isFavorite ? 'favorite-btn--active' : ''} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.45)',
        border: 'none',
        borderRadius: 'var(--radius-full)',
        cursor: isPending ? 'not-allowed' : 'pointer',
        padding: size === 'md' ? '0.45rem 0.9rem' : '0.35rem',
        color: isFavorite ? '#ef4444' : '#fff',
        transition: 'color 0.15s ease, background 0.15s ease, transform 0.1s ease',
        opacity: isPending ? 0.7 : 1,
        gap: size === 'md' ? '0.4rem' : undefined,
        fontSize: size === 'md' ? '0.875rem' : undefined,
        fontWeight: size === 'md' ? 600 : undefined,
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
    >
      {isFavorite
        ? <FaHeart size={iconSize} aria-hidden="true" />
        : <FiHeart size={iconSize} aria-hidden="true" />
      }
      {size === 'md' && <span>{isFavorite ? 'Saved' : 'Save'}</span>}
    </button>
  );
};
