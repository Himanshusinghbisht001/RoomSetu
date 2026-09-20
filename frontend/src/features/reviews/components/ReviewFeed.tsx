import React, { useState } from 'react';
import { StarRating } from './StarRating.js';
import { ReviewForm } from './ReviewForm.js';
import { useAuth } from '../../../auth/AuthProvider.js';
import { useDeleteReview, useUpdateReview } from '../hooks/useReviews.js';
import type { Review } from '../types.js';

interface ReviewFeedProps {
  roomId: string;
  reviews: Review[];
  isLoading: boolean;
  onLoadMore: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}

export const ReviewFeed: React.FC<ReviewFeedProps> = ({
  roomId,
  reviews,
  isLoading,
  onLoadMore,
  hasNextPage,
  isFetchingNextPage,
}) => {
  const { user } = useAuth();
  
  if (isLoading && reviews.length === 0) {
    return <div className="spinner"></div>;
  }

  if (reviews.length === 0) {
    return (
      <div className="empty-reviews">
        <p>No reviews yet.</p>
        {user?.role === 'seeker' && <p>Be the first to share your experience.</p>}
      </div>
    );
  }

  return (
    <div className="review-feed">
      {reviews.map((review) => (
        <ReviewItem key={review.id} review={review} roomId={roomId} />
      ))}
      
      {hasNextPage && (
        <div className="load-more-container">
          <button
            className="btn btn-outline"
            onClick={onLoadMore}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
};

// Extracted item component to manage its own editing state safely
const ReviewItem: React.FC<{ review: Review; roomId: string }> = ({ review, roomId }) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  
  const updateMutation = useUpdateReview(roomId);
  const deleteMutation = useDeleteReview(roomId);

  const isOwner = user?.id === review.user?._id;

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this review?')) {
      deleteMutation.mutate(review.id);
    }
  };

  if (isEditing) {
    return (
      <div className="review-item">
        <ReviewForm
          initialData={{ rating: review.rating, comment: review.comment }}
          onSubmit={async (data) => {
            await updateMutation.mutateAsync({ reviewId: review.id, data });
            setIsEditing(false);
          }}
          isSubmitting={updateMutation.isPending}
          error={updateMutation.error}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="review-item">
      <div className="review-header">
        <div className="review-user-info">
          <div className="review-avatar">
            {review.user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="review-meta">
            <span className="review-author">{review.user?.name || 'Anonymous User'}</span>
            <span className="review-time">{getRelativeTime(review.createdAt)}</span>
          </div>
        </div>
        {isOwner && (
          <div className="review-actions">
            <button className="btn-link" onClick={() => setIsEditing(true)}>Edit</button>
            <button className="btn-link text-danger" onClick={handleDelete}>Delete</button>
          </div>
        )}
      </div>
      <div className="review-rating">
        <StarRating rating={review.rating} readonly />
      </div>
      <p className="review-comment">{review.comment}</p>
    </div>
  );
};
