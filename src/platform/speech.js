import { isNativePlatform } from './platform';
import { getSpeechRecognition as getWebSpeechRecognition } from './web/speech';
import { getSpeechRecognition as getNativeSpeechRecognition } from './native/speech';

export function getSpeechRecognition() {
  return isNativePlatform() ? getNativeSpeechRecognition() : getWebSpeechRecognition();
}
