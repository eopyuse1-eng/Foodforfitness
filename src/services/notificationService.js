import { isNativePlatform } from '../platform/platform';
import { getNotificationProvider } from '../platform/notifications';

const sentReminderKey = (reminderId, dateKey) => `food-for-fitness:reminder:${reminderId}:${dateKey}`;
const REMINDER_CHANNEL_ID = 'food-for-fitness-reminders';
const REMINDER_CHANNEL = {
  id: REMINDER_CHANNEL_ID,
  name: 'Food for Fitness reminders',
  description: 'Meal, hydration, medication, and health reminders',
  importance: 5,
  visibility: 1,
  vibration: true
};
const MAX_NOTIFICATION_ID = 2000000000;
const NATIVE_OPERATION_TIMEOUT_MS = 8000;
let nativeNotificationListenersPromise;
let nativePermissionPromise;

function withNativeTimeout(operation, label) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(`${label} timed out.`)), NATIVE_OPERATION_TIMEOUT_MS);
  });

  return Promise.race([operation, timeout]).finally(() => window.clearTimeout(timeoutId));
}

function dispatchNotificationEvent(name, detail) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function getSafeNotificationId(reminderId, offset = 0) {
  const numericId = Number(reminderId);
  if (Number.isSafeInteger(numericId) && numericId > 0 && numericId + offset <= MAX_NOTIFICATION_ID) {
    return numericId + offset;
  }

  const source = String(reminderId);
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const baseId = (hash >>> 0) % (MAX_NOTIFICATION_ID - 100000000) + 1;
  return baseId + (offset % 100000000);
}

function getScheduledNotificationId(reminderId, occurrenceIndex = 0) {
  return getSafeNotificationId(`${reminderId}:${occurrenceIndex}`);
}

export async function isNativeApp() {
  return isNativePlatform();
}

function getNativeNotifications() {
  if (!isNativePlatform()) return null;

  const native = getNotificationProvider();
  if (!nativeNotificationListenersPromise) {
    nativeNotificationListenersPromise = Promise.all([
      native.addListener('localNotificationReceived', (notification) => {
        dispatchNotificationEvent('food-for-fitness:notification-received', notification);
        dispatchNotificationEvent('food-for-fitness:reminder', notification);
      }),
      native.addListener('localNotificationActionPerformed', (action) => {
        dispatchNotificationEvent('food-for-fitness:notification-action', action);
      })
    ]).catch((error) => {
      nativeNotificationListenersPromise = undefined;
      console.warn('Native notification listeners unavailable:', error);
    });
  }
  return native;
}

async function prepareNativeNotifications(native, { requestPermission = false } = {}) {
  if (!native) return false;

  let permission = await withNativeTimeout(native.checkPermissions(), 'Notification permission check');
  if (requestPermission && permission.display !== 'granted') {
    permission = await withNativeTimeout(native.requestPermissions(), 'Notification permission request');
  }
  if (permission.display !== 'granted') return false;

  console.log('[Notifications] Creating channel:', REMINDER_CHANNEL_ID);
  await withNativeTimeout(native.createChannel(REMINDER_CHANNEL), 'Notification channel creation');
  console.log('[Notifications] Channel ready:', REMINDER_CHANNEL_ID);
  return true;
}

export async function requestNotificationPermission() {
  const native = getNativeNotifications();
  if (native) {
    if (!nativePermissionPromise) {
      nativePermissionPromise = (async () => {
        const permission = await withNativeTimeout(native.checkPermissions(), 'Notification permission check');
        if (permission.display !== 'granted') {
          const requested = await withNativeTimeout(native.requestPermissions(), 'Notification permission request');
          if (requested.display !== 'granted') return requested.display;
        }
        return (await prepareNativeNotifications(native)) ? 'granted' : 'denied';
      })().catch((error) => {
        nativePermissionPromise = undefined;
        throw error;
      });
    }
    return nativePermissionPromise;
  }

  if ('Notification' in window) return window.Notification.requestPermission();
  return 'unsupported';
}

export async function getNotificationPermission() {
  const native = getNativeNotifications();
  if (native) {
    const permission = await native.checkPermissions();
    return permission.display;
  }

  if ('Notification' in window) return window.Notification.permission;
  return 'unsupported';
}

export async function getExactNotificationPermission() {
  const native = getNativeNotifications();
  if (!native?.checkExactNotificationSetting) return 'unsupported';

  const permission = await native.checkExactNotificationSetting();
  return permission.exact_alarm === 'granted' ? 'granted' : 'denied';
}

export async function requestExactNotificationPermission() {
  const native = getNativeNotifications();
  if (!native?.changeExactNotificationSetting) return 'unsupported';

  const permission = await native.changeExactNotificationSetting();
  return permission.exact_alarm === 'granted' ? 'granted' : 'denied';
}

function buildReminderNotifications(reminders, exactPermission) {
  return reminders.flatMap((reminder) => {
    const timeKey = getReminderTimeKey(reminder.time);
    if (!reminder.active || !timeKey) return [];

    const [hours, minutes] = timeKey.split(':').map(Number);
    const firstDate = new Date();
    firstDate.setHours(hours, minutes, 0, 0);
    if (firstDate <= new Date()) firstDate.setDate(firstDate.getDate() + 1);

    const occurrenceCount = reminder.repeat === 'once' ? 1 : 30;
    const notifications = [];
    for (let dayOffset = 0; dayOffset < occurrenceCount && notifications.length < 30; dayOffset += 1) {
      const scheduleDate = new Date(firstDate);
      scheduleDate.setDate(firstDate.getDate() + dayOffset);
      const day = scheduleDate.getDay();
      if (reminder.repeat === 'weekdays' && (day === 0 || day === 6)) continue;

      notifications.push({
        id: getScheduledNotificationId(reminder.id, notifications.length),
        title: 'Food for Fitness',
        body: reminder.title,
        channelId: REMINDER_CHANNEL_ID,
        smallIcon: 'ic_stat_food_fitness',
        foreground: true,
        isExactNotification: exactPermission === 'granted',
        isExactMandatory: false,
        schedule: { at: scheduleDate, allowWhileIdle: true },
        extra: { reminderId: reminder.id }
      });
    }
    return notifications;
  });
}

async function cancelReminderNotifications(native, reminders) {
  const pendingResult = await withNativeTimeout(native.getPending(), 'Pending reminder lookup');
  const pendingReminderIds = (pendingResult.notifications || [])
    .filter((notification) => notification.extra?.reminderId != null)
    .map((notification) => notification.id);
  const knownReminderIds = reminders.flatMap((reminder) => [
    getSafeNotificationId(reminder.id),
    ...Array.from({ length: 31 }, (_, index) => getScheduledNotificationId(reminder.id, index))
  ]);
  const notificationIds = [...new Set([...pendingReminderIds, ...knownReminderIds])];
  if (notificationIds.length === 0) return;

  await native.cancel({
    notifications: notificationIds.map((id) => ({ id }))
  });
}

export async function cancelNativeReminders(reminders) {
  const native = getNativeNotifications();
  if (!native) return false;

  await withNativeTimeout(cancelReminderNotifications(native, reminders), 'Reminder cancellation');
  return true;
}

export async function scheduleNativeReminders(reminders) {
  const native = getNativeNotifications();
  if (!native) return false;

  console.log('[Notifications] Cancelling previous reminder schedules.');
  await cancelNativeReminders(reminders);
  if (!await prepareNativeNotifications(native)) return false;

  const exactPermission = await getExactNotificationPermission();
  if (exactPermission === 'denied') {
    console.warn('Exact alarm access is disabled; Android may deliver reminders late or remove exact schedules.');
  }

  const notifications = buildReminderNotifications(reminders, exactPermission);

  if (notifications.length > 0) {
    console.log('[Notifications] Scheduling reminders:', notifications);
    const result = await withNativeTimeout(native.schedule({ notifications }), 'Reminder scheduling');
    console.log('[Notifications] Schedule result:', result);
    if (result?.warning) console.warn('[Notifications] Schedule warning:', result.warning);
  }
  return true;
}

export function getCurrentTimeKey(date = new Date()) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function getReminderTimeKey(time) {
  if (!time) return '';
  if (/^\d{2}:\d{2}$/.test(time)) return time;

  const match = String(time).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return '';

  let hours = Number(match[1]);
  const minutes = match[2];
  const period = match[3].toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

export function formatReminderTime(time) {
  const timeKey = getReminderTimeKey(time);
  if (!timeKey) return time;

  const [hours, minutes] = timeKey.split(':').map(Number);
  return new Date(2020, 0, 1, hours, minutes).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit'
  });
}

export async function showReminderNotification(reminder, date = new Date()) {
  const native = getNativeNotifications();
  const webPermission = 'Notification' in window ? window.Notification.permission : 'denied';
  if (!native && webPermission !== 'granted') return false;

  const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const storageKey = sentReminderKey(reminder.id, dateKey);
  if (window.localStorage.getItem(storageKey) === 'sent') return false;

  const options = {
    body: `${reminder.title} • ${formatReminderTime(reminder.time)}`,
    icon: '/app-icon.svg',
    badge: '/app-icon.svg',
    tag: `food-for-fitness-reminder-${reminder.id}`,
    renotify: true
  };

  if (native) {
    if (!await prepareNativeNotifications(native)) return false;
    const result = await withNativeTimeout(native.schedule({
      notifications: [{
        id: getSafeNotificationId(reminder.id),
        title: 'Food for Fitness',
        body: reminder.title,
        channelId: REMINDER_CHANNEL_ID,
        smallIcon: 'ic_stat_food_fitness',
        foreground: true,
        isExactNotification: false,
        schedule: { at: new Date(Date.now() + 1000), allowWhileIdle: true },
        extra: { reminderId: reminder.id }
      }]
    }), 'Reminder scheduling');
    console.log('[Notifications] Immediate reminder schedule result:', result);
  } else {
    const registration = await navigator.serviceWorker?.ready;
    if (registration?.showNotification) {
      await registration.showNotification('Food for Fitness', options);
    } else {
      new window.Notification('Food for Fitness', options);
    }
  }

  window.localStorage.setItem(storageKey, 'sent');
  window.dispatchEvent(new CustomEvent('food-for-fitness:reminder', { detail: reminder }));
  return true;
}
