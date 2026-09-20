import React, { useState } from 'react';
import { StarRating } from './StarRating.js';
import type { CreateReviewInput } from '../types.js';

interface ReviewFormProps {
  onSubmit: (data: CreateReviewInput) => Promise<void>;
  initialData?: CreateReviewInput;
  isSubmitting?: boolean;
  onCancel?: () => void;
  error?: Error | null;
}

export const ReviewForm: React.FC<ReviewFormProps> = ({
  onSubmit,
  initialData,
  isSubmitting = false,
  onCancel,
  error,
}) => {
  const [rating, setRating] = useState(initialData?.rating || 0);
  const [comment, setComment] = useState(initialData?.comment || '');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (rating === 0) {
      setValidationError('Please select a rating');
      return;
    }

    if (!comment.trim()) {
      setValidationError('Please write a comment');
      return;
    }

    try {
      await onSubmit({ rating, comment: comment.trim() });
      if (!initialData) {
        setRating(0);
        setComment('');
      }
    } catch (err) {
      // The parent will handle the API error via React Query
    }
  };

  return (
    <form onSubmit={handleSubmit} className="review-form">
      <div className="review-form-header">
        <span className="review-form-title">{initialData ? 'Edit your review' : 'Write a review'}</span>
        <StarRating rating={rating} onRatingChange={setRating} readonly={isSubmitting} />
      </div>

      <textarea
        className="review-textarea"
        placeholder="Write your review..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        disabled={isSubmitting}
        maxLength={500}
        rows={4}
      />
      
      <div className="review-form-footer">
        <span className="char-count">{comment.length}/500</span>
        
        <div className="review-form-actions">
          {onCancel && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting || rating === 0 || !comment.trim()}
          >
            {isSubmitting ? 'Posting...' : (initialData ? 'Update Review' : 'Post Review')}
          </button>
        </div>
      </div>

      {(validationError || error) && (
        <div className="form-error">
          {validationError || (error instanceof Error ? error.message : 'Failed to submit review')}
        </div>
      )}
    </form>
  );
};
