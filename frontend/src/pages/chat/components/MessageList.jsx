import { useState } from 'react';
import { Calendar, ChevronDown, Copy, Download, ImageIcon, Pin, PinOff, Reply, Trash2, CheckCheck, Smile, Pencil, Link2 } from 'lucide-react';
import ReactionPicker from './ReactionPicker';
import MessageDropdown from './MessageDropdown';
import CollapsibleMessage from '../../../components/CollapsibleMessage';
import { cn } from '../chatUtils';

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

export default function MessageList({
  messages,
  loadingMsgs,
  user,
  messageRefs,
  messageBubbleRefs,
  messageReactionRefs,
  messagesEndRef,
  containerRef,
  emojiPickerRef,
  hoveredMsgId,
  setHoveredMsgId,
  openDropdownId,
  dropdownCoords,
  selectionMode,
  selectedMessageIds,
  setSelectedMessageIds,
  showPinnedMenu,
  setShowPinnedMenu,
  jumpedMessageId,
  openReactionPickerFor,
  reactionPickerPos,
  reactionPickerMainEmojis,
  reactionPickerShowExtended,
  setReactionPickerShowExtended,
  setOpenReactionPickerFor,
  setReactionPickerPos,
  openReactionUsersFor,
  setOpenReactionUsersFor,
  normalizedMessageSearch,
  activeSearchMatchId,
  dropdownArrow,
  formatMessageGroupLabel,
  getJakartaDateKey,
  parseUtcDate,
  isImageAttachment,
  getFileLabel,
  getFileInfo,
  formatTime,
  getRoleLabel,
  getRoleColor,
  getPinnedPreviewText,
  getReplyPreviewData,
  isTaggedForCurrentUser,
  isReplyToCurrentUser,
  handleGoToMessage,
  handleGoToReplyMessage,
  handleToggleReaction,
  handleSelectPickerEmoji,
  handleCopyMessage,
  handleReply,
  handlePin,
  handleDelete,
  handleEditMessage,
  editingMessageId,
  editingText,
  setEditingText,
  handleSaveEdit,
  handleCancelEdit,
  handleOpenEditEvent,
  handleOpenViewEvent,
  openReactionPickerAtMessage,
  handleToggleDropdown,
  handleTouchStart,
  handleTouchEnd,
  handleDeleteSelectedMessages,
  handleExitSelectionMode,
  closeDropdowns,
  canPin,
  canDelete,
  canEdit,
  baseUrl,
  unreadBoundaryId,
  unreadCount,
}) {
  const [hoverUsers, setHoverUsers] = useState(null); // { messageId, emoji, rect }
  const pinnedMessages = messages.filter((m) => m.is_pinned);
  const latestPinnedMessage = pinnedMessages[pinnedMessages.length - 1] || null;

  // dropdown rendering handled by MessageDropdown component

  return (
    <div ref={containerRef} className="flex flex-1 flex-col gap-1 overflow-y-auto px-5 py-4" style={{ position: 'relative', zIndex: 0 }}>
      {pinnedMessages.length > 0 && (
        <div style={{ padding: '7px 20px', background: '#EFF6FF', borderBottom: '1px solid #DBEAFE', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#1D4ED8' }}>
          <Pin size={12} />
          <span style={{ fontWeight: 600 }}>Pinned:</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
            {getPinnedPreviewText(latestPinnedMessage)}
          </span>
          <div data-pinnedmenu="true" style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setShowPinnedMenu((v) => !v)}
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
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#F9FAFB'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                >
                  <Link2 size={14} /> Pergi ke pesan
                </button>
                {canPin() && (
                  <button
                    onClick={() => handlePin(latestPinnedMessage)}
                    style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 7, fontSize: 13, color: '#DC2626', textAlign: 'left' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#FEF2F2'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
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
              onClick={handleExitSelectionMode}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #C7D2FE', background: '#fff', color: '#4F46E5', fontSize: 12, cursor: 'pointer' }}
            >
              Selesai
            </button>
          </div>
        </div>
      )}

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

        // Compute compact spacing and adjust when reactions exist
        const REACTION_EXTRA = 8; // visual height of reactions area
        const REACTION_GAP = 12; // extra gap between reaction UI and the following bubble (3-5px recommended)
        const BASE_GAP = 0; // default compact gap between messages
        const baseBetweenDifferentUsers = 25; // slightly larger between different senders
        const prevHasReactions = prevMsg && (prevMsg.reactions || []).length > 0;
        const marginTop = prevMsg
          ? (prevMsg.user_id !== msg.user_id ? baseBetweenDifferentUsers : BASE_GAP) + (prevHasReactions ? (REACTION_EXTRA + REACTION_GAP) : 0)
          : BASE_GAP;
        const paddingBottom = (msg.reactions || []).length > 0 ? 5 + REACTION_EXTRA : 0;

        return (
          <div key={msg.id}>
            {/* Unread separator */}
            {unreadBoundaryId === msg.id && (
              <div className="my-2.5 flex justify-center">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 shadow-sm">
                  {unreadCount > 0 ? `${unreadCount} pesan belum dibaca` : 'Pesan belum dibaca'}
                </span>
              </div>
            )}
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
              onTouchStart={(e) => handleTouchStart(e, msg)}
              onTouchEnd={handleTouchEnd}
              onTouchMove={handleTouchEnd}
              onClick={() => {
                if (!selectionMode) return;
                setSelectedMessageIds((prev) => (
                  prev.includes(msg.id) ? prev.filter((id) => id !== msg.id) : [...prev, msg.id]
                ));
              }}
              className={cn(
                'relative flex items-center gap-1.5 rounded-xl transition-all duration-200',
                isMe ? 'justify-end' : 'justify-start',
                selectionMode ? 'cursor-pointer px-1.5 py-0.5' : 'cursor-default',
                selectionMode && isSelected ? 'bg-indigo-100' : '',
                isActiveMatch || isJumpedTarget ? 'ring-2 ring-blue-300' : ''
              )}
              style={{ paddingBottom, marginTop }}
            >
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
                      <MessageDropdown
                        msg={msg}
                        posStyle={dropdownCoords}
                        dropdownArrow={dropdownArrow}
                        handleCopyMessage={handleCopyMessage}
                        canEdit={canEdit}
                        handleEditMessage={handleEditMessage}
                        openReactionPickerAtMessage={openReactionPickerAtMessage}
                        closeDropdowns={closeDropdowns}
                        handleReply={handleReply}
                        canPin={canPin}
                        handlePin={handlePin}
                        canDelete={canDelete}
                        handleDelete={handleDelete}
                        user={user}
                      />
                  )}
                </div>
              )}

              {!isMe && (
                <div
                  className={cn(
                    'mb-0.5 flex h-8 w-8 shrink-0 self-end items-center justify-center rounded-full text-[10px] font-bold text-blue-600',
                    showSender ? 'visible bg-blue-50' : 'invisible bg-transparent'
                  )}
                >
                  {showSender ? msg.username.slice(0, 2).toUpperCase() : ''}
                </div>
              )}

              <div className="max-w-[72%] md:max-w-[62%]" ref={(node) => { if (node) messageBubbleRefs.current[msg.id] = node; else delete messageBubbleRefs.current[msg.id]; }}>
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
                    'break-words text-sm leading-relaxed shadow-sm',
                    'rounded-2xl',
                    msg.is_event
                      ? (isMe ? 'rounded-br-md bg-[#dcf8c6] text-slate-800' : 'rounded-bl-md border border-slate-100 bg-white text-slate-800')
                      : (isMe ? 'rounded-br-md bg-blue-600 text-white' : 'rounded-bl-md border border-slate-100 bg-white text-slate-800'),
                    !isMe && isHighlightedForMe && !msg.is_event ? 'border-amber-300 bg-amber-50 ring-1 ring-amber-200' : '',
                    msg.is_event ? 'min-w-[260px]' : msg.file_url ? (isImageMessage ? 'p-2' : 'min-w-[210px] px-3 py-2.5') : 'px-3.5 py-2.5',
                    isActiveMatch ? 'ring-2 ring-blue-300' : '',
                    !isActiveMatch && matchesQuery ? 'ring-1 ring-blue-200' : ''
                  )}
                >
                  {replyPreview && !msg.is_event && (
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
                          src={`${baseUrl}${replyPreview.fileUrl}`}
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
                  {!!msg.is_pinned && !msg.is_event && (
                    <div className={cn('mb-1 flex items-center gap-1 text-[10px]', isMe ? 'text-white/70' : 'text-blue-600')}>
                      <Pin size={9} /> Pinned
                    </div>
                  )}

                  {!!msg.is_event ? (
                    <div className="flex flex-col">
                      <div className="px-3.5 pt-3 pb-2">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 bg-[#c8e6b2] p-2 rounded-lg text-[#075e54] flex-shrink-0">
                            <Calendar size={20} />
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-[15px] leading-tight text-slate-800">{msg.event_name}</div>
                            <div className="text-[13px] text-slate-600 mt-1">
                              {new Date(msg.event_start_at).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              {msg.event_end_at ? ` - ${new Date(msg.event_end_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : ''}
                            </div>
                            {msg.event_location && <div className="text-[13px] text-slate-600">{msg.event_location}</div>}
                            {msg.event_description && <div className="text-[12px] mt-1 text-slate-500 italic line-clamp-2">{msg.event_description}</div>}
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-black/5 flex flex-col">
                        {(() => {
                          const canEditEvent = user?.role === 'admin' || msg.user_id === user?.id;
                          return canEditEvent ? (
                            <button
                              className="text-center text-[14px] font-semibold py-2.5 text-[#075e54] hover:bg-black/5 transition-colors cursor-pointer w-full border-none bg-transparent rounded-b-2xl"
                              onClick={() => handleOpenEditEvent(msg)}
                            >
                              Edit event
                            </button>
                          ) : (
                            <button
                              className="text-center text-[14px] font-semibold py-2.5 text-[#128C7E] hover:bg-black/5 transition-colors cursor-pointer w-full border-none bg-transparent rounded-b-2xl"
                              onClick={() => handleOpenViewEvent(msg)}
                            >
                              Lihat detail
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  ) : msg.file_url ? (
                    <div>
                      {isImageMessage ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 220 }}>
                          <a
                            href={`${baseUrl}${msg.file_url}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{ textDecoration: 'none', display: 'block' }}
                          >
                            <img
                              src={`${baseUrl}${msg.file_url}`}
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
                              href={`${baseUrl}/api/messages/download/${msg.id}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
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
                            href={`${baseUrl}/api/messages/download/${msg.id}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
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
                      {msg.content && !msg.is_event && (
                        <div className="mt-2 text-[13px]" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          <CollapsibleMessage id={msg.id} content={msg.content} isMe={isMe} renderMentions={renderMentions} />
                        </div>
                      )}
                    </div>
                  ) : (
                    !msg.is_event && (
                      editingMessageId === msg.id ? (
                        <div data-editarea={msg.id}>
                          <div style={{ marginBottom: 8 }}>
                            {/* Inline editor provided by parent via props */}
                            <textarea
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              style={{
                                width: '100%',
                                minHeight: 80,
                                padding: 10,
                                borderRadius: 10,
                                resize: 'vertical',
                                background: '#fff',
                                color: '#111827',
                                border: '1px solid #E5E7EB',
                                outline: 'none',
                                fontSize: 14,
                              }}
                            />
                          </div>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button
                              onClick={() => handleCancelEdit()}
                              style={{
                                padding: '6px 10px',
                                borderRadius: 10,
                                background: '#fff',
                                border: '1px solid rgba(15,23,42,0.06)',
                                color: '#0f172a',
                                cursor: 'pointer',
                                boxShadow: '0 2px 6px rgba(2,6,23,0.05)',
                                fontWeight: 600,
                                transition: 'transform 120ms ease, box-shadow 120ms ease'
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveEdit(msg.id)}
                              style={{
                                padding: '8px 14px',
                                borderRadius: 12,
                                background: '#2563EB',
                                color: '#fff',
                                border: '1px solid rgba(37,99,235,0.9)',
                                cursor: 'pointer',
                                boxShadow: '0 6px 18px rgba(37,99,235,0.12)',
                                fontWeight: 700,
                                letterSpacing: 0.2,
                                transition: 'transform 120ms ease, box-shadow 120ms ease'
                              }}
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}><CollapsibleMessage id={msg.id} content={msg.content} isMe={isMe} renderMentions={renderMentions} /></div>
                      )
                    )
                  )}

                  <div
                    ref={(node) => { if (node) messageReactionRefs.current[msg.id] = node; else delete messageReactionRefs.current[msg.id]; }}
                    style={{ position: 'absolute', bottom: -14, zIndex: 50, display: 'flex', alignItems: 'center', gap: 6, left: 0 }}
                  >
                    {(msg.reactions || []).map((r) => {
                      const reactedByMe = (msg.reacting_users || []).some((u) => u.userId === user?.id && u.emoji === r.emoji);
                      return (
                        <div key={r.emoji} style={{ display: 'flex', alignItems: 'center' }}>
                          <button
                              type="button"
                              onClick={() => {
                                // Always toggle reaction on click (add/remove). Popup disabled per new UX.
                                handleToggleReaction(msg.id, r.emoji);
                              }}
                              onMouseEnter={(e) => {
                                try {
                                  // desktop-only hover detection
                                  const canHover = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
                                  if (!canHover) return;
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setHoverUsers({ messageId: msg.id, emoji: r.emoji, rect });
                                } catch (err) {}
                              }}
                              onMouseLeave={() => {
                                setHoverUsers(null);
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '4px 8px',
                                borderRadius: 6,
                                border: '1px solid #2563EB',
                                background: reactedByMe ? 'rgba(37,99,235,0.25)' : 'rgba(37,99,235,0.12)',
                                color: '#111827',
                                cursor: 'pointer',
                                fontSize: 14,
                                lineHeight: 1,
                              }}
                              aria-label={`react-${r.emoji}`}
                            >
                              <span style={{ fontSize: 16, lineHeight: 1 }}>{r.emoji}</span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#111827', userSelect: 'none' }} aria-label={`react-count-${r.emoji}`}>{r.count}</span>
                            </button>
                        </div>
                      );
                    })}

                          {/* Reaction users popup disabled per new UX: clicking reaction toggles add/remove and no popup shown */}
                  </div>

                  <div className={cn('mt-1 flex items-center justify-end gap-1 text-[10px] px-2 pb-1', msg.is_event ? 'text-slate-500' : (isMe ? 'text-white/65' : 'text-slate-400'))}>
                    {!!msg.edited_at && <span>diedit</span>}
                    {formatTime(msg.created_at)}
                    {isMe && <CheckCheck size={12} />}
                  </div>
                </div>
              </div>
              {/* dropdown trigger for other users: place inside the same flex row so it's vertically centered beside the bubble */}
              {!selectionMode && !isMe && (
                <div
                  data-msgdropdown="true"
                  className={cn('relative shrink-0 transition-all duration-200', showCtrl ? 'opacity-100' : 'opacity-0')}
                  style={{ alignSelf: 'center', marginLeft: 6 }}
                >
                  <button
                    onClick={(e) => handleToggleDropdown(e, msg.id, false)}
                    className="flex h-6.5 w-6.5 items-center justify-center rounded-full border-0 bg-slate-200 text-slate-500 transition-all duration-200 hover:bg-slate-300"
                  >
                    <ChevronDown size={13} />
                  </button>
                  {isOpen && (
                    <MessageDropdown
                      msg={msg}
                      posStyle={dropdownCoords}
                      dropdownArrow={dropdownArrow}
                      handleCopyMessage={handleCopyMessage}
                      canEdit={canEdit}
                      handleEditMessage={handleEditMessage}
                      openReactionPickerAtMessage={openReactionPickerAtMessage}
                      closeDropdowns={closeDropdowns}
                      handleReply={handleReply}
                      canPin={canPin}
                      handlePin={handlePin}
                      canDelete={canDelete}
                      handleDelete={handleDelete}
                      user={user}
                    />
                  )}
                </div>
              )}
            </div>

            
          </div>
        );
      })}
      <div ref={messagesEndRef} />
      {/* Hover tooltip showing users who reacted (desktop only). Appears when hovering a reaction pill. */}
      {hoverUsers && (() => {
        try {
          const message = messages.find(m => m.id === hoverUsers.messageId);
          if (!message) return null;
          const users = (message.reacting_users || []).filter(u => u.emoji === hoverUsers.emoji);
          const rect = hoverUsers.rect || { left: 0, right: 0, top: 0, bottom: 0, width: 0 };
          const centerX = rect.left + rect.width / 2;
          const spaceBelow = window.innerHeight - rect.bottom;
          const popupHeight = Math.min(220, 40 + users.length * 36);
          const showAbove = spaceBelow < popupHeight + 12 && rect.top > popupHeight + 12;
          const top = showAbove ? (rect.top - popupHeight - 12) : (rect.bottom + 12);

          // Estimate popup width (clamped between min/max used below) to avoid clipping on right-aligned messages.
          const popupMinW = 180;
          const popupMaxW = 320;
          const estimatedPopupW = Math.min(popupMaxW, Math.max(popupMinW, 220));

          // Clamp centerX so popup won't overflow the viewport; shift left when near right edge.
          const halfW = estimatedPopupW / 2;
          const margin = 12;
          const clampedCenterX = Math.max(halfW + margin, Math.min(centerX, window.innerWidth - halfW - margin));

          const popupStyle = {
            position: 'fixed',
            left: clampedCenterX,
            top,
            transform: 'translateX(-50%)',
            zIndex: 800,
            background: '#fff',
            borderRadius: 12,
            padding: '8px 10px',
            boxShadow: '0 10px 30px rgba(2,6,23,0.12)',
            minWidth: popupMinW,
            maxWidth: popupMaxW,
            maxHeight: 260,
            overflow: 'auto',
          };

          return (
            <div
              style={popupStyle}
              onMouseEnter={() => setHoverUsers(hoverUsers)}
              onMouseLeave={() => setHoverUsers(null)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ fontSize: 16 }}>{hoverUsers.emoji}</div>
                <div style={{ fontSize: 13, fontWeight: 400, color: '#0f172a' }}>{users.length} reacted</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {users.length === 0 ? (
                  <div style={{ color: '#6B7280', fontSize: 13 }}>No reactions</div>
                ) : users.map(u => (
                  <div key={u.userId} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 999, background: '#E6EEF9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: '#1D4ED8' }}>{(u.username || 'U').slice(0,2).toUpperCase()}</div>
                    <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 400 }}>{u.username}</div>
                  </div>
                ))}
              </div>
              {/* little caret */}
              <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: showAbove ? 'none' : '8px solid #fff', borderBottom: showAbove ? '8px solid #fff' : 'none', bottom: showAbove ? -8 : 'auto', top: showAbove ? 'auto' : -8 }} />
            </div>
          );
        } catch (err) {
          return null;
        }
      })()}
      {openReactionPickerFor && reactionPickerPos && (
        <ReactionPicker
          emojiPickerRef={emojiPickerRef}
          openReactionPickerFor={openReactionPickerFor}
          reactionPickerPos={reactionPickerPos}
          reactionPickerMainEmojis={reactionPickerMainEmojis}
          reactionPickerShowExtended={reactionPickerShowExtended}
          setReactionPickerShowExtended={setReactionPickerShowExtended}
          handleSelectPickerEmoji={handleSelectPickerEmoji}
        />
      )}
    </div>
  );
}
