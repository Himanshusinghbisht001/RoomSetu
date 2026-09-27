import { apiClient } from '../../../lib/api/client.js';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
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

export const isPushSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

export const registerServiceWorker = async () => {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
};

export const subscribeToPush = async () => {
  if (!isPushSupported()) throw new Error('Push not supported by this browser');
  
  const registration = await navigator.serviceWorker.ready;
  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  
  if (!vapidPublicKey) {
    throw new Error('VAPID public key is missing. Contact support.');
  }

  const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: convertedVapidKey
  });

  const subJson = subscription.toJSON();
  if (!subJson.keys) throw new Error('Invalid subscription format');

  await apiClient.post('/notifications/subscribe', {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subJson.keys.p256dh,
      auth: subJson.keys.auth
    },
    device: navigator.userAgent
  });

  return subscription;
};

export const unsubscribeFromPush = async () => {
  if (!isPushSupported()) throw new Error('Push not supported');
  
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  
  if (subscription) {
    await apiClient.delete('/notifications/unsubscribe', {
      data: { endpoint: subscription.endpoint }
    });
    await subscription.unsubscribe();
  }
};

export const getPushSubscription = async () => {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return await registration.pushManager.getSubscription();
};
