import React, { useState } from 'react';
import { useRoomReviews, useRoomRatingSummary, useCreateReview } from '../hooks/useReviews.js';
import { ReviewFeed } from './ReviewFeed.js';
import { ReviewForm } from './ReviewForm.js';
import { useAuth } from '../../../auth/AuthProvider.js';

interface RoomReviewSectionProps {
  roomId: string;
}

export const RoomReviewSection: React.FC<RoomReviewSectionProps> = ({ roomId }) => {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  
  const { data: summary, isLoading: isSummaryLoading } = useRoomRatingSummary(roomId);
  const { data: reviewsData, isLoading: isReviewsLoading, isFetching } = useRoomReviews(roomId, page);
  const createMutation = useCreateReview(roomId);

  const [allReviews, setAllReviews] = React.useState<any[]>([]);

  // Append reviews when a new page loads
  React.useEffect(() => {
    if (reviewsData?.data) {
      if (page === 1) {
        setAllReviews(reviewsData.data);
      } else {
        setAllReviews((prev) => {
          // Prevent duplicates on re-render
          const existingIds = new Set(prev.map(r => r.id));
          const newReviews = reviewsData.data.filter(r => !existingIds.has(r.id));
          return [...prev, ...newReviews];
        });
      }
    }
  }, [reviewsData, page]);

  const hasNextPage = reviewsData ? page < reviewsData.pagination.totalPages : false;

  const handleLoadMore = () => {
    if (hasNextPage) {
      setPage((prev) => prev + 1);
    }
  };

  const hasUserAlreadyReviewed = user && allReviews.some(r => r.user?._id === user.id);

  return (
    <section className="room-review-section" aria-labelledby="reviews-heading">
      <hr className="section-divider" />
      
      <div className="review-summary-header">
        <h2 id="reviews-heading">Reviews & Comments</h2>
        {!isSummaryLoading && summary && (
          <div className="rating-summary-badge">
            <span className="rating-score">⭐ {summary.averageRating > 0 ? summary.averageRating.toFixed(1) : 'No rating'}</span>
            {summary.reviewCount > 0 && (
              <span className="review-count">· {summary.reviewCount} review{summary.reviewCount !== 1 ? 's' : ''}</span>
            )}
          </div>
        )}
      </div>

      <div className="review-content-wrapper">
        {user?.role === 'seeker' && !hasUserAlreadyReviewed && (
          <div className="review-form-container">
            <ReviewForm
              onSubmit={async (data) => {
                await createMutation.mutateAsync(data);
                // Reset page to 1 to refetch with newest comments
                setPage(1);
              }}
              isSubmitting={createMutation.isPending}
              error={createMutation.error}
            />
          </div>
        )}

        {user?.role === 'seeker' && hasUserAlreadyReviewed && (
          <div className="already-reviewed-msg">
            You have already reviewed this room. You can edit your review above.
          </div>
        )}

        {!user && (
          <div className="login-prompt">
            <p>Log in as a seeker to write a review.</p>
          </div>
        )}

        <ReviewFeed 
          roomId={roomId}
          reviews={allReviews}
          isLoading={isReviewsLoading && page === 1}
          onLoadMore={handleLoadMore}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetching && page > 1}
        />
      </div>
    </section>
  );
};
