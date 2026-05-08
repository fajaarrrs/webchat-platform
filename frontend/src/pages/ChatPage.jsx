import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { api, BASE_URL } from '../api';
import useBreakpoint from '../hooks/useBreakpoint';
import webcareLogo from '../assets/webcare-logo.webp';
import {
  Search, Send, Paperclip, MoreVertical,
  FileText, ImageIcon, CheckCheck, MessagesSquare, UserPlus, X, Link2, Copy,
  Reply, Pin, PinOff, Trash2, Users, Download, CornerUpLeft, ChevronDown, Pencil,
  Info, Star, Eraser, LogOut, ChevronLeft, ChevronRight, HelpCircle, Settings,
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

function formatRelative(dt) {
  const d = parseUtcDate(dt);
  if (!d) return '—';
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Baru saja';
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.floor(hours / 24)} hari lalu`;
}

function isImageAttachment(fileName = '', fileType = '') {
  return (fileType || '').startsWith('image/')
    || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes((fileName.split('.').pop() || '').toLowerCase());
}

function getFileExtension(fileName = '') {
  const ext = (fileName.split('.').pop() || '').trim();
  return ext.toLowerCase();
}

function getFileInfo(name) {
  const ext = getFileExtension(name);
  const extLabel = ext.toUpperCase() || 'FILE';

  if (ext === 'pdf') return { Icon: FileText, color: '#DC2626', bg: '#FEF2F2', label: extLabel };
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext))
    return { Icon: ImageIcon, color: '#7c3aed', bg: '#F5F3FF', label: extLabel };
  if (['doc', 'docx'].includes(ext))
    return { Icon: FileText, color: '#2563EB', bg: '#EFF6FF', label: extLabel };
  if (['xls', 'xlsx'].includes(ext))
    return { Icon: FileText, color: '#059669', bg: '#ECFDF5', label: extLabel };
  if (['zip', 'rar', '7z'].includes(ext))
    return { Icon: FileText, color: '#b45309', bg: '#FFFBEB', label: extLabel };
  return { Icon: FileText, color: '#6B7280', bg: '#F9FAFB', label: extLabel };
}

function getFileLabel(fileName = '', fileType = '') {
  const ext = getFileExtension(fileName).toUpperCase();
  if (ext) return ext;
  if ((fileType || '').startsWith('image/')) return fileType.split('/')[1]?.toUpperCase() || 'IMAGE';
  if (fileType) return fileType.split('/')[1]?.toUpperCase() || 'FILE';
  return 'FILE';
}

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

function escapeRegex(value = '') {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getActiveMentionQuery(text = '', caretPosition = 0) {
  const prefix = text.slice(0, caretPosition);
  const match = prefix.match(/(^|\s)@([a-zA-Z0-9._-]*)$/);
  if (!match) return null;
  return {
    query: match[2] || '',
    replaceStart: prefix.length - match[2].length - 1,
    replaceEnd: caretPosition,
  };
}

function renderMentions(text = '') {
  const mentionPattern = /(@[a-zA-Z0-9._-]+)/g;
  const parts = String(text).split(mentionPattern);

  return parts.map((part, idx) => {
    if (/^@[a-zA-Z0-9._-]+$/.test(part)) {
      return <span key={`mention-${idx}`} style={{ fontWeight: 600 }}>{part}</span>;
    }
    return <span key={`text-${idx}`}>{part}</span>;
  });
}

// Message text with read-more toggle. Preserves newlines and supports
// a mobile/desktop line clamp with a fallback character limit.
function MessageText({ text = '', isMobile = false, className = '' }) {
  const ref = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [needsToggle, setNeedsToggle] = useState(false);

  const FALLBACK_CHARS = 350;
  const MOBILE_LINES = 5; // per user request
  const DESKTOP_LINES = 8; // per user request
  const maxLines = isMobile ? MOBILE_LINES : DESKTOP_LINES;

  useEffect(() => {
    if (!ref.current) return;

    const el = ref.current;
    const textStr = String(text || '');

    // Fallback: check character limit
    if (textStr.length > FALLBACK_CHARS) {
      setNeedsToggle(true);
      return;
    }

    // Measure overflow by temporarily applying clamp
    const checkOverflow = () => {
      if (!el) return;

      // Store original inline styles
      const origDisplay = el.style.display;
      const origOrient = el.style.WebkitBoxOrient;
      const origClamp = el.style.WebkitLineClamp;
      const origOverflow = el.style.overflow;

      // Apply clamp styles
      el.style.display = '-webkit-box';
      el.style.WebkitBoxOrient = 'vertical';
      el.style.WebkitLineClamp = String(maxLines);
      el.style.overflow = 'hidden';

      // Measure after a small delay to allow layout
      setTimeout(() => {
        const isOverflow = el.scrollHeight > el.clientHeight + 2;
        setNeedsToggle(isOverflow);

        // Restore original styles
        el.style.display = origDisplay;
        el.style.WebkitBoxOrient = origOrient;
        el.style.WebkitLineClamp = origClamp;
        el.style.overflow = origOverflow;
      }, 10);
    };

    checkOverflow();

    // Re-check on resize
    const handleResize = () => checkOverflow();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [text, maxLines]);

  const collapsedStyle = {
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: String(maxLines),
    overflow: 'hidden',
    whiteSpace: 'pre-wrap',
  };

  const expandedStyle = { whiteSpace: 'pre-wrap' };

  if (!text) return null;

  return (
    <div className={className} style={{ width: '100%' }}>
      <div ref={ref} style={needsToggle && !expanded ? collapsedStyle : expandedStyle}>
        {renderMentions(text)}
      </div>
      {needsToggle && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="mt-2 text-xs font-semibold text-blue-600 hover:underline"
        >
          {expanded ? 'Tutup' : 'Baca selengkapnya'}
        </button>
      )}
    </div>
  );
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
  const [dropdownCoords, setDropdownCoords] = useState({ top: 0, left: 0 });
  const [mobileMenu, setMobileMenu] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [forumMembers, setForumMembers] = useState([]);
  const [onlineSet, setOnlineSet] = useState(new Set());
  const [lastSeenMap, setLastSeenMap] = useState({});
  const [caretPosition, setCaretPosition] = useState(0);
  const [mentionActiveIndex, setMentionActiveIndex] = useState(0);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingContent, setEditingContent] = useState('');

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageInputRef = useRef(null);
  const messageSearchInputRef = useRef(null);
  const socketRef = useRef(null);
  const messageRefs = useRef({});
  const prevForumIdRef = useRef(null);
  const activeForumIdRef = useRef(activeForumId);
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
    socket.on('connect', () => {
      console.log('🟢 Socket connected', socket.id);
    });
    socket.on('connect_error', (err) => {
      console.error('Socket connect_error', err);
      try { addToast(err?.message || 'Gagal terhubung ke server (socket).', 'error'); } catch { }
    });
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
    socket.on('message_edited', (updatedMessage) => {
      setMessages((prev) => prev.map((m) => (m.id === updatedMessage.id ? updatedMessage : m)));
      syncForumPreview(updatedMessage);
    });
    // Presence events
    socket.on('presence:forum_users', (payload) => {
      const fid = payload?.forumId;
      if (!fid || fid !== activeForumIdRef.current) return;
      const list = Array.isArray(payload?.online) ? payload.online : [];
      console.log('📥 Forum members received:', list);
      setForumMembers(list);
      const map = {};
      const os = new Set();
      list.forEach((m) => {
        map[m.id] = m.last_online_at || null;
        if (m.online) os.add(m.id);
      });
      setLastSeenMap(map);
      setOnlineSet(os);
    });

    socket.on('presence:user_online', (u) => {
      if (!u || !u.id) return;
      setOnlineSet((prev) => {
        const next = new Set(prev);
        next.add(u.id);
        return next;
      });
      setLastSeenMap((prev) => ({ ...prev, [u.id]: null }));
    });

    socket.on('presence:user_offline', ({ id }) => {
      if (!id) return;
      setOnlineSet((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      const currentFid = activeForumIdRef.current;
      if (currentFid) {
        api.get(`/forums/${currentFid}/online`).then((data) => {
          const list = data?.online || [];
          const map = {};
          list.forEach((m) => { map[m.id] = m.last_online_at || null; });
          setLastSeenMap(map);
          setForumMembers(list);
        }).catch(() => { });
      }
    });
    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    activeForumIdRef.current = activeForumId;
  }, [activeForumId]);

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
    api.get(`/forums/${activeForumId}/online`)
      .then((data) => {
        const list = data?.online || [];
        setForumMembers(list);
        const map = {};
        const os = new Set();
        list.forEach((m) => {
          map[m.id] = m.last_online_at || null;
          if (m.online) os.add(m.id);
        });
        setLastSeenMap(map);
        setOnlineSet(os);
      })
      .catch(() => {
        setForumMembers([]);
        setLastSeenMap({});
        setOnlineSet(new Set());
      });

    setTimeout(() => messageInputRef.current?.focus(), 0);
  }, [activeForumId]);

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
    const handleViewportChange = () => setOpenDropdownId(null);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
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
    if (!inputText.trim() || !activeForumId) return; if (!socketRef.current || !socketRef.current.connected) {
      try { addToast('Belum terhubung ke server. Silakan refresh atau login kembali.', 'error'); } catch { }
      return;
    }
    socketRef.current.emit('send_message', {
      forumId: activeForumId,
      content: inputText.trim(),
      replyToId: replyTo?.id || null,
    });
    setInputText('');
    setReplyTo(null);
  };

  const handleSelectMention = (username, mentionMeta) => {
    if (!mentionMeta) return;

    const before = inputText.slice(0, mentionMeta.replaceStart);
    const after = inputText.slice(mentionMeta.replaceEnd);
    const inserted = `@${username} `;
    const nextText = `${before}${inserted}${after}`;
    const nextCaret = before.length + inserted.length;

    setInputText(nextText);
    setCaretPosition(nextCaret);
    setMentionActiveIndex(0);

    setTimeout(() => {
      if (!messageInputRef.current) return;
      messageInputRef.current.focus();
      messageInputRef.current.setSelectionRange(nextCaret, nextCaret);
    }, 0);
  };

  const handleReply = msg => {
    setReplyTo({ id: msg.id, content: msg.content, username: msg.username });
    setOpenDropdownId(null);
    setMobileMenu(null);
    setTimeout(() => messageInputRef.current?.focus(), 0);
  };

  const handlePin = msg => {
    messageInputRef.current?.blur();
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
    messageInputRef.current?.blur();
    if (!window.confirm('Hapus pesan ini?')) return;
    socketRef.current?.emit('delete_message', { messageId: msg.id, forumId: activeForumId });
    setOpenDropdownId(null);
    setMobileMenu(null);
  };

  const handleCopyMessage = async (msg) => {
    messageInputRef.current?.blur();
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

  const handleMessageInputKeyDown = (e, mentionOptions, mentionMeta) => {
    if (mentionOptions.length > 0 && mentionMeta) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionActiveIndex((prev) => (prev + 1) % mentionOptions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionActiveIndex((prev) => (prev - 1 + mentionOptions.length) % mentionOptions.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSelectMention(mentionOptions[mentionActiveIndex]?.username || mentionOptions[0].username, mentionMeta);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionActiveIndex(0);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      handleSend(e);
    }
  };

  const handleToggleDropdown = (event, msgId, isMe) => {
    const shouldClose = openDropdownId === msgId;
    if (shouldClose) {
      setOpenDropdownId(null);
      return;
    }

    const trigger = event.currentTarget;
    const rect = trigger.getBoundingClientRect();
    const menuWidth = 168;
    const menuHeight = 168;
    const gap = 8;
    const viewportPadding = 8;

    let left = isMe
      ? rect.left - menuWidth - gap
      : rect.right + gap;

    if (left + menuWidth > window.innerWidth - viewportPadding) {
      left = rect.left - menuWidth - gap;
    }
    if (left < viewportPadding) {
      left = rect.right + gap;
    }
    if (left + menuWidth > window.innerWidth - viewportPadding) {
      left = window.innerWidth - menuWidth - viewportPadding;
    }

    let top = rect.top + rect.height / 2 - menuHeight / 2;
    if (top < viewportPadding) {
      top = viewportPadding;
    }
    if (top + menuHeight > window.innerHeight - viewportPadding) {
      top = window.innerHeight - menuHeight - viewportPadding;
    }

    setDropdownCoords({ top, left });
    setOpenDropdownId(msgId);
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
      const res = await fetch(`${BASE_URL}/api/messages/upload`, {
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
  const canEdit = msg => (user?.role === 'admin' || msg.user_id === user?.id) && !msg.file_url;
  const canPin = () => user?.role === 'admin';

  const handleEditMessage = (msg) => {
    if (!canEdit(msg)) return;
    setEditingMessageId(msg.id);
    setEditingContent(msg.content || '');
    setOpenDropdownId(null);
    setMobileMenu(null);
  };

  const handleSaveEditMessage = (msgId) => {
    const trimmed = editingContent.trim();
    if (!trimmed) {
      addToast('Pesan tidak boleh kosong.', 'error');
      return;
    }

    const originalMsg = messages.find(m => m.id === msgId);
    if (trimmed === (originalMsg?.content || '').trim()) {
      setEditingMessageId(null);
      setEditingContent('');
      return;
    }

    socketRef.current?.emit('edit_message', {
      messageId: msgId,
      forumId: activeForumId,
      content: trimmed,
    });

    setEditingMessageId(null);
    setEditingContent('');
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };
  const getReplyPreviewData = (msg) => {
    if (!msg.reply_to_id) return null;

    const repliedMessage = messageLookup[msg.reply_to_id];
    const replyUsername = msg.reply_username || repliedMessage?.username || 'Unknown';
    const replyFileName = msg.reply_file_name || repliedMessage?.file_name || '';
    const replyFileType = msg.reply_file_type || repliedMessage?.file_type || '';
    const replyFileUrl = msg.reply_file_url || repliedMessage?.file_url || '';
    const replyText = msg.reply_content?.trim() || repliedMessage?.content?.trim() || '';
    const isReplyImage = !!replyFileName && isImageAttachment(replyFileName, replyFileType);

    let content = replyText;
    if (!content && replyFileName) {
      content = isReplyImage
        ? `Image: ${getFileLabel(replyFileName, replyFileType)}`
        : `File: ${getFileLabel(replyFileName, replyFileType)}`;
    }
    if (!content) {
      content = 'Pesan tidak ditemukan';
    }

    return {
      username: replyUsername,
      content,
      fileName: replyFileName,
      fileType: replyFileType,
      fileUrl: replyFileUrl,
      isImage: isReplyImage,
    };
  };
  const getForumSenderName = (forum) => {
    if (!forum.last_sender_username) return '';
    return forum.last_sender_id === user?.id ? 'Anda' : forum.last_sender_username;
  };
  const getForumPreview = (forum) => {
    const sender = getForumSenderName(forum);
    const prefix = sender ? `${sender}: ` : '';

    if (forum.last_file_name) {
      const fileLabel = getFileLabel(forum.last_file_name, forum.last_file_type);
      return `${prefix}${isImageAttachment(forum.last_file_name, forum.last_file_type) ? `Image: ${fileLabel}` : `File: ${fileLabel}`}`;
    }

    return `${prefix}${forum.last_message?.trim() || '\u2014'}`;
  };

  const getPinnedPreviewText = (msg) => {
    if (!msg) return '';
    if (msg.content?.trim()) return msg.content.trim();
    if (msg.file_name) {
      const fileLabel = getFileLabel(msg.file_name, msg.file_type);
      return isImageAttachment(msg.file_name, msg.file_type) ? `Image: ${fileLabel}` : `File: ${fileLabel}`;
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

  const handleGoToReplyMessage = (msg) => {
    const replyToId = msg?.reply_to_id;
    if (!replyToId) return;

    const targetMessage = messageLookup[replyToId];
    if (!targetMessage) {
      addToast('Pesan ini sudah dihapus.', 'error');
      return;
    }

    handleGoToMessage(targetMessage);
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

  const handleGoDashboard = () => {
    if (!roleBasePath) return;
    navigate(`${roleBasePath}/dashboard`);
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
  const mentionMeta = getActiveMentionQuery(inputText, caretPosition);
  const mentionSuggestions = mentionMeta
    ? forumMembers
      .filter((member) => member?.username)
      .filter((member) => {
        if (!mentionMeta.query) return true;
        return member.username.toLowerCase().includes(mentionMeta.query.toLowerCase());
      })
      .slice(0, 6)
    : [];

  const isTaggedForCurrentUser = (msg) => {
    if (!user?.username || !msg?.content || msg.user_id === user.id) return false;
    const escapedUsername = escapeRegex(user.username);
    const mentionRegex = new RegExp(`(^|\\s)@${escapedUsername}(?=\\s|$|[.,!?;:])`, 'i');
    return mentionRegex.test(msg.content);
  };

  useEffect(() => {
    setMentionActiveIndex(0);
  }, [mentionMeta?.query, activeForumId]);

  const searchMatches = normalizedMessageSearch
    ? messages.filter((msg) => (`${msg.content || ''} ${msg.file_name || ''}`).toLowerCase().includes(normalizedMessageSearch))
    : [];
  const activeSearchMatchId = searchMatches[searchMatchIndex]?.id;
  const messageLookup = messages.reduce((lookup, message) => {
    lookup[message.id] = message;
    return lookup;
  }, {});

  const isReplyToCurrentUser = (msg) => {
    if (!user || msg?.user_id === user.id || !msg?.reply_to_id) return false;

    const repliedMessage = messageLookup[msg.reply_to_id];
    if (repliedMessage?.user_id === user.id) return true;

    // Fallback when original message is gone from list; snapshot username still exists.
    return !!(msg.reply_username && user.username && msg.reply_username === user.username);
  };

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
        position: 'fixed',
        zIndex: 500,
        minWidth: 152,
        background: '#fff',
        border: '1px solid #E5E7EB',
        borderRadius: 10,
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
        padding: 6,
        ...posStyle,
      }}
    >
      {[
        { icon: Copy, label: 'Salin pesan', onClick: () => handleCopyMessage(msg), color: '#374151' },
        ...(canEdit(msg) ? [{ icon: Pencil, label: 'Edit', onClick: () => handleEditMessage(msg), color: '#374151' }] : []),
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
          className="flex w-full items-center gap-2.5 rounded-md border-0 bg-transparent px-3 py-2 text-left text-[13px] transition-all duration-200 hover:bg-slate-50"
          style={{ color }}
        >
          <Icon size={14} /> {label}
        </button>
      ))}
    </div>
  );

  return (
    <DashboardLayout hideSidebar={isCompactChatLayout}>
      <div className="flex h-screen overflow-hidden font-sans">

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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img src={webcareLogo} alt="Webcare" style={{ height: 24, width: 24, borderRadius: 4 }} />
                <span style={{ fontSize: 16, fontWeight: 700, color: '#1F2937' }}>WebcareChat</span>
              </div>
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
                          { key: 'dashboard', label: 'Dashboard', icon: CornerUpLeft, onClick: handleGoDashboard },
                          { key: 'settings', label: 'Settings', icon: Settings, onClick: handleOpenSettings },
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
                    onClick={() => setActiveForumId(forum.id)}
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
          <div className="flex flex-1 flex-col bg-slate-50 text-slate-400">
            <div className="flex flex-1 flex-col items-center justify-center">
              <MessagesSquare size={48} className="mb-3.5 opacity-30" />
              <p className="text-sm">Pilih forum untuk mulai chat.</p>
            </div>
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 flex-col bg-slate-50">

            {/* Chat Header */}
            <div className="relative z-[320] flex items-center justify-between border-b border-slate-200 bg-white/85 px-5 py-3 backdrop-blur-md">
              <div className="flex items-center gap-3">
                {isMobile && (
                  <button
                    onClick={() => setActiveForumId(null)}
                    title="Kembali ke daftar forum"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50"
                  >
                    <ChevronLeft size={14} />
                  </button>
                )}
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
                  style={{ background: getColor(forums.findIndex(f => f.id === activeForumId)) }}
                >
                  {getInitials(activeForum.title)}
                </div>
                <div>
                  <p className="m-0 text-sm font-bold text-slate-800">{activeForum.title}</p>
                  <p className="m-0 flex items-center gap-1.5 text-xs">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="text-slate-500">Online</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleHeaderSearchClick}
                  title="Cari pesan"
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg border text-slate-500 transition-all duration-200',
                    showMessageSearch
                      ? 'border-blue-200 bg-blue-50 text-blue-600'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  )}
                >
                  <Search size={19} />
                </button>

                <div data-headermenu="true" className="relative">
                  <button
                    onClick={() => setShowHeaderMenu(v => !v)}
                    title="Menu grup"
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg border text-slate-500 transition-all duration-200',
                      showHeaderMenu
                        ? 'border-blue-200 bg-blue-50 text-blue-600'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    )}
                  >
                    <MoreVertical size={19} />
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
            <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-5 py-4">
              {loadingMsgs && <div className="p-4 text-center text-[13px] text-slate-400">Memuat pesan...</div>}
              {!loadingMsgs && messages.length === 0 && (
                <div className="p-8 text-center text-[13px] text-slate-400">
                  Belum ada pesan. Mulai percakapan!
                </div>
              )}

              {messages.map((msg, i) => {
                const isMe = msg.user_id === user?.id;
                const isHighlightedForMe = isTaggedForCurrentUser(msg) || isReplyToCurrentUser(msg);
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
                      <div className="my-2.5 flex justify-center">
                        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
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
                      className={cn(
                        'flex items-center gap-1.5 rounded-xl transition-all duration-200',
                        isMe ? 'justify-end' : 'justify-start',
                        i > 0 && prevMsg?.user_id !== msg.user_id ? 'mt-3.5' : 'mt-0.5',
                        selectionMode ? 'cursor-pointer px-1.5 py-0.5' : 'cursor-default',
                        selectionMode && isSelected ? 'bg-indigo-100' : '',
                        isActiveMatch || isJumpedTarget ? 'ring-2 ring-blue-300' : ''
                      )}
                    >
                      {/* Dropdown trigger — left of MY bubble */}
                      {!selectionMode && isMe && (
                        <div
                          data-msgdropdown="true"
                          className={cn('relative shrink-0 transition-all duration-200', showCtrl ? 'opacity-100' : 'opacity-0')}
                        >
                          <button
                            onClick={(e) => handleToggleDropdown(e, msg.id, true)}
                            className="flex h-6.5 w-6.5 items-center justify-center rounded-full border-0 bg-slate-200 text-slate-500 transition-all duration-200 hover:bg-slate-300"
                          >
                            <ChevronDown size={13} />
                          </button>
                          {isOpen && (
                            renderDropdown(msg, dropdownCoords)
                          )}
                        </div>
                      )}

                      {/* Avatar for others */}
                      {!isMe && (
                        <div
                          className={cn(
                            'mb-0.5 flex h-8 w-8 shrink-0 self-end items-center justify-center rounded-full text-[10px] font-bold text-blue-600',
                            showSender ? 'visible bg-blue-50' : 'invisible bg-transparent'
                          )}
                        >
                          {showSender ? getInitials(msg.username) : ''}
                        </div>
                      )}

                      {/* Bubble */}
                      <div className="max-w-[72%] md:max-w-[62%]">
                        {showSender && (
                          <div className="mb-1 pl-0.5">
                            <div className="text-[13px] font-semibold text-slate-800">
                              {msg.username}
                            </div>
                            <div className="mt-0.5 text-[11px] font-semibold" style={{ color: getRoleColor(msg.role) }}>
                              {getRoleLabel(msg.role)}
                            </div>
                          </div>
                        )}

                        <div
                          className={cn(
                            'break-words text-sm leading-relaxed shadow-sm whitespace-pre-wrap',
                            'rounded-2xl',
                            isMe ? 'rounded-br-md bg-blue-600 text-white' : 'rounded-bl-md border border-slate-100 bg-white text-slate-800',
                            !isMe && isHighlightedForMe ? 'border-amber-300 bg-amber-50 ring-1 ring-amber-200' : '',
                            msg.file_url ? (isImageMessage ? 'p-2' : 'min-w-[210px] px-3 py-2.5') : 'px-3.5 py-2.5',
                            isActiveMatch ? 'ring-2 ring-blue-300' : '',
                            !isActiveMatch && matchesQuery ? 'ring-1 ring-blue-200' : ''
                          )}
                        >
                          {/* Edit Mode UI */}
                          {editingMessageId === msg.id && canEdit(msg) ? (
                            <div className="flex flex-col gap-2">
                              <textarea
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:bg-white resize-none"
                              rows={3}
                              style={{ lineHeight: 1.4 }}
                            />
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleSaveEditMessage(msg.id)}
                                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                              >
                                Simpan
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                Batalkan
                              </button>
                              </div>
                            </div>
                          ) : (
                            <>
                          {replyPreview && (
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => handleGoToReplyMessage(msg)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleGoToReplyMessage(msg);
                                }
                              }}
                              className={cn(
                                'mb-2 flex items-center gap-2 rounded-lg border-l-4 px-2.5 py-1.5 text-xs leading-snug transition-all duration-200',
                                'cursor-pointer hover:opacity-90',
                                isMe
                                  ? 'border-white/50 bg-white/15 text-white/95'
                                  : 'border-blue-600 bg-slate-100 text-slate-500'
                              )}
                            >
                              <div className="min-w-0 flex-1">
                                <div className={cn('font-bold', isMe ? 'text-white/95' : 'text-slate-600')}>
                                  {replyPreview.username}
                                </div>
                                <div className={cn('truncate', isMe ? 'text-white/90' : 'text-slate-500')}>
                                  {replyPreview.content}
                                </div>
                              </div>
                              {replyPreview.isImage && replyPreview.fileUrl && (
                                <img
                                  src={`${BASE_URL}${replyPreview.fileUrl}`}
                                  alt={replyPreview.fileName || 'Reply image'}
                                  style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 8,
                                    objectFit: 'cover',
                                    flexShrink: 0,
                                    background: isMe ? 'rgba(255,255,255,0.18)' : '#E5E7EB',
                                  }}
                                />
                              )}
                            </div>
                          )}
                          {!!msg.is_pinned && (
                            <div className={cn('mb-1 flex items-center gap-1 text-[10px]', isMe ? 'text-white/70' : 'text-blue-600')}>
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
                                      <span style={{ fontSize: 12, fontWeight: 600, color: isMe ? '#fff' : '#374151' }}>
                                        {getFileLabel(msg.file_name || '', msg.file_type || '')}
                                      </span>
                                      {msg.file_size ? (
                                        <span style={{ fontSize: 11, color: isMe ? 'rgba(255,255,255,0.68)' : '#9CA3AF' }}>
                                          · {(msg.file_size / 1024).toFixed(0)} KB
                                        </span>
                                      ) : null}
                                    </div>
                                    <a
                                      href={`${BASE_URL}/api/messages/download/${msg.id}`}
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
                                    href={`${BASE_URL}/api/messages/download/${msg.id}`}
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
                              {msg.content && <MessageText text={msg.content} isMobile={isMobile} className="mt-2 text-[13px]" />}
                            </div>
                          ) : (
                            <MessageText text={msg.content} isMobile={isMobile} />
                          )}

                          <div className={cn('mt-1 flex items-center justify-end gap-1 text-[10px]', isMe ? 'text-white/65' : 'text-slate-400')}>
                            {!!msg.edited_at && <span>diedit</span>}
                            {formatTime(msg.created_at)}
                            {isMe && <CheckCheck size={12} />}
                          </div>
                            </>
                        )}
                        </div>
                      </div>

                      {/* Dropdown trigger — right of OTHERS bubble */}
                      {!selectionMode && !isMe && (
                        <div
                          data-msgdropdown="true"
                          className={cn('relative shrink-0 transition-all duration-200', showCtrl ? 'opacity-100' : 'opacity-0')}
                        >
                          <button
                            onClick={(e) => handleToggleDropdown(e, msg.id, false)}
                            className="flex h-6.5 w-6.5 items-center justify-center rounded-full border-0 bg-slate-200 text-slate-500 transition-all duration-200 hover:bg-slate-300"
                          >
                            <ChevronDown size={13} />
                          </button>
                          {isOpen && (
                            renderDropdown(msg, dropdownCoords)
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
            <div className="border-t border-slate-200 bg-white/90 px-4 pb-4 pt-3 backdrop-blur-sm md:px-5">
              {replyTo && (
                <div className="mb-2.5 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <CornerUpLeft size={13} color="#2563EB" />
                  <div className="flex-1">
                    <div className="text-[11px] font-semibold text-blue-600">{replyTo.username}</div>
                    <div className="truncate text-xs text-slate-500">{replyTo.content}</div>
                  </div>
                  <button onClick={() => setReplyTo(null)} className="border-0 bg-transparent text-slate-400 transition-all duration-200 hover:text-slate-600">
                    <X size={14} />
                  </button>
                </div>
              )}

              <form
                onSubmit={handleSend}
                className={cn(
                  'relative flex items-center rounded-full border border-slate-200 bg-white shadow-lg',
                  isMobile ? 'gap-1.5 px-2 py-1.5' : 'gap-2 px-2.5 py-2'
                )}
              >
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowAttach(!showAttach)}
                    className={cn(
                      'flex items-center justify-center rounded-full border-0 bg-slate-100 text-slate-500 transition-all duration-200 hover:bg-slate-200',
                      isMobile ? 'h-8 w-8' : 'h-9 w-9'
                    )}
                  >
                    <Paperclip size={isMobile ? 15 : 16} />
                  </button>
                  {showAttach && (
                    <div className="absolute bottom-11 left-0 z-50 flex min-w-[170px] flex-col gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                      {[['Dokumen', FileText, '#2563EB'], ['Gambar', ImageIcon, '#7c3aed']].map(([label, Icon, color]) => (
                        <button
                          key={label} type="button"
                          onClick={() => fileInputRef.current.click()}
                          className="flex items-center gap-2 rounded-md border-0 bg-transparent px-3 py-2 text-[13px] whitespace-nowrap text-slate-700 transition-all duration-200 hover:bg-slate-100"
                        >
                          <Icon size={15} color={color} /> Upload {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileUpload} />

                <div className="min-w-0 flex-1">
                  <textarea
                    ref={messageInputRef}
                    value={inputText}
                    rows={1}
                    onChange={e => setInputText(e.target.value)}
                    onClick={(e) => setCaretPosition(e.currentTarget.selectionStart || 0)}
                    onKeyUp={(e) => setCaretPosition(e.currentTarget.selectionStart || 0)}
                    onSelect={(e) => setCaretPosition(e.currentTarget.selectionStart || 0)}
                    onKeyDown={(e) => handleMessageInputKeyDown(e, mentionSuggestions, mentionMeta)}
                    placeholder="Ketik pesan..."
                    className={cn(
                      'w-full min-w-0 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white resize-none',
                      isMobile ? 'min-h-[36px] px-3 py-2 text-[13px]' : 'min-h-[44px] px-4 py-2.5 text-sm'
                    )}
                    style={{ lineHeight: 1.4 }}
                  />
                </div>

                {mentionMeta && mentionSuggestions.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      left: isMobile ? 54 : 60,
                      right: isMobile ? 46 : 52,
                      bottom: isMobile ? 44 : 48,
                      maxHeight: 220,
                      overflowY: 'auto',
                      zIndex: 70,
                      background: '#fff',
                      border: '1px solid #E2E8F0',
                      borderRadius: 12,
                      boxShadow: '0 12px 30px rgba(15, 23, 42, 0.18)',
                      padding: 6,
                    }}
                  >
                    {mentionSuggestions.map((member, idx) => {
                      const isActive = idx === mentionActiveIndex;
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => handleSelectMention(member.username, mentionMeta)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 10,
                            padding: '8px 10px',
                            border: 'none',
                            borderRadius: 8,
                            background: isActive ? '#EFF6FF' : 'transparent',
                            color: '#1F2937',
                            textAlign: 'left',
                            cursor: 'pointer',
                          }}
                        >
                          <span style={{ fontSize: 13, fontWeight: 600 }}>@{member.username}</span>
                          <span style={{ fontSize: 11, color: '#64748B' }}>{getRoleLabel(member.role)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className={cn(
                    'flex shrink-0 items-center justify-center rounded-full border-0 transition-all duration-200',
                    isMobile ? 'h-8 w-8' : 'h-9 w-9',
                    inputText.trim()
                      ? 'cursor-pointer bg-blue-600 text-white hover:bg-blue-700'
                      : 'cursor-not-allowed bg-slate-200 text-slate-400'
                  )}
                >
                  <Send size={isMobile ? 14 : 15} />
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
                  <div style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', padding: '6px 0' }}>Belum ada anggota.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
{forumMembers.map(member => {
                      const online = onlineSet.has(member.id) || !!member.online;
                      const lastSeen = lastSeenMap[member.id] || member.last_online_at || null;
                      
                      // Determine role based on backend role or username pattern
                      let displayRole = 'Client';
                      let roleBg = '#ECFDF5';
                      let roleColor = '#059669';
                      
                      if (member.role === 'admin') {
                        displayRole = 'Admin';
                        roleBg = '#F5F3FF';
                        roleColor = '#7c3aed';
                      } else if (member.role === 'karyawan' || (member.username && member.username.includes('-webcare'))) {
                        displayRole = 'Employee';
                        roleBg = '#EFF6FF';
                        roleColor = '#2563EB';
                      } else {
                        displayRole = 'Client';
                        roleBg = '#ECFDF5';
                        roleColor = '#059669';
                      }
                      
                      return (
                        <div key={member.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: getColor(member.id % 6), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', position: 'relative' }}>
                            {getInitials(member.username)}
                            {online && (
                              <div style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: '#10B981', border: '2px solid #fff' }} />
                            )}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: '#1F2937' }}>
                                {member.username}
                              </div>
                              {member.id === user?.id && (
                                <span style={{ fontSize: 10, fontWeight: 600, color: '#6366F1' }}>Anda</span>
                              )}
                            </div>
                            <div style={{ fontSize: 10, fontWeight: 600, color: roleColor, marginTop: 2 }}>
                              {displayRole}
                            </div>
                            <div style={{ fontSize: 11, color: online ? '#10B981' : '#9CA3AF', marginTop: 2 }}>
                              {online ? 'Online' : `Terakhir terlihat: ${formatRelative(lastSeen)}`}
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
                            href={`${BASE_URL}/api/messages/download/${file.id}`}
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
              ...(canEdit(mobileMenu.msg) ? [{ icon: Pencil, label: 'Edit', onClick: () => handleEditMessage(mobileMenu.msg), color: '#374151' }] : []),
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
                placeholder="Contoh: http://localhost:5173/chat/join/ab12cd34ef"
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
