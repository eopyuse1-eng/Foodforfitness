import { Capacitor } from '@capacitor/core';

export function isNativePlatform() {
  return Capacitor.isNativePlatform();
}

export function getPlatformKind() {
  return isNativePlatform() ? 'native' : 'web';
}
