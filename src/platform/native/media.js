export async function getCameraStream() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera access is not supported by this Android WebView.');
  }

  return navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
}
