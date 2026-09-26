import type { ChatMessage } from '../api/chatApi.js';

interface MessageBubbleProps {
  message: ChatMessage;
  isMine: boolean;
}

/**
 * Renders a single chat message bubble.
 * - isMine=true  → right-aligned teal bubble (outgoing)
 * - isMine=false → left-aligned surface bubble (incoming)
 */
export function MessageBubble({ message, isMine }: MessageBubbleProps) {
  const timeStr = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`chat-bubble-row ${isMine ? 'chat-bubble-row--mine' : 'chat-bubble-row--theirs'}`}
    >
      <div className={`chat-bubble ${isMine ? 'chat-bubble--mine' : 'chat-bubble--theirs'}`}>
        <p className="chat-bubble__text">{message.content}</p>
        <span className="chat-bubble__time">{timeStr}</span>
      </div>
    </div>
  );
}
