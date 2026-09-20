import React, { useState } from 'react';

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({ rating, onRatingChange, readonly = false }) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const displayRating = hoverRating !== null ? hoverRating : rating;

  return (
    <div className={`star-rating ${readonly ? 'readonly' : ''}`} role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= displayRating;
        
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={star === rating}
            aria-label={`${star} Star${star > 1 ? 's' : ''}`}
            className={`star-btn ${isFilled ? 'filled' : ''}`}
            disabled={readonly}
            onClick={() => {
              if (!readonly && onRatingChange) {
                onRatingChange(star);
              }
            }}
            onMouseEnter={() => !readonly && setHoverRating(star)}
            onMouseLeave={() => !readonly && setHoverRating(null)}
          >
            {isFilled ? '⭐' : '☆'}
          </button>
        );
      })}
    </div>
  );
};
