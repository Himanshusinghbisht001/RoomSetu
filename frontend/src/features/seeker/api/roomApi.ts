import { apiClient } from '../../../lib/api/client';
import type { RoomListResponse, RoomDetailsResponse, RoomQueryParams } from '../types';

export const getRooms = async (params: RoomQueryParams = {}): Promise<RoomListResponse> => {
  // Strip undefined values so they aren't sent as empty query params
  const cleanParams: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      cleanParams[key] = value;
    }
  }
  const response = await apiClient.get<RoomListResponse>('/rooms', { params: cleanParams });
  return response.data;
};

export const getRoomById = async (id: string): Promise<RoomDetailsResponse> => {
  const response = await apiClient.get<RoomDetailsResponse>(`/rooms/${id}`);
  return response.data;
};

export const getLocationCounts = async (city?: string) => {
  const response = await apiClient.get<import('../types').LocationCountResponse>('/rooms/locations/counts', {
    params: city ? { city } : undefined,
  });
  return response.data;
};
