import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import {
  Search, Send, Paperclip, MoreVertical,
  FileText, ImageIcon, CheckCheck, MessagesSquare, UserPlus, X, Link2,
  Reply, Pin, PinOff, Trash2, Users, Download, CornerUpLeft, ChevronDown,
} from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
const forumColors = ['#2563EB', '#7c3aed', '#059669', '#d97706', '#0891b2', '#be185d'];

function getFileInfo(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf') return { Icon: FileText, color: '#DC2626', bg: '#FEF2F2', label: 'PDF' };
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext))
    return { Icon: ImageIcon, color: '#7c3aed', bg: '#F5F3FF', label: ext.toUpperCase() };
  if (['doc', 'docx'].includes(ext))
    return { Icon: FileText, color: '#2563EB', bg: '#EFF6FF', label: 'DOC' };
  if (['xls', 'xlsx'].includes(ext))
    return { Icon: FileText, color: '#059669', bg: '#ECFDF5', label: 'XLS' };
  return { Icon: FileText, color: '#6B7280', bg: '#F9FAFB', label: ext.toUpperCase() || 'FILE' };
}

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
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showForumList, setShowForumList] = useState(true);

  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [mobileMenu, setMobileMenu] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [forumMembers, setForumMembers] = useState([]);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const socketRef = useRef(null);
  const prevForumIdRef = useRef(null);
  const longPressTimer = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('wchat_token');
    const socket = io(SOCKET_URL, { auth: { token } });
    socketRef.current = socket;
    socket.on('new_message', msg => setMessages(prev => [...prev, msg]));
    socket.on('message_deleted', ({ messageId }) =>
      setMessages(prev => prev.filter(m => m.id !== messageId))
    );
    socket.on('message_pinned', ({ messageId, is_pinned }) =>
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_pinned } : m))
    );
    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    api.get('/forums').then(data => {
      setForums(data);
      if (!initialForumId && data.length > 0) setActiveForumId(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!activeForumId || !socketRef.current) return;
    if (prevForumIdRef.current && prevForumIdRef.current !== activeForumId)
      socketRef.current.emit('leave_forum', prevForumIdRef.current);
    prevForumIdRef.current = activeForumId;
    socketRef.current.emit('join_forum', activeForumId);
    setLoadingMsgs(true);
    setMessages([]);
    setReplyTo(null);
    setOpenDropdownId(null);
    api.get(`/messages/${activeForumId}`)
      .then(data => setMessages(data))
      .finally(() => setLoadingMsgs(false));
    api.get(`/forums/${activeForumId}/members`)
      .then(data => setForumMembers(data))
      .catch(() => setForumMembers([]));
  }, [activeForumId]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (activeForumId && isMobile) setShowForumList(false);
  }, [activeForumId, isMobile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handle = e => {
      if (!e.target.closest('[data-msgdropdown]')) setOpenDropdownId(null);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const handleSend = e => {
    e?.preventDefault();
    if (!inputText.trim() || !activeForumId) return;
    socketRef.current?.emit('send_message', {
      forumId: activeForumId,
      content: inputText.trim(),
      replyToId: replyTo?.id || null,
    });
    setInputText('');
    setReplyTo(null);
  };

  const handleReply = msg => {
    setReplyTo({ id: msg.id, content: msg.content, username: msg.username });
    setOpenDropdownId(null);
    setMobileMenu(null);
  };

  const handlePin = msg => {
    socketRef.current?.emit('pin_message', { messageId: msg.id, forumId: activeForumId });
    setOpenDropdownId(null);
    setMobileMenu(null);
  };

  const handleDelete = msg => {
    if (!window.confirm('Hapus pesan ini?')) return;
    socketRef.current?.emit('delete_message', { messageId: msg.id, forumId: activeForumId });
    setOpenDropdownId(null);
    setMobileMenu(null);
  };

  const handleTouchStart = (e, msg) => {
    longPressTimer.current = setTimeout(() => setMobileMenu({ msg }), 600);
  };
  const handleTouchEnd = () => clearTimeout(longPressTimer.current);

  const handleJoinForum = async e => {
    e.preventDefault();
    const raw = joinLink.trim();
    if (!raw) return;
    const match = raw.match(/\/chat\/join\/([a-f0-9]+)/);
    const token = match ? match[1] : raw;
    setJoinLoading(true);
    try {
      const data = await api.post(`/forums/join/${token}`);
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

  const handleFileUpload = async e => {
    const file = e.target.files[0];
    if (!file || !activeForumId) return;
    setShowAttach(false);
    e.target.value = '';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('forumId', activeForumId);
    if (replyTo?.id) formData.append('replyToId', replyTo.id);

    try {
      const token = localStorage.getItem('wchat_token');
      const res = await fetch(`${SOCKET_URL}/api/messages/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload gagal.');
      // Server broadcasts via socket, but also add locally in case socket is slow
      setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data]);
      setReplyTo(null);
    } catch (err) {
      alert(err.message || 'Gagal mengunggah file.');
    }
  };

  const getInitials = (name = '') => name.slice(0, 2).toUpperCase();
  const getColor = idx => forumColors[idx % forumColors.length];
  const formatTime = dt => {
    if (!dt) return '';
    // SQLite stores UTC without timezone marker; append 'Z' so JS parses it as UTC
    const utc = dt.endsWith('Z') ? dt : dt.replace(' ', 'T') + 'Z';
    return new Date(utc).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
  };
  const getRoleLabel = role =>
    role === 'admin' ? 'Admin' : role === 'karyawan' ? 'Employee' : 'Client';
  const getRoleColor = role =>
    role === 'admin' ? '#6d28d9' : role === 'karyawan' ? '#1d4ed8' : '#059669';
  const canDelete = msg => user?.role === 'admin' || msg.user_id === user?.id;
  const canPin = () => user?.role === 'admin';

  const activeForum = forums.find(f => f.id === activeForumId);
  const filteredForums = forums.filter(f =>
    f.title.toLowerCase().includes(searchGroup.toLowerCase())
  );
  const pinnedMessages = messages.filter(m => m.is_pinned);
  const sharedFiles = messages.filter(m => m.file_url);

  const renderDropdown = (msg, posStyle) => (
    <div
      data-msgdropdown="true"
      style={{
        background: '#fff', borderRadius: 10, padding: 4,
        boxShadow: '0 8px 28px rgba(0,0,0,0.14)', border: '1px solid #E5E7EB',
        minWidth: 148, zIndex: 300, ...posStyle,
      }}
    >
      {[
        { icon: Reply, label: 'Reply', onClick: () => handleReply(msg), color: '#374151' },
        ...(canPin() ? [{
          icon: msg.is_pinned ? PinOff : Pin,
          label: msg.is_pinned ? 'Unpin' : 'Pin',
          onClick: () => handlePin(msg),
          color: '#374151',
        }] : []),
        ...(canDelete(msg) ? [{
          icon: Trash2, label: 'Delete',
          onClick: () => handleDelete(msg), color: '#DC2626',
        }] : []),
      ].map(({ icon: Icon, label, onClick, color }) => (
        <button
          key={label}
          onClick={onClick}
          onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
          style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '8px 12px', border: 'none', background: 'none',
            cursor: 'pointer', fontSize: 13, color, width: '100%',
            borderRadius: 6, textAlign: 'left',
          }}
        >
          <Icon size={14} /> {label}
        </button>
      ))}
    </div>
  );

  return (
    <DashboardLayout disableScroll>
      <div style={{ display: 'flex', height: '100%', overflow: 'hidden', width: '100%' }}>

        {/* LEFT PANEL - Forum List */}
        <div style={{
          width: isMobile ? '100%' : 300, 
          borderRight: '1px solid #E5E7EB', background: '#fff',
          display: (isMobile && !showForumList) ? 'none' : 'flex', 
          flexDirection: 'column', flexShrink: 0,
        }}>
          <div style={{ padding: '14px 16px 10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#1F2937' }}>WebcareChat</span>
            </div>
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input
                value={searchGroup}
                onChange={e => setSearchGroup(e.target.value)}
                placeholder="Cari atau mulai chat baru"
                style={{
                  width: '100%', padding: '9px 12px 9px 32px',
                  border: '1.5px solid #E5E7EB', borderRadius: 20, fontSize: 13,
                  outline: 'none', background: '#F9FAFB', boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = '#2563EB'}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              />
            </div>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
              {['Semua', 'Favorit'].map((tab, i) => (
                <button
                  key={tab}
                  style={{
                    padding: '5px 13px', borderRadius: 16, border: 'none', cursor: 'pointer',
                    background: i === 0 ? '#2563EB' : '#F3F4F6',
                    color: i === 0 ? '#fff' : '#6B7280',
                    fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  {tab}
                </button>
              ))}
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
            {filteredForums.map((forum, i) => {
              const isActive = activeForumId === forum.id;
              return (
                <div
                  key={forum.id}
                  onClick={() => {
                    setActiveForumId(forum.id);
                    if (isMobile) setShowForumList(false);
                  }}
                  style={{
                    padding: '12px 16px', cursor: 'pointer', transition: 'background 0.15s',
                    background: isActive ? '#EFF6FF' : 'transparent',
                    borderLeft: isActive ? '3px solid #2563EB' : '3px solid transparent',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F9FAFB'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                    background: getColor(i),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, color: '#fff',
                  }}>
                    {getInitials(forum.title)}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {forum.title}
                      </span>
                      {forum.last_activity && (
                        <span style={{ fontSize: 11, color: '#9CA3AF', flexShrink: 0, marginLeft: 4 }}>
                          {formatTime(forum.last_activity)}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{forum.project}</div>
                    <div style={{ fontSize: 12, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                      {forum.last_message || '\u2014'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CENTER PANEL - Chat Window */}
        {(!activeForum && !isMobile) ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB', color: '#9CA3AF' }}>
            <MessagesSquare size={48} style={{ marginBottom: 14, opacity: 0.3 }} />
            <p style={{ fontSize: 14 }}>Pilih forum untuk mulai chat.</p>
          </div>
        ) : (activeForum || (!showForumList && isMobile)) && (
          <div style={{ 
            flex: 1, 
            display: (isMobile && showForumList) ? 'none' : 'flex', 
            flexDirection: 'column', background: '#F9FAFB', minWidth: 0,
            height: '100%',
            overflow: 'hidden'
          }}>

            {/* Chat Header */}
            <div style={{
              padding: isMobile ? '10px 14px' : '12px 20px', background: '#fff',
              borderBottom: '1px solid #E5E7EB',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {isMobile && (
                  <button 
                    onClick={() => setShowForumList(true)}
                    style={{ background: 'none', border: 'none', color: '#2563EB', padding: '0 8px 0 0', display: 'flex', alignItems: 'center' }}
                  >
                    <CornerUpLeft size={20} />
                  </button>
                )}
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: getColor(forums.findIndex(f => f.id === activeForumId)),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: '#fff',
                }}>
                  {getInitials(activeForum?.title)}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#1F2937', margin: 0 }}>{activeForum?.title}</p>
                  <p style={{ fontSize: 12, margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
                    <span style={{ color: '#6B7280' }}>Online</span>
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button style={{ width: 34, height: 34, borderRadius: 8, border: '1.5px solid #E5E7EB', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
                  <Search size={15} />
                </button>
                <button style={{ width: 34, height: 34, borderRadius: 8, border: '1.5px solid #E5E7EB', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
                  <MoreVertical size={15} />
                </button>
              </div>
            </div>

            {/* Pinned bar */}
            {pinnedMessages.length > 0 && (
              <div style={{ padding: '7px 20px', background: '#EFF6FF', borderBottom: '1px solid #DBEAFE', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#1D4ED8' }}>
                <Pin size={12} />
                <span style={{ fontWeight: 600 }}>Pinned:</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {pinnedMessages[pinnedMessages.length - 1].content}
                </span>
              </div>
            )}

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px 14px' : '16px 20px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {loadingMsgs && <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, padding: 16 }}>Memuat pesan...</div>}
              {!loadingMsgs && messages.length === 0 && (
                <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, padding: 32 }}>
                  Belum ada pesan. Mulai percakapan!
                </div>
              )}

              {messages.map((msg, i) => {
                const isMe = msg.user_id === user?.id;
                const prevMsg = messages[i - 1];
                const showSender = !isMe && (i === 0 || prevMsg?.user_id !== msg.user_id);
                const isHovered = hoveredMsgId === msg.id;
                const isOpen = openDropdownId === msg.id;
                const showCtrl = isHovered || isOpen;

                return (
                  <div
                    key={msg.id}
                    onMouseEnter={() => setHoveredMsgId(msg.id)}
                    onMouseLeave={() => setHoveredMsgId(null)}
                    onTouchStart={e => handleTouchStart(e, msg)}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchEnd}
                    style={{
                      display: 'flex',
                      justifyContent: isMe ? 'flex-end' : 'flex-start',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: (i > 0 && prevMsg?.user_id !== msg.user_id) ? 14 : 2,
                    }}
                  >
                    {/* Dropdown trigger — left of MY bubble */}
                    {isMe && (
                      <div
                        data-msgdropdown="true"
                        style={{ position: 'relative', opacity: showCtrl ? 1 : 0, transition: 'opacity 0.15s', flexShrink: 0 }}
                      >
                        <button
                          onClick={() => setOpenDropdownId(isOpen ? null : msg.id)}
                          style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: '#E5E7EB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}
                        >
                          <ChevronDown size={13} />
                        </button>
                        {isOpen && (
                          <div style={{ position: 'absolute', bottom: 30, right: 0 }}>
                            {renderDropdown(msg)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Avatar for others */}
                    {!isMe && (
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        background: showSender ? '#EFF6FF' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700, color: '#2563EB',
                        visibility: showSender ? 'visible' : 'hidden',
                        alignSelf: 'flex-end', marginBottom: 2,
                      }}>
                        {showSender ? getInitials(msg.username) : ''}
                      </div>
                    )}

                    {/* Bubble */}
                    <div style={{ maxWidth: isMobile ? '82%' : '62%' }}>
                      {showSender && (
                        <div style={{ marginBottom: 4, paddingLeft: 2 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>
                            {msg.username}
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: getRoleColor(msg.role), marginTop: 1 }}>
                            {getRoleLabel(msg.role)}
                          </div>
                        </div>
                      )}

                      {msg.reply_to_id && (
                        <div style={{
                          background: isMe ? 'rgba(255,255,255,0.18)' : '#F3F4F6',
                          borderLeft: `3px solid ${isMe ? 'rgba(255,255,255,0.55)' : '#2563EB'}`,
                          borderRadius: '6px 6px 0 0',
                          padding: '5px 9px', marginBottom: -4, fontSize: 11,
                          color: isMe ? 'rgba(255,255,255,0.82)' : '#6B7280',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          <span style={{ fontWeight: 600 }}>{msg.reply_username || 'Unknown'}: </span>
                          {msg.reply_content}
                        </div>
                      )}

                      <div style={{
                        background: isMe ? 'linear-gradient(135deg, #1D4ED8, #2563EB)' : '#fff',
                        color: isMe ? '#fff' : '#1F2937',
                        padding: msg.file_url ? '10px 12px' : '9px 13px',
                        borderRadius: isMe
                          ? (msg.reply_to_id ? '0 14px 4px 14px' : '14px 14px 4px 14px')
                          : (msg.reply_to_id ? '0 14px 14px 4px' : '14px 14px 14px 4px'),
                        fontSize: 14, lineHeight: 1.5,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                        border: isMe ? 'none' : '1px solid #F3F4F6',
                        wordBreak: 'break-word',
                        minWidth: msg.file_url ? (isMobile ? 180 : 210) : undefined,
                      }}>
                        {!!msg.is_pinned && (
                          <div style={{ fontSize: 10, marginBottom: 3, color: isMe ? 'rgba(255,255,255,0.7)' : '#2563EB', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Pin size={9} /> Pinned
                          </div>
                        )}

                        {msg.file_url ? (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                                background: isMe ? 'rgba(255,255,255,0.18)' : getFileInfo(msg.file_name || '').bg,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                {(() => { const { Icon, color } = getFileInfo(msg.file_name || ''); return <Icon size={20} color={isMe ? '#fff' : color} />; })()}
                              </div>
                              <div style={{ flex: 1, overflow: 'hidden' }}>
                                <div style={{
                                  fontSize: 13, fontWeight: 600, lineHeight: 1.3,
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  color: isMe ? '#fff' : '#1F2937',
                                }}>
                                  {msg.file_name}
                                </div>
                                <div style={{ fontSize: 11, color: isMe ? 'rgba(255,255,255,0.65)' : '#9CA3AF', marginTop: 2 }}>
                                  {getFileInfo(msg.file_name || '').label}
                                  {msg.file_size ? ` · ${(msg.file_size / 1024).toFixed(0)} KB` : ''}
                                </div>
                              </div>
                              <a
                                href={`${SOCKET_URL}/api/messages/download/${msg.id}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={e => e.stopPropagation()}
                                style={{
                                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                                  background: isMe ? 'rgba(255,255,255,0.2)' : '#F3F4F6',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: isMe ? '#fff' : '#6B7280',
                                  textDecoration: 'none',
                                }}
                              >
                                <Download size={14} />
                              </a>
                            </div>
                            {msg.content && (
                              <div style={{ marginTop: 8, fontSize: 13 }}>{msg.content}</div>
                            )}
                          </div>
                        ) : (
                          msg.content
                        )}

                        <div style={{ fontSize: 10, marginTop: 4, textAlign: 'right', color: isMe ? 'rgba(255,255,255,0.65)' : '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
                          {formatTime(msg.created_at)}
                          {isMe && <CheckCheck size={12} />}
                        </div>
                      </div>
                    </div>

                    {/* Dropdown trigger — right of OTHERS bubble */}
                    {!isMe && (
                      <div
                        data-msgdropdown="true"
                        style={{ position: 'relative', opacity: showCtrl ? 1 : 0, transition: 'opacity 0.15s', flexShrink: 0 }}
                      >
                        <button
                          onClick={() => setOpenDropdownId(isOpen ? null : msg.id)}
                          style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: '#E5E7EB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}
                        >
                          <ChevronDown size={13} />
                        </button>
                        {isOpen && (
                          <div style={{ position: 'absolute', bottom: 30, left: 0 }}>
                            {renderDropdown(msg)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={{ background: '#fff', borderTop: '1px solid #E5E7EB' }}>
              {replyTo && (
                <div style={{ padding: '8px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 8, background: '#F9FAFB' }}>
                  <CornerUpLeft size={13} color="#2563EB" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#2563EB' }}>{replyTo.username}</div>
                    <div style={{ fontSize: 12, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{replyTo.content}</div>
                  </div>
                  <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                    <X size={14} />
                  </button>
                </div>
              )}

              <form onSubmit={handleSend} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setShowAttach(!showAttach)}
                    style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: '#F3F4F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}
                  >
                    <Paperclip size={16} />
                  </button>
                  {showAttach && (
                    <div style={{ position: 'absolute', bottom: 44, left: 0, background: '#fff', borderRadius: 10, padding: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 4, zIndex: 50 }}>
                      {[['Dokumen', FileText, '#2563EB'], ['Gambar', ImageIcon, '#7c3aed']].map(([label, Icon, color]) => (
                        <button
                          key={label} type="button"
                          onClick={() => fileInputRef.current.click()}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: '#374151', whiteSpace: 'nowrap' }}
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
                  style={{ flex: 1, padding: '9px 14px', border: '1.5px solid #E5E7EB', borderRadius: 20, fontSize: 14, outline: 'none', background: '#F9FAFB', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
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
                    color: inputText.trim() ? '#fff' : '#9CA3AF', flexShrink: 0, transition: 'all 0.2s',
                  }}
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* RIGHT PANEL — Directory (Hidden on Mobile) */}
        {(activeForum && !isMobile) && (
          <div style={{ width: 272, borderLeft: '1px solid #E5E7EB', background: '#fff', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ padding: '14px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1F2937' }}>Directory</span>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                <MoreVertical size={16} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 0 16px' }}>
              {/* Team Members */}
              <div style={{ padding: '0 16px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <Users size={14} color="#6B7280" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Team Members</span>
                  <span style={{ background: '#F3F4F6', color: '#6B7280', fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 10 }}>
                    {forumMembers.length}
                  </span>
                </div>
                {forumMembers.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', padding: '6px 0' }}>\u2014</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {forumMembers.map(member => (
                      <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: getColor(member.id % 6), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>
                          {getInitials(member.username)}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#1F2937' }}>{member.username}</div>
                          <div style={{ fontSize: 11, color: getRoleColor(member.role) }}>{getRoleLabel(member.role)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ height: 1, background: '#F3F4F6', margin: '12px 0' }} />

              {/* Files */}
              <div style={{ padding: '0 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <FileText size={14} color="#6B7280" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Files</span>
                  <span style={{ background: '#F3F4F6', color: '#6B7280', fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 10 }}>
                    {sharedFiles.length}
                  </span>
                </div>
                {sharedFiles.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', padding: '6px 0' }}>
                    Belum ada file yang dibagikan.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[...sharedFiles].reverse().slice(0, 20).map(file => {
                      const { Icon, color, bg, label } = getFileInfo(file.file_name || '');
                      return (
                        <div key={file.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon size={16} color={color} />
                          </div>
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ fontSize: 12, fontWeight: 500, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.file_name}</div>
                            <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                              {label}{file.file_size ? ` · ${(file.file_size / 1024).toFixed(0)} KB` : ''}
                            </div>
                          </div>
                          <a
                            href={`${SOCKET_URL}/api/messages/download/${file.id}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', flexShrink: 0 }}
                          >
                            <Download size={14} />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile context menu (bottom sheet) */}
      {mobileMenu && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.42)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setMobileMenu(null)}
        >
          <div
            style={{ background: '#fff', borderRadius: '16px 16px 0 0', padding: '16px 16px 24px', width: '100%', maxWidth: 480, boxShadow: '0 -4px 24px rgba(0,0,0,0.1)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: 36, height: 4, background: '#E5E7EB', borderRadius: 2, margin: '0 auto 16px' }} />
            {[
              { icon: Reply, label: 'Reply', onClick: () => handleReply(mobileMenu.msg), color: '#374151' },
              ...(canPin() ? [{ icon: mobileMenu.msg.is_pinned ? PinOff : Pin, label: mobileMenu.msg.is_pinned ? 'Unpin' : 'Pin', onClick: () => handlePin(mobileMenu.msg), color: '#374151' }] : []),
              ...(canDelete(mobileMenu.msg) ? [{ icon: Trash2, label: 'Delete', onClick: () => handleDelete(mobileMenu.msg), color: '#DC2626' }] : []),
            ].map(({ icon: Icon, label, onClick, color }) => (
              <button
                key={label}
                onClick={onClick}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 15, color, width: '100%', borderRadius: 8, textAlign: 'left' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <Icon size={18} /> {label}
              </button>
            ))}
            <button
              onClick={() => setMobileMenu(null)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', border: 'none', background: '#F3F4F6', cursor: 'pointer', fontSize: 14, color: '#6B7280', width: '100%', borderRadius: 8, marginTop: 8, fontWeight: 500 }}
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Join Forum Modal */}
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
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 16 }}
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
