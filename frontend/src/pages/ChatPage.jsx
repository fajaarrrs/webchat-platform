import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import {
  Search, Send, Paperclip, MoreVertical,
  FileText, ImageIcon, CheckCheck, MessagesSquare, UserPlus, X, Link2,
} from 'lucide-react';

const SOCKET_URL = 'http://localhost:5000';
const forumColors = ['#2563EB', '#7c3aed', '#059669', '#d97706', '#0891b2', '#be185d'];

export default function ChatPage() {
  const { user } = useAuth();
  const location = useLocation();
  const initialForumId = location.state?.forumId ?? null;

  const [forums, setForums] = useState([]);
  const [activeForumId, setActiveForumId] = useState(initialForumId);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [searchGroup, setSearchGroup] = useState('');
  const [showAttach, setShowAttach] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinLink, setJoinLink] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const socketRef = useRef(null);
  const prevForumIdRef = useRef(null);

  // Connect socket on mount
  useEffect(() => {
    const token = localStorage.getItem('wchat_token');
    const socket = io(SOCKET_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on('new_message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => socket.disconnect();
  }, []);

  // Load forum list
  useEffect(() => {
    api.get('/forums').then(data => {
      setForums(data);
      // If no initial forum, default to first
      if (!initialForumId && data.length > 0) {
        setActiveForumId(data[0].id);
      }
    });
  }, []);

  // When active forum changes: leave old room, join new, load history
  useEffect(() => {
    if (!activeForumId || !socketRef.current) return;

    if (prevForumIdRef.current && prevForumIdRef.current !== activeForumId) {
      socketRef.current.emit('leave_forum', prevForumIdRef.current);
    }
    prevForumIdRef.current = activeForumId;
    socketRef.current.emit('join_forum', activeForumId);

    setLoadingMsgs(true);
    setMessages([]);
    api.get(`/messages/${activeForumId}`)
      .then(data => setMessages(data))
      .finally(() => setLoadingMsgs(false));
  }, [activeForumId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e?.preventDefault();
    if (!inputText.trim() || !activeForumId) return;
    socketRef.current?.emit('send_message', { forumId: activeForumId, content: inputText.trim() });
    setInputText('');
  };

  const handleJoinForum = async (e) => {
    e.preventDefault();
    const raw = joinLink.trim();
    if (!raw) return;
    // Extract token from full URL or use as-is
    const match = raw.match(/\/chat\/join\/([a-f0-9]+)/);
    const token = match ? match[1] : raw;
    setJoinLoading(true);
    try {
      const data = await api.post(`/forums/join/${token}`);
      // Refresh forum list
      const updated = await api.get('/forums');
      setForums(updated);
      setActiveForumId(data.forum_id);
      setShowJoinModal(false);
      setJoinLink('');
    } catch (err) {
      alert(err.message || 'Link tidak valid.');
    }
    setJoinLoading(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !activeForumId) return;
    socketRef.current?.emit('send_message', { forumId: activeForumId, content: `ðŸ“Ž ${file.name}` });
    setShowAttach(false);
    e.target.value = '';
  };

  const activeForum = forums.find(f => f.id === activeForumId);
  const filteredForums = forums.filter(f =>
    f.title.toLowerCase().includes(searchGroup.toLowerCase())
  );

  const getInitials = (name = '') => name.slice(0, 2).toUpperCase();
  const getColor = (idx) => forumColors[idx % forumColors.length];

  const formatTime = (dt) => {
    if (!dt) return '';
    return new Date(dt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

        {/* Left: Forum List */}
        <div style={{
          width: 300, borderRight: '1px solid #E5E7EB', background: '#fff',
          display: 'flex', flexDirection: 'column', flexShrink: 0,
        }}>
          <div style={{ padding: '16px 16px 12px' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                <input
                  value={searchGroup}
                  onChange={e => setSearchGroup(e.target.value)}
                  placeholder="Cari forum..."
                  style={{
                    width: '100%', padding: '9px 12px 9px 32px',
                    border: '1.5px solid #E5E7EB', borderRadius: 20, fontSize: 13,
                    outline: 'none', background: '#F9FAFB', boxSizing: 'border-box',
                  }}
                  onFocus={e => e.target.style.borderColor = '#2563EB'}
                  onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                />
              </div>
              {user?.role !== 'admin' && (
                <button
                  onClick={() => setShowJoinModal(true)}
                  title="Tambah Forum"
                  style={{
                    width: 34, height: 34, borderRadius: '50%', border: 'none', flexShrink: 0,
                    background: 'linear-gradient(135deg, #1D4ED8, #2563EB)',
                    color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <UserPlus size={15} />
                </button>
              )}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredForums.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: '#9CA3AF', fontSize: 13 }}>
                {user?.role === 'admin' ? 'Belum ada forum.' : (
                  <>
                    <p style={{ margin: '0 0 10px' }}>Belum ada forum.</p>
                    <button
                      onClick={() => setShowJoinModal(true)}
                      style={{
                        padding: '8px 14px', borderRadius: 8, border: 'none',
                        background: 'linear-gradient(135deg, #1D4ED8, #2563EB)',
                        color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      <UserPlus size={13} /> Gabung Forum
                    </button>
                  </>
                )}
              </div>
            )}
            {filteredForums.map((forum, i) => (
              <div
                key={forum.id}
                onClick={() => setActiveForumId(forum.id)}
                style={{
                  padding: '12px 16px', cursor: 'pointer', transition: 'background 0.15s',
                  background: activeForumId === forum.id ? '#EFF6FF' : 'transparent',
                  borderLeft: activeForumId === forum.id ? '3px solid #2563EB' : '3px solid transparent',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}
                onMouseEnter={e => { if (activeForumId !== forum.id) e.currentTarget.style.background = '#F9FAFB'; }}
                onMouseLeave={e => { if (activeForumId !== forum.id) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{
                  width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                  background: getColor(i),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: '#fff',
                }}>
                  {getInitials(forum.title)}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {forum.title}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                    {forum.last_message || forum.project}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Chat Area */}
        {!activeForum ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB', color: '#9CA3AF' }}>
            <MessagesSquare size={48} style={{ marginBottom: 14, opacity: 0.3 }} />
            <p style={{ fontSize: 14 }}>Pilih forum untuk mulai chat.</p>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F9FAFB', minWidth: 0 }}>
            {/* Chat Header */}
            <div style={{
              padding: '14px 24px', background: '#fff',
              borderBottom: '1px solid #E5E7EB',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: getColor(forums.findIndex(f => f.id === activeForumId)),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: '#fff',
                }}>
                  {getInitials(activeForum.title)}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#1F2937', margin: 0 }}>{activeForum.title}</p>
                  <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>{activeForum.project}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {activeForum.member_count ?? 0} anggota
                </span>
                <button style={{
                  width: 34, height: 34, borderRadius: 8, border: '1.5px solid #E5E7EB',
                  background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#6B7280',
                }}>
                  <MoreVertical size={16} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {loadingMsgs && (
                <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, padding: 16 }}>Memuat pesan...</div>
              )}
              {!loadingMsgs && messages.length === 0 && (
                <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, padding: 32 }}>
                  Belum ada pesan. Mulai percakapan!
                </div>
              )}
              {messages.map((msg, i) => {
                const isMe = msg.user_id === user?.id;
                const prevMsg = messages[i - 1];
                const showName = !isMe && (i === 0 || prevMsg?.user_id !== msg.user_id);
                return (
                  <div key={msg.id} style={{
                    display: 'flex',
                    justifyContent: isMe ? 'flex-end' : 'flex-start',
                    alignItems: 'flex-end', gap: 8,
                    marginTop: (i > 0 && prevMsg?.user_id !== msg.user_id) ? 12 : 2,
                  }}>
                    {!isMe && (
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                        background: showName ? '#eff6ff' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700, color: '#2563EB',
                        visibility: showName ? 'visible' : 'hidden',
                      }}>
                        {showName ? getInitials(msg.username) : ''}
                      </div>
                    )}
                    <div style={{ maxWidth: '60%' }}>
                      {showName && (
                        <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 3, paddingLeft: 2 }}>
                          {msg.username}
                          <span style={{
                            marginLeft: 6, fontSize: 10, fontWeight: 600,
                            color: msg.role === 'admin' ? '#6d28d9' : msg.role === 'karyawan' ? '#1d4ed8' : '#059669',
                          }}>
                            [{msg.role === 'admin' ? 'Admin' : msg.role === 'karyawan' ? 'Employee' : 'Client'}]
                          </span>
                        </div>
                      )}
                      <div style={{
                        background: isMe ? 'linear-gradient(135deg, #1D4ED8, #2563EB)' : '#fff',
                        color: isMe ? '#fff' : '#1F2937',
                        padding: '9px 13px',
                        borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        fontSize: 14, lineHeight: 1.5,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                        border: isMe ? 'none' : '1px solid #F3F4F6',
                        wordBreak: 'break-word',
                      }}>
                        {msg.content}
                        <div style={{
                          fontSize: 10, marginTop: 4, textAlign: 'right',
                          color: isMe ? 'rgba(255,255,255,0.65)' : '#9CA3AF',
                          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3,
                        }}>
                          {formatTime(msg.created_at)}
                          {isMe && <CheckCheck size={12} />}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={{ padding: '12px 16px', background: '#fff', borderTop: '1px solid #E5E7EB' }}>
              <form onSubmit={handleSend} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setShowAttach(!showAttach)}
                    style={{
                      width: 36, height: 36, borderRadius: '50%', border: 'none',
                      background: '#F3F4F6', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#6B7280', flexShrink: 0,
                    }}
                  >
                    <Paperclip size={16} />
                  </button>
                  {showAttach && (
                    <div style={{
                      position: 'absolute', bottom: 44, left: 0,
                      background: '#fff', borderRadius: 10, padding: 8,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid #E5E7EB',
                      display: 'flex', flexDirection: 'column', gap: 4, zIndex: 10,
                    }}>
                      {[['Dokumen', FileText, '#2563EB'], ['Gambar', ImageIcon, '#7c3aed']].map(([label, Icon, color]) => (
                        <button
                          key={label} type="button"
                          onClick={() => fileInputRef.current.click()}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '8px 12px', borderRadius: 6, border: 'none',
                            background: 'none', cursor: 'pointer', fontSize: 13, color: '#374151',
                            whiteSpace: 'nowrap',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                          <Icon size={15} color={color} /> Upload {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileUpload} />

                <input
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSend(e); }}
                  placeholder="Ketik pesan..."
                  style={{
                    flex: 1, padding: '9px 14px',
                    border: '1.5px solid #E5E7EB', borderRadius: 20, fontSize: 14,
                    outline: 'none', background: '#F9FAFB', boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#2563EB'}
                  onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                />

                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  style={{
                    width: 36, height: 36, borderRadius: '50%', border: 'none',
                    background: inputText.trim() ? 'linear-gradient(135deg, #1D4ED8, #2563EB)' : '#E5E7EB',
                    cursor: inputText.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: inputText.trim() ? '#fff' : '#9CA3AF', flexShrink: 0,
                    transition: 'all 0.2s',
                  }}
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Add Forum Modal */}
      {showJoinModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) { setShowJoinModal(false); setJoinLink(''); } }}
        >
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: '#eff6ff', borderRadius: 10, padding: 8 }}><Link2 size={18} color="#2563EB" /></div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1F2937', margin: 0 }}>Gabung Forum</h2>
              </div>
              <button onClick={() => { setShowJoinModal(false); setJoinLink(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={20} /></button>
            </div>
            <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>Paste link atau token yang dikirim admin untuk bergabung ke forum chat.</p>
            <form onSubmit={handleJoinForum}>
              <input
                value={joinLink}
                onChange={e => setJoinLink(e.target.value)}
                placeholder="Contoh: http://...webchat.../chat/join/abc123"
                autoFocus
                style={{
                  width: '100%', padding: '11px 14px',
                  border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14,
                  outline: 'none', boxSizing: 'border-box', marginBottom: 16,
                }}
                onFocus={e => e.target.style.borderColor = '#2563EB'}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => { setShowJoinModal(false); setJoinLink(''); }}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1.5px solid #E5E7EB', background: '#fff', color: '#6B7280', fontSize: 14, cursor: 'pointer' }}
                >Batal</button>
                <button type="submit" disabled={joinLoading || !joinLink.trim()}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: joinLoading || !joinLink.trim() ? '#93c5fd' : 'linear-gradient(135deg, #1D4ED8, #2563EB)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: joinLoading || !joinLink.trim() ? 'not-allowed' : 'pointer' }}
                >{joinLoading ? 'Bergabung...' : 'Gabung'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
