import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getRooms, getRoomById } from '../api/roomApi';
import type { RoomQueryParams } from '../types';

export const useRooms = (queryParams: RoomQueryParams) => {
  return useQuery({
    queryKey: ['rooms', queryParams],
    queryFn: () => getRooms(queryParams),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
};

export const useRoom = (roomId: string) => {
  return useQuery({
    queryKey: ['room', roomId],
    queryFn: () => getRoomById(roomId),
    enabled: !!roomId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useLocationCounts = (city?: string) => {
  return useQuery({
    queryKey: ['locationCounts', city],
    queryFn: () => import('../api/roomApi').then(m => m.getLocationCounts(city)),
    staleTime: 5 * 60 * 1000,
  });
};
