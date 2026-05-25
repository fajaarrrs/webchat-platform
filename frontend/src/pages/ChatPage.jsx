import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import DashboardLayout from '../components/DashboardLayout';
import CreateEventModal from '../components/CreateEventModal';
import PushNotificationModal from '../components/PushNotificationModal';
import { useAuth } from '../context/AuthContext';
import { api, BASE_URL } from '../api';
import useBreakpoint from '../hooks/useBreakpoint';
import { usePushNotifications } from '../hooks/usePushNotifications';
import ForumListPanel from './chat/components/ForumListPanel';
import MessageList from './chat/components/MessageList';
import ChatInput from './chat/components/ChatInput';
import DirectoryPanel from './chat/components/DirectoryPanel';
import ChatHeader from './chat/components/ChatHeader';
import TaskSlider from './chat/components/TaskSlider';
import FaqModal from './chat/components/FaqModal';
import JoinModal from './chat/components/JoinModal';
import ViewEventModal from './chat/components/ViewEventModal';
import useChatSearch from './chat/hooks/useChatSearch';
import {
  cn,
  escapeRegex,
  formatForumActivityLabel,
  formatMessageGroupLabel,
  formatTime,
  formatUnreadCount,
  getActiveMentionQuery,
  getColor,
  getFileInfo,
  getFileLabel,
  getInitials,
  getJakartaDateKey,
  getRoleColor,
  getRoleLabel,
  isImageAttachment,
  parseUtcDate,
} from './chat/chatUtils';
import {
  Search,
  MoreVertical,
  MessagesSquare,
  Copy,
  Pencil,
  Reply,
  Pin,
  PinOff,
  Trash2,
  X,
  Link2,
  Info,
  Star,
  Eraser,
  LogOut,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Calendar,
  Clock,
  MapPin,
} from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export default function ChatPage() {
  const { user, addToast, logout } = useAuth();
  const { isMobile } = useBreakpoint();
  const { 
    showPermissionModal, 
    setShowPermissionModal, 
    requestNotificationPermission 
  } = usePushNotifications();
  const [pushModalLoading, setPushModalLoading] = useState(false);
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
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null); // msg object being edited
  const [viewingEvent, setViewingEvent] = useState(null); // msg object being viewed
  const [eventLoading, setEventLoading] = useState(false);
  const [chatTab, setChatTab] = useState('all');
  const [favoriteForumIds, setFavoriteForumIds] = useState([]);

  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [messageSearch, setMessageSearch] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [showDirectory, setShowDirectory] = useState(false);
  const [showPinnedMenu, setShowPinnedMenu] = useState(false);
  const [jumpedMessageId, setJumpedMessageId] = useState(null);
  const [showTaskSlider, setShowTaskSlider] = useState(false);

  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  const [openReactionPickerFor, setOpenReactionPickerFor] = useState(null);
  const [openReactionUsersFor, setOpenReactionUsersFor] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [reactionPickerPos, setReactionPickerPos] = useState(null);
  const [reactionPickerMainEmojis, setReactionPickerMainEmojis] = useState([]);
  const [reactionPickerShowExtended, setReactionPickerShowExtended] = useState(false);
  const [dropdownCoords, setDropdownCoords] = useState({ top: 0, left: 0 });
  const [mobileMenu, setMobileMenu] = useState(null);
  const [dropdownArrow, setDropdownArrow] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [forumMembers, setForumMembers] = useState([]);
  const [caretPosition, setCaretPosition] = useState(0);
  const [mentionActiveIndex, setMentionActiveIndex] = useState(0);

  const messagesEndRef = useRef(null);
  const messageListContainerRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const isAtBottomRef = useRef(true);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const fileInputRef = useRef(null);
  const messageInputRef = useRef(null);
  const messageSearchInputRef = useRef(null);
  const socketRef = useRef(null);
  const messageRefs = useRef({});
  const messageBubbleRefs = useRef({});
  const messageReactionRefs = useRef({});
  const emojiPickerRef = useRef(null);
  const emojiButtonRef = useRef(null);
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
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        const next = [...prev, msg];
        // If user is at bottom, keep view pinned to bottom
        if (isAtBottomRef.current) {
          // scroll after render
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        } else {
          // user scrolled up: increment unseen count and don't force scroll
          setNewMessageCount((c) => c + 1);
        }
        syncForumPreview(msg);
        return next;
      });
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
    socket.on('event_updated', (updatedMessage) => {
      setMessages((prev) => prev.map((m) => (m.id === updatedMessage.id ? updatedMessage : m)));
    });
    socket.on('message_reactions_updated', ({ messageId, reactions, users }) => {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions: reactions || [], reacting_users: users || [] } : m));
    });
    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });
    return () => socket.disconnect();
  }, []);

  // Monitor scroll position of the message list container to show/hide the
  // floating "scroll to bottom" button and reset unseen count when user
  // scrolls back to bottom.
  useEffect(() => {
    const el = messageListContainerRef.current;
    if (!el) return;
    const THRESH = 60; // px from bottom considered "at bottom"
    const onScroll = () => {
      const atBottom = (el.scrollHeight - el.scrollTop - el.clientHeight) < THRESH;
      isAtBottomRef.current = atBottom;
      setIsAtBottom(atBottom);
      if (atBottom) setNewMessageCount(0);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    // initial check
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, [messageListContainerRef.current]);

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
    setShowDirectory(false);
    setShowPinnedMenu(false);
    setJumpedMessageId(null);
    api.get(`/messages/${activeForumId}`)
      .then(data => setMessages(data))
      .finally(() => setLoadingMsgs(false));
    api.get(`/forums/${activeForumId}/members`)
      .then(data => setForumMembers(data))
      .catch(() => setForumMembers([]));

    setTimeout(() => messageInputRef.current?.focus(), 0);
  }, [activeForumId]);

  // Remove automatic scrolling on every messages change. Instead, only auto-scroll
  // when the user is currently at the bottom. When user is scrolled up, show
  // a floating "scroll to bottom" button with a badge count for new messages.

  useEffect(() => {
    const handle = e => {
      if (!e.target.closest('[data-msgdropdown]')) {
        setOpenDropdownId(null);
        setDropdownArrow(null);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const onDocClick = (e) => {
      if (!openReactionPickerFor) return;
      const pickerNode = emojiPickerRef.current;
      if (pickerNode && pickerNode.contains(e.target)) return;
      setOpenReactionPickerFor(null);
      setReactionPickerPos(null);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [openReactionPickerFor]);

  // After the picker is rendered, measure and nudge it so it sits close to the bubble (not far above)
  useEffect(() => {
    if (!openReactionPickerFor || openReactionPickerFor === 'input' || !reactionPickerPos) return;
    const pickerNode = emojiPickerRef.current;
    const targetNode = messageRefs.current[openReactionPickerFor];
    if (!pickerNode || !targetNode || !pickerNode.getBoundingClientRect) return;

    const pickerRect = pickerNode.getBoundingClientRect();
    const targetRect = targetNode.getBoundingClientRect();
    const spaceAbove = targetRect.top - 8;
    const spaceBelow = window.innerHeight - targetRect.bottom - 8;

    let top;
    if (spaceAbove >= pickerRect.height + 6) {
      // place just above with small gap
      top = Math.max(8, targetRect.top - pickerRect.height - 6);
    } else if (spaceBelow >= pickerRect.height + 6) {
      top = targetRect.bottom + 6;
    } else {
      // fallback: choose side with more space but clamp to viewport
      if (spaceBelow > spaceAbove) {
        top = Math.max(8, Math.min(targetRect.bottom + 6, window.innerHeight - pickerRect.height - 8));
      } else {
        top = Math.max(8, Math.min(targetRect.top - pickerRect.height - 6, window.innerHeight - pickerRect.height - 8));
      }
    }

    setReactionPickerPos(prev => {
      if (!prev) return prev;
      if (Math.abs((prev.top || 0) - top) < 1) return prev;
      return { ...prev, top };
    });
  }, [openReactionPickerFor, reactionPickerPos?.left, reactionPickerPos?.width, messages]);

  // After input picker is rendered, ensure it does not overlap the input area
  useEffect(() => {
    if (openReactionPickerFor !== 'input' || !reactionPickerPos) return;
    const pickerNode = emojiPickerRef.current;
    const inputNode = messageInputRef.current;
    if (!pickerNode || !inputNode || !pickerNode.getBoundingClientRect) return;

    const pickerRect = pickerNode.getBoundingClientRect();
    const inputRect = inputNode.getBoundingClientRect();
    const overlap = pickerRect.bottom > inputRect.top - 8;
    if (!overlap) return;

    const nextTop = Math.max(8, inputRect.top - pickerRect.height - 8);
    setReactionPickerPos(prev => {
      if (!prev) return prev;
      if (Math.abs((prev.top || 0) - nextTop) < 1) return prev;
      return { ...prev, top: nextTop };
    });
  }, [openReactionPickerFor, reactionPickerPos?.left, reactionPickerPos?.width, inputText]);

  // Position floating reaction containers next to the message bubble (align to bubble, not avatar)
  useEffect(() => {
    const updateReactionPositions = () => {
      messages.forEach((m) => {
        const parent = messageRefs.current[m.id];
        const bubble = messageBubbleRefs.current[m.id];
        const reactEl = messageReactionRefs.current[m.id];
        if (!parent || !bubble || !reactEl) return;

        try {
          const parentRect = parent.getBoundingClientRect();
          const bubbleRect = bubble.getBoundingClientRect();
          const reactRect = reactEl.getBoundingClientRect();

          let left;
          const isMy = m.user_id === user?.id;
          const offsetX = 6; // slight offset from bubble edge

          if (isMy) {
            // align reaction right edge with bubble right edge
            left = bubbleRect.right - parentRect.left - reactRect.width + offsetX;
          } else {
            // align reaction left edge with bubble left edge
            left = bubbleRect.left - parentRect.left + offsetX;
          }

          // clamp inside parent
          left = Math.max(0, Math.min(left, parent.clientWidth - reactRect.width));
          reactEl.style.left = `${left}px`;
        } catch (err) {
          // ignore measurement errors
        }
      });
    };

    updateReactionPositions();
    window.addEventListener('resize', updateReactionPositions);
    return () => window.removeEventListener('resize', updateReactionPositions);
  }, [messages, user]);

  // Close attach popup when clicking outside
  useEffect(() => {
    if (!showAttach) return;
    const handle = (e) => {
      if (e.target.closest('[data-attachmenu]')) return;
      setShowAttach(false);
    };
    document.addEventListener('pointerdown', handle);
    return () => document.removeEventListener('pointerdown', handle);
  }, [showAttach]);

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
    if (!inputText.trim() || !activeForumId) return;
    socketRef.current?.emit('send_message', {
      forumId: activeForumId,
      content: inputText.trim(),
      replyToId: replyTo?.id || null,
    });
    setInputText('');
    setReplyTo(null);
  };

  const handleCreateEvent = (eventData) => {
    if (!activeForumId) return;
    socketRef.current?.emit('send_message', {
      forumId: activeForumId,
      content: '',
      eventData,
    });
    setShowEventModal(false);
    addToast('Event berhasil dibuat!', 'success');
  };

  const handleEditEvent = (eventData) => {
    if (!editingEvent || !activeForumId) return;
    setEventLoading(true);
    socketRef.current?.emit('edit_event', {
      messageId: editingEvent.id,
      forumId: activeForumId,
      eventData,
    });
    setEditingEvent(null);
    setEventLoading(false);
    addToast('Event berhasil diperbarui!', 'success');
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

  const handleToggleReaction = async (messageId, emoji) => {
    if (!messageId || !emoji) return;
    const msg = messages.find(m => m.id === messageId);
    const existing = msg?.reacting_users?.find(u => u.userId === user?.id);
    const isRemoval = existing && existing.emoji === emoji;
    const isChange = existing && existing.emoji !== emoji;

    // Update user emoji prefs only when adding/changing to the new emoji
    if (!isRemoval && (isChange || !existing)) {
      try {
        const key = `wchat_emoji_prefs_${user?.id}`;
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : { counts: {}, recents: [] };
        parsed.counts = parsed.counts || {};
        parsed.recents = parsed.recents || [];
        parsed.counts[emoji] = (parsed.counts[emoji] || 0) + 1;
        // move emoji to front of recents
        parsed.recents = [emoji, ...parsed.recents.filter(e => e !== emoji)].slice(0, 50);
        localStorage.setItem(key, JSON.stringify(parsed));
      } catch (err) {
        // ignore localstorage errors
      }
    }

    // Prefer socket for realtime; fallback to HTTP API
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('toggle_reaction', { messageId, emoji });
      return;
    }

    try {
      const data = await api.post(`/messages/${messageId}/reactions`, { emoji });
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions: data.reactions || [], reacting_users: data.users || [] } : m));
    } catch (err) {
      addToast(err.message || 'Gagal mengubah reaksi.', 'error');
    }
  };

  const computeMainEmojisForUser = (userId) => {
    const defaults = ['👍','❤️','😂','🎉','😮'];
    try {
      const key = `wchat_emoji_prefs_${userId}`;
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : { counts: {}, recents: [] };
      const recents = (parsed.recents || []).slice(0, 5);
      const counts = parsed.counts || {};
      const byCount = Object.keys(counts).sort((a,b) => counts[b] - counts[a]);
      const combined = [...recents, ...byCount.filter(e => !recents.includes(e))];
      const result = [...new Set(combined)].slice(0,5);
      if (result.length < 5) {
        defaults.forEach(d => { if (!result.includes(d)) result.push(d); });
      }
      return result.slice(0,5);
    } catch {
      return ['👍','❤️','😂','🎉','😮'];
    }
  };

  const openReactionPickerAtMessage = (msgId, variant = 'compact') => {
    const node = messageRefs.current[msgId];
    const isPanel = variant === 'panel';
    const PICKER_WIDTH = isPanel ? 340 : 260;
    const EST_HEIGHT = isPanel ? 320 : 100;
    const width = Math.min(PICKER_WIDTH, Math.max(160, window.innerWidth - 16));
    let left = Math.max(8, Math.min(window.innerWidth / 2 - width / 2, window.innerWidth - width - 8));
    let top = 80;
    if (node && node.getBoundingClientRect) {
      const rect = node.getBoundingClientRect();
      const msg = messages.find(m => m.id === msgId);
      const isMe = !!(msg && msg.user_id === user?.id);

      // Prefer showing the picker above the bubble. If not enough space, show below.
      const preferAboveTop = rect.top - EST_HEIGHT - 8;
      const preferBelowTop = rect.bottom + 8;
      top = (preferAboveTop > 8) ? preferAboveTop : preferBelowTop;

      // Anchor horizontally near the bubble edge
      if (isMe) {
        left = rect.right - width;
      } else {
        left = rect.left;
      }

      // For panel variant, if the panel is wider than available space near the bubble,
      // try to center it over the viewport to avoid clipping the bubble.
      if (isPanel) {
        // If it would clip on the left, nudge right; if it would clip on the right, nudge left
        left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
      } else {
        left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
      }
    }

    setReactionPickerPos({ left, top, width });
    setReactionPickerMainEmojis(computeMainEmojisForUser(user?.id));
    setReactionPickerShowExtended(false);
    setOpenReactionPickerFor(msgId);
  };

  const openEmojiPickerAtNode = (node) => {
    if (!node) return;
    const PICKER_WIDTH = 340;
    const EST_HEIGHT = 320;
    const width = Math.min(PICKER_WIDTH, Math.max(260, window.innerWidth - 16));
    const rect = node.getBoundingClientRect();

    // Prefer showing above input area if possible
    let top = rect.top - EST_HEIGHT - 8;
    const inputRect = messageInputRef.current?.getBoundingClientRect?.();
    if (inputRect) {
      top = inputRect.top - EST_HEIGHT - 8;
    }
    if (top < 8) top = rect.bottom + 8;

    // If the picker would overlap the input area, push it above the input
    if (inputRect) {
      const maxTop = inputRect.top - EST_HEIGHT - 8;
      if (top + EST_HEIGHT > inputRect.top - 8) {
        top = Math.max(8, maxTop);
      }
    }

    // Align with input left edge but clamp
    let left = rect.left;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));

    setReactionPickerPos({ left, top, width });
    setReactionPickerMainEmojis(computeMainEmojisForUser(user?.id));
    setReactionPickerShowExtended(false);
    setOpenReactionPickerFor('input');
  };

  const handleSelectPickerEmoji = (target, emoji) => {
    if (target === 'input') {
      const caret = typeof caretPosition === 'number' ? caretPosition : (messageInputRef.current?.value?.length || 0);
      const before = (inputText || '').slice(0, caret);
      const after = (inputText || '').slice(caret);
      const nextText = `${before}${emoji}${after}`;
      setInputText(nextText);
      setTimeout(() => {
        messageInputRef.current?.focus();
        const newPos = (caret || 0) + emoji.length;
        try { messageInputRef.current.setSelectionRange(newPos, newPos); } catch {}
        setCaretPosition(newPos);
      }, 0);
    } else {
      handleToggleReaction(target, emoji);
    }

    setOpenReactionPickerFor(null);
    setReactionPickerPos(null);
  };

  const closeDropdowns = () => {
    setOpenDropdownId(null);
    setMobileMenu(null);
  };

  const handleExitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedMessageIds([]);
  };

  const handleOpenEditEvent = (msg) => setEditingEvent(msg);
  const handleOpenViewEvent = (msg) => setViewingEvent(msg);

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
      setDropdownArrow(null);
      return;
    }

    const trigger = event.currentTarget;
    // Prefer using the message bubble rect so dropdown anchors to the bubble,
    // not the small chevron button or avatar. Fallback to trigger rect.
    const bubbleNode = messageBubbleRefs.current?.[msgId];
    const rect = (bubbleNode && bubbleNode.getBoundingClientRect) ? bubbleNode.getBoundingClientRect() : trigger.getBoundingClientRect();
    const menuWidth = 168;
    const menuHeight = 168;
    // numeric spacing values (tweak these numbers to tune popup distance)
    const gap = 10; // px gap from bubble to menu
    const viewportPadding = 8; // px padding from screen edges

    // safe zones to avoid covering header and input area
    // smaller values move the popup closer to the bubble for top/bottom edge cases
    const TOP_SAFE = 56; // px from top (header area)
    const BOTTOM_SAFE = 72; // px from bottom (chat input area)

    // compute a dynamic bottom safe area using actual input position so menu won't
    // be placed where it can be covered by the input field
    let dynamicBottomSafe = BOTTOM_SAFE;
    try {
      const inputRect = messageInputRef.current?.getBoundingClientRect?.();
      if (inputRect && inputRect.top) {
        const fromBottom = Math.ceil(window.innerHeight - inputRect.top);
        dynamicBottomSafe = Math.max(BOTTOM_SAFE, fromBottom + 8);
      }
    } catch (err) {
      // fallback to static BOTTOM_SAFE
    }

    // horizontal placement: prefer outside the bubble
    const spaceRight = window.innerWidth - rect.right - viewportPadding;
    const spaceLeft = rect.left - viewportPadding;
    let left;
    let intendedSide = null; // 'left'|'right'|'top'|'bottom'
    if (!isMe) {
      // for other users: prefer placing to the right of the bubble
      if (spaceRight >= menuWidth + gap) {
        left = rect.right + gap;
        intendedSide = 'left';
      } else if (spaceLeft >= menuWidth + gap) {
        left = rect.left - menuWidth - gap;
        intendedSide = 'right';
      } else {
        // fallback: clamp within viewport but still prefer right side visually
        left = Math.max(viewportPadding, Math.min(window.innerWidth - menuWidth - viewportPadding, rect.right + gap));
        intendedSide = 'left';
      }
    } else {
      // for own messages: prefer placing to the left of the bubble
      if (spaceLeft >= menuWidth + gap) {
        left = rect.left - menuWidth - gap;
        intendedSide = 'right';
      } else if (spaceRight >= menuWidth + gap) {
        left = rect.right + gap;
        intendedSide = 'left';
      } else {
        left = Math.max(viewportPadding, Math.min(window.innerWidth - menuWidth - viewportPadding, rect.left - menuWidth - gap));
        intendedSide = 'right';
      }
    }

    // vertical placement: when dropdown sits to left/right, prefer centering vertically beside the message
    const centerTopCandidate = Math.round(rect.top + rect.height / 2 - menuHeight / 2);
    const centerFits = centerTopCandidate >= TOP_SAFE + viewportPadding && (centerTopCandidate + menuHeight) <= window.innerHeight - dynamicBottomSafe - viewportPadding;
    let top = centerTopCandidate;

    const fitsAbove = rect.top - gap - menuHeight >= TOP_SAFE + viewportPadding;
    const fitsBelow = rect.bottom + gap + menuHeight <= window.innerHeight - dynamicBottomSafe - viewportPadding;

    // Compute closest above/below positions relative to the bubble
    const preferBelowTop = rect.bottom + gap;
    const preferAboveTop = rect.top - menuHeight - gap;

    // Allowed range biased toward the bubble so the menu doesn't sit far away when centered
    const ALLOW_BIAS = 6; // px bias inward from fully above/below positions
    const allowedMin = Math.max(TOP_SAFE + viewportPadding, preferAboveTop + ALLOW_BIAS);
    const allowedMax = Math.min(window.innerHeight - menuHeight - viewportPadding - dynamicBottomSafe, preferBelowTop - ALLOW_BIAS);

    if (allowedMin <= allowedMax) {
      // clamp centered top to be within the biased allowed range (keeps menu nearer the bubble)
      top = Math.max(allowedMin, Math.min(centerTopCandidate, allowedMax));
    } else {
      // If placing below would overlap the input area, prefer placing above the bubble even
      // if it means clamping the top into the safe zone. This keeps the menu visually close
      // to the bubble and avoids covering the input field.
      const wouldOverlapInputIfBelow = (rect.bottom + gap + menuHeight) > (window.innerHeight - dynamicBottomSafe - viewportPadding);
      if (wouldOverlapInputIfBelow) {
        // attempt to place above and nudge closer to the bubble; then clamp inside safe zone
        top = Math.min(preferAboveTop + 12, window.innerHeight - menuHeight - viewportPadding - dynamicBottomSafe);
        top = Math.max(top, TOP_SAFE + viewportPadding);
      } else if (fitsBelow) {
        // fallback: place below but clamp
        top = Math.max(preferBelowTop, TOP_SAFE + viewportPadding);
        top = Math.min(top, window.innerHeight - menuHeight - viewportPadding - dynamicBottomSafe);
      } else if (fitsAbove) {
        top = Math.min(preferAboveTop, window.innerHeight - menuHeight - viewportPadding - dynamicBottomSafe);
        top = Math.max(top, TOP_SAFE + viewportPadding);
      } else {
        // ultimate fallback: center but clamp to viewport safe area
        top = Math.max(TOP_SAFE + viewportPadding, Math.min(centerTopCandidate, window.innerHeight - menuHeight - viewportPadding - dynamicBottomSafe));
      }
    }

    setDropdownCoords({ top, left });

    // compute arrow position relative to dropdown box, pointing to bubble center
    let arrow = null;
    const bubbleCenterY = Math.round(rect.top + rect.height / 2);
    const bubbleCenterX = Math.round(rect.left + rect.width / 2);

    if (intendedSide === 'left') {
      const arrowTop = Math.round(bubbleCenterY - top - 8);
      arrow = { side: 'left', top: Math.max(8, Math.min(menuHeight - 16, arrowTop)) };
    } else if (intendedSide === 'right') {
      const arrowTop = Math.round(bubbleCenterY - top - 8);
      arrow = { side: 'right', top: Math.max(8, Math.min(menuHeight - 16, arrowTop)) };
    } else if (top >= rect.bottom) {
      const arrowLeft = Math.round(bubbleCenterX - left - 8);
      arrow = { side: 'top', left: Math.max(12, Math.min(menuWidth - 24, arrowLeft)) };
    } else {
      const arrowLeft = Math.round(bubbleCenterX - left - 8);
      arrow = { side: 'bottom', left: Math.max(12, Math.min(menuWidth - 24, arrowLeft)) };
    }

    setDropdownArrow(arrow);
    setOpenDropdownId(msgId);
  };

  const handleTouchStart = (e, msg) => {
    longPressTimer.current = setTimeout(() => setMobileMenu({ msg }), 600);
  };
  const handleTouchEnd = () => clearTimeout(longPressTimer.current);

  const toggleAttachMenu = () => {
    const next = !showAttach;
    if (next) {
      setOpenReactionPickerFor(null);
      setReactionPickerPos(null);
      setOpenReactionUsersFor(null);
    }
    setShowAttach(next);
  };

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

  const canDelete = msg => user?.role === 'admin' || msg.user_id === user?.id;
  const canEdit = (msg) => {
    if (!msg) return false;
    if (msg.file_url) return false;
    if (user?.role === 'admin') return true;
    if (msg.user_id !== user?.id) return false;
    try {
      const created = new Date(msg.created_at).getTime();
      const now = Date.now();
      const diff = now - created;
      const FIFTEEN_MIN = 15 * 60 * 1000;
      return diff <= FIFTEEN_MIN;
    } catch {
      return false;
    }
  };
  const canPin = () => user?.role === 'admin';

  const handleEditMessage = (msg) => {
    messageInputRef.current?.blur();
    if (!canEdit(msg)) return;
    setEditingMessageId(msg.id);
    setEditingText(msg.content || '');
    setOpenDropdownId(null);
    setMobileMenu(null);
    setTimeout(() => {
      const el = document.querySelector(`[data-editarea="${msg.id}"] textarea`);
      if (el) el.focus();
    }, 0);
  };

  const handleSaveEdit = async (msgId) => {
    const trimmed = (editingText || '').trim();
    const orig = messages.find(m => m.id === msgId)?.content || '';
    if (trimmed === '') {
      addToast('Pesan tidak boleh kosong.', 'error');
      return;
    }
    if (trimmed === (orig || '').trim()) {
      setEditingMessageId(null);
      setEditingText('');
      return;
    }

    try {
      // optimistic close; server broadcasts updated message via socket
      socketRef.current?.emit('edit_message', {
        messageId: msgId,
        forumId: activeForumId,
        content: trimmed,
      }, (res) => {
        if (res && res.error) {
          addToast(res.error || 'Gagal mengedit pesan.', 'error');
        }
      });
      setEditingMessageId(null);
      setEditingText('');
    } catch (err) {
      addToast(err.message || 'Gagal mengedit pesan.', 'error');
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingText('');
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

  const handleOpenTasks = () => {
    setShowTaskSlider(true);
    setShowHeaderMenu(false);
  };

  const handleOpenGroupInfo = () => {
    if (!activeForumId) return;
    setShowDirectory(true);
    // refresh members when opening
    api.get(`/forums/${activeForumId}/members`)
      .then(data => setForumMembers(data))
      .catch(() => setForumMembers([]));
    setShowHeaderMenu(false);
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

  const mentionMeta = getActiveMentionQuery(inputText, caretPosition);
  const mentionSuggestions = mentionMeta
    ? forumMembers
        .filter((member) => member?.username)
        .filter((member) => {
          if (!mentionMeta.query) return true;
          return member.username.toLowerCase().includes(mentionMeta.query.toLowerCase());
        })
        .slice(0, 6)
        .map((member) => ({ ...member, roleLabel: getRoleLabel(member.role) }))
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

  const {
    normalizedMessageSearch,
    searchMatches,
    searchMatchIndex,
    setSearchMatchIndex,
    activeSearchMatchId,
  } = useChatSearch(messages, messageSearch, activeForumId, messageRefs);
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

  const sharedFiles = messages.filter(m => m.file_url);

  return (
    <DashboardLayout hideSidebar={isCompactChatLayout}>
      <div className="flex h-screen overflow-hidden font-sans">

        {/* LEFT PANEL */}
        {showForumListPanel && (
          <ForumListPanel
            isMobile={isMobile}
            user={user}
            searchGroup={searchGroup}
            setSearchGroup={setSearchGroup}
            chatTab={chatTab}
            setChatTab={setChatTab}
            showQuickMenu={showQuickMenu}
            setShowQuickMenu={setShowQuickMenu}
            filteredForums={filteredForums}
            activeForumId={activeForumId}
            setActiveForumId={setActiveForumId}
            favoriteForumIds={favoriteForumIds}
            formatForumActivityLabel={formatForumActivityLabel}
            getForumPreview={getForumPreview}
            formatUnreadCount={formatUnreadCount}
            getInitials={getInitials}
            getColor={getColor}
            handleGoDashboard={handleGoDashboard}
            handleOpenSettings={handleOpenSettings}
            handleOpenJoinModal={handleOpenJoinModal}
            handleOpenFaq={handleOpenFaq}
            handleLogout={handleLogout}
          />
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

            <ChatHeader
              isMobile={isMobile}
              activeForum={activeForum}
              activeForumId={activeForumId}
              setActiveForumId={setActiveForumId}
              forums={forums}
              handleHeaderSearchClick={handleHeaderSearchClick}
              showMessageSearch={showMessageSearch}
              showHeaderMenu={showHeaderMenu}
              setShowHeaderMenu={setShowHeaderMenu}
              handleShareForumLink={handleShareForumLink}
              isActiveForumFavorite={isActiveForumFavorite}
              toggleFavoriteForum={toggleFavoriteForum}
              handleClearChat={handleClearChat}
              handleExitGroup={handleExitGroup}
              handleGoDashboard={handleGoDashboard}
              handleOpenSettings={handleOpenSettings}
              handleOpenJoinModal={handleOpenJoinModal}
              handleOpenFaq={handleOpenFaq}
              handleOpenTasks={handleOpenTasks}
              handleOpenGroupInfo={handleOpenGroupInfo}
              handleLogout={handleLogout}
            />

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

            <MessageList
              messages={messages}
              loadingMsgs={loadingMsgs}
              user={user}
              messageRefs={messageRefs}
              messageBubbleRefs={messageBubbleRefs}
              messageReactionRefs={messageReactionRefs}
              messagesEndRef={messagesEndRef}
              emojiPickerRef={emojiPickerRef}
              hoveredMsgId={hoveredMsgId}
              setHoveredMsgId={setHoveredMsgId}
              openDropdownId={openDropdownId}
              dropdownCoords={dropdownCoords}
              selectionMode={selectionMode}
              selectedMessageIds={selectedMessageIds}
              setSelectedMessageIds={setSelectedMessageIds}
              showPinnedMenu={showPinnedMenu}
              setShowPinnedMenu={setShowPinnedMenu}
              jumpedMessageId={jumpedMessageId}
              openReactionPickerFor={openReactionPickerFor}
              reactionPickerPos={reactionPickerPos}
              reactionPickerMainEmojis={reactionPickerMainEmojis}
              reactionPickerShowExtended={reactionPickerShowExtended}
              setReactionPickerShowExtended={setReactionPickerShowExtended}
              setOpenReactionPickerFor={setOpenReactionPickerFor}
              setReactionPickerPos={setReactionPickerPos}
              openReactionUsersFor={openReactionUsersFor}
              setOpenReactionUsersFor={setOpenReactionUsersFor}
              normalizedMessageSearch={normalizedMessageSearch}
              activeSearchMatchId={activeSearchMatchId}
              formatMessageGroupLabel={formatMessageGroupLabel}
              getJakartaDateKey={getJakartaDateKey}
              parseUtcDate={parseUtcDate}
              isImageAttachment={isImageAttachment}
              getFileLabel={getFileLabel}
              getFileInfo={getFileInfo}
              formatTime={formatTime}
              getRoleLabel={getRoleLabel}
              getRoleColor={getRoleColor}
              getPinnedPreviewText={getPinnedPreviewText}
              getReplyPreviewData={getReplyPreviewData}
              isTaggedForCurrentUser={isTaggedForCurrentUser}
              isReplyToCurrentUser={isReplyToCurrentUser}
              handleGoToMessage={handleGoToMessage}
              handleGoToReplyMessage={handleGoToReplyMessage}
              handleToggleReaction={handleToggleReaction}
              handleSelectPickerEmoji={handleSelectPickerEmoji}
              handleCopyMessage={handleCopyMessage}
              handleReply={handleReply}
              handlePin={handlePin}
              handleDelete={handleDelete}
              handleEditMessage={handleEditMessage}
              editingMessageId={editingMessageId}
              editingText={editingText}
              setEditingText={setEditingText}
              handleSaveEdit={handleSaveEdit}
              handleCancelEdit={handleCancelEdit}
              handleOpenEditEvent={handleOpenEditEvent}
              handleOpenViewEvent={handleOpenViewEvent}
              openReactionPickerAtMessage={openReactionPickerAtMessage}
              handleToggleDropdown={handleToggleDropdown}
              containerRef={messageListContainerRef}
              dropdownArrow={dropdownArrow}
              handleTouchStart={handleTouchStart}
              handleTouchEnd={handleTouchEnd}
              handleDeleteSelectedMessages={handleDeleteSelectedMessages}
              handleExitSelectionMode={handleExitSelectionMode}
              closeDropdowns={closeDropdowns}
              canPin={canPin}
              canDelete={canDelete}
              canEdit={canEdit}
              baseUrl={BASE_URL}
            />

            {/* Floating scroll-to-bottom button */}
            {!isAtBottom && (
              <div style={{ position: 'fixed', right: 18, bottom: 86, zIndex: 900 }}>
                <button
                  onClick={() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                    setNewMessageCount(0);
                    isAtBottomRef.current = true;
                    setIsAtBottom(true);
                  }}
                  title="Scroll to bottom"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 36, height: 36, borderRadius: 999, background: '#fff', color: '#2563EB', border: '1px solid #2563EB', boxShadow: 'none', cursor: 'pointer', padding: 0, position: 'relative'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"></path></svg>
                  {newMessageCount > 0 && (
                    <span style={{ position: 'absolute', top: -6, right: -6, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8, background: '#ef4444', color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #fff' }}>{newMessageCount}</span>
                  )}
                </button>
              </div>
            )}

            <ChatInput
              isMobile={isMobile}
              inputText={inputText}
              setInputText={setInputText}
              handleSend={handleSend}
              handleMessageInputKeyDown={handleMessageInputKeyDown}
              mentionMeta={mentionMeta}
              mentionSuggestions={mentionSuggestions}
              mentionActiveIndex={mentionActiveIndex}
              handleSelectMention={handleSelectMention}
              caretPosition={caretPosition}
              setCaretPosition={setCaretPosition}
              replyTo={replyTo}
              setReplyTo={setReplyTo}
              showAttach={showAttach}
              toggleAttachMenu={toggleAttachMenu}
              setShowAttach={setShowAttach}
              handleFileUpload={handleFileUpload}
              openEmojiPickerAtNode={openEmojiPickerAtNode}
              fileInputRef={fileInputRef}
              messageInputRef={messageInputRef}
              emojiButtonRef={emojiButtonRef}
              setShowEventModal={setShowEventModal}
            />
          </div>
        ))}

        {/* RIGHT PANEL — Directory */}
        {activeForum && showDirectory && (
          <DirectoryPanel
            activeForum={activeForum}
            forumMembers={forumMembers}
            user={user}
            getInitials={getInitials}
            getRoleColor={getRoleColor}
            getRoleLabel={getRoleLabel}
            getColor={getColor}
            sharedFiles={sharedFiles}
            getFileInfo={getFileInfo}
            setShowDirectory={setShowDirectory}
            baseUrl={BASE_URL}
          />
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

      {showFaqModal && <FaqModal onClose={() => setShowFaqModal(false)} />}

      {showJoinModal && (
        <JoinModal
          joinLink={joinLink}
          setJoinLink={setJoinLink}
          joinLoading={joinLoading}
          onSubmit={handleJoinForum}
          onClose={() => { setShowJoinModal(false); setJoinLink(''); }}
        />
      )}

      {/* Create Event Modal */}
      {showEventModal && (
        <CreateEventModal
          onClose={() => setShowEventModal(false)}
          onSubmit={handleCreateEvent}
          loading={false}
        />
      )}

      {/* Edit Event Modal */}
      {editingEvent && (
        <CreateEventModal
          onClose={() => setEditingEvent(null)}
          onSubmit={handleEditEvent}
          loading={eventLoading}
          initialData={editingEvent}
        />
      )}

      {viewingEvent && <ViewEventModal viewingEvent={viewingEvent} onClose={() => setViewingEvent(null)} />}

      {/* Task Slider */}
      <TaskSlider isOpen={showTaskSlider} onClose={() => setShowTaskSlider(false)} forumId={activeForumId} />

      {/* Push Notification Permission Modal */}
      <PushNotificationModal
        isOpen={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        onEnable={async () => {
          setPushModalLoading(true);
          const result = await requestNotificationPermission();
          setPushModalLoading(false);
          if (result) {
            setShowPermissionModal(false);
            addToast('Push notifications enabled!', 'success');
          } else {
            addToast('Failed to enable notifications', 'error');
          }
        }}
        onDisable={() => setShowPermissionModal(false)}
        isLoading={pushModalLoading}
      />
    </DashboardLayout>
  );
}
