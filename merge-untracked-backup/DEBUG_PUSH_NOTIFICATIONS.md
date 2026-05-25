# Push Notification Debug Guide

## TESTED FIX ✓

**MASALAH ASLI**: Mention regex hanya detect word characters, sehingga username dengan spasi tidak ter-detect.

**SOLUSI**: Updated regex untuk support:
- `@"Client Ketjeh"` (dengan quotes)
- `@ClientKetjeh` (tanpa spasi)

---

## Testing Steps

**PENTING**: Pastikan kedua browser/akun sudah **enable notifications** sebelum test!

### Step 1: Test Scenario
1. Buka 2 browser/tab dengan akun berbeda
2. Login akun pertama (e.g., admin) di Browser 1
3. Login akun kedua (e.g., Client Ketjeh) di Browser 2
4. Kedua browser masuk ke **forum yang sama**
5. Kedua enable notifications
6. **Di Browser 1**, kirim pesan dengan mention menggunakan **SALAH SATU FORMAT**:
   - Format 1: `@"Client Ketjeh" test notification` (dengan quotes)
   - Format 2: `@ClientKetjeh test notification` (tanpa spasi)

### Step 2: Check Backend Logs
Lihat terminal backend untuk logs:

```
[MENTION] Extracted mentions from "@\"Client Ketjeh\" test": ["Client Ketjeh"]
[PUSH] sendMentionNotifications called - Mentioned: ["Client Ketjeh"]
[PUSH] Looking for user: Client Ketjeh - Found: ID=13
[PUSH] Sending push to user Client Ketjeh (ID: 13)
[PUSH-SEND] User 13 has 1 subscription(s)
[PUSH-SEND] Sending to endpoint: https://fcm.googleapis.com/fcm/send/...
[PUSH-SEND-SUCCESS] Push sent successfully
```

✅ **SUKSES**: Notification akan muncul di Browser 2

### Step 3: Kemungkinan Issues Lainnya

Jika masih tidak dapat notifikasi, cek:

```
[PUSH-SEND-ERROR] Status: 401 → VAPID keys salah
[PUSH-SEND-ERROR] Status: 410 → Subscription sudah invalid
[PUSH-SEND] No subscriptions found → User belum enable push
```

### Step 4: Service Worker Check

Buka DevTools → Application → Service Workers:
- ✓ Service Worker status: "activated and running"
- ✓ Di tab Console, cek apakah ada error

### Database Query

```bash
cd backend
node debug-subscriptions.js
```

Output yang benar:
```
Total subscriptions: 2
ID: 1, User: admin (ID: 1), ...
ID: 2, User: Client Ketjeh (ID: 13), ...
```

## Testing Plan untuk Anda

1. **Test mention dengan format 1**: `@"Client Ketjeh" hello`
2. Lihat apakah notification muncul di Client Ketjeh browser
3. Share backend logs output jika masih tidak bekerja
4. Cek di DevTools Console service worker ada error tidak

