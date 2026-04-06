import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { api, BASE_URL } from '../api';
import useBreakpoint from '../hooks/useBreakpoint';
import { Settings, User, Lock, Eye, EyeOff, Save, BadgeCheck, ShieldCheck, UserCircle, Users, Pencil, Trash2, X, Check, Camera, ArrowLeft, ChevronDown } from 'lucide-react';

const roleBadge = {
  admin:    { label: 'Admin',    bg: '#ede9fe', color: '#6d28d9', Icon: ShieldCheck },
  karyawan: { label: 'Employee', bg: '#dbeafe', color: '#1d4ed8', Icon: BadgeCheck },
  client:   { label: 'Client',   bg: '#d1fae5', color: '#065f46', Icon: UserCircle },
};

const roleBadgeTone = {
  admin: 'bg-violet-100 text-violet-700',
  karyawan: 'bg-blue-100 text-blue-700',
  client: 'bg-emerald-100 text-emerald-700',
};

const CROP_SIZE = 280;

export default function SettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialTab = location.state?.initialTab === 'password' || location.state?.initialTab === 'users'
    ? location.state.initialTab
    : 'profile';
  const { user, updateProfile, uploadAvatar, deleteAvatar, addToast } = useAuth();
  const { isMobile, isTablet } = useBreakpoint();
  const [tab, setTab] = useState(initialTab);
  const [profileForm, setProfileForm] = useState({ username: user?.username || '', email: user?.email || '' });
  const [passForm, setPassForm] = useState({ current: '', newPass: '', confirm: '' });
  const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false });
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [cropState, setCropState] = useState(null); // { file, objectUrl, naturalW, naturalH, scale, offsetX, offsetY }
  const [isDragging, setIsDragging] = useState(false);
  const avatarInputRef = useRef(null);
  const profileAvatarInputRef = useRef(null);
  const dragStartRef = useRef(null);

  // Admin users management
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // { id, username, email, role }
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const isAdmin = user?.role === 'admin';
  const badge = roleBadge[user?.role] || roleBadge.client;
  const BadgeIcon = badge.Icon;
  const initials = user?.username?.slice(0, 2).toUpperCase() || '??';
  const nonAdminRouteBase = user?.role ? `/${user.role}` : '';
  const showProfileSection = isAdmin ? tab === 'profile' : true;
  const showPasswordSection = isAdmin ? tab === 'password' : true;

  const tabs = [
    { key: 'profile',  label: 'Profil',    icon: User },
    { key: 'password', label: 'Keamanan',  icon: Lock },
    ...(isAdmin ? [{ key: 'users', label: 'Kelola Users', icon: Users }] : []),
  ];

  useEffect(() => {
    if (tab === 'users' && isAdmin) {
      setUsersLoading(true);
      api.get('/users')
        .then(data => setUsers(data))
        .catch(err => addToast(err.message, 'error'))
        .finally(() => setUsersLoading(false));
    }
  }, [tab]);

  useEffect(() => {
    if (!location.state?.initialTab) return;
    if (location.state.initialTab === 'password' || (location.state.initialTab === 'users' && isAdmin)) {
      setTab(location.state.initialTab);
    } else {
      setTab('profile');
    }
  }, [location.state, isAdmin]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('[data-role-dropdown]')) {
        setShowRoleDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const clampOffset = (val, imgDim) => Math.min(0, Math.max(CROP_SIZE - imgDim, val));

  const openCropModal = (file) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const fitScale = Math.max(CROP_SIZE / img.naturalWidth, CROP_SIZE / img.naturalHeight);
      const imgW = img.naturalWidth * fitScale;
      const imgH = img.naturalHeight * fitScale;
      setCropState({
        file, objectUrl,
        naturalW: img.naturalWidth, naturalH: img.naturalHeight,
        scale: fitScale,
        offsetX: (CROP_SIZE - imgW) / 2,
        offsetY: (CROP_SIZE - imgH) / 2,
      });
    };
    img.src = objectUrl;
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    openCropModal(file);
    e.target.value = '';
  };

  const handleCropDragStart = (e) => {
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragStartRef.current = { clientX, clientY, offsetX: cropState.offsetX, offsetY: cropState.offsetY };
    setIsDragging(true);
  };

  const handleCropDragMove = (e) => {
    if (!isDragging || !dragStartRef.current) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const dx = clientX - dragStartRef.current.clientX;
    const dy = clientY - dragStartRef.current.clientY;
    setCropState(prev => {
      if (!prev) return prev;
      const imgW = prev.naturalW * prev.scale;
      const imgH = prev.naturalH * prev.scale;
      return {
        ...prev,
        offsetX: clampOffset(dragStartRef.current.offsetX + dx, imgW),
        offsetY: clampOffset(dragStartRef.current.offsetY + dy, imgH),
      };
    });
  };

  const handleCropDragEnd = () => { setIsDragging(false); dragStartRef.current = null; };

  const handleZoom = (newScale) => {
    setCropState(prev => {
      if (!prev) return prev;
      const imgW = prev.naturalW * newScale;
      const imgH = prev.naturalH * newScale;
      const ratioX = (CROP_SIZE / 2 - prev.offsetX) / (prev.naturalW * prev.scale);
      const ratioY = (CROP_SIZE / 2 - prev.offsetY) / (prev.naturalH * prev.scale);
      return {
        ...prev, scale: newScale,
        offsetX: clampOffset(CROP_SIZE / 2 - ratioX * imgW, imgW),
        offsetY: clampOffset(CROP_SIZE / 2 - ratioY * imgH, imgH),
      };
    });
  };

  const handleCropConfirm = () => {
    if (!cropState) return;
    const canvas = document.createElement('canvas');
    canvas.width = CROP_SIZE;
    canvas.height = CROP_SIZE;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    const img = new Image();
    img.onload = () => {
      const imgW = cropState.naturalW * cropState.scale;
      const imgH = cropState.naturalH * cropState.scale;
      ctx.drawImage(img, cropState.offsetX, cropState.offsetY, imgW, imgH);
      canvas.toBlob(async (blob) => {
        const croppedFile = new File([blob], 'avatar.png', { type: 'image/png' });
        URL.revokeObjectURL(cropState.objectUrl);
        setCropState(null);
        setAvatarUploading(true);
        await uploadAvatar(croppedFile);
        setAvatarUploading(false);
      }, 'image/png');
    };
    img.src = cropState.objectUrl;
  };

  const handleCropCancel = () => {
    if (cropState) URL.revokeObjectURL(cropState.objectUrl);
    setCropState(null);
    setIsDragging(false);
  };

  const handleDeleteAvatar = async () => {
    setAvatarUploading(true);
    await deleteAvatar();
    setAvatarUploading(false);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profileForm.username.trim()) return;
    setSaving(true);
    await updateProfile({ username: profileForm.username.trim(), email: profileForm.email.trim() });
    setSaving(false);
  };

  const handleChangePass = async (e) => {
    e.preventDefault();
    if (passForm.newPass !== passForm.confirm) {
      addToast('Password baru tidak cocok.', 'error'); return;
    }
    if (passForm.newPass.length < 6) {
      addToast('Password minimal 6 karakter.', 'error'); return;
    }
    setSaving(true);
    const result = await updateProfile({ currentPassword: passForm.current, newPassword: passForm.newPass });
    if (result.success) setPassForm({ current: '', newPass: '', confirm: '' });
    setSaving(false);
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditSaving(true);
    try {
      const updated = await api.put(`/users/${editingUser.id}`, {
        username: editingUser.username,
        email: editingUser.email,
        role: editingUser.role,
      });
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
      setEditingUser(null);
      addToast('User berhasil diperbarui.', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
    setEditSaving(false);
  };

  const handleDeleteUser = async (id) => {
    try {
      await api.delete(`/users/${id}`);
      setUsers(prev => prev.filter(u => u.id !== id));
      setDeleteConfirm(null);
      addToast('User berhasil dihapus.', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const renderCropModal = () => {
    if (!cropState) return null;
    const minScale = Math.max(CROP_SIZE / cropState.naturalW, CROP_SIZE / cropState.naturalH);
    const maxScale = minScale * 4;

    return (
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
        onMouseMove={handleCropDragMove}
        onMouseUp={handleCropDragEnd}
        onMouseLeave={handleCropDragEnd}
        onTouchMove={handleCropDragMove}
        onTouchEnd={handleCropDragEnd}
      >
        <div
          style={{ background: '#fff', borderRadius: 20, padding: '28px 32px 28px', width: 380, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', userSelect: 'none' }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1F2937', margin: 0 }}>Atur Foto Profil</h2>
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: '4px 0 0' }}>Geser gambar &amp; atur ukuran lingkaran</p>
            </div>
            <button onClick={handleCropCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}>
              <X size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0 16px' }}>
            <div style={{ position: 'relative' }}>
              <div
                onMouseDown={handleCropDragStart}
                onTouchStart={handleCropDragStart}
                style={{
                  width: CROP_SIZE, height: CROP_SIZE,
                  borderRadius: '50%', overflow: 'hidden',
                  cursor: isDragging ? 'grabbing' : 'grab',
                  background: '#E5E7EB', position: 'relative',
                  boxShadow: '0 0 0 4px #fff, 0 0 0 6px #2563EB',
                }}
              >
                <img
                  src={cropState.objectUrl}
                  draggable={false}
                  alt="crop preview"
                  style={{
                    position: 'absolute',
                    width: cropState.naturalW * cropState.scale,
                    height: cropState.naturalH * cropState.scale,
                    left: cropState.offsetX,
                    top: cropState.offsetY,
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}
                />
              </div>
              <p style={{ textAlign: 'center', fontSize: 11, color: '#9CA3AF', marginTop: 10 }}>Pratinjau</p>
            </div>
          </div>

          <div style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Perbesar</label>
              <span style={{ fontSize: 11, color: '#6B7280' }}>{(cropState.scale / minScale).toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min={minScale}
              max={maxScale}
              step={(maxScale - minScale) / 100}
              value={cropState.scale}
              onChange={e => handleZoom(parseFloat(e.target.value))}
              style={{ width: '100%', cursor: 'pointer', accentColor: '#2563EB' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
              <span style={{ fontSize: 10, color: '#D1D5DB' }}>Min</span>
              <span style={{ fontSize: 10, color: '#D1D5DB' }}>Maks</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={handleCropCancel}
              style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1.5px solid #E5E7EB', background: '#fff', color: '#6B7280', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
            >
              Batalkan
            </button>
            <button
              type="button"
              onClick={handleCropConfirm}
              style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#1D4ED8', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              Gunakan Foto
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!isAdmin) {
    const roleTone = roleBadgeTone[user?.role] || roleBadgeTone.client;
    const navTabs = tabs.filter(({ key }) => key !== 'users');

    return (
      <>
        <DashboardLayout hideSidebar>
          <div className="min-h-screen w-full bg-slate-50">
            <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
              <div className="mb-5 flex items-center justify-between gap-4">
                <button
                  onClick={() => navigate(`${nonAdminRouteBase}/chat`)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
                >
                  <ArrowLeft size={14} /> Kembali ke Chat
                </button>
                <div className="inline-flex items-center gap-2 text-slate-700">
                  <Settings size={18} className="text-blue-600" />
                  <span className="text-lg font-bold">Pengaturan</span>
                </div>
              </div>

              <div className="mb-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="relative h-16 w-16 shrink-0 rounded-full ring-4 ring-blue-50">
                  {user?.avatar ? (
                    <img
                      src={`${BASE_URL}${user.avatar}`}
                      alt="avatar"
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
                      {initials}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarUploading}
                    title="Ganti foto profil"
                    className="absolute -bottom-1 -right-1 inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <Camera size={13} />
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold text-slate-800">{user?.username}</p>
                  <p className="truncate text-sm text-slate-500">{user?.email}</p>
                  <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${roleTone}`}>
                    <BadgeIcon size={12} /> {badge.label}
                  </span>
                </div>
              </div>

              <div className="mb-4 flex items-center gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm lg:hidden">
                {navTabs.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={`inline-flex min-w-max items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      tab === key
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon size={14} /> {label}
                  </button>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-[220px_1fr] lg:gap-6">
                <aside className="hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:block">
                  <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Menu</p>
                  <nav className="space-y-1">
                    {navTabs.map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTab(key)}
                        className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                          tab === key
                            ? 'bg-blue-600 text-white shadow'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Icon size={15} /> {label}
                      </button>
                    ))}
                  </nav>
                </aside>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div key={tab} className="admin-dash-reveal">
                    {tab === 'profile' ? (
                      <div>
                        <h2 className="text-lg font-bold text-slate-800">Edit Profil</h2>
                        <p className="mt-1 text-sm text-slate-500">Perbarui data akun agar informasi kamu selalu terbaru.</p>

                        <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-sm font-semibold text-slate-700">Foto Profil</p>
                            <p className="mt-1 text-xs text-slate-500">Gunakan foto yang jelas. Format JPG, PNG, atau GIF.</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => profileAvatarInputRef.current?.click()}
                                disabled={avatarUploading}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                <Camera size={14} /> {avatarUploading ? 'Mengunggah...' : 'Pilih Foto'}
                              </button>
                              {user?.avatar && (
                                <button
                                  type="button"
                                  onClick={handleDeleteAvatar}
                                  disabled={avatarUploading}
                                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                  <Trash2 size={14} /> Hapus Foto
                                </button>
                              )}
                              <input
                                ref={profileAvatarInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleAvatarChange}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Username</label>
                            <input
                              type="text"
                              value={profileForm.username}
                              onChange={e => setProfileForm({ ...profileForm, username: e.target.value })}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div>
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Email</label>
                            <input
                              type="email"
                              value={profileForm.email}
                              onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div className="flex justify-end">
                            <button
                              type="submit"
                              disabled={saving}
                              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              <Save size={15} /> {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                            </button>
                          </div>
                        </form>
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-white shadow-sm">
                        <h2 className="text-lg font-bold text-slate-800">Ubah Password</h2>
                        <p className="mt-1 text-sm text-slate-500">Gunakan kombinasi huruf besar, huruf kecil, angka, dan simbol.</p>

                        <form onSubmit={handleChangePass} className="mt-6 space-y-4" autoComplete="off">
                          {[
                            { key: 'current', label: 'Password Saat Ini', field: 'current' },
                            { key: 'new', label: 'Password Baru', field: 'newPass' },
                            { key: 'confirm', label: 'Konfirmasi Password', field: 'confirm' },
                          ].map(({ key, label, field }) => (
                            <div key={key}>
                              <label className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</label>
                              <div className="relative">
                                <input
                                  type={showPass[key] ? 'text' : 'password'}
                                  value={passForm[field]}
                                  onChange={e => setPassForm({ ...passForm, [field]: e.target.value })}
                                  placeholder={label}
                                  autoComplete="new-password"
                                  data-lpignore="true"
                                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 pr-10 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPass(p => ({ ...p, [key]: !p[key] }))}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-blue-600"
                                >
                                  {showPass[key] ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                              </div>
                              <p className="mt-1 text-xs text-slate-400">Minimal 6 karakter dan jangan gunakan password yang sama dengan akun lain.</p>
                            </div>
                          ))}

                          <div className="flex justify-end">
                            <button
                              type="submit"
                              disabled={saving}
                              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              <Save size={15} /> {saving ? 'Menyimpan...' : 'Simpan Password'}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </DashboardLayout>
        {renderCropModal()}
      </>
    );
  }

  const containerStyle = isAdmin
    ? {
        padding: isMobile ? '20px 14px' : isTablet ? '26px 20px' : '32px 36px',
        maxWidth: 780,
      }
    : {
        padding: isMobile ? '20px 14px 36px' : '32px 20px 48px',
        maxWidth: 820,
        width: '100%',
        margin: '0 auto',
      };

  return (
    <>
    <DashboardLayout hideSidebar={!isAdmin}>
      <div style={containerStyle}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          {!isAdmin && (
            <button
              onClick={() => navigate(`${nonAdminRouteBase}/chat`)}
              style={{
                marginBottom: 14,
                padding: '8px 12px',
                borderRadius: 10,
                border: '1px solid #E5E7EB',
                background: '#fff',
                color: '#4B5563',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <ArrowLeft size={14} /> Kembali ke Chat
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Settings size={20} color="#2563EB" />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1F2937' }}>Pengaturan</h1>
          </div>
        </div>

        {/* Profile Card */}
        <div style={{
          background: '#fff', borderRadius: 14, padding: '24px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB',
          marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
        }}>
          {/* Avatar with camera overlay */}
          <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
            {user?.avatar ? (
              <img
                src={`${BASE_URL}${user.avatar}`}
                alt="avatar"
                style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: '#1D4ED8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontWeight: 700, color: '#fff',
              }}>
                {initials}
              </div>
            )}
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              title="Ganti foto profil"
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 22, height: 22, borderRadius: '50%',
                background: '#1D4ED8', border: '2px solid #fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: avatarUploading ? 'wait' : 'pointer', padding: 0,
              }}
            >
              <Camera size={11} color="#fff" />
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
            />
          </div>
          <div>
            <p style={{ fontSize: 17, fontWeight: 700, color: '#1F2937', margin: 0 }}>{user?.username}</p>
            <p style={{ fontSize: 13, color: '#6B7280', margin: '2px 0 8px' }}>{user?.email}</p>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: badge.bg, color: badge.color,
              fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 99,
            }}>
              <BadgeIcon size={13} /> {badge.label}
            </span>
          </div>
        </div>

        {/* Tabs (admin only) */}
        {isAdmin && (
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#F3F4F6', padding: 4, borderRadius: 10, width: isMobile ? '100%' : 'fit-content', flexWrap: 'wrap' }}>
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: tab === key ? '#fff' : 'transparent',
                  color: tab === key ? '#1D4ED8' : '#6B7280',
                  fontWeight: tab === key ? 700 : 400, fontSize: 13,
                  boxShadow: tab === key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        )}

        {/* Profile Form */}
        {showProfileSection && (
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1F2937', marginBottom: 20 }}>Edit Profil</h2>
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Photo upload section */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', background: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E7EB' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {user?.avatar ? (
                    <img
                      src={`${BASE_URL}${user.avatar}`}
                      alt="avatar"
                      style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{
                      width: 56, height: 56, borderRadius: '50%',
                      background: '#1D4ED8',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, fontWeight: 700, color: '#fff',
                    }}>
                      {initials}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', margin: '0 0 4px' }}>Foto Profil</p>
                  <p style={{ fontSize: 11, color: '#9CA3AF', margin: '0 0 10px' }}>JPG, PNG, atau GIF. Maks 5 MB.</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => profileAvatarInputRef.current?.click()}
                      disabled={avatarUploading}
                      style={{
                        padding: '6px 14px', borderRadius: 6, border: '1.5px solid #D1D5DB',
                        background: '#fff', color: '#374151', fontSize: 12, fontWeight: 600,
                        cursor: avatarUploading ? 'wait' : 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      <Camera size={13} />{avatarUploading ? 'Mengunggah...' : 'Pilih Foto'}
                    </button>
                    {user?.avatar && (
                      <button
                        type="button"
                        onClick={handleDeleteAvatar}
                        disabled={avatarUploading}
                        style={{
                          padding: '6px 14px', borderRadius: 6, border: '1.5px solid #fca5a5',
                          background: '#fef2f2', color: '#ef4444', fontSize: 12, fontWeight: 600,
                          cursor: avatarUploading ? 'wait' : 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                        }}
                      >
                        <Trash2 size={13} /> Hapus Foto
                      </button>
                    )}
                  </div>
                  <input
                    ref={profileAvatarInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleAvatarChange}
                  />
                </div>
              </div>
              {[
                { label: 'Username', field: 'username', type: 'text' },
                { label: 'Email',    field: 'email',    type: 'email' },
              ].map(({ label, field, type }) => (
                <div key={field}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>{label}</label>
                  <input
                    type={type}
                    value={profileForm[field]}
                    onChange={e => setProfileForm({ ...profileForm, [field]: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 12px',
                      border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14,
                      outline: 'none', boxSizing: 'border-box',
                    }}
                    onFocus={e => e.target.style.borderColor = '#2563EB'}
                    onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                  />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Role</label>
                <input disabled value={badge.label} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14, background: '#F9FAFB', color: '#9CA3AF', boxSizing: 'border-box', cursor: 'not-allowed' }} />
                <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>Role tidak dapat diubah secara mandiri.</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" disabled={saving} style={{
                  padding: '10px 22px', borderRadius: 8, border: 'none',
                  background: saving ? '#93c5fd' : '#1D4ED8',
                  color: '#fff', fontWeight: 600, fontSize: 14,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <Save size={15} /> {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Password Form */}
        {showPasswordSection && (
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB', marginTop: isAdmin ? 0 : 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1F2937', marginBottom: 20 }}>Ganti Password</h2>
            <form onSubmit={handleChangePass} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { key: 'current', label: 'Password Saat Ini',   field: 'current' },
                { key: 'new',     label: 'Password Baru',       field: 'newPass' },
                { key: 'confirm', label: 'Konfirmasi Password', field: 'confirm' },
              ].map(({ key, label, field }) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>{label}</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPass[key] ? 'text' : 'password'}
                      value={passForm[field]}
                      onChange={e => setPassForm({ ...passForm, [field]: e.target.value })}
                      placeholder={label}
                      style={{
                        width: '100%', padding: '10px 40px 10px 12px',
                        border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14,
                        outline: 'none', boxSizing: 'border-box',
                      }}
                      onFocus={e => e.target.style.borderColor = '#2563EB'}
                      onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                    />
                    <button type="button" onClick={() => setShowPass(p => ({ ...p, [key]: !p[key] }))}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 0, color: '#9CA3AF', cursor: 'pointer' }}>
                      {showPass[key] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" disabled={saving} style={{
                  padding: '10px 22px', borderRadius: 8, border: 'none',
                  background: saving ? '#93c5fd' : '#1D4ED8',
                  color: '#fff', fontWeight: 600, fontSize: 14,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <Save size={15} /> {saving ? 'Menyimpan...' : 'Simpan Password'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Admin: Kelola Users */}
        {tab === 'users' && isAdmin && (
          <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #F3F4F6' }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1F2937' }}>Daftar User ({users.length})</h2>
            </div>
            {usersLoading ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>Memuat...</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB' }}>
                    {['Username', 'Email', 'Role', 'Aksi'].map(h => (
                      <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6B7280', borderBottom: '1px solid #F3F4F6' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => {
                    const rb = roleBadge[u.role] || roleBadge.client;
                    const isSelf = u.id === user?.id;
                    return (
                      <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? '1px solid #F9FAFB' : 'none' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                        <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#1F2937' }}>
                          {u.username}
                          {isSelf && <span style={{ marginLeft: 6, fontSize: 10, color: '#2563EB' }}>(kamu)</span>}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#6B7280' }}>{u.email}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ background: rb.bg, color: rb.color, fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 99 }}>
                            {rb.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => {
                                setEditingUser({ id: u.id, username: u.username, email: u.email, role: u.role });
                                setShowRoleDropdown(false);
                              }}
                              style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6B7280' }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#2563EB'; e.currentTarget.style.borderColor = '#93c5fd'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#6B7280'; e.currentTarget.style.borderColor = '#E5E7EB'; }}
                            >
                              <Pencil size={12} /> Edit
                            </button>
                            {!isSelf && u.role !== 'admin' && (
                              deleteConfirm === u.id ? (
                                <div style={{ display: 'flex', gap: 4 }}>
                                  <button onClick={() => handleDeleteUser(u.id)} style={{ padding: '5px 8px', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Ya</button>
                                  <button onClick={() => setDeleteConfirm(null)} style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', fontSize: 11, color: '#6B7280' }}>Batal</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirm(u.id)}
                                  style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#6B7280' }}
                                  onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#fca5a5'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#6B7280'; e.currentTarget.style.borderColor = '#E5E7EB'; }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) setEditingUser(null); }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1F2937' }}>Edit User</h2>
              <button onClick={() => { setEditingUser(null); setShowRoleDropdown(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleEditUser} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Username', field: 'username', type: 'text' },
                { label: 'Email',    field: 'email',    type: 'email' },
              ].map(({ label, field, type }) => (
                <div key={field}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>{label}</label>
                  <input
                    type={type}
                    value={editingUser[field]}
                    onChange={e => setEditingUser(prev => ({ ...prev, [field]: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = '#2563EB'}
                    onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                  />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Role</label>
                <div data-role-dropdown="true" style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setShowRoleDropdown(v => !v)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: showRoleDropdown ? '1.5px solid #2563EB' : '1.5px solid #E5E7EB',
                      borderRadius: 8,
                      fontSize: 14,
                      background: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      color: '#1F2937',
                      cursor: 'pointer',
                    }}
                  >
                    {editingUser.role === 'admin' ? 'Admin' : editingUser.role === 'karyawan' ? 'Employee (karyawan)' : 'Client'}
                    <ChevronDown size={16} color="#6B7280" />
                  </button>

                  {showRoleDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      left: 0,
                      right: 0,
                      background: '#fff',
                      border: '1px solid #E5E7EB',
                      borderRadius: 10,
                      boxShadow: '0 10px 28px rgba(0,0,0,0.12)',
                      padding: 6,
                      zIndex: 50,
                    }}>
                      {[
                        { value: 'admin', label: 'Admin' },
                        { value: 'karyawan', label: 'Employee (karyawan)' },
                        { value: 'client', label: 'Client' },
                      ].map((option) => {
                        const isActive = editingUser.role === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setEditingUser(prev => ({ ...prev, role: option.value }));
                              setShowRoleDropdown(false);
                            }}
                            style={{
                              width: '100%',
                              border: 'none',
                              borderRadius: 8,
                              background: isActive ? '#EFF6FF' : 'transparent',
                              color: isActive ? '#1D4ED8' : '#374151',
                              padding: '9px 10px',
                              fontSize: 13,
                              fontWeight: isActive ? 600 : 500,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              textAlign: 'left',
                            }}
                            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F9FAFB'; }}
                            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                          >
                            <span>{option.label}</span>
                            {isActive && <Check size={14} color="#1D4ED8" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => { setEditingUser(null); setShowRoleDropdown(false); }} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1.5px solid #E5E7EB', background: '#fff', color: '#6B7280', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Batal</button>
                <button type="submit" disabled={editSaving} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: editSaving ? '#93c5fd' : '#1D4ED8', color: '#fff', fontSize: 14, fontWeight: 600, cursor: editSaving ? 'not-allowed' : 'pointer' }}>
                  {editSaving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
    {renderCropModal()}
    </>
  );
}
