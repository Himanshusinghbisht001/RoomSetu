import React from 'react';
import type { PaginationInfo } from '../types.js';

interface PaginationProps {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ pagination, onPageChange }) => {
  if (pagination.totalPages <= 1) return null;

  return (
    <nav className="pagination" aria-label="Pagination Navigation">
      <button
        className="btn btn-outline btn-sm"
        disabled={pagination.page <= 1}
        onClick={() => onPageChange(pagination.page - 1)}
        aria-label="Go to previous page"
      >
        ← Previous
      </button>
      <span className="pagination-info" aria-live="polite">
        Page {pagination.page} of {pagination.totalPages}
      </span>
      <button
        className="btn btn-outline btn-sm"
        disabled={pagination.page >= pagination.totalPages}
        onClick={() => onPageChange(pagination.page + 1)}
        aria-label="Go to next page"
      >
        Next →
      </button>
    </nav>
  );
};
