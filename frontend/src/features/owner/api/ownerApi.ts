import { apiClient } from '../../../lib/api/client.js';
import type { ApiResponse } from '../../../types/auth.js';
import type { DashboardSummary, OwnerRoomQuery, Room } from '../types.js';

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const res = await apiClient.get<ApiResponse<DashboardSummary>>('/rooms/dashboard/summary');
  return res.data.data;
}

export async function getOwnerRooms(query: OwnerRoomQuery = {}): Promise<{ rooms: Room[]; pagination: any }> {
  const res = await apiClient.get<ApiResponse<any>>('/rooms/my', { params: query });
  return {
    rooms: res.data.data,
    pagination: (res.data as any).pagination || {}, // Assuming pagination info might be returned if implemented
  };
}
