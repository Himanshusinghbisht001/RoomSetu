import { apiClient } from '../../../lib/api/client.js';
import type { CreateInquiryInput, Inquiry, PaginatedInquiries } from '../types.js';

export const inquiryApi = {
  createInquiry: async (roomId: string, data: CreateInquiryInput): Promise<Inquiry> => {
    const res = await apiClient.post<{ success: boolean; data: Inquiry }>(
      `/rooms/${roomId}/inquiries`,
      data
    );
    return res.data.data;
  },

  getReceivedInquiries: async (page = 1, limit = 10): Promise<PaginatedInquiries> => {
    const res = await apiClient.get<PaginatedInquiries>('/inquiries/received', {
      params: { page, limit },
    });
    return res.data;
  },

  getMyInquiries: async (page = 1, limit = 10): Promise<PaginatedInquiries> => {
    const res = await apiClient.get<PaginatedInquiries>('/inquiries/my', {
      params: { page, limit },
    });
    return res.data;
  },

  acceptInquiry: async (inquiryId: string): Promise<Inquiry> => {
    const res = await apiClient.patch<{ success: boolean; data: Inquiry }>(
      `/inquiries/${inquiryId}/accept`
    );
    return res.data.data;
  },

  rejectInquiry: async (inquiryId: string): Promise<Inquiry> => {
    const res = await apiClient.patch<{ success: boolean; data: Inquiry }>(
      `/inquiries/${inquiryId}/reject`
    );
    return res.data.data;
  },

  cancelInquiry: async (inquiryId: string): Promise<Inquiry> => {
    const res = await apiClient.patch<{ success: boolean; data: Inquiry }>(
      `/inquiries/${inquiryId}/cancel`
    );
    return res.data.data;
  },
};
