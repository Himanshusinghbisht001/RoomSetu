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

  const sendMessage = useCallback(
    (content: string): Promise<void> => {
      const trimmed = content.trim();
      if (!trimmed) return Promise.resolve();

      return new Promise((resolve, reject) => {
        // Use a one-shot chat:error listener as the failure signal.
        // Socket.io v4 does not provide acknowledgement by default; we resolve
        // optimistically after emit and reject on a chat:error received within
        // a short window.
        const TIMEOUT_MS = 5000;

        const onError = (err: { message: string }) => {
          clearTimeout(timer);
          reject(new Error(err.message ?? 'Failed to send message'));
        };

        const timer = setTimeout(() => {
          socket.off('chat:error', onError);
          resolve(); // no error within window → assume delivered
        }, TIMEOUT_MS);

        socket.once('chat:error', (err: { message: string }) => {
          clearTimeout(timer);
          socket.off('chat:error', onError);
          reject(new Error(err.message ?? 'Failed to send message'));
        });

        socket.emit('chat:message:send', { inquiryId, content: trimmed });
      });
    },
    [inquiryId, socket]
  );

  return { sendMessage };
}
