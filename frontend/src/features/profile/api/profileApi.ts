import { apiClient } from '../../../lib/api/client.js';
import type { ApiResponse, User } from '../../../types/auth.js';

export async function updateProfile(payload: {
  name?: string;
  phoneNumber?: string;
  bio?: string;
  avatar?: string;
}): Promise<User> {
  const res = await apiClient.patch<ApiResponse<User>>('/users/profile', payload);
  return res.data.data;
}

export async function changePassword(payload: {
  currentPassword?: string;
  newPassword?: string;
}): Promise<{ message: string }> {
  const res = await apiClient.patch<ApiResponse<{ message: string }>>('/users/password', payload);
  return res.data.data;
}
