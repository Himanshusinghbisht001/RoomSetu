import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../auth/AuthProvider.js';
import { useChatMessages, useSendMessage } from '../hooks/useChat.js';
import { MessageBubble } from './MessageBubble.js';

interface ChatWindowProps {
  inquiryId: string;
  /** Display title shown in the chat header */
  chatTitle: string;
  /** Subtitle (e.g. "Private Chat") */
  chatSubtitle?: string;
}

/**
 * Self-contained chat window component.
 * Handles message display, scrolling, the compose area, and error feedback.
 */
export function ChatWindow({ inquiryId, chatTitle, chatSubtitle }: ChatWindowProps) {
  const { user } = useAuth();
  const { data: messages, isLoading, isError, error } = useChatMessages(inquiryId);
  const { sendMessage } = useSendMessage(inquiryId);

  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom whenever the message list grows
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setSendError(null);

    try {
      await sendMessage(trimmed);
      setContent('');
      textareaRef.current?.focus();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter = send; Shift+Enter = newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  // ── States ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="chat-window">
        <div className="chat-header">
          <div className="chat-header__info">
            <span className="chat-header__title">{chatTitle}</span>
            {chatSubtitle && <span className="chat-header__subtitle">{chatSubtitle}</span>}
          </div>
        </div>
        <div className="chat-messages chat-messages--center">
          <div className="chat-spinner" aria-label="Loading messages" />
        </div>
      </div>
    );
  }

  if (isError) {
    // Axios Error shape when failing from TanStack Query
    const errorStatus = (error as any)?.response?.status;
    const isForbidden = errorStatus === 403;
    const errorMessage = isForbidden 
      ? "Chat is only available for accepted inquiries." 
      : "Failed to load messages. Please refresh.";

    return (
      <div className="chat-window" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="chat-header">
          <div className="chat-header__info">
            <span className="chat-header__title">{chatTitle}</span>
            {chatSubtitle && <span className="chat-header__subtitle">{chatSubtitle}</span>}
          </div>
        </div>
        <div className="chat-messages chat-messages--center">
          <p className="chat-error-text" style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)' }}>{errorMessage}</p>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="chat-window">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header__icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <div className="chat-header__info">
          <span className="chat-header__title">{chatTitle}</span>
          {chatSubtitle && <span className="chat-header__subtitle">{chatSubtitle}</span>}
        </div>
        <div className="chat-header__badge">Private</div>
      </div>

      {/* Messages */}
      <div className="chat-messages" role="log" aria-live="polite" aria-label="Chat messages">
        {(!messages || messages.length === 0) ? (
          <div className="chat-empty">
            <div className="chat-empty__icon" aria-hidden="true">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="chat-empty__title">No messages yet</p>
            <p className="chat-empty__hint">Send the first message to get the conversation started.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isMine={msg.senderId === user?.id}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Send error */}
      {sendError && (
        <div className="chat-send-error" role="alert">
          <span>{sendError}</span>
          <button className="chat-send-error__dismiss" onClick={() => setSendError(null)} aria-label="Dismiss error">✕</button>
        </div>
      )}

      {/* Composer */}
      <div className="chat-composer">
        <textarea
          ref={textareaRef}
          className="chat-composer__input"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
          rows={1}
          disabled={sending}
          aria-label="Message input"
          maxLength={2000}
        />
        <button
          className="chat-composer__send"
          onClick={() => void handleSend()}
          disabled={sending || !content.trim()}
          aria-label="Send message"
        >
          {sending ? (
            <span className="chat-composer__sending-dots" aria-hidden="true" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
