import { useState } from 'react';
import { X, Calendar, Clock, MapPin, Link2, ChevronDown, ChevronUp } from 'lucide-react';

function getTodayLocal() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function getRoundedTime() {
  const d = new Date();
  d.setMinutes(Math.ceil(d.getMinutes() / 30) * 30, 0, 0);
  return d.toTimeString().slice(0, 5);
}

export default function CreateEventModal({ onClose, onSubmit, loading, initialData }) {
  const isEditMode = !!initialData;

  // Parse initialData date/time for edit mode
  const parseInitialDate = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  };
  const parseInitialTime = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const [name, setName] = useState(initialData?.event_name || '');
  const [description, setDescription] = useState(initialData?.event_description || '');
  const [startDate, setStartDate] = useState(initialData?.event_start_at ? parseInitialDate(initialData.event_start_at) : getTodayLocal());
  const [startTime, setStartTime] = useState(initialData?.event_start_at ? parseInitialTime(initialData.event_start_at) : getRoundedTime());
  const [showEndTime, setShowEndTime] = useState(!!initialData?.event_end_at);
  const [endDate, setEndDate] = useState(initialData?.event_end_at ? parseInitialDate(initialData.event_end_at) : '');
  const [endTime, setEndTime] = useState(initialData?.event_end_at ? parseInitialTime(initialData.event_end_at) : '');
  const [location, setLocation] = useState(initialData?.event_location || '');
  const [callLinkEnabled, setCallLinkEnabled] = useState(!!initialData?.event_call_link);
  const [callLink, setCallLink] = useState(initialData?.event_call_link || '');
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = 'Nama event wajib diisi.';
    if (!startDate) e.startDate = 'Tanggal mulai wajib diisi.';
    if (!startTime) e.startTime = 'Waktu mulai wajib diisi.';
    if (callLinkEnabled && callLink.trim() && !/^https?:\/\//i.test(callLink.trim())) {
      e.callLink = 'Link harus dimulai dengan http:// atau https://';
    }
    if (showEndTime && endDate && endTime) {
      const startDt = new Date(`${startDate}T${startTime}`);
      const endDt = new Date(`${endDate}T${endTime}`);
      if (endDt <= startDt) e.endTime = 'Waktu selesai harus setelah waktu mulai.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const startAt = new Date(`${startDate}T${startTime}`).toISOString();
    let endAt = null;
    if (showEndTime && endDate && endTime) {
      endAt = new Date(`${endDate}T${endTime}`).toISOString();
    }

    onSubmit({
      name: name.trim(),
      description: description.trim(),
      start_at: startAt,
      end_at: endAt,
      location: location.trim(),
      call_link: callLinkEnabled ? callLink.trim() : '',
    });
  };

  const inputBase = {
    width: '100%',
    padding: '10px 12px',
    border: '1.5px solid #E5E7EB',
    borderRadius: 8,
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
    color: '#1F2937',
    background: '#fff',
    transition: 'border-color 0.15s',
  };

  const labelStyle = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 5,
  };

  const errorStyle = {
    fontSize: 11,
    color: '#DC2626',
    marginTop: 4,
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15, 23, 42, 0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#fff',
        borderRadius: 18,
        width: '100%',
        maxWidth: 440,
        boxShadow: '0 24px 64px rgba(15, 23, 42, 0.22)',
        overflow: 'hidden',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 20px 14px',
          borderBottom: '1px solid #F3F4F6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Calendar size={18} color="#fff" />
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1F2937', margin: 0 }}>{isEditMode ? 'Edit Event' : 'Buat Event'}</h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#F3F4F6', border: 'none', cursor: 'pointer',
              width: 30, height: 30, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#6B7280',
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '18px 20px 20px', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Event Name */}
            <div>
              <label style={labelStyle}>Nama Event <span style={{ color: '#DC2626' }}>*</span></label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Rapat Proyek Website"
                style={{ ...inputBase, borderColor: errors.name ? '#DC2626' : '#E5E7EB' }}
                onFocus={(e) => e.target.style.borderColor = '#6366F1'}
                onBlur={(e) => e.target.style.borderColor = errors.name ? '#DC2626' : '#E5E7EB'}
                autoFocus
              />
              {errors.name && <div style={errorStyle}>{errors.name}</div>}
            </div>

            {/* Description */}
            <div>
              <label style={labelStyle}>Deskripsi <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(opsional)</span></label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tambahkan deskripsi event..."
                rows={3}
                style={{
                  ...inputBase,
                  resize: 'none',
                  lineHeight: 1.5,
                }}
                onFocus={(e) => e.target.style.borderColor = '#6366F1'}
                onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
              />
            </div>

            {/* Start Date & Time */}
            <div>
              <label style={labelStyle}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Clock size={12} color="#6B7280" />
                  Tanggal & Waktu Mulai <span style={{ color: '#DC2626' }}>*</span>
                </span>
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ ...inputBase, borderColor: errors.startDate ? '#DC2626' : '#E5E7EB' }}
                    onFocus={(e) => e.target.style.borderColor = '#6366F1'}
                    onBlur={(e) => e.target.style.borderColor = errors.startDate ? '#DC2626' : '#E5E7EB'}
                  />
                  {errors.startDate && <div style={errorStyle}>{errors.startDate}</div>}
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    style={{ ...inputBase, borderColor: errors.startTime ? '#DC2626' : '#E5E7EB' }}
                    onFocus={(e) => e.target.style.borderColor = '#6366F1'}
                    onBlur={(e) => e.target.style.borderColor = errors.startTime ? '#DC2626' : '#E5E7EB'}
                  />
                  {errors.startTime && <div style={errorStyle}>{errors.startTime}</div>}
                </div>
              </div>
            </div>

            {/* End Time (collapsible) */}
            <div>
              <button
                type="button"
                onClick={() => {
                  setShowEndTime((v) => !v);
                  if (!showEndTime) {
                    setEndDate(startDate);
                    setEndTime('');
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#4F46E5', fontSize: 13, fontWeight: 600, padding: 0,
                }}
              >
                {showEndTime ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showEndTime ? 'Hapus waktu selesai' : '+ Tambah waktu selesai'}
              </button>

              {showEndTime && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <div style={{ flex: 1 }}>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      style={inputBase}
                      onFocus={(e) => e.target.style.borderColor = '#6366F1'}
                      onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      style={{ ...inputBase, borderColor: errors.endTime ? '#DC2626' : '#E5E7EB' }}
                      onFocus={(e) => e.target.style.borderColor = '#6366F1'}
                      onBlur={(e) => e.target.style.borderColor = errors.endTime ? '#DC2626' : '#E5E7EB'}
                    />
                    {errors.endTime && <div style={errorStyle}>{errors.endTime}</div>}
                  </div>
                </div>
              )}
            </div>

            {/* Location */}
            <div>
              <label style={labelStyle}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <MapPin size={12} color="#6B7280" />
                  Lokasi <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(opsional)</span>
                </span>
              </label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Contoh: Ruang Meeting Lantai 2 / Online"
                style={inputBase}
                onFocus={(e) => e.target.style.borderColor = '#6366F1'}
                onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
              />
            </div>

            {/* Call Link Toggle */}
            <div style={{
              padding: '12px 14px',
              borderRadius: 10,
              background: '#F9FAFB',
              border: '1.5px solid #E5E7EB',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Link2 size={14} color="#6B7280" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Link Meeting / Call</span>
                </div>
                {/* Toggle switch */}
                <button
                  type="button"
                  onClick={() => setCallLinkEnabled((v) => !v)}
                  style={{
                    width: 44, height: 24,
                    borderRadius: 12,
                    border: 'none',
                    cursor: 'pointer',
                    background: callLinkEnabled
                      ? 'linear-gradient(135deg, #4F46E5, #7C3AED)'
                      : '#D1D5DB',
                    position: 'relative',
                    transition: 'background 0.2s',
                    flexShrink: 0,
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    top: 3, left: callLinkEnabled ? 23 : 3,
                    width: 18, height: 18,
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                  }} />
                </button>
              </div>

              {callLinkEnabled && (
                <div style={{ marginTop: 10 }}>
                  <input
                    value={callLink}
                    onChange={(e) => setCallLink(e.target.value)}
                    placeholder="https://meet.google.com/xxx-yyyy-zzz"
                    style={{ ...inputBase, borderColor: errors.callLink ? '#DC2626' : '#E5E7EB', background: '#fff' }}
                    onFocus={(e) => e.target.style.borderColor = '#6366F1'}
                    onBlur={(e) => e.target.style.borderColor = errors.callLink ? '#DC2626' : '#E5E7EB'}
                  />
                  {errors.callLink && <div style={errorStyle}>{errors.callLink}</div>}
                </div>
              )}
            </div>

          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: '11px', borderRadius: 10,
                border: '1.5px solid #E5E7EB',
                background: '#fff', color: '#6B7280',
                fontSize: 14, fontWeight: 500, cursor: 'pointer',
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 2, padding: '11px', borderRadius: 10, border: 'none',
                background: loading
                  ? '#A5B4FC'
                  : 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                color: '#fff', fontSize: 14, fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                transition: 'opacity 0.15s',
              }}
            >
              <Calendar size={15} />
              {loading ? (isEditMode ? 'Menyimpan...' : 'Membuat event...') : (isEditMode ? 'Simpan Perubahan' : 'Buat Event')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
