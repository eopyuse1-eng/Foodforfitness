import { isNativePlatform } from './platform';
import { getTextToSpeechProvider as getWebTextToSpeechProvider } from './web/textToSpeech';
import { getTextToSpeechProvider as getNativeTextToSpeechProvider } from './native/textToSpeech';

export function getTextToSpeechProvider() {
  return isNativePlatform()
    ? getNativeTextToSpeechProvider()
    : getWebTextToSpeechProvider();
}
