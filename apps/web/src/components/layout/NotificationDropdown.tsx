import { useState } from 'react';
import { Bell, CheckCheck, FileText } from 'lucide-react';
import { usePlatform } from '@/context/PlatformContext';
import { api } from '@/lib/api';
import type { Notification } from '@/types';

function timeAgo(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}

export default function NotificationDropdown({ onNavigate }: { onNavigate: (route: string) => void }) {
  const { notifications, refresh } = usePlatform();
  const [open, setOpen] = useState(false);
  const unread = notifications.filter(notification => !notification.read);
  const recent = notifications.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  async function markAllRead() {
    await api.markAllNotificationsRead(unread.map(notification => notification.id));
    await refresh();
  }

  async function openNotification(notification: Notification) {
    if (!notification.read) {
      await api.markNotificationRead(notification.id);
      await refresh();
    }
    if (notification.link) onNavigate(notification.link);
    setOpen(false);
  }

  return <div className="relative">
    <button type="button" className="topbar-icon-control" onClick={() => setOpen(value => !value)} aria-label={`Notifications${unread.length ? `, ${unread.length} unread` : ''}`} aria-expanded={open}>
      <Bell size={18} />
      {unread.length > 0 && <span className="topbar-notification-badge">{unread.length > 9 ? '9+' : unread.length}</span>}
    </button>
    {open && <div className="topbar-popover topbar-notification-menu">
      <div className="topbar-popover-header"><div><b>Notifications</b><span>{unread.length ? `${unread.length} unread` : 'All caught up'}</span></div>{unread.length > 0 && <button type="button" className="topbar-text-action" onClick={() => void markAllRead()}><CheckCheck size={14} /> Mark all as read</button>}</div>
      <div className="topbar-notification-list">{recent.length ? recent.map(notification => <button type="button" key={notification.id} className={`topbar-notification-item ${notification.read ? '' : 'is-unread'}`} onClick={() => void openNotification(notification)}><span className="topbar-notification-icon"><FileText size={15} /></span><span className="topbar-notification-copy"><b>{notification.title}</b><span>{notification.message}</span><small>{timeAgo(notification.created_at)}</small></span>{!notification.read && <i />}</button>) : <p className="topbar-empty">No notifications yet.</p>}</div>
      <button type="button" className="topbar-view-all" onClick={() => { onNavigate('/dashboard/notifications'); setOpen(false); }}>View all notifications</button>
    </div>}
  </div>;
}
