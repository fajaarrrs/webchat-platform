import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';

const DEFAULT_EXTENDED = [
  { e: '👍', k: ['thumbs up', 'like', 'ok'] },
  { e: '❤️', k: ['heart', 'love'] },
  { e: '😂', k: ['joy', 'laugh', 'lol'] },
  { e: '🎉', k: ['party', 'celebrate', 'congrats'] },
  { e: '😮', k: ['surprise', 'wow'] },
  { e: '😢', k: ['sad', 'cry'] },
  { e: '👀', k: ['eyes', 'look'] },
  { e: '🔥', k: ['fire', 'lit', 'hot'] },
  { e: '🙏', k: ['pray', 'thanks', 'please'] },
  { e: '🎯', k: ['target', 'goal'] },
  { e: '😄', k: ['smile', 'happy'] },
  { e: '😅', k: ['sweat', 'nervous'] },
  { e: '😎', k: ['cool'] },
  { e: '👏', k: ['clap', 'applause'] },
  { e: '🤝', k: ['handshake'] },
  { e: '🤔', k: ['thinking'] },
  { e: '😴', k: ['sleep'] },
  { e: '💯', k: ['100', 'perfect'] },
  { e: '🥳', k: ['celebrate', 'party'] },
  { e: '💡', k: ['idea'] },
  { e: '📌', k: ['pin'] },
  { e: '✅', k: ['check', 'ok', 'done'] },
  { e: '❗', k: ['exclamation', 'important'] },
  { e: '❌', k: ['x', 'no'] },
  { e: '🔗', k: ['link'] },
  { e: '💬', k: ['chat', 'message'] },
  { e: '📎', k: ['attach'] },
  { e: '📷', k: ['photo', 'image'] },
  { e: '🔔', k: ['bell', 'notify'] },
  { e: '🌟', k: ['star'] },
  { e: '💖', k: ['heart', 'love'] },
  { e: '🙌', k: ['hooray', 'praise'] },
  { e: '🤗', k: ['hug'] },
  { e: '🤞', k: ['fingers crossed'] }
];

export default function EmojiPicker({
  mainEmojis = [],
  onSelect,
  showExtended = false,
  onToggleExtended,
  extended = DEFAULT_EXTENDED,
  width = 220,
  variant = 'compact', // 'compact' | 'panel'
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return extended;
    return extended.filter(item => {
      return item.e.includes(q) || (item.k || []).some(k => k.includes(q));
    });
  }, [query, extended]);

  // Panel variant: email-like grid with categories + search
  if (variant === 'panel') {
    const panelWidth = Math.max(300, Math.min(width || 420, 520));
    return (
      <div style={{ width: panelWidth, padding: 12, borderRadius: 14, background: '#fff', boxShadow: '0 12px 40px rgba(15,23,42,0.12)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Frequently Used</div>
        </div>

        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Search size={16} color="#9CA3AF" />
          </div>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search emoji"
            style={{ padding: '10px 12px 10px 40px', borderRadius: 9999, border: '1px solid #E5E7EB', outline: 'none', width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {['⌚', '🙂', '🚀', '☕', '🏆', '💡', '🔣', '🏳️'].map((c, i) => (
            <button key={i} type="button" style={{ width: 32, height: 32, borderRadius: 9999, border: 'none', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>{c}</button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(36px, 1fr))', gap: 10, maxHeight: 300, overflowY: 'auto', overflowX: 'hidden', paddingTop: 4 }}>
          {filtered.map(item => (
            <button
              key={item.e}
              type="button"
              onClick={() => onSelect && onSelect(item.e)}
              style={{ width: 36, height: 36, borderRadius: 9999, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {item.e}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Compact variant used for message reaction row — keep the same visual language but smaller
  return (
    <div style={{ width, padding: 10, borderRadius: 14, background: '#fff', boxShadow: '0 8px 30px rgba(15,23,42,0.08)', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {mainEmojis.slice(0, 5).map(e => (
          <button key={e} type="button" onClick={() => onSelect && onSelect(e)} style={{ width: 40, height: 40, borderRadius: 9999, border: 'none', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 18 }}>
            {e}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        <button type="button" onClick={() => onToggleExtended && onToggleExtended(!showExtended)} style={{ width: 36, height: 36, borderRadius: 9999, border: '1px solid #E5E7EB', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16 }} title="Search more emojis">+</button>
      </div>

      {showExtended && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(34px, 1fr))', gap: 8, maxHeight: 220, overflowY: 'auto', overflowX: 'hidden' }}>
          {filtered.map(item => (
            <button key={item.e} type="button" onClick={() => onSelect && onSelect(item.e)} style={{ width: 34, height: 34, borderRadius: 9999, border: 'none', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16 }}>
              {item.e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
