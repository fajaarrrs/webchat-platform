import { useEffect, useRef, useState } from 'react';
import { api } from '../api';

// Helper function to convert VAPID public key to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const subscriptionRef = useRef(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported] = useState('serviceWorker' in navigator && 'PushManager' in window);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [hasSeenPermissionPrompt, setHasSeenPermissionPrompt] = useState(false);

  const initPushNotifications = async () => {
    if (!isSupported) return;

    try {
      const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!VAPID_PUBLIC_KEY) {
        console.error('VAPID_PUBLIC_KEY not configured');
        return;
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);

      // Check current subscription
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        subscriptionRef.current = subscription;
        setIsSubscribed(true);
      } else if (Notification.permission === 'default' && !hasSeenPermissionPrompt) {
        // Show custom permission modal only if permission hasn't been asked yet
        setShowPermissionModal(true);
        setHasSeenPermissionPrompt(true);
        localStorage.setItem('wchat_permission_prompt_shown', 'true');
      }
    } catch (err) {
      console.error('Error initializing push notifications:', err);
    }
  };

  const requestNotificationPermission = async () => {
    if (!isSupported) return false;

    try {
      const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!VAPID_PUBLIC_KEY) {
        console.error('VAPID_PUBLIC_KEY not configured');
        return false;
      }

      const registration = await navigator.serviceWorker.ready;

      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }

      if (permission === 'granted') {
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });

        subscriptionRef.current = subscription;

        // Send subscription to backend
        await api.post('/push/subscribe', {
          subscription: subscription.toJSON()
        });

        setIsSubscribed(true);
        console.log('Push notification subscription successful');
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      return false;
    }
  };

  const unsubscribeFromPush = async () => {
    try {
      if (subscriptionRef.current) {
        await api.post('/push/unsubscribe', {
          subscription: subscriptionRef.current.toJSON()
        });

        await subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
        setIsSubscribed(false);
        console.log('Unsubscribed from push notifications');
        return true;
      }
    } catch (err) {
      console.error('Error unsubscribing from push notifications:', err);
      return false;
    }
  };

  // Auto-init on first load only
  useEffect(() => {
    if (isSupported) {
      const alreadyPrompted = localStorage.getItem('wchat_permission_prompt_shown');
      if (alreadyPrompted) {
        setHasSeenPermissionPrompt(true);
      }
      initPushNotifications();
    }
  }, [isSupported]);

  return {
    isSupported,
    isSubscribed,
    showPermissionModal,
    setShowPermissionModal,
    requestNotificationPermission,
    unsubscribeFromPush,
    toggleSubscription: isSubscribed ? unsubscribeFromPush : requestNotificationPermission
  };
}

