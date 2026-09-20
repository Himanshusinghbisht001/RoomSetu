import { apiClient } from '../../../lib/api/client.js';
import type { ReviewListResponse, ReviewSummary, CreateReviewInput, UpdateReviewInput, Review } from '../types.js';

export const getRoomReviews = async (roomId: string, page = 1, limit = 10): Promise<ReviewListResponse> => {
  const response = await apiClient.get<ReviewListResponse>(`/rooms/${roomId}/reviews`, {
    params: { page, limit },
  });
  return response.data;
};

export const getRoomRatingSummary = async (roomId: string): Promise<ReviewSummary> => {
  const response = await apiClient.get<{ success: boolean; data: ReviewSummary }>(`/rooms/${roomId}/reviews/summary`);
  return response.data.data;
};

export const createReview = async (roomId: string, data: CreateReviewInput): Promise<Review> => {
  const response = await apiClient.post<{ success: boolean; data: Review }>(`/rooms/${roomId}/reviews`, data);
  return response.data.data;
};

export const updateReview = async (reviewId: string, data: UpdateReviewInput): Promise<Review> => {
  const response = await apiClient.patch<{ success: boolean; data: Review }>(`/reviews/${reviewId}`, data);
  return response.data.data;
};

export const deleteReview = async (reviewId: string): Promise<void> => {
  await apiClient.delete(`/reviews/${reviewId}`);
};
