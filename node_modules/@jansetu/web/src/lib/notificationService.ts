import { collection, doc, limit, onSnapshot, query, updateDoc, where, type Unsubscribe } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { Notification } from '@/types';

export type NotificationInput = {
  recipientId: string;
  recipientRole?: string;
  type: string;
  title: string;
  message: string;
  relatedProblemId?: string;
  relatedProjectId?: string;
  relatedTeamId?: string;
  relatedUniversityId?: string;
  relatedPartnerId?: string;
  relatedUserId?: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  actionUrl?: string;
};

function normalize(id: string, value: Record<string, any>): Notification {
  return {
    id,
    user_id: value.recipientId || value.userId || '',
    title: value.title || 'JanSamadhan update',
    message: value.message || '',
    type: value.type || 'GENERAL',
    read: Boolean(value.isRead ?? value.read),
    link: value.actionUrl || value.link || value.relatedProblemId || value.relatedProjectId,
    created_at: value.createdAt?.toDate?.()?.toISOString?.() || value.createdAt || value.created_at || new Date().toISOString(),
  };
}

export function subscribeToNotifications(recipientId: string | undefined, onChange: (items: Notification[]) => void, onError?: (error: Error) => void): Unsubscribe {
  if (!db || !recipientId) {
    onChange([]);
    return () => undefined;
  }
  const source = query(collection(db, 'notifications'), where('recipientId', '==', recipientId), limit(100));
  return onSnapshot(source, snapshot => {
    const items = snapshot.docs.map(item => normalize(item.id, item.data())).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    onChange(items);
  }, error => onError?.(error));
}

export async function markNotificationRead(id: string) {
  if (!db || !auth?.currentUser) throw new Error('You must be signed in to update notifications.');
  await updateDoc(doc(db, 'notifications', id), { isRead: true, read: true });
}

export async function markAllNotificationsRead(ids: string[]) {
  await Promise.all(ids.map(markNotificationRead));
}

export function createNotification(input: NotificationInput) {
  return import('firebase/firestore').then(({ addDoc }) => {
    if (!db) throw new Error('Firebase is not configured.');
    return addDoc(collection(db, 'notifications'), { ...input, isRead: false, read: false, createdAt: new Date() });
  });
}
