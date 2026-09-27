import React, { useState, useEffect } from 'react';
import { 
  isPushSupported, 
  subscribeToPush, 
  unsubscribeFromPush, 
  getPushSubscription,
  registerServiceWorker
} from '../services/pushNotifications.js';
import { useAuth } from '../../../auth/AuthProvider.js';

export const NotificationSettings: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSupport = async () => {
      if (isPushSupported()) {
        setIsSupported(true);
        setPermission(Notification.permission);
        if (isAuthenticated) {
          await registerServiceWorker();
          const sub = await getPushSubscription();
          setIsSubscribed(!!sub);
        }
      }
    };
    checkSupport();
  }, [isAuthenticated]);

  if (!isAuthenticated || !isSupported) return null;

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);
    try {
      const currentPerm = await Notification.requestPermission();
      setPermission(currentPerm);
      if (currentPerm === 'granted') {
        await subscribeToPush();
        setIsSubscribed(true);
      } else {
        setError('Permission denied by browser.');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to subscribe');
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    setError(null);
    try {
      await unsubscribeFromPush();
      setIsSubscribed(false);
    } catch (e: any) {
      setError(e.message || 'Failed to unsubscribe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
       {isSubscribed ? (
         <button 
           className="btn btn-outline btn-sm" 
           onClick={handleUnsubscribe} 
           disabled={loading}
           title="Disable Web Push Notifications"
         >
           🔕 Disable Push
         </button>
       ) : (
         <button 
           className="btn btn-outline btn-sm" 
           onClick={handleSubscribe} 
           disabled={loading || permission === 'denied'}
           title={permission === 'denied' ? 'Notifications blocked in browser' : 'Enable Web Push Notifications'}
         >
           {permission === 'denied' ? '🚫 Push Blocked' : '🔔 Enable Push'}
         </button>
       )}
       {error && <span style={{position:'absolute', bottom:'-20px', left:0, color:'var(--danger)', fontSize:'10px', whiteSpace:'nowrap'}}>{error}</span>}
    </div>
  );
};
