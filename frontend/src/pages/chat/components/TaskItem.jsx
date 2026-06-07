import React from 'react';
import { Check, X, Edit2, Trash2 } from 'lucide-react';

const formatCompletedTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  // Convert UTC to WIB (UTC+7)
  const wibDate = new Date(date.getTime() + (7 * 60 * 60 * 1000));
  const day = wibDate.toLocaleDateString('id-ID', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  const time = wibDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${day} ${time}`;
};

export default function TaskItem({ task, onToggle, onEdit, onDelete }) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [title, setTitle] = React.useState(task.title);
  const [description, setDescription] = React.useState(task.description);

  const handleSave = () => {
    if (title.trim()) {
      onEdit(task.id, { title, description });
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div style={{
        padding: '12px',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Judul task"
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '6px',
            border: '1px solid #D1D5DB',
            fontSize: '13px',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Deskripsi (opsional)"
          rows="2"
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '6px',
            border: '1px solid #D1D5DB',
            fontSize: '12px',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            resize: 'vertical',
          }}
        />
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '6px',
              background: '#3B82F6',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            Simpan
          </button>
          <button
            onClick={() => setIsEditing(false)}
            style={{
              flex: 1,
              padding: '6px',
              background: '#E5E7EB',
              color: '#6B7280',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            Batal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '12px',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        gap: '10px',
        alignItems: 'flex-start',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#F9FAFB';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <button
        onClick={() => onToggle(task.id)}
        style={{
          width: '20px',
          height: '20px',
          borderRadius: '4px',
          border: task.completed === 1 ? 'none' : '1.5px solid #D1D5DB',
          background: task.completed === 1 ? '#10B981' : 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
          marginTop: '2px',
        }}
      >
        {task.completed === 1 && <Check size={14} color="white" />}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: '0 0 4px 0',
            fontSize: '13px',
            fontWeight: '500',
            color: task.completed ? '#9CA3AF' : '#1F2937',
            textDecoration: task.completed ? 'line-through' : 'none',
            wordBreak: 'break-word',
          }}
        >
          {task.title}
        </p>
        {task.description && (
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              color: '#6B7280',
              textDecoration: task.completed ? 'line-through' : 'none',
              wordBreak: 'break-word',
            }}
          >
            {task.description}
          </p>
        )}
        {task.created_by_username && task.created_at && (
          <p
            style={{
              margin: '6px 0 0 0',
              fontSize: '11px',
              color: '#6B7280',
              fontWeight: '500',
              wordBreak: 'break-word',
            }}
          >
            Created by {task.created_by_username} on {formatCompletedTime(task.created_at)}
          </p>
        )}
        {task.completed === 1 && task.completed_by_username && task.completed_at && (
          <p
            style={{
              margin: '4px 0 0 0',
              fontSize: '11px',
              color: '#10B981',
              fontWeight: '500',
              wordBreak: 'break-word',
            }}
          >
            ✓ Completed by {task.completed_by_username} on {formatCompletedTime(task.completed_at)}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
        <button
          onClick={() => setIsEditing(true)}
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            border: '1px solid #E5E7EB',
            background: 'white',
            color: '#6B7280',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#F3F4F6';
            e.currentTarget.style.color = '#3B82F6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'white';
            e.currentTarget.style.color = '#6B7280';
          }}
        >
          <Edit2 size={14} />
        </button>
        <button
          onClick={() => onDelete(task.id)}
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            border: '1px solid #E5E7EB',
            background: 'white',
            color: '#6B7280',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#FEE2E2';
            e.currentTarget.style.color = '#DC2626';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'white';
            e.currentTarget.style.color = '#6B7280';
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
