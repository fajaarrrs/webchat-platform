# WebChat Platform

WebChat Platform adalah aplikasi komunikasi tim berbasis forum dengan role admin, karyawan, dan client. Sistem ini terdiri dari:

- Frontend: React + Vite (single-page application)
- Backend: Express + SQLite (REST API + Socket.io)

## Fitur Utama

- Login dan register berbasis role
- Pembuatan forum oleh admin
- Join forum melalui link token
- Real-time chat dengan Socket.io
- Reply pesan, edit pesan
- Hapus pesan (Admin bisa menghapus pesan sendiri dan yang lain, sedangkan non admin hanya bisa menghapus pesannya sendiri)
- Pin/unpin pesan (only admin)
- Upload file lampiran (maksimal 10MB)
- Manajemen user (admin)
- Pengaturan profil user

## Akun Admin Utama

Backend melakukan seed akun admin otomatis jika belum ada user role admin.

- Username: admin
- Email: admin@gmail.com
- Password: admin123

Catatan:

- Akun admin utama ini tidak bisa dihapus dari panel manajemen user.
- Sangat disarankan langsung ganti password setelah login pertama
- Dapat melakukan register (akun baru, sebagai client/employee) lalu edit role di akun Admin (pada fitur management user) untuk mengubah akun baru menjadi role Admin.

## Prasyarat

- Node.js 18+ (disarankan 20+)
- npm

## Menjalankan Project (Development)

Jalankan backend dan frontend di terminal terpisah.

### 1) Setup backend

1. Masuk ke folder backend.
2. Install dependency.
3. Jalankan server.

Contoh perintah:

```bash
cd backend
npm install
npm run dev
```

Server default berjalan di:

- http://localhost:5000

### 2) Setup frontend

1. Masuk ke folder frontend.
2. Install dependency.
3. Jalankan Vite.

Contoh perintah:

```bash
cd frontend
npm install
npm run dev
```

Frontend default berjalan di:

- http://localhost:5173

## Konfigurasi Environment (Opsional tapi Disarankan)

### Backend .env

Buat file .env di folder backend:

```env
PORT=5000
JWT_SECRET=ubah-ke-secret-yang-kuat
FRONTEND_URL=http://localhost:5173
```

### Frontend .env

Buat file .env di folder frontend:

```env
VITE_API_BASE_URL=http://localhost:5000
```

## Cara Menggunakan Website

### Alur admin

1. Login dengan akun admin utama.
2. Buka dashboard admin.
3. Buat forum/link baru.
4. Bagikan link join forum ke user yang perlu bergabung.
5. Pantau chat, user, dan aktivitas forum.

### Alur karyawan/client

1. Register akun baru.
2. Login sesuai akun.
3. Buka link join forum dari admin.
4. Masuk ke halaman chat role masing-masing.
5. Kirim pesan teks atau upload file.

## Struktur Ringkas Project

```text
webchat-platform/
	backend/   # API, DB SQLite, Socket.io
	frontend/  # React app (Vite)
```

## Endpoint Pengecekan Cepat

- GET / -> Welcome message API
- GET /health -> status server

## Troubleshooting Singkat

- Jika frontend gagal akses API, cek nilai VITE_API_BASE_URL.
- Jika token invalid, logout lalu login ulang.
- Jika upload gagal, pastikan ukuran file <= 10MB.
- Jika port bentrok, ubah PORT backend dan sesuaikan di frontend .env.