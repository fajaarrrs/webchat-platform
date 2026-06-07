import React, { useState, useEffect } from 'react';
import { X, Plus, Loader } from 'lucide-react';
import { api } from '../../../api';
import TaskItem from './TaskItem';

export default function TaskSlider({ isOpen, onClose, forumId, socket }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && forumId) {
      fetchTasks();
    }
  }, [isOpen, forumId]);

  // Listen for real-time task updates via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleTaskUpdated = (updatedTask) => {
      setTasks(prev => {
        // Check if task exists and update it, or add if new
        const exists = prev.some(t => t.id === updatedTask.id);
        if (exists) {
          return prev.map(t => t.id === updatedTask.id ? updatedTask : t);
        } else {
          return [updatedTask, ...prev];
        }
      });
    };

    socket.on('task_updated', handleTaskUpdated);

    return () => {
      socket.off('task_updated', handleTaskUpdated);
    };
  }, [socket]);

  const fetchTasks = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/tasks?forumId=${forumId}`);
      setTasks(Array.isArray(response) ? response : []);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setError('Gagal memuat tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) {
      setError('Judul task harus diisi');
      return;
    }

    setCreatingTask(true);
    setError('');
    try {
      const response = await api.post('/tasks', {
        title: newTaskTitle,
        description: newTaskDescription,
        forumId,
      });
      setTasks(prev => [response, ...prev]);
      setNewTaskTitle('');
      setNewTaskDescription('');
    } catch (err) {
      console.error('Failed to create task:', err);
      setError('Gagal membuat task');
    } finally {
      setCreatingTask(false);
    }
  };

  const handleToggleTask = async (taskId) => {
    try {
      const response = await api.patch(`/tasks/${taskId}/toggle`);
      setTasks(prev => prev.map(t => t.id === taskId ? response : t));
    } catch (err) {
      console.error('Failed to toggle task:', err);
      setError('Gagal mengubah status task');
    }
  };

  const handleEditTask = async (taskId, updates) => {
    try {
      const response = await api.put(`/tasks/${taskId}`, updates);
      setTasks(prev => prev.map(t => t.id === taskId ? response : t));
    } catch (err) {
      console.error('Failed to edit task:', err);
      setError('Gagal mengubah task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Hapus task ini?')) return;

    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      console.error('Failed to delete task:', err);
      setError('Gagal menghapus task');
    }
  };

  const completedCount = tasks.filter(t => t.completed === 1).length;

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            zIndex: 400,
          }}
        />
      )}

      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '360px',
          height: '100vh',
          background: '#fff',
          boxShadow: '-4px 0 12px rgba(0,0,0,0.15)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease',
          zIndex: 401,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ margin: '0 0 2px 0', fontSize: '16px', fontWeight: '600', color: '#1F2937' }}>
              Tasks
            </h2>
            <p style={{ margin: 0, fontSize: '12px', color: '#6B7280' }}>
              {completedCount} dari {tasks.length} selesai
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              background: '#fff',
              color: '#6B7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.color = '#1F2937'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#6B7280'; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Add Task Form */}
        <div style={{ padding: '16px', borderBottom: '1px solid #E5E7EB' }}>
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
            placeholder="Tambah task baru..."
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              fontSize: '13px',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
              marginBottom: '8px',
            }}
          />
          <textarea
            value={newTaskDescription}
            onChange={(e) => setNewTaskDescription(e.target.value)}
            placeholder="Deskripsi (opsional)"
            rows="2"
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              fontSize: '12px',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
              marginBottom: '8px',
              resize: 'vertical',
            }}
          />
          <button
            onClick={handleAddTask}
            disabled={!newTaskTitle.trim() || creatingTask}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              background: newTaskTitle.trim() && !creatingTask ? '#3B82F6' : '#D1D5DB',
              color: '#fff',
              fontSize: '13px',
              fontWeight: '500',
              cursor: newTaskTitle.trim() && !creatingTask ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            {creatingTask ? (
              <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Membuat...</>
            ) : (
              <><Plus size={14} /> Tambah Task</>
            )}
          </button>
          {error && (
            <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#DC2626' }}>{error}</p>
          )}
        </div>

        {/* Task List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6B7280' }}>
              <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : tasks.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF', fontSize: '13px' }}>
              Tidak ada task
            </div>
          ) : (
            tasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={handleToggleTask}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
              />
            ))
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}