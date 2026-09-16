import { apiClient } from '../../../lib/api/client.js';
import type { ApiResponse } from '../../../types/auth.js';
import type { Availability, CreateRoomPayload, Room, UpdateRoomPayload } from '../types.js';

export async function createRoom(payload: CreateRoomPayload): Promise<Room> {
  const res = await apiClient.post<ApiResponse<Room>>('/rooms', payload);
  return res.data.data;
}

export async function updateRoom(id: string, payload: UpdateRoomPayload): Promise<Room> {
  const res = await apiClient.patch<ApiResponse<Room>>(`/rooms/${id}`, payload);
  return res.data.data;
}

export async function softDeleteRoom(id: string): Promise<void> {
  await apiClient.delete(`/rooms/${id}`);
}

export async function updateAvailability(id: string, availability: Availability): Promise<Room> {
  const res = await apiClient.patch<ApiResponse<Room>>(`/rooms/${id}/availability`, { availability });
  return res.data.data;
}
