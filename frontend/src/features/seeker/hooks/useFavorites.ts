import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addFavorite, removeFavorite, getFavorites, checkFavorite } from '../api/favoritesApi';
import { useAuth } from '../../../auth/AuthProvider';

/** List all favorites for the authenticated seeker */
export const useFavorites = (page = 1, limit = 10) => {
  const { isAuthenticated, user } = useAuth();
  const isSeeker = isAuthenticated && user?.role === 'seeker';

  return useQuery({
    queryKey: ['favorites', page, limit],
    queryFn: () => getFavorites(page, limit),
    enabled: isSeeker,
    staleTime: 60 * 1000,
  });
};

/** Check if a specific room is favorited by the current seeker */
export const useFavoriteStatus = (roomId: string) => {
  const { isAuthenticated, user } = useAuth();
  const isSeeker = isAuthenticated && user?.role === 'seeker';

  return useQuery({
    queryKey: ['favoriteStatus', roomId],
    queryFn: () => checkFavorite(roomId),
    enabled: isSeeker && !!roomId,
    staleTime: 60 * 1000,
    select: (data) => data.data.isFavorite,
  });
};

/** Toggle (add/remove) a favorite with optimistic updates */
export const useToggleFavorite = (roomId: string) => {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: () => addFavorite(roomId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['favoriteStatus', roomId] });
      const previous = queryClient.getQueryData(['favoriteStatus', roomId]);
      // Optimistic update — flip to true immediately
      queryClient.setQueryData(['favoriteStatus', roomId], (old: any) => ({
        ...(old ?? {}),
        data: { isFavorite: true },
      }));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      // Roll back on failure
      if (context?.previous !== undefined) {
        queryClient.setQueryData(['favoriteStatus', roomId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favoriteStatus', roomId] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => removeFavorite(roomId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['favoriteStatus', roomId] });
      const previous = queryClient.getQueryData(['favoriteStatus', roomId]);
      // Optimistic update — flip to false immediately
      queryClient.setQueryData(['favoriteStatus', roomId], (old: any) => ({
        ...(old ?? {}),
        data: { isFavorite: false },
      }));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(['favoriteStatus', roomId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favoriteStatus', roomId] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  return { addMutation, removeMutation };
};
