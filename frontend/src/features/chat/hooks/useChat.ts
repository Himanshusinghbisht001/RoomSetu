import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import { chatApi, type ChatMessage } from '../api/chatApi.js';
import { useSocket } from '../../../lib/socket/useSocket.js';

export const chatKeys = {
  messages: (inquiryId: string) => ['chat', 'messages', inquiryId] as const,
};

/**
 * Fetches historical messages for an inquiry via REST and subscribes to
 * real-time `chat:message:new` events for the same inquiry over the shared
 * socket.  New messages are appended via setQueryData — no full refetch.
 */
export function useChatMessages(inquiryId: string) {
  const queryClient = useQueryClient();
  const socket = useSocket();

  // ── Load history ────────────────────────────────────────────────────────────
  const query = useQuery({
    queryKey: chatKeys.messages(inquiryId),
    queryFn: () => chatApi.getMessages(inquiryId),
    enabled: !!inquiryId,
    staleTime: 1000 * 60 * 5, // 5 min — socket keeps data fresh
    retry: 1,
  });

  // ── Real-time listener ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!inquiryId) return;

    const handleNewMessage = (msg: ChatMessage) => {
      // Guard: only append messages that belong to this inquiry
      if (msg.inquiryId !== inquiryId) return;

      queryClient.setQueryData<ChatMessage[]>(
        chatKeys.messages(inquiryId),
        (prev) => {
          const existing = prev ?? [];
          // Deduplicate by id
          if (existing.some((m) => m.id === msg.id)) return existing;
          return [...existing, msg];
        }
      );
    };

    socket.on('chat:message:new', handleNewMessage);

    return () => {
      socket.off('chat:message:new', handleNewMessage);
    };
  }, [inquiryId, queryClient, socket]);

  return query;
}

/**
 * Returns a stable sendMessage callback that emits `chat:message:send` via
 * the shared socket.  The backend derives senderId server-side from the JWT.
 */
export function useSendMessage(inquiryId: string) {
  const socket = useSocket();
  const queryClient = useQueryClient();

  const sendMessage = useCallback(
    (content: string): Promise<void> => {
      const trimmed = content.trim();
      if (!trimmed) return Promise.resolve();

      return new Promise((resolve, reject) => {
        const TIMEOUT_MS = 5000;
        let isDone = false;

        const timer = setTimeout(() => {
          if (isDone) return;
          isDone = true;
          reject(new Error('Request timeout'));
        }, TIMEOUT_MS);

        socket.emit(
          'chat:message:send',
          { inquiryId, content: trimmed },
          (response?: { success: boolean; data?: ChatMessage; error?: string }) => {
            if (isDone) return;
            isDone = true;
            clearTimeout(timer);

            if (response?.success && response.data) {
              // Append to cache to render immediately
              queryClient.setQueryData<ChatMessage[]>(
                chatKeys.messages(inquiryId),
                (prev) => {
                  const existing = prev ?? [];
                  if (existing.some((m) => m.id === response.data!.id)) return existing;
                  return [...existing, response.data!];
                }
              );
              resolve();
            } else {
              reject(new Error(response?.error ?? 'Failed to send message'));
            }
          }
        );
      });
    },
    [inquiryId, socket, queryClient]
  );

  return { sendMessage };
}
