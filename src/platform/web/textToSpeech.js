export function getTextToSpeechProvider() {
  return typeof window !== 'undefined' && window.speechSynthesis ? window.speechSynthesis : null;
}
