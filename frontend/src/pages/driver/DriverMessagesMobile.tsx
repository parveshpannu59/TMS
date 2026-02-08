import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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

  const ios = { blue: '#007aff', red: '#ff3b30' };

  // ─── Chat View ───
  if (selectedUserId) {
    return (
      <div className="dm-content" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 140px)', gap: 0 }}>
        {/* Chat Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 4px',
          borderBottom: '0.5px solid var(--dm-separator)', flexShrink: 0,
        }}>
          <button className="dm-icon" onClick={handleBack} style={{ color: ios.blue }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--dm-accent), var(--dm-accent-2))',
            display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 600, color: '#fff',
          }}>
            {selectedUserId.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 16 }}>{t('driverApp.conversation')}</div>
            <div style={{ fontSize: 12, color: 'var(--dm-muted)' }}>User {selectedUserId.slice(0, 8)}...</div>
          </div>
        </div>

        {error && (
          <div style={{ padding: '8px 16px', background: `${ios.red}08`, color: ios.red, fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8, padding: 16 }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--dm-muted)', padding: 24 }}>{t('common.loading')}</div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--dm-muted)', padding: 40 }}>
              <div style={{ fontSize: 40, marginBottom: 8, opacity: 0.5 }}>💬</div>
              <div style={{ fontSize: 15 }}>{t('driverApp.noMessages')}</div>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.fromUserId === myUserId;
              return (
                <div
                  key={msg.id}
                  style={{
                    alignSelf: isOwn ? 'flex-end' : 'flex-start',
                    maxWidth: '78%',
                    padding: '10px 14px',
                    borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: isOwn ? ios.blue : 'var(--dm-fill)',
                    color: isOwn ? '#fff' : 'var(--dm-text)',
                  }}
                >
                  <div style={{ fontSize: 16, wordBreak: 'break-word', lineHeight: 1.4 }}>{msg.message}</div>
                  <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4, textAlign: 'right' }}>
                    {formatTime(msg.createdAt)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input Bar */}
        <div style={{
          display: 'flex', gap: 8, padding: '10px 12px',
          borderTop: '0.5px solid var(--dm-separator)',
          background: 'var(--dm-surface)',
        }}>
          <input
            type="text"
            className="dm-input"
            placeholder={t('driverApp.message')}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            style={{ flex: 1, borderRadius: 24, padding: '10px 16px', fontSize: 16 }}
          />
          <button
            className="dm-icon"
            onClick={handleSend}
            disabled={sending || !messageText.trim()}
            style={{
              color: messageText.trim() ? ios.blue : 'var(--dm-muted)',
              minWidth: 44, minHeight: 44,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill={messageText.trim() ? ios.blue : 'none'} stroke={messageText.trim() ? ios.blue : 'currentColor'} strokeWidth="2" strokeLinecap="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // ─── Conversations List ───
  return (
    <div className="dm-content" style={{ display: 'grid', gap: 12 }}>
      <div style={{ fontWeight: 700, fontSize: 28, letterSpacing: -0.5 }}>{t('driverApp.messages')}</div>

      {error && (
        <div className="dm-card" style={{ padding: 14, background: `${ios.red}08`, color: ios.red, fontSize: 14 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--dm-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
          <div style={{ fontSize: 15 }}>{t('driverApp.loadingConversations')}</div>
        </div>
      ) : conversations.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--dm-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.5 }}>💬</div>
          <div style={{ fontWeight: 600, fontSize: 17 }}>{t('driverApp.noConversations')}</div>
          <div style={{ fontSize: 14, marginTop: 4, lineHeight: 1.5 }}>
            {t('driverApp.noConversationsDesc')}
          </div>
        </div>
      ) : (
        <div className="dm-inset-group">
          {conversations.map((conv) => (
            <div
              key={`${conv.otherUserId}-${conv.loadId || 'default'}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', cursor: 'pointer',
              }}
              onClick={() => handleSelectConversation(conv.otherUserId, conv.loadId)}
            >
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--dm-accent), var(--dm-accent-2))',
                display: 'grid', placeItems: 'center',
                fontSize: 16, fontWeight: 600, color: '#fff', flexShrink: 0,
              }}>
                {conv.otherUserId.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 16 }}>User {conv.otherUserId.slice(0, 8)}...</span>
                  <span style={{ fontSize: 12, color: 'var(--dm-muted)', flexShrink: 0 }}>
                    {conv.lastMessage?.createdAt ? formatTime(conv.lastMessage.createdAt) : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                  <span style={{ fontSize: 14, color: 'var(--dm-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {conv.lastMessage?.message || 'No messages'}
                  </span>
                  {conv.unreadCount > 0 && (
                    <span style={{
                      background: ios.blue, color: '#fff',
                      fontSize: 12, fontWeight: 700,
                      minWidth: 22, height: 22, padding: '0 6px',
                      borderRadius: 11, display: 'grid', placeItems: 'center',
                      flexShrink: 0, marginLeft: 8,
                    }}>
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
