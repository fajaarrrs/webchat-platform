import { useState, useRef, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import {
  Search, Send, Paperclip, Phone, MoreVertical,
  Smile, ImageIcon, FileText, X, CheckCheck, Check,
} from 'lucide-react';

const groups = [
  { id: 'g1', name: 'Support Umum',        last: 'Client #021: Terima kasih!',     time: '16:08', unread: 2, online: true  },
  { id: 'g2', name: 'Project Alpha',        last: 'sari: Update laporan sudah dikirim', time: '15:40', unread: 0, online: true  },
  { id: 'g3', name: 'Billing Support',      last: 'Client #018: Sudah dibayar',      time: '14:22', unread: 5, online: false },
  { id: 'g4', name: 'Pengumuman Platform',  last: 'admin: Platform akan update besok', time: '10:00', unread: 0, online: false },
];

const initialMessages = {
  g1: [
    { id: 1, sender: 'client',   text: 'omg, this is amazing',          time: '16:05', status: 'read' },
    { id: 2, sender: 'client',   text: 'perfect! ✅',                   time: '16:05', status: 'read' },
    { id: 3, sender: 'client',   text: 'Wow, this is really epic',       time: '16:06', status: 'read' },
    { id: 4, sender: 'me',       text: 'How are you?',                   time: '16:06', status: 'read' },
    { id: 5, sender: 'client',   text: 'just ideas for next time',       time: '16:07', status: 'read' },
    { id: 6, sender: 'client',   text: "I'll be there in 2 mins 🕑",     time: '16:07', status: 'read' },
    { id: 7, sender: 'me',       text: 'woohoooo',                       time: '16:08', status: 'read' },
    { id: 8, sender: 'me',       text: 'Haha oh man',                    time: '16:08', status: 'read' },
    { id: 9, sender: 'me',       text: "Haha that's terrifying 😅",       time: '16:08', status: 'read' },
    { id: 10, sender: 'client',  text: 'aww',                            time: '16:08', status: 'delivered' },
    { id: 11, sender: 'client',  text: 'omg, this is amazing',           time: '16:08', status: 'delivered' },
    { id: 12, sender: 'client',  text: 'woohoooo 🔥',                    time: '16:08', status: 'delivered' },
  ],
  g2: [
    { id: 1, sender: 'other', text: 'Update laporan sudah saya kirimkan.', time: '15:38', status: 'read' },
    { id: 2, sender: 'me',    text: 'Siap, sudah diterima!',               time: '15:40', status: 'read' },
  ],
  g3: [
    { id: 1, sender: 'client', text: 'Halo, saya sudah lakukan pembayaran.', time: '14:20', status: 'read' },
    { id: 2, sender: 'me',     text: 'Baik, kami akan verifikasi segera.',   time: '14:22', status: 'read' },
  ],
  g4: [
    { id: 1, sender: 'me', text: 'Platform akan melakukan update besok pukul 02.00 WIB.', time: '10:00', status: 'read' },
  ],
};

export default function ChatPage() {
  const { user } = useAuth();
  const [activeGroup, setActiveGroup] = useState(groups[0]);
  const [allMessages, setAllMessages] = useState(initialMessages);
  const [inputText, setInputText] = useState('');
  const [searchGroup, setSearchGroup] = useState('');
  const [showAttach, setShowAttach] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const messages = allMessages[activeGroup.id] || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeGroup]);

  const handleSend = (e) => {
    e?.preventDefault();
    if (!inputText.trim()) return;
    const newMsg = {
      id: Date.now(),
      sender: 'me',
      text: inputText.trim(),
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };
    setAllMessages(prev => ({
      ...prev,
      [activeGroup.id]: [...(prev[activeGroup.id] || []), newMsg],
    }));
    setInputText('');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const newMsg = {
      id: Date.now(),
      sender: 'me',
      text: `📎 ${file.name}`,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
      isFile: true,
    };
    setAllMessages(prev => ({
      ...prev,
      [activeGroup.id]: [...(prev[activeGroup.id] || []), newMsg],
    }));
    setShowAttach(false);
  };

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(searchGroup.toLowerCase())
  );

  const getInitials = (name) => name.slice(0, 2).toUpperCase();
  const groupColors = ['#2563EB', '#7c3aed', '#059669', '#d97706'];

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

        {/* Left: Group List */}
        <div style={{
          width: 300, borderRight: '1px solid #E5E7EB', background: '#fff',
          display: 'flex', flexDirection: 'column', flexShrink: 0,
        }}>
          {/* Search */}
          <div style={{ padding: '16px 16px 12px' }}>
            <div style={{ position: 'relative' }}>
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
          </div>

          {/* Group List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredGroups.map((group, i) => (
              <div
                key={group.id}
                onClick={() => setActiveGroup(group)}
                style={{
                  padding: '12px 16px', cursor: 'pointer', transition: 'background 0.15s',
                  background: activeGroup.id === group.id ? '#EFF6FF' : 'transparent',
                  borderLeft: activeGroup.id === group.id ? '3px solid #2563EB' : '3px solid transparent',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}
                onMouseEnter={e => { if (activeGroup.id !== group.id) e.currentTarget.style.background = '#F9FAFB'; }}
                onMouseLeave={e => { if (activeGroup.id !== group.id) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%',
                    background: groupColors[i % groupColors.length],
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: '#fff',
                  }}>
                    {getInitials(group.name)}
                  </div>
                  {group.online && (
                    <div style={{
                      position: 'absolute', bottom: 1, right: 1,
                      width: 10, height: 10, borderRadius: '50%',
                      background: '#10B981', border: '2px solid #fff',
                    }} />
                  )}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>{group.name}</span>
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>{group.time}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                    <span style={{
                      fontSize: 12, color: '#6B7280',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      maxWidth: 160,
                    }}>
                      {group.last}
                    </span>
                    {group.unread > 0 && (
                      <span style={{
                        background: '#2563EB', color: '#fff', borderRadius: '50%',
                        width: 18, height: 18, fontSize: 10, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        {group.unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Chat Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F9FAFB', minWidth: 0 }}>
          {/* Chat Header */}
          <div style={{
            padding: '14px 24px', background: '#fff',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: groupColors[groups.findIndex(g => g.id === activeGroup.id) % groupColors.length],
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: '#fff',
                }}>
                  {getInitials(activeGroup.name)}
                </div>
                {activeGroup.online && (
                  <div style={{
                    position: 'absolute', bottom: 1, right: 1,
                    width: 9, height: 9, borderRadius: '50%',
                    background: '#10B981', border: '2px solid #fff',
                  }} />
                )}
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#1F2937', margin: 0 }}>{activeGroup.name}</p>
                <p style={{ fontSize: 12, color: activeGroup.online ? '#10B981' : '#9CA3AF', margin: 0 }}>
                  {activeGroup.online ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{
                padding: '7px 14px', borderRadius: 8, border: '1.5px solid #E5E7EB',
                background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 13, fontWeight: 600, color: '#2563EB',
              }}>
                <Phone size={14} /> Panggil
              </button>
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
            {messages.map((msg, i) => {
              const isMe = msg.sender === 'me';
              const showAvatar = !isMe && (i === 0 || messages[i - 1]?.sender === 'me');
              return (
                <div key={msg.id} style={{
                  display: 'flex',
                  justifyContent: isMe ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-end', gap: 8,
                  marginTop: (i > 0 && messages[i - 1]?.sender !== msg.sender) ? 12 : 2,
                }}>
                  {!isMe && (
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                      background: showAvatar ? '#eff6ff' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: '#2563EB',
                      visibility: showAvatar ? 'visible' : 'hidden',
                    }}>
                      {showAvatar ? getInitials(activeGroup.name) : ''}
                    </div>
                  )}
                  <div style={{
                    maxWidth: '60%',
                    background: isMe ? 'linear-gradient(135deg, #1D4ED8, #2563EB)' : '#fff',
                    color: isMe ? '#fff' : '#1F2937',
                    padding: '9px 13px',
                    borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    fontSize: 14, lineHeight: 1.5,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                    border: isMe ? 'none' : '1px solid #F3F4F6',
                    wordBreak: 'break-word',
                  }}>
                    {msg.isFile ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FileText size={14} /> {msg.text}
                      </span>
                    ) : msg.text}
                    <div style={{
                      fontSize: 10, marginTop: 4, textAlign: 'right',
                      color: isMe ? 'rgba(255,255,255,0.65)' : '#9CA3AF',
                      display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3,
                    }}>
                      {msg.time}
                      {isMe && (
                        msg.status === 'read' ? <CheckCheck size={12} /> :
                        msg.status === 'delivered' ? <CheckCheck size={12} style={{ opacity: 0.5 }} /> :
                        <Check size={12} style={{ opacity: 0.5 }} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div style={{
            padding: '12px 16px', background: '#fff',
            borderTop: '1px solid #E5E7EB',
          }}>
            <form
              onSubmit={handleSend}
              style={{ display: 'flex', alignItems: 'center', gap: 10 }}
            >
              {/* Attach Button */}
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
                    <button
                      type="button"
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
                      <FileText size={15} color="#2563EB" /> Upload Dokumen
                    </button>
                    <button
                      type="button"
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
                      <ImageIcon size={15} color="#7c3aed" /> Upload Gambar
                    </button>
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
      </div>
    </DashboardLayout>
  );
}
