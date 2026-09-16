import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getOwnerRooms } from '../api/ownerApi.js';
import { createRoom, softDeleteRoom, updateAvailability, updateRoom } from '../api/roomApi.js';
import type { OwnerRoomQuery } from '../types.js';

export function useOwnerRooms(query: OwnerRoomQuery) {
  return useQuery({
    queryKey: ['owner', 'rooms', query],
    queryFn: () => getOwnerRooms(query),
  });
}

export function useCreateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRoom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'rooms'] });
      queryClient.invalidateQueries({ queryKey: ['owner', 'dashboard-summary'] });
    },
  });
}

export function useUpdateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => updateRoom(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'rooms'] });
      queryClient.invalidateQueries({ queryKey: ['owner', 'dashboard-summary'] });
    },
  });
}

export function useDeleteRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: softDeleteRoom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'rooms'] });
      queryClient.invalidateQueries({ queryKey: ['owner', 'dashboard-summary'] });
    },
  });
}

export function useUpdateAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, availability }: { id: string; availability: any }) => updateAvailability(id, availability),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'rooms'] });
      queryClient.invalidateQueries({ queryKey: ['owner', 'dashboard-summary'] });
    },
  });
}
