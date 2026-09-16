import { apiClient } from '../../../lib/api/client.js';
import type { FeedbackPayload } from '../types.js';

export const submitFeedback = async (payload: FeedbackPayload) => {
  const response = await apiClient.post('/feedback', payload);
  return response.data;
};
