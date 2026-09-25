import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inquiryApi } from '../api/inquiryApi.js';
import type { CreateInquiryInput } from '../types.js';

export const inquiryKeys = {
  all: ['inquiries'] as const,
  my: () => [...inquiryKeys.all, 'my'] as const,
  received: () => [...inquiryKeys.all, 'received'] as const,
};

export function useCreateInquiry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roomId, data }: { roomId: string; data: CreateInquiryInput }) =>
      inquiryApi.createInquiry(roomId, data),
    onSuccess: () => {
      // Invalidate both 'my' inquiries and 'received' inquiries (if owner testing self, though impossible)
      queryClient.invalidateQueries({ queryKey: inquiryKeys.all });
    },
  });
}

export function useMyInquiries(page = 1, limit = 10) {
  return useQuery({
    queryKey: [...inquiryKeys.my(), { page, limit }],
    queryFn: () => inquiryApi.getMyInquiries(page, limit),
  });
}

export function useReceivedInquiries(page = 1, limit = 10) {
  return useQuery({
    queryKey: [...inquiryKeys.received(), { page, limit }],
    queryFn: () => inquiryApi.getReceivedInquiries(page, limit),
  });
}

export function useAcceptInquiry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inquiryId: string) => inquiryApi.acceptInquiry(inquiryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inquiryKeys.received() });
    },
  });
}

export function useRejectInquiry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inquiryId: string) => inquiryApi.rejectInquiry(inquiryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inquiryKeys.received() });
    },
  });
}
