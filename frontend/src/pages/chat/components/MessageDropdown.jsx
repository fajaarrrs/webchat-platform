import React from 'react';
import { createPortal } from 'react-dom';
import { Copy, Pencil, Smile, Reply, Pin, PinOff, Trash2 } from 'lucide-react';

function MessageDropdownInner({
  msg,
  posStyle,
  dropdownArrow,
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
        // ensure dropdown sits above header, input and other overlays
        zIndex: 99999,
        minWidth: 152,
        background: '#fff',
        border: '1px solid #E5E7EB',
        borderRadius: 10,
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
        padding: 6,
        ...posStyle,
      }}
    >
      {dropdownArrow && (
        <>
          {/* outer (border) triangle */}
          {dropdownArrow.side === 'left' && (
            <div style={{ position: 'absolute', left: -9, top: `${dropdownArrow.top - 1}px`, width: 0, height: 0, borderTop: '9px solid transparent', borderBottom: '9px solid transparent', borderRight: '9px solid #E5E7EB' }} />
          )}
          {dropdownArrow.side === 'left' && (
            <div style={{ position: 'absolute', left: -8, top: `${dropdownArrow.top}px`, width: 0, height: 0, borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderRight: '8px solid #fff' }} />
          )}

          {dropdownArrow.side === 'right' && (
            <div style={{ position: 'absolute', right: -9, top: `${dropdownArrow.top - 1}px`, width: 0, height: 0, borderTop: '9px solid transparent', borderBottom: '9px solid transparent', borderLeft: '9px solid #E5E7EB' }} />
          )}
          {dropdownArrow.side === 'right' && (
            <div style={{ position: 'absolute', right: -8, top: `${dropdownArrow.top}px`, width: 0, height: 0, borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderLeft: '8px solid #fff' }} />
          )}

          {dropdownArrow.side === 'top' && (
            <div style={{ position: 'absolute', top: -9, left: `${dropdownArrow.left - 1}px`, width: 0, height: 0, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderBottom: '9px solid #E5E7EB' }} />
          )}
          {dropdownArrow.side === 'top' && (
            <div style={{ position: 'absolute', top: -8, left: `${dropdownArrow.left}px`, width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderBottom: '8px solid #fff' }} />
          )}

          {dropdownArrow.side === 'bottom' && (
            <div style={{ position: 'absolute', bottom: -9, left: `${dropdownArrow.left - 1}px`, width: 0, height: 0, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderTop: '9px solid #E5E7EB' }} />
          )}
          {dropdownArrow.side === 'bottom' && (
            <div style={{ position: 'absolute', bottom: -8, left: `${dropdownArrow.left}px`, width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: '8px solid #fff' }} />
          )}
        </>
      )}

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

export default function MessageDropdown(props) {
  if (typeof document === 'undefined') return null;
  return createPortal(<MessageDropdownInner {...props} />, document.body);
}
