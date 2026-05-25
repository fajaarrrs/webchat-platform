# Web Push Notifications Implementation Guide

## Overview
This WebChat platform now supports Web Push Notifications to alert users about mentions and important updates even when the browser tab is closed.

## Features Implemented

### 1. Backend Components

#### a. Service Configuration
- **Location**: `backend/.env`
- **VAPID Keys**: Already generated and configured
  - `VAPID_PUBLIC_KEY`: Used by frontend for subscription
  - `VAPID_PRIVATE_KEY`: Used by backend to sign notifications
  - `VAPID_SUBJECT`: Contact email for push service

#### b. Database
- **Table**: `push_subscriptions`
  - Stores user subscriptions
  - Each record contains: user_id, subscription JSON, created_at
  - Foreign key relationship with users table

#### c. API Routes (`routes/push.js`)
- **POST /api/push/subscribe**: Register device for push notifications
  - Requires authentication
  - Body: `{ subscription: {...} }` (PushSubscription object)
  - Stores subscription in database

- **POST /api/push/unsubscribe**: Unregister device
  - Requires authentication  
  - Body: `{ subscription: {...} }`
  - Removes subscription from database

#### d. Mention Detection & Push Sending (`index.js`)
- Detects `@username` mentions in messages
- Automatically sends push notifications to mentioned users
- Excludes the sender from receiving their own mention notifications
- Payload includes:
  - Title: "Mentioned by {sender}"
  - Body: "You were mentioned in {forum_name}"
  - Click-through URL to the relevant forum

### 2. Frontend Components

#### a. Service Worker (`public/sw.js`)
- Handles incoming push messages
- Displays notifications with custom styling
- Handles notification click events to navigate to the relevant URL
- Supports web app notifications even when tab is closed

#### b. Custom Hook (`hooks/usePushNotifications.js`)
- `usePushNotifications()` hook provides:
  - `isSupported`: Boolean indicating browser support
  - `isSubscribed`: Current subscription status
  - `requestNotificationPermission()`: Request user permission
  - `toggleSubscription()`: Enable/disable notifications
  - Auto-initializes on mount

- Features:
  - Automatic service worker registration
  - VAPID key setup
  - Subscription management
  - Device subscription storage

#### c. Settings Page (`pages/SettingsPage.jsx`)
- Push notifications toggle in Profile tab
- Shows current subscription status
- Easy enable/disable button
- Only visible on browsers that support Web Push

### 3. Integration Points

#### Chat Page (`pages/ChatPage.jsx`)
- Automatically initializes push notifications on load
- Triggers the permission request if needed
- No manual configuration required

#### Auth Context
- Push subscription persists across sessions
- Each device gets its own subscription

## Setup Instructions

### Backend Setup
1. VAPID keys already generated in `.env`:
   ```
   VAPID_PUBLIC_KEY=BG3FGuFbZDku81FhXu3R9ZtbLW2rc4tMWagLfG8u7GOTLMSKqKnM50Kh31EUcOlj_IPDlmD-L9sQWmIhNvFCbBc
   VAPID_PRIVATE_KEY=00L-0rakQhLSCP_UUFPg4BidTPZIy4-7MFI6qywOj_I
   VAPID_SUBJECT=mailto:admin@webchat.com
   ```

2. Dependencies installed:
   ```bash
   npm install web-push
   ```

3. Database initialized with `push_subscriptions` table on first run

### Frontend Setup
1. VAPID public key configured in `.env.local`:
   ```
   VITE_VAPID_PUBLIC_KEY=BG3FGuFbZDku81FhXu3R9ZtbLW2rc4tMWagLfG8u7GOTLMSKqKnM50Kh31EUcOlj_IPDlmD-L9sQWmIhNvFCbBc
   ```

2. Service worker automatically registered on first visit

3. Users will be prompted for notification permission

## Usage Flow

### User Perspective
1. User visits the chat page
2. Browser prompts "Allow notifications?"
3. User clicks "Allow"
4. Service worker registers automatically
5. Subscription sent to backend
6. When mentioned: `@username in message`
7. Push notification appears (even if tab closed)
8. Click notification → opens chat in that forum

### Administrator Perspective
- Can view all user subscriptions in database
- Subscriptions auto-cleanup if invalid (410 Gone responses)
- Monitor push delivery via server logs

### Developer Notes
- Push notifications require HTTPS in production
- Works on localhost for development
- Supported browsers: Chrome, Firefox, Edge (not Safari yet)
- Each browser/device gets separate subscription
- Subscriptions persist until explicitly unsubscribed or invalidated

## File Structure
```
backend/
├── .env (VAPID keys configured)
├── routes/push.js (API endpoints)
├── index.js (mention detection logic)
└── database.js (push_subscriptions table)

frontend/
├── .env (VAPID_PUBLIC_KEY)
├── public/sw.js (service worker)
├── src/
│   ├── hooks/usePushNotifications.js (custom hook)
│   ├── pages/ChatPage.jsx (initialization)
│   └── pages/SettingsPage.jsx (toggle UI)
```

## Testing Checklist

- [ ] Backend starts without errors
- [ ] Database table created successfully
- [ ] Frontend loads service worker
- [ ] Browser prompts for notification permission
- [ ] Subscription sent to backend after permission
- [ ] Settings page shows toggle (if browser supported)
- [ ] Mention (@username) triggers push notification
- [ ] Push notification appears even with tab closed
- [ ] Clicking notification opens correct forum
- [ ] Unsubscribe removes subscription from database
- [ ] Invalid subscriptions cleaned up automatically

## Troubleshooting

### "VAPID_PUBLIC_KEY not configured"
- Check that `VITE_VAPID_PUBLIC_KEY` is in frontend `.env`
- Restart frontend dev server after .env changes

### Service Worker Not Registering
- Check browser console for errors
- Ensure `/public/sw.js` is accessible
- Works on `localhost` without HTTPS

### No Notifications Received
- Check browser's notification settings
- Verify notification permission was granted
- Check backend logs for send errors
- Ensure subscription is stored in database

### Database Errors
- Run `npm run dev` to initialize tables
- Check database file permissions
- Verify `push_subscriptions` table exists

## Future Enhancements

1. Admin push notifications for system events
2. Direct message (DM) notifications
3. Notification preferences per forum
4. Sound and badge customization
5. Notification history log
6. Rich notifications with images/buttons
7. Android app support
8. iOS app support (after PWA improvements)

## Security Considerations

- VAPID keys are sensitive - rotate them if compromised
- Store subscriptions only necessary data
- Validate subscriptions before sending
- Clean up stale subscriptions automatically
- Always use HTTPS in production
- Rate limit push sending to prevent spam

## References

- [Web Push Protocol (RFC 8030)](https://tools.ietf.org/html/rfc8030)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [web-push npm package](https://www.npmjs.com/package/web-push)
