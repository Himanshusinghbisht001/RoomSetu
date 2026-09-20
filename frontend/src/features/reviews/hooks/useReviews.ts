import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRoomReviews, getRoomRatingSummary, createReview, updateReview, deleteReview } from '../api/reviewApi.js';
import type { CreateReviewInput, UpdateReviewInput } from '../types.js';

export const useRoomReviews = (roomId: string, page: number, limit = 10) => {
  return useQuery({
    queryKey: ['roomReviews', roomId, page, limit],
    queryFn: () => getRoomReviews(roomId, page, limit),
    enabled: !!roomId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useRoomRatingSummary = (roomId: string) => {
  return useQuery({
    queryKey: ['roomRatingSummary', roomId],
    queryFn: () => getRoomRatingSummary(roomId),
    enabled: !!roomId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateReview = (roomId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateReviewInput) => createReview(roomId, data),
    onSuccess: () => {
      // Invalidate both reviews list and the summary
      queryClient.invalidateQueries({ queryKey: ['roomReviews', roomId] });
      queryClient.invalidateQueries({ queryKey: ['roomRatingSummary', roomId] });
    },
  });
};

export const useUpdateReview = (roomId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reviewId, data }: { reviewId: string; data: UpdateReviewInput }) => updateReview(reviewId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roomReviews', roomId] });
      queryClient.invalidateQueries({ queryKey: ['roomRatingSummary', roomId] });
    },
  });
};

export const useDeleteReview = (roomId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reviewId: string) => deleteReview(reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roomReviews', roomId] });
      queryClient.invalidateQueries({ queryKey: ['roomRatingSummary', roomId] });
    },
  });
};
