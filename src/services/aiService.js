import { streamGeminiResponse, streamGeminiFoodAnalysis } from './geminiService';
import { getNutriBotSafetyResponse, withNutriBotGuardrails } from '../utils/nutribotGuardrails';

const NUTRIBOT_MODEL_URL = import.meta.env.VITE_NUTRIBOT_MODEL_URL;

function readModelAnswer(payload) {
  if (payload?.needs_fallback === true) return null;
  if (typeof payload?.answer !== 'string' || !payload.answer.trim()) return null;
  return payload.answer.trim();
}

async function requestTrainedModel({ contents, systemInstruction }) {
  if (!NUTRIBOT_MODEL_URL) return null;

  const response = await fetch(NUTRIBOT_MODEL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: systemInstruction,
      messages: contents.slice(-12).map((content) => ({
        role: content.role === 'model' ? 'assistant' : content.role,
        content: (content.parts || [])
          .filter((part) => typeof part.text === 'string')
          .map((part) => part.text)
          .join('\n')
          .slice(0, 4000)
      }))
    }),
    signal: AbortSignal.timeout(30000)
  });

  if (!response.ok) {
    throw new Error(`NutriBot model request failed with status ${response.status}.`);
  }

  return readModelAnswer(await response.json());
}

export async function generateAiResponse({ apiKey, contents, systemInstruction }) {
  const latestUserMessage = [...contents]
    .reverse()
    .find((content) => content.role === 'user')
    ?.parts
    ?.filter((part) => typeof part.text === 'string')
    .map((part) => part.text)
    .join('\n');
  const safetyResponse = getNutriBotSafetyResponse(latestUserMessage);
  if (safetyResponse) return safetyResponse;

  const guardedSystemInstruction = withNutriBotGuardrails(systemInstruction);
  try {
    const trainedAnswer = await requestTrainedModel({
      contents,
      systemInstruction: guardedSystemInstruction
    });
    if (trainedAnswer) return trainedAnswer;
  } catch (error) {
    console.warn('Trained NutriBot model is unavailable; using Gemini fallback.', error);
  }

  return streamGeminiResponse({
    apiKey,
    contents,
    systemInstruction: guardedSystemInstruction
  });
}

export function analyzeFoodImage({ apiKey, imageData, prompt }) {
  return streamGeminiFoodAnalysis({ apiKey, imageData, prompt });
}
