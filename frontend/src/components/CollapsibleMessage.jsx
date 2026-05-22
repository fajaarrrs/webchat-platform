import React, { useState } from 'react';

// In-memory map to persist expanded/collapsed chunk count during the session
const collapseState = new Map();

export default function CollapsibleMessage({ id, content = '', isMe = false, renderMentions }) {
  const text = String(content || '');
  const lines = text.split(/\n/).length;
  // Trigger collapse when message is long by lines OR characters
  const isLong = lines > 7 || text.length > 400;

  // Determine mode: line-based if there are explicit line breaks, else char-based
  const lineMode = lines > 1;
  const chunkSize = lineMode ? 7 : 400;

  const totalUnits = lineMode ? lines : text.length;
  const totalChunks = Math.max(1, Math.ceil(totalUnits / chunkSize));

  const key = id != null ? `msg-${id}` : `text-${text}`;
  const [chunkCount, setChunkCount] = useState(() => collapseState.get(key) || 1);

  const expandOne = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const next = Math.min(chunkCount + 1, totalChunks);
    setChunkCount(next);
    collapseState.set(key, next);
  };

  const collapseAll = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const next = 1;
    setChunkCount(next);
    collapseState.set(key, next);
  };

  if (!isLong) {
    return (
      <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {renderMentions ? renderMentions(text) : text}
      </div>
    );
  }

  const linkStyle = {
    color: isMe ? '#FFFFFF' : '#1D4ED8',
    fontWeight: 700,
    textDecoration: 'underline',
    cursor: 'pointer',
    display: 'inline',
  };

  // compute displayed content according to chunkCount
  const displayedUnits = Math.min(chunkCount * chunkSize, totalUnits);
  let displayed;
  if (lineMode) {
    const parts = text.split(/\n/);
    displayed = parts.slice(0, displayedUnits).join('\n');
    if (displayedUnits < totalUnits) displayed += '\n…';
  } else {
    displayed = text.slice(0, displayedUnits);
    if (displayedUnits < totalUnits) displayed += '…';
  }

  const isFullyShown = chunkCount >= totalChunks;

  return (
    <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {renderMentions ? renderMentions(displayed) : displayed}
      {' '}
      {!isFullyShown ? (
        <span
          role="button"
          tabIndex={0}
          onClick={expandOne}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); expandOne(e); } }}
          style={linkStyle}
        >
          Baca Selengkapnya...
        </span>
      ) : (
        <span
          role="button"
          tabIndex={0}
          onClick={collapseAll}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); collapseAll(e); } }}
          style={linkStyle}
        >
          Sembunyikan
        </span>
      )}
    </div>
  );
}
