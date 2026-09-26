import { apiClient } from '../../../lib/api/client.js';

export interface ChatMessage {
  id: string;
  inquiryId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export const chatApi = {
  getMessages: async (inquiryId: string): Promise<ChatMessage[]> => {
    const res = await apiClient.get<{ success: boolean; data: ChatMessage[] }>(
      `/chat/${inquiryId}/messages`
    );
    return res.data.data;
  },
};
