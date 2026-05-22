import { CornerUpLeft, FileText, ImageIcon, Paperclip, Smile, Calendar, Send, X } from 'lucide-react';
import { cn } from '../chatUtils';

export default function ChatInput({
  isMobile,
  inputText,
  setInputText,
  handleSend,
  handleMessageInputKeyDown,
  mentionMeta,
  mentionSuggestions,
  mentionActiveIndex,
  handleSelectMention,
  caretPosition,
  setCaretPosition,
  replyTo,
  setReplyTo,
  showAttach,
  toggleAttachMenu,
  setShowAttach,
  handleFileUpload,
  openEmojiPickerAtNode,
  fileInputRef,
  messageInputRef,
  emojiButtonRef,
  setShowEventModal,
}) {
  return (
    <div className="border-t border-slate-200 bg-white/90 px-4 pb-4 pt-3 backdrop-blur-sm md:px-5" style={{ position: 'relative', zIndex: 20 }}>
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
          isMobile ? 'gap-1.5 px-2 py-1.5' : 'gap-2 px-2.5 py-1.5'
        )}
        style={{ alignItems: 'center' }}
      >
        <div className="relative" style={{ display: 'flex', alignItems: 'center' }}>
          <div className={cn('flex items-center', isMobile ? 'h-8' : 'h-9')} style={{ gap: 8, marginRight: 8 }}>
            <button
              data-attachmenu
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={toggleAttachMenu}
              className={cn(
                'flex items-center justify-center rounded-full border-0 bg-slate-100 text-slate-500 transition-all duration-200 hover:bg-slate-200',
                isMobile ? 'h-8 w-8' : 'h-9 w-9'
              )}
              style={{ boxSizing: 'border-box', padding: 0 }}
            >
              <Paperclip size={isMobile ? 15 : 16} />
            </button>

            <button
              ref={emojiButtonRef}
              type="button"
              onClick={() => { openEmojiPickerAtNode(emojiButtonRef.current); setShowAttach(false); }}
              title="Add emoji"
              className={cn(
                'flex items-center justify-center rounded-full border-0 bg-slate-100 text-slate-500 transition-all duration-200 hover:bg-slate-200',
                isMobile ? 'h-8 w-8' : 'h-9 w-9'
              )}
              style={{ boxSizing: 'border-box', padding: 0 }}
            >
              <Smile size={isMobile ? 15 : 16} />
            </button>
          </div>

          {showAttach && (
            <div data-attachmenu onPointerDown={(e) => e.stopPropagation()} style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, zIndex: 1300, minWidth: 170, display: 'flex', flexDirection: 'column', gap: 6, borderRadius: 12, border: '1px solid #E5E7EB', background: '#fff', padding: 8, boxShadow: '0 12px 30px rgba(0,0,0,0.08)' }}>
              {[
                ['Dokumen', FileText, '#2563EB', () => fileInputRef.current?.click()],
                ['Gambar', ImageIcon, '#7c3aed', () => fileInputRef.current?.click()],
                ['Event', Calendar, '#f43f5e', () => { setShowAttach(false); setShowEventModal(true); }],
              ].map(([label, Icon, color, onClick]) => (
                <button
                  key={label} type="button"
                  onClick={onClick}
                  className="flex items-center gap-2 rounded-md border-0 bg-transparent px-3 py-2 text-[13px] whitespace-nowrap text-slate-700 transition-all duration-200 hover:bg-slate-100"
                >
                  <Icon size={15} color={color} /> {label === 'Event' ? 'Buat' : 'Upload'} {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileUpload} />

        <div className="min-w-0 flex-1">
          <input
            ref={messageInputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onClick={(e) => setCaretPosition(e.currentTarget.selectionStart || 0)}
            onKeyUp={(e) => setCaretPosition(e.currentTarget.selectionStart || 0)}
            onSelect={(e) => setCaretPosition(e.currentTarget.selectionStart || 0)}
            onKeyDown={(e) => handleMessageInputKeyDown(e, mentionSuggestions, mentionMeta)}
            placeholder="Ketik pesan..."
            className={cn(
              'w-full min-w-0 rounded-full border border-slate-200 bg-slate-50 text-slate-700 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white',
              isMobile ? 'h-8 px-3 text-[13px]' : 'h-9 px-4 text-sm'
            )}
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
                  <span style={{ fontSize: 11, color: '#64748B' }}>{member.roleLabel || member.role}</span>
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
  );
}
