import { isNativePlatform } from './platform';
import { getNotificationProvider as getWebNotificationProvider } from './web/notifications';
import { getNotificationProvider as getNativeNotificationProvider } from './native/notifications';

export function getNotificationProvider() {
  return isNativePlatform()
    ? getNativeNotificationProvider()
    : getWebNotificationProvider();
}
