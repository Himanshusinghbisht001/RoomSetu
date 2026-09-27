import { apiClient } from '../../../lib/api/client';
import type { Room, PaginationInfo } from '../types';

export interface FavoriteCheckResponse {
  success: boolean;
  data: { isFavorite: boolean };
}

export interface FavoritesListResponse {
  success: boolean;
  data: Room[];
  pagination: PaginationInfo;
}

export const addFavorite = async (roomId: string): Promise<{ success: boolean; data: { success: boolean } }> => {
  const response = await apiClient.post(`/favorites/${roomId}`);
  return response.data;
};

export const removeFavorite = async (roomId: string): Promise<{ success: boolean; data: { success: boolean } }> => {
  const response = await apiClient.delete(`/favorites/${roomId}`);
  return response.data;
};

export const getFavorites = async (page = 1, limit = 10): Promise<FavoritesListResponse> => {
  const response = await apiClient.get<FavoritesListResponse>('/favorites', { params: { page, limit } });
  return response.data;
};

export const checkFavorite = async (roomId: string): Promise<FavoriteCheckResponse> => {
  const response = await apiClient.get<FavoriteCheckResponse>(`/favorites/check/${roomId}`);
  return response.data;
};
