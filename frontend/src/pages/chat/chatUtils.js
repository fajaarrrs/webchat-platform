import { FileText, ImageIcon } from 'lucide-react';

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

function getInitials(name = '') {
  return name.slice(0, 2).toUpperCase();
}

function getColor(idx) {
  return forumColors[idx % forumColors.length];
}

function formatUnreadCount(count) {
  return count > 99 ? '99+' : String(count);
}

function formatTime(dt) {
  const parsed = parseUtcDate(dt);
  if (!parsed) return '';
  return parsed.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: JAKARTA_TIMEZONE });
}

function getRoleLabel(role) {
  return role === 'admin' ? 'Admin' : role === 'karyawan' ? 'Employee' : 'Client';
}

function getRoleColor(role) {
  return role === 'admin' ? '#6d28d9' : role === 'karyawan' ? '#1d4ed8' : '#059669';
}

export {
  JAKARTA_TIMEZONE,
  chatListDateFormatter,
  forumColors,
  getActiveMentionQuery,
  getColor,
  getFileExtension,
  getFileInfo,
  getFileLabel,
  getInitials,
  getJakartaDateKey,
  getRoleColor,
  getRoleLabel,
  formatForumActivityLabel,
  formatMessageGroupLabel,
  formatTime,
  formatUnreadCount,
  isImageAttachment,
  parseUtcDate,
  cn,
  escapeRegex,
};
