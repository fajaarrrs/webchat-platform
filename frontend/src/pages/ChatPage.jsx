import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { io } from 'socket.io-client';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { api, BASE_URL } from '../api';
import useBreakpoint from '../hooks/useBreakpoint';
import {
  Search, Send, Paperclip, MoreVertical,
  FileText, ImageIcon, CheckCheck, MessagesSquare, UserPlus, X, Link2, Copy,
  Reply, Pin, PinOff, Trash2, Users, Download, CornerUpLeft, ChevronDown,
  Info, Star, Eraser, LogOut, ChevronLeft, ChevronRight, HelpCircle, UserCircle2, Settings,
} from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
const forumColors = ['#2563EB', '#7c3aed', '#059669', '#d97706', '#0891b2', '#be185d'];
const JAKARTA_TIMEZONE = 'Asia/Jakarta';
const jakartaDateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: JAKARTA_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const chatListDateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: JAKARTA_TIMEZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function parseUtcDate(value) {
  if (!value) return null;
  const utc = value.endsWith('Z') ? value : `${value.replace(' ', 'T')}Z`;
  const date = new Date(utc);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getJakartaDateKey(date) {
  return jakartaDateKeyFormatter.format(date);
}

function formatForumActivityLabel(value) {
  const activityDate = parseUtcDate(value);
  if (!activityDate) return '';

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const activityKey = getJakartaDateKey(activityDate);
  if (activityKey === getJakartaDateKey(today)) return 'Today';
  if (activityKey === getJakartaDateKey(yesterday)) return 'Yesterday';

  return chatListDateFormatter.format(activityDate);
}

function formatMessageGroupLabel(value) {
  const activityDate = parseUtcDate(value);
  if (!activityDate) return '';

  if (getJakartaDateKey(activityDate) === getJakartaDateKey(new Date())) {
    return 'Hari ini';
  }

  return chatListDateFormatter.format(activityDate);
}

function isImageAttachment(fileName = '', fileType = '') {
  return (fileType || '').startsWith('image/')
    || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes((fileName.split('.').pop() || '').toLowerCase());
}

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
  const { user, addToast, logout } = useAuth();
  const { isMobile } = useBreakpoint();
  const location = useLocation();
  const navigate = useNavigate();
  const initialForumId = location.state?.forumId ?? null;
  const isCompactChatLayout = user?.role === 'client' || user?.role === 'karyawan';
  const roleBasePath = user?.role ? `/${user.role}` : '';

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
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [chatTab, setChatTab] = useState('all');
  const [favoriteForumIds, setFavoriteForumIds] = useState([]);

  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [messageSearch, setMessageSearch] = useState('');
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [showDirectory, setShowDirectory] = useState(false);
  const [showPinnedMenu, setShowPinnedMenu] = useState(false);
  const [jumpedMessageId, setJumpedMessageId] = useState(null);

  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [mobileMenu, setMobileMenu] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [forumMembers, setForumMembers] = useState([]);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageSearchInputRef = useRef(null);
  const socketRef = useRef(null);
  const messageRefs = useRef({});
  const prevForumIdRef = useRef(null);
  const longPressTimer = useRef(null);
  const skipFavoriteSaveRef = useRef(true);
  const skipChatTabSaveRef = useRef(true);

  const favoriteKey = user?.id ? `wchat_forum_favorites_${user.id}` : null;
  const chatTabKey = user?.id ? `wchat_chat_tab_${user.id}` : null;
  const sortForumsByActivity = (items) => [...items].sort(
    (a, b) => getActivityTime(b.last_activity || b.created_at) - getActivityTime(a.last_activity || a.created_at)
  );

  const getActivityTime = (value) => {
    return parseUtcDate(value)?.getTime() || 0;
  };

  const applyForumPreviewUpdate = (payload) => {
    const forumId = payload?.forum_id ?? payload?.id;
    if (!forumId) return;

    setForums((prev) => {
      const updated = prev.map((forum) => (
        forum.id === forumId
          ? {
              ...forum,
              ...payload,
              id: forum.id,
            }
          : forum
      ));

      return sortForumsByActivity(updated);
    });
  };

  const syncForumPreview = (message, explicitForumId) => {
    const forumId = explicitForumId ?? message?.forum_id;
    if (!forumId) return;

    setForums((prev) => {
      const updated = prev.map((forum) => {
        if (forum.id !== forumId) return forum;
        return {
          ...forum,
          last_message: message?.content ?? '',
          last_file_name: message?.file_name || null,
          last_file_type: message?.file_type || null,
          last_activity: message?.created_at || forum.last_activity,
          last_sender_id: message?.user_id || forum.last_sender_id || null,
          last_sender_username: message?.username || forum.last_sender_username || null,
          last_sender_role: message?.role || forum.last_sender_role || null,
        };
      });

      return sortForumsByActivity(updated);
    });
  };

  useEffect(() => {
    const token = localStorage.getItem('wchat_token');
    const socket = io(SOCKET_URL, { auth: { token } });
    socketRef.current = socket;
    socket.on('new_message', (msg) => {
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
      syncForumPreview(msg);
    });
    socket.on('forum_preview_updated', (payload) => {
      applyForumPreviewUpdate(payload);
    });
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
      setForums(sortForumsByActivity(data));
      if (!initialForumId && data.length > 0 && !isMobile) setActiveForumId(data[0].id);
    });
  }, [initialForumId, isMobile]);

  useEffect(() => {
    if (!favoriteKey) {
      setFavoriteForumIds([]);
      skipFavoriteSaveRef.current = true;
      return;
    }

    try {
      const raw = localStorage.getItem(favoriteKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setFavoriteForumIds(Array.isArray(parsed) ? parsed : []);
    } catch {
      setFavoriteForumIds([]);
    }
    skipFavoriteSaveRef.current = true;
  }, [favoriteKey]);

  useEffect(() => {
    if (!favoriteKey) return;
    if (skipFavoriteSaveRef.current) {
      skipFavoriteSaveRef.current = false;
      return;
    }
    localStorage.setItem(favoriteKey, JSON.stringify(favoriteForumIds));
  }, [favoriteKey, favoriteForumIds]);

  useEffect(() => {
    if (!chatTabKey) {
      setChatTab('all');
      skipChatTabSaveRef.current = true;
      return;
    }

    const storedTab = localStorage.getItem(chatTabKey);
    setChatTab(storedTab === 'favorites' ? 'favorites' : 'all');
    skipChatTabSaveRef.current = true;
  }, [chatTabKey]);

  useEffect(() => {
    if (!chatTabKey) return;
    if (skipChatTabSaveRef.current) {
      skipChatTabSaveRef.current = false;
      return;
    }
    localStorage.setItem(chatTabKey, chatTab);
  }, [chatTab, chatTabKey]);

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
    setShowHeaderMenu(false);
    setSelectionMode(false);
    setSelectedMessageIds([]);
    setShowMessageSearch(false);
    setMessageSearch('');
    setSearchMatchIndex(0);
    setShowDirectory(false);
    setShowPinnedMenu(false);
    setJumpedMessageId(null);
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

  useEffect(() => {
    const handle = e => {
      if (!e.target.closest('[data-headermenu]')) setShowHeaderMenu(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  useEffect(() => {
    const handle = e => {
      if (!e.target.closest('[data-quickmenu]')) setShowQuickMenu(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  useEffect(() => {
    const handle = e => {
      if (!e.target.closest('[data-pinnedmenu]')) setShowPinnedMenu(false);
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
    if (msg?.is_pinned) {
      const ok = window.confirm('Apakah Anda yakin ingin membatalkan pin pada pesan ini?');
      if (!ok) {
        setOpenDropdownId(null);
        setMobileMenu(null);
        return;
      }
    }
    socketRef.current?.emit('pin_message', { messageId: msg.id, forumId: activeForumId });
    setOpenDropdownId(null);
    setMobileMenu(null);
    setShowPinnedMenu(false);
  };

  const handleDelete = msg => {
    if (!window.confirm('Hapus pesan ini?')) return;
    socketRef.current?.emit('delete_message', { messageId: msg.id, forumId: activeForumId });
    setOpenDropdownId(null);
    setMobileMenu(null);
  };

  const handleCopyMessage = async (msg) => {
    const payload = msg?.content?.trim()
      || msg?.file_name
      || (msg?.file_url ? `${BASE_URL}${msg.file_url}` : '');

    if (!payload) {
      addToast('Pesan tidak memiliki konten untuk disalin.', 'error');
      return;
    }

    try {
      await navigator.clipboard.writeText(payload);
      addToast('Pesan berhasil disalin.', 'success');
    } catch {
      addToast('Gagal menyalin pesan.', 'error');
    }

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
    const match = raw.match(/\/chat\/join\/([^/?#\s]+)/i);
    const token = match ? match[1] : raw;
    setJoinLoading(true);
    try {
      const data = await api.post(`/forums/join/${token}`);
      const updated = await api.get('/forums');
      setForums(updated);
      setActiveForumId(data.forum_id);
      setShowJoinModal(false);
      setJoinLink('');
      addToast(`Berhasil gabung ke forum "${data.title}".`, 'success');
    } catch (err) {
      addToast(err.message || 'Link tidak valid.', 'error');
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
      syncForumPreview(data, activeForumId);
      setReplyTo(null);
    } catch (err) {
      addToast(err.message || 'Gagal mengunggah file.', 'error');
    }
  };

  const getInitials = (name = '') => name.slice(0, 2).toUpperCase();
  const getColor = idx => forumColors[idx % forumColors.length];
  const formatUnreadCount = (count) => (count > 99 ? '99+' : String(count));
  const formatTime = dt => {
    const parsed = parseUtcDate(dt);
    if (!parsed) return '';
    return parsed.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: JAKARTA_TIMEZONE });
  };
  const getRoleLabel = role =>
    role === 'admin' ? 'Admin' : role === 'karyawan' ? 'Employee' : 'Client';
  const getRoleColor = role =>
    role === 'admin' ? '#6d28d9' : role === 'karyawan' ? '#1d4ed8' : '#059669';
  const canDelete = msg => user?.role === 'admin' || msg.user_id === user?.id;
  const canPin = () => user?.role === 'admin';
  const getReplyPreviewData = (msg) => {
    if (!msg.reply_to_id) return null;

    const repliedMessage = messageLookup[msg.reply_to_id];
    const replyUsername = msg.reply_username || repliedMessage?.username || 'Unknown';
    const replyContent = msg.reply_content?.trim()
      || repliedMessage?.content?.trim()
      || (repliedMessage?.file_name
        ? (isImageAttachment(repliedMessage.file_name, repliedMessage.file_type)
          ? 'Gambar'
          : `File: ${repliedMessage.file_name}`)
        : 'Pesan tidak ditemukan');

    return { username: replyUsername, content: replyContent };
  };
  const getForumSenderName = (forum) => {
    if (!forum.last_sender_username) return '';
    return forum.last_sender_id === user?.id ? 'Anda' : forum.last_sender_username;
  };
  const getForumPreview = (forum) => {
    const sender = getForumSenderName(forum);
    const prefix = sender ? `${sender}: ` : '';

    if (forum.last_file_name) {
      return `${prefix}${isImageAttachment(forum.last_file_name, forum.last_file_type) ? 'Gambar' : `File: ${forum.last_file_name}`}`;
    }

    return `${prefix}${forum.last_message?.trim() || '\u2014'}`;
  };

  const getPinnedPreviewText = (msg) => {
    if (!msg) return '';
    if (msg.content?.trim()) return msg.content.trim();
    if (msg.file_name) {
      return isImageAttachment(msg.file_name, msg.file_type) ? 'Gambar' : `File: ${msg.file_name}`;
    }
    return 'Pesan disematkan';
  };

  const handleGoToMessage = (msg) => {
    if (!msg) return;
    const node = messageRefs.current[msg.id];
    node?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setJumpedMessageId(msg.id);
    setShowPinnedMenu(false);
    setTimeout(() => {
      setJumpedMessageId((prev) => (prev === msg.id ? null : prev));
    }, 1400);
  };

  const toggleFavoriteForum = (forumId) => {
    const isFav = favoriteForumIds.includes(forumId);
    setFavoriteForumIds(prev => (
      isFav ? prev.filter(id => id !== forumId) : [...prev, forumId]
    ));
    addToast(isFav ? 'Forum dihapus dari favorit.' : 'Forum ditambahkan ke favorit.', 'success');
  };

  const handleHeaderSearchClick = () => {
    if (!showMessageSearch) {
      setShowMessageSearch(true);
      setTimeout(() => messageSearchInputRef.current?.focus(), 0);
      return;
    }
    if (!messageSearch.trim()) {
      messageSearchInputRef.current?.focus();
      return;
    }
    if (searchMatches.length > 0) {
      setSearchMatchIndex(prev => (prev + 1) % searchMatches.length);
    }
  };

  const handleNavigateSearchMatch = (step) => {
    if (searchMatches.length === 0) return;
    setSearchMatchIndex(prev => (prev + step + searchMatches.length) % searchMatches.length);
  };

  const handleClearChat = async () => {
    if (!activeForumId) return;
    if (!window.confirm('Kosongkan semua pesan di grup ini? Aksi ini tidak bisa dibatalkan.')) return;

    try {
      await api.delete(`/messages/forum/${activeForumId}`);
      setMessages([]);
      const updatedForums = await api.get('/forums');
      setForums(updatedForums);
      addToast('Chat berhasil dikosongkan.', 'success');
    } catch (err) {
      addToast(err.message || 'Gagal mengosongkan chat.', 'error');
    }
    setShowHeaderMenu(false);
  };

  const handleExitGroup = async () => {
    if (!activeForumId) return;
    if (!window.confirm('Keluar dari grup ini?')) return;

    try {
      await api.delete(`/forums/${activeForumId}/leave`);
      const updated = await api.get('/forums');
      setForums(updated);
      if (updated.length === 0) setActiveForumId(null);
      else if (!updated.some(f => f.id === activeForumId)) setActiveForumId(updated[0].id);
      addToast('Berhasil keluar dari grup.', 'success');
    } catch (err) {
      addToast(err.message || 'Gagal keluar dari grup.', 'error');
    }
    setShowHeaderMenu(false);
    setShowDirectory(false);
  };

  const handleShareForumLink = async () => {
    const joinIdentifier = activeForum?.slug || activeForum?.token;
    if (!joinIdentifier) {
      addToast('Link forum tidak tersedia.', 'error');
      setShowHeaderMenu(false);
      return;
    }

    const joinLink = `${window.location.origin}/chat/join/${joinIdentifier}`;
    try {
      await navigator.clipboard.writeText(joinLink);
      addToast('Link forum berhasil disalin.', 'success');
    } catch {
      addToast('Gagal menyalin link forum.', 'error');
    }
    setShowHeaderMenu(false);
  };

  const handleDeleteSelectedMessages = () => {
    if (!activeForumId || selectedMessageIds.length === 0) return;
    const selected = messages.filter(msg => selectedMessageIds.includes(msg.id));
    const deletable = selected.filter(canDelete);

    if (deletable.length === 0) {
      addToast('Tidak ada pesan terpilih yang bisa dihapus.', 'error');
      return;
    }

    if (!window.confirm(`Hapus ${deletable.length} pesan terpilih?`)) return;

    deletable.forEach((msg) => {
      socketRef.current?.emit('delete_message', { messageId: msg.id, forumId: activeForumId });
    });

    if (deletable.length < selected.length) {
      addToast('Sebagian pesan tidak dapat dihapus.', 'error');
    }

    setSelectionMode(false);
    setSelectedMessageIds([]);
  };

  const handleOpenSettings = () => {
    if (!roleBasePath) return;
    navigate(`${roleBasePath}/settings`, { state: { initialTab: 'password' } });
    setShowQuickMenu(false);
  };

  const handleOpenProfile = () => {
    if (!roleBasePath) return;
    navigate(`${roleBasePath}/settings`, { state: { initialTab: 'profile' } });
    setShowQuickMenu(false);
  };

  const handleOpenFaq = () => {
    setShowFaqModal(true);
    setShowQuickMenu(false);
  };

  const handleOpenJoinModal = () => {
    setShowJoinModal(true);
    setShowQuickMenu(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const activeForum = forums.find(f => f.id === activeForumId);
  const isActiveForumFavorite = activeForumId ? favoriteForumIds.includes(activeForumId) : false;
  const tabForums = chatTab === 'favorites'
    ? forums.filter(f => favoriteForumIds.includes(f.id))
    : forums;
  const filteredForums = tabForums.filter(f =>
    f.title.toLowerCase().includes(searchGroup.toLowerCase())
  );
  const showForumListPanel = !isMobile || !activeForumId;
  const showChatPanel = !isMobile || !!activeForumId;

  const normalizedMessageSearch = messageSearch.trim().toLowerCase();
  const searchMatches = normalizedMessageSearch
    ? messages.filter((msg) => (`${msg.content || ''} ${msg.file_name || ''}`).toLowerCase().includes(normalizedMessageSearch))
    : [];
  const activeSearchMatchId = searchMatches[searchMatchIndex]?.id;
  const messageLookup = messages.reduce((lookup, message) => {
    lookup[message.id] = message;
    return lookup;
  }, {});

  useEffect(() => {
    setSearchMatchIndex(0);
  }, [messageSearch, activeForumId]);

  useEffect(() => {
    if (!activeSearchMatchId) return;
    const node = messageRefs.current[activeSearchMatchId];
    node?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeSearchMatchId]);
  const pinnedMessages = messages.filter(m => m.is_pinned);
  const latestPinnedMessage = pinnedMessages[pinnedMessages.length - 1] || null;
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
        { icon: Copy, label: 'Salin pesan', onClick: () => handleCopyMessage(msg), color: '#374151' },
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
    <DashboardLayout hideSidebar={isCompactChatLayout}>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

        {/* LEFT PANEL */}
        {showForumListPanel && (
        <div style={{
          width: isMobile ? '100%' : 300,
          borderRight: isMobile ? 'none' : '1px solid #E5E7EB',
          background: '#fff',
          display: 'flex', flexDirection: 'column', flexShrink: 0,
        }}>
          <div style={{ padding: '14px 16px 10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#1F2937' }}>WebcareChat</span>

              {user?.role !== 'admin' && (
                <div data-quickmenu="true" style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowQuickMenu(v => !v)}
                    title="Menu"
                    style={{
                      width: 32, height: 32, borderRadius: 8, border: '1.5px solid #E5E7EB',
                      background: showQuickMenu ? '#EFF6FF' : '#fff', color: showQuickMenu ? '#2563EB' : '#6B7280', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <MoreVertical size={15} />
                  </button>

                  {showQuickMenu && (
                    <div style={{ position: 'absolute', top: 38, right: 0, width: 196, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, boxShadow: '0 12px 28px rgba(0,0,0,0.12)', padding: 6, zIndex: 120 }}>
                      {[
                        { key: 'settings', label: 'Settings', icon: Settings, onClick: handleOpenSettings },
                        { key: 'profile', label: 'Profile', icon: UserCircle2, onClick: handleOpenProfile },
                        { key: 'join', label: 'Gabung Forum', icon: UserPlus, onClick: handleOpenJoinModal },
                        { key: 'faq', label: 'FAQ', icon: HelpCircle, onClick: handleOpenFaq },
                        { key: 'logout', label: 'Logout', icon: LogOut, onClick: handleLogout, danger: true },
                      ].map(({ key, label, icon: Icon, onClick }) => (
                        <button
                          key={key}
                          onClick={onClick}
                          style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, fontSize: 13, color: key === 'logout' ? '#DC2626' : '#374151', textAlign: 'left' }}
                          onMouseEnter={e => e.currentTarget.style.background = key === 'logout' ? '#FEF2F2' : '#F9FAFB'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                          <Icon size={14} /> {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
              {[
                { key: 'all', label: 'Semua' },
                { key: 'favorites', label: 'Favorit' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setChatTab(tab.key)}
                  style={{
                    padding: '5px 13px', borderRadius: 16, border: 'none', cursor: 'pointer',
                    background: chatTab === tab.key ? '#2563EB' : '#F3F4F6',
                    color: chatTab === tab.key ? '#fff' : '#6B7280',
                    fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredForums.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: '#9CA3AF', fontSize: 13 }}>
                {chatTab === 'favorites'
                  ? 'Belum ada forum favorit.'
                  : user?.role === 'admin' ? 'Belum ada forum.' : (
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
              const activityLabel = formatForumActivityLabel(forum.last_activity || forum.created_at);
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
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {forum.title}
                        </span>
                        {favoriteForumIds.includes(forum.id) && <Star size={11} color="#d97706" fill="#fbbf24" />}
                      </div>
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{forum.project}</div>
                      <div style={{ fontSize: 12, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                        {getForumPreview(forum)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                      {activityLabel && (
                        <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                          {activityLabel}
                        </span>
                      )}
                      {Number(forum.unread_count) > 0 && (
                        <span style={{
                          minWidth: 20,
                          height: 20,
                          padding: '0 6px',
                          borderRadius: 999,
                          background: '#2563EB',
                          color: '#fff',
                          fontSize: 11,
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          lineHeight: 1,
                        }}>
                          {formatUnreadCount(Number(forum.unread_count))}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        )}

        {/* CENTER PANEL */}
        {showChatPanel && (!activeForum ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F9FAFB', color: '#9CA3AF' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <MessagesSquare size={48} style={{ marginBottom: 14, opacity: 0.3 }} />
              <p style={{ fontSize: 14 }}>Pilih forum untuk mulai chat.</p>
            </div>
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
              position: 'relative', zIndex: 320,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {isMobile && (
                  <button
                    onClick={() => setActiveForumId(null)}
                    title="Kembali ke daftar forum"
                    style={{ width: 30, height: 30, borderRadius: 8, border: '1.5px solid #E5E7EB', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}
                  >
                    <ChevronLeft size={14} />
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
                <button
                  onClick={handleHeaderSearchClick}
                  title="Cari pesan"
                  style={{ width: 34, height: 34, borderRadius: 8, border: '1.5px solid #E5E7EB', background: showMessageSearch ? '#EFF6FF' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: showMessageSearch ? '#2563EB' : '#6B7280' }}
                >
                  <Search size={15} />
                </button>

                <div data-headermenu="true" style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowHeaderMenu(v => !v)}
                    title="Menu grup"
                    style={{ width: 34, height: 34, borderRadius: 8, border: '1.5px solid #E5E7EB', background: showHeaderMenu ? '#EFF6FF' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: showHeaderMenu ? '#2563EB' : '#6B7280' }}
                  >
                    <MoreVertical size={15} />
                  </button>

                  {showHeaderMenu && (
                    <div style={{ position: 'absolute', top: 40, right: 0, width: 220, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, boxShadow: '0 12px 28px rgba(0,0,0,0.12)', padding: 6, zIndex: 120 }}>
                      {[
                        { key: 'info', label: 'Grup Info', icon: Info, onClick: () => { setShowDirectory(true); setShowHeaderMenu(false); } },
                        { key: 'share-link', label: 'Share link', icon: Link2, onClick: handleShareForumLink },
                        { key: 'favorite', label: isActiveForumFavorite ? 'Remove from favorites' : 'Add to favorites', icon: Star, onClick: () => { if (activeForumId) toggleFavoriteForum(activeForumId); setShowHeaderMenu(false); } },
                        { key: 'clear', label: 'Clear chat', icon: Eraser, onClick: handleClearChat, danger: user?.role !== 'admin' },
                        { key: 'exit', label: 'Exit group', icon: LogOut, onClick: handleExitGroup, danger: true },
                      ].map(({ key, label, icon: Icon, onClick, danger }) => (
                        <button
                          key={key}
                          onClick={onClick}
                          style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, fontSize: 13, color: danger ? '#DC2626' : '#374151', textAlign: 'left' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                          <Icon size={14} /> {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {showMessageSearch && (
              <div style={{ padding: '10px 20px', background: '#fff', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Search size={14} color="#6B7280" />
                <input
                  ref={messageSearchInputRef}
                  value={messageSearch}
                  onChange={e => setMessageSearch(e.target.value)}
                  placeholder="Cari pesan di grup ini..."
                  style={{ flex: 1, border: '1px solid #E5E7EB', borderRadius: 8, padding: '7px 10px', fontSize: 13, outline: 'none' }}
                />
                <span style={{ fontSize: 12, color: '#6B7280', minWidth: 44, textAlign: 'center' }}>
                  {searchMatches.length === 0 ? '0/0' : `${searchMatchIndex + 1}/${searchMatches.length}`}
                </span>
                <button onClick={() => handleNavigateSearchMatch(-1)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ChevronLeft size={14} />
                </button>
                <button onClick={() => handleNavigateSearchMatch(1)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ChevronRight size={14} />
                </button>
                <button
                  onClick={() => { setShowMessageSearch(false); setMessageSearch(''); setSearchMatchIndex(0); }}
                  style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Pinned bar */}
            {pinnedMessages.length > 0 && (
              <div style={{ padding: '7px 20px', background: '#EFF6FF', borderBottom: '1px solid #DBEAFE', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#1D4ED8' }}>
                <Pin size={12} />
                <span style={{ fontWeight: 600 }}>Pinned:</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                  {getPinnedPreviewText(latestPinnedMessage)}
                </span>
                <div data-pinnedmenu="true" style={{ position: 'relative', flexShrink: 0 }}>
                  <button
                    onClick={() => setShowPinnedMenu(v => !v)}
                    title="Menu pesan pin"
                    style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #BFDBFE', background: '#fff', cursor: 'pointer', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <ChevronDown size={14} />
                  </button>

                  {showPinnedMenu && latestPinnedMessage && (
                    <div style={{ position: 'absolute', top: 30, right: 0, width: 178, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, boxShadow: '0 12px 28px rgba(0,0,0,0.15)', padding: 6, zIndex: 210 }}>
                      <button
                        onClick={() => handleGoToMessage(latestPinnedMessage)}
                        style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 7, fontSize: 13, color: '#374151', textAlign: 'left' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        <Link2 size={14} /> Pergi ke pesan
                      </button>
                      {canPin() && (
                        <button
                          onClick={() => handlePin(latestPinnedMessage)}
                          style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 7, fontSize: 13, color: '#DC2626', textAlign: 'left' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                          <PinOff size={14} /> Lepas pin
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectionMode && (
              <div style={{ padding: '8px 20px', background: '#EEF2FF', borderBottom: '1px solid #DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1E40AF' }}>{selectedMessageIds.length} pesan dipilih</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={handleDeleteSelectedMessages}
                    disabled={selectedMessageIds.length === 0}
                    style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: selectedMessageIds.length === 0 ? '#BFDBFE' : '#2563EB', color: '#fff', fontSize: 12, cursor: selectedMessageIds.length === 0 ? 'not-allowed' : 'pointer' }}
                  >
                    Hapus Terpilih
                  </button>
                  <button
                    onClick={() => { setSelectionMode(false); setSelectedMessageIds([]); }}
                    style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #C7D2FE', background: '#fff', color: '#4F46E5', fontSize: 12, cursor: 'pointer' }}
                  >
                    Selesai
                  </button>
                </div>
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
                const isImageMessage = isImageAttachment(msg.file_name || '', msg.file_type || '');
                const replyPreview = getReplyPreviewData(msg);
                const prevMsg = messages[i - 1];
                const currentDateKey = getJakartaDateKey(parseUtcDate(msg.created_at) || new Date(0));
                const previousDateKey = prevMsg ? getJakartaDateKey(parseUtcDate(prevMsg.created_at) || new Date(0)) : null;
                const showDateSeparator = i === 0 || currentDateKey !== previousDateKey;
                const showSender = !isMe && (i === 0 || prevMsg?.user_id !== msg.user_id);
                const isHovered = hoveredMsgId === msg.id;
                const isOpen = openDropdownId === msg.id;
                const isSelected = selectedMessageIds.includes(msg.id);
                const textPayload = `${msg.content || ''} ${msg.file_name || ''}`.toLowerCase();
                const matchesQuery = normalizedMessageSearch && textPayload.includes(normalizedMessageSearch);
                const isActiveMatch = activeSearchMatchId === msg.id;
                const isJumpedTarget = jumpedMessageId === msg.id;
                const showCtrl = !selectionMode && (isHovered || isOpen);

                return (
                  <div key={msg.id}>
                    {showDateSeparator && (
                      <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0 12px' }}>
                        <span style={{
                          padding: '5px 12px',
                          borderRadius: 999,
                          background: '#E5E7EB',
                          color: '#4B5563',
                          fontSize: 12,
                          fontWeight: 600,
                          boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                        }}>
                          {formatMessageGroupLabel(msg.created_at)}
                        </span>
                      </div>
                    )}

                    <div
                      ref={(node) => { if (node) messageRefs.current[msg.id] = node; }}
                      onMouseEnter={() => setHoveredMsgId(msg.id)}
                      onMouseLeave={() => setHoveredMsgId(null)}
                      onTouchStart={e => handleTouchStart(e, msg)}
                      onTouchEnd={handleTouchEnd}
                      onTouchMove={handleTouchEnd}
                      onClick={() => {
                        if (!selectionMode) return;
                        setSelectedMessageIds(prev => (
                          prev.includes(msg.id) ? prev.filter(id => id !== msg.id) : [...prev, msg.id]
                        ));
                      }}
                      style={{
                        display: 'flex',
                        justifyContent: isMe ? 'flex-end' : 'flex-start',
                        alignItems: 'center',
                        gap: 6,
                        marginTop: (i > 0 && prevMsg?.user_id !== msg.user_id) ? 14 : 2,
                        padding: selectionMode ? '2px 6px' : 0,
                        borderRadius: 10,
                        background: selectionMode && isSelected ? '#E0E7FF' : 'transparent',
                        outline: (isActiveMatch || isJumpedTarget) ? '2px solid #93C5FD' : 'none',
                        cursor: selectionMode ? 'pointer' : 'default',
                      }}
                    >
                    {/* Dropdown trigger — left of MY bubble */}
                    {!selectionMode && isMe && (
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
                          <div style={{ position: 'absolute', top: 30, right: 0 }}>
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

                      <div style={{
                        background: isMe ? 'linear-gradient(135deg, #1D4ED8, #2563EB)' : '#fff',
                        color: isMe ? '#fff' : '#1F2937',
                        padding: msg.file_url ? (isImageMessage ? 8 : '10px 12px') : '9px 13px',
                        borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        fontSize: 14, lineHeight: 1.5,
                        border: isMe ? 'none' : '1px solid #F3F4F6',
                        wordBreak: 'break-word',

                        minWidth: msg.file_url && !isImageMessage ? 210 : undefined,
                        boxShadow: isActiveMatch
                          ? '0 0 0 2px #93C5FD'
                          : matchesQuery ? '0 0 0 1px #BFDBFE' : '0 1px 3px rgba(0,0,0,0.07)',

                      }}>
                        {replyPreview && (
                          <div style={{
                            background: isMe ? 'rgba(255,255,255,0.12)' : '#F3F4F6',
                            borderLeft: `3px solid ${isMe ? 'rgba(255,255,255,0.45)' : '#2563EB'}`,
                            borderRadius: 8,
                            padding: '6px 10px',
                            marginBottom: 8,
                            fontSize: 12,
                            lineHeight: 1.3,
                            color: isMe ? 'rgba(255,255,255,0.95)' : '#6B7280',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            <span style={{ fontWeight: 700, color: isMe ? 'rgba(255,255,255,0.95)' : '#4B5563' }}>{replyPreview.username}: </span>
                            {replyPreview.content}
                          </div>
                        )}
                        {!!msg.is_pinned && (
                          <div style={{ fontSize: 10, marginBottom: 3, color: isMe ? 'rgba(255,255,255,0.7)' : '#2563EB', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Pin size={9} /> Pinned
                          </div>
                        )}

                        {msg.file_url ? (
                          <div>
                            {isImageMessage ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 220 }}>
                                <a
                                  href={`${BASE_URL}${msg.file_url}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  style={{ textDecoration: 'none', display: 'block' }}
                                >
                                  <img
                                    src={`${BASE_URL}${msg.file_url}`}
                                    alt={msg.file_name || 'Gambar'}
                                    style={{
                                      width: '100%',
                                      aspectRatio: '1 / 1',
                                      objectFit: 'cover',
                                      borderRadius: 12,
                                      display: 'block',
                                      background: isMe ? 'rgba(255,255,255,0.18)' : '#F3F4F6',
                                    }}
                                  />
                                </a>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                                    <ImageIcon size={14} color={isMe ? '#E0E7FF' : '#6B7280'} />
                                    <span style={{ fontSize: 12, fontWeight: 600, color: isMe ? '#fff' : '#374151' }}>Gambar</span>
                                    {msg.file_size ? (
                                      <span style={{ fontSize: 11, color: isMe ? 'rgba(255,255,255,0.68)' : '#9CA3AF' }}>
                                        · {(msg.file_size / 1024).toFixed(0)} KB
                                      </span>
                                    ) : null}
                                  </div>
                                  <a
                                    href={`http://localhost:5000/api/messages/download/${msg.id}`}
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
                              </div>
                            ) : (
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
                                  href={`http://localhost:5000/api/messages/download/${msg.id}`}
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
                            )}
                            
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
                    {!selectionMode && !isMe && (
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
                          <div style={{ position: 'absolute', top: 30, left: 0 }}>
                            {renderDropdown(msg)}
                          </div>
                        )}
                      </div>
                    )}
                    </div>
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
        ))}

        {/* RIGHT PANEL — Directory */}
        {activeForum && showDirectory && (

          <div style={{ width: 272, borderLeft: '1px solid #E5E7EB', background: '#fff', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ padding: '14px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1F2937' }}>Directory</span>
              <button
                onClick={() => setShowDirectory(false)}
                title="Tutup directory"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
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
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#1F2937', display: 'flex', alignItems: 'center', gap: 5 }}>
                            {member.username}
                            {member.id === user?.id && (
                              <span style={{ fontSize: 10, fontWeight: 600, color: '#6366F1', background: '#EEF2FF', borderRadius: 6, padding: '1px 6px' }}>Anda</span>
                            )}
                          </div>
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
              { icon: Copy, label: 'Salin pesan', onClick: () => handleCopyMessage(mobileMenu.msg), color: '#374151' },
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

      {/* FAQ Modal */}
      {showFaqModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) setShowFaqModal(false); }}
        >
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: '#eff6ff', borderRadius: 10, padding: 8 }}><HelpCircle size={18} color="#2563EB" /></div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1F2937', margin: 0 }}>FAQ</h2>
              </div>
              <button onClick={() => setShowFaqModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13, color: '#4B5563' }}>
              <div style={{ padding: '10px 12px', borderRadius: 10, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                <strong style={{ color: '#1F2937' }}>Bagaimana cara gabung forum?</strong>
                <p style={{ margin: '6px 0 0' }}>Buka menu titik tiga, pilih Gabung Forum, lalu paste link atau token dari admin.</p>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: 10, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                <strong style={{ color: '#1F2937' }}>Bagaimana edit profil?</strong>
                <p style={{ margin: '6px 0 0' }}>Buka menu titik tiga lalu pilih Profile untuk mengubah data akun.</p>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: 10, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                <strong style={{ color: '#1F2937' }}>Di mana pengaturan akun?</strong>
                <p style={{ margin: '6px 0 0' }}>Pilih Settings pada menu titik tiga untuk membuka halaman pengaturan.</p>
              </div>
            </div>
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
