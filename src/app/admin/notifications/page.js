'use client';
import { useState, useEffect } from 'react';
import { Check, CheckCircle2 } from 'lucide-react';
import { apiRequest, showToast } from '@/lib/api';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await apiRequest('/api/admin/notifications');
      if (res.s === 1) {
        setNotifications(res.r?.notifications || []);
      }
    } catch (err) {
      showToast('Failed to fetch notifications', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id = null) => {
    try {
      const res = await apiRequest('/api/admin/notifications/read', {
        method: 'POST',
        body: JSON.stringify({ notification_id: id }),
      });
      if (res.s === 1) {
        showToast('Notification(s) marked as read', 'success');
        fetchNotifications();
      }
    } catch (err) {
      showToast('Error updating notification', 'error');
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading notifications...</div>;

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Notifications</h1>
        {notifications.some(n => !n.is_read) && (
          <button 
            onClick={() => handleMarkAsRead()}
            style={{ background: 'none', border: 'none', color: '#0ea5e9', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Check size={16} /> Mark all as read
          </button>
        )}
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {notifications.length === 0 ? (
          <div style={{ background: 'white', padding: '32px', textAlign: 'center', borderRadius: '12px', color: '#64748b' }}>
            No notifications found.
          </div>
        ) : (
          notifications.map((n) => (
            <div key={n.id} style={{ 
              background: 'white', 
              borderRadius: '12px', 
              padding: '20px', 
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
              borderLeft: n.is_read ? '4px solid transparent' : '4px solid #0ea5e9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#0ea5e9', background: '#e0f2fe', padding: '2px 8px', borderRadius: '12px' }}>{n.type}</span>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{new Date(n.created_at).toLocaleString()}</span>
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', margin: '0 0 6px 0' }}>{n.title}</h3>
                <p style={{ color: '#475569', fontSize: '0.95rem', margin: 0, lineHeight: '1.5' }}>{n.message}</p>
              </div>
              
              {!n.is_read && (
                <button 
                  onClick={() => handleMarkAsRead(n.id)}
                  title="Mark as read"
                  style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '4px' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#10b981'}
                  onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}
                >
                  <CheckCircle2 size={24} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
