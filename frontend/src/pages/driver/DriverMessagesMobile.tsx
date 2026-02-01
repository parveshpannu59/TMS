import { useCallback, useEffect, useState } from 'react';
import { messageApi } from '@/api/message.api';
import { getAuth } from '@/utils/mobileAuth';
import type { Conversation, Message } from '@/types/message.types';
import '../../layouts/mobile/mobile.css';

function formatTime(date: string) {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function DriverMessagesMobile() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();
  const [selectedLoadId, setSelectedLoadId] = useState<string | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');

  const myUserId = getAuth()?.user?.id;

  const fetchConversations = useCallback(async () => {
    try {
      const data = await messageApi.getConversations();
      setConversations(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load conversations');
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async (userId: string, loadId?: string) => {
    try {
      setLoading(true);
      const data = await messageApi.getConversation(userId, loadId);
      setMessages(data);
      await messageApi.markAsRead(userId);
      fetchConversations();
    } catch (err: any) {
      setError(err?.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [fetchConversations]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedUserId) fetchMessages(selectedUserId, selectedLoadId);
  }, [selectedUserId, selectedLoadId, fetchMessages]);

  const handleSend = async () => {
    if (!selectedUserId || !messageText.trim()) return;
    try {
      setSending(true);
      setError(null);
      await messageApi.sendMessage({
        toUserId: selectedUserId,
        loadId: selectedLoadId,
        message: messageText.trim(),
        messageType: 'text',
      });
      setMessageText('');
      await fetchMessages(selectedUserId, selectedLoadId);
    } catch (err: any) {
      setError(err?.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const handleSelectConversation = (userId: string, loadId?: string) => {
    setSelectedUserId(userId);
    setSelectedLoadId(loadId);
  };

  const handleBack = () => {
    setSelectedUserId(undefined);
    setSelectedLoadId(undefined);
    setMessages([]);
  };

  if (selectedUserId) {
    return (
      <div className="dm-content" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 140px)' }}>
        <div className="dm-card" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button className="dm-icon" onClick={handleBack} aria-label="Back">←</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700 }}>Conversation</div>
            <div style={{ fontSize: 12, color: 'var(--dm-muted)' }}>User {selectedUserId.slice(0, 8)}...</div>
          </div>
        </div>

        {error && (
          <div className="dm-card" style={{ padding: 8, background: 'rgba(255,100,100,0.15)', color: '#ff7676', fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12, padding: 12 }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--dm-muted)' }}>Loading…</div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--dm-muted)', padding: 24 }}>
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.fromUserId === myUserId;
              return (
                <div
                  key={msg.id}
                  style={{
                    alignSelf: isOwn ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                    padding: '10px 14px',
                    borderRadius: 14,
                    background: isOwn ? 'var(--dm-accent)' : 'var(--dm-surface)',
                    color: isOwn ? '#022c22' : 'var(--dm-text)',
                    border: '1px solid var(--dm-border)',
                  }}
                >
                  <div style={{ fontSize: 14, wordBreak: 'break-word' }}>{msg.message}</div>
                  <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>
                    {formatTime(msg.createdAt)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid var(--dm-border)' }}>
          <input
            type="text"
            className="dm-input"
            placeholder="Type a message…"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            style={{ flex: 1 }}
          />
          <button
            className="dm-btn"
            onClick={handleSend}
            disabled={sending || !messageText.trim()}
            style={{ padding: '12px 20px' }}
          >
            {sending ? '…' : 'Send'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dm-content" style={{ display: 'grid', gap: 8 }}>
      <div style={{ fontWeight: 800, fontSize: 18 }}>Messages</div>

      {error && (
        <div className="dm-card" style={{ padding: 12, background: 'rgba(255,100,100,0.15)', color: '#ff7676' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="dm-card" style={{ padding: 32, textAlign: 'center', color: 'var(--dm-muted)' }}>
          Loading conversations…
        </div>
      ) : conversations.length === 0 ? (
        <div className="dm-card" style={{ padding: 32, textAlign: 'center', color: 'var(--dm-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>No conversations yet</div>
          <div style={{ fontSize: 13 }}>
            Messages from dispatch or load updates will appear here.
          </div>
        </div>
      ) : (
        conversations.map((conv) => (
          <div
            key={`${conv.otherUserId}-${conv.loadId || 'default'}`}
            className="dm-card"
            style={{
              display: 'grid',
              gap: 8,
              cursor: 'pointer',
              gridTemplateColumns: '1fr auto',
              alignItems: 'center',
            }}
            onClick={() => handleSelectConversation(conv.otherUserId, conv.loadId)}
          >
            <div>
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                User {conv.otherUserId.slice(0, 8)}…
                {conv.unreadCount > 0 && (
                  <span
                    style={{
                      background: 'var(--dm-danger)',
                      color: '#fff',
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 999,
                    }}
                  >
                    {conv.unreadCount}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, color: 'var(--dm-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {conv.lastMessage?.message || '—'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--dm-muted)' }}>
                {conv.lastMessage?.createdAt ? formatTime(conv.lastMessage.createdAt) : ''}
              </div>
            </div>
            <div style={{ color: 'var(--dm-accent)' }}>→</div>
          </div>
        ))
      )}
    </div>
  );
}
