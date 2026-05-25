const express = require('express');
const webpush = require('web-push');
const { db } = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Configure VAPID keys (only if both keys are provided)
const vapidPublic = process.env.VAPID_PUBLIC_KEY;
const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
if (vapidPublic && vapidPrivate) {
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:admin@webchat.com',
      vapidPublic,
      vapidPrivate
    );
    console.log('[PUSH] VAPID keys configured');
  } catch (err) {
    console.error('[PUSH] Failed to set VAPID details:', err.message || err);
  }
} else {
  console.warn('[PUSH] VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY not set — push notifications disabled');
}

// POST /api/push/subscribe — subscribe user to push notifications
router.post('/subscribe', authenticate, (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription object' });
    }

    // Store subscription in database
    db.prepare(
      'INSERT INTO push_subscriptions (user_id, subscription) VALUES (?, ?)'
    ).run(req.user.id, JSON.stringify(subscription));

    res.json({ success: true, message: 'Subscribed to push notifications' });
  } catch (err) {
    console.error('POST /subscribe error:', err);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

// POST /api/push/unsubscribe — unsubscribe user from push notifications
router.post('/unsubscribe', authenticate, (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription object' });
    }

    // Remove subscription from database
    db.prepare(
      'DELETE FROM push_subscriptions WHERE user_id = ? AND subscription = ?'
    ).run(req.user.id, JSON.stringify(subscription));

    res.json({ success: true, message: 'Unsubscribed from push notifications' });
  } catch (err) {
    console.error('POST /unsubscribe error:', err);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

// Helper function to send push notification to a specific subscription
async function sendPushNotification(subscription, payload) {
  try {
    const result = await webpush.sendNotification(subscription, JSON.stringify(payload));
    console.log(`[PUSH-SEND-SUCCESS] Push sent successfully`);
    return result;
  } catch (err) {
    console.error(`[PUSH-SEND-ERROR] Status: ${err.statusCode}, Message: ${err.message}`);
    if (err.statusCode === 410) {
      // Subscription is no longer valid, remove it
      console.log(`[PUSH-SEND-ERROR] Removing invalid subscription (410 Gone)`);
      db.prepare('DELETE FROM push_subscriptions WHERE subscription = ?').run(
        JSON.stringify(subscription)
      );
    }
    throw err;
  }
}

// Helper function to send push to all subscriptions of a user
async function sendPushToUser(userId, payload) {
  try {
    const subscriptions = db.prepare(
      'SELECT subscription FROM push_subscriptions WHERE user_id = ?'
    ).all(userId);

    console.log(`[PUSH-SEND] User ${userId} has ${subscriptions.length} subscription(s)`);
    if (subscriptions.length === 0) {
      console.log(`[PUSH-SEND] No subscriptions found for user ${userId}`);
      return;
    }

    for (const row of subscriptions) {
      const subscription = JSON.parse(row.subscription);
      console.log(`[PUSH-SEND] Sending to endpoint: ${subscription.endpoint.substring(0, 50)}...`);
      await sendPushNotification(subscription, payload);
    }
  } catch (err) {
    console.error('Error sending push to user:', err);
  }
}

// Export helper functions for use in other modules
module.exports = router;
module.exports.sendPushToUser = sendPushToUser;
module.exports.sendPushNotification = sendPushNotification;
module.exports.webpush = webpush;
