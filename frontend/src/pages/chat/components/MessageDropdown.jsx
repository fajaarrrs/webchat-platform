import React from 'react';
import { Copy, Pencil, Smile, Reply, Pin, PinOff, Trash2 } from 'lucide-react';

export default function MessageDropdown({
  msg,
  posStyle,
  handleCopyMessage,
  canEdit,
  handleEditMessage,
  openReactionPickerAtMessage,
  closeDropdowns,
  handleReply,
  canPin,
  handlePin,
  canDelete,
  handleDelete,
  user,
}) {
  return (
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
        ...((msg.reacting_users || []).some((u) => u.userId === user?.id) ? [] : [{ icon: Smile, label: 'Tambah Reaksi', onClick: () => { openReactionPickerAtMessage(msg.id, 'compact'); closeDropdowns(); }, color: '#374151' }]),
        { icon: Reply, label: 'Reply', onClick: () => handleReply(msg), color: '#374151' },
        ...(canPin() ? [{
          icon: msg.is_pinned ? PinOff : Pin,
          label: msg.is_pinned ? 'Unpin' : 'Pin',
          onClick: () => handlePin(msg),
          color: '#374151',
        }] : []),
        ...(canDelete(msg) ? [{ icon: Trash2, label: 'Delete', onClick: () => handleDelete(msg), color: '#DC2626' }] : []),
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
}
