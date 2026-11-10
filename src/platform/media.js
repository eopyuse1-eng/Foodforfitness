import { isNativePlatform } from './platform';
import { getCameraStream as getWebCameraStream } from './web/media';
import { getCameraStream as getNativeCameraStream } from './native/media';

export function getCameraStream() {
  return isNativePlatform() ? getNativeCameraStream() : getWebCameraStream();
}
