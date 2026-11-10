import { GoogleGenerativeAI } from "@google/generative-ai";

const PRIMARY_GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || "gemini-3-flash-preview";
const FALLBACK_GEMINI_MODEL = import.meta.env.VITE_GEMINI_FALLBACK_MODEL || "gemini-3.8-flash";
const GEMINI_TIMEOUT_MS = 60000;

function isTransientGeminiError(error) {
  const status = Number(error?.status || error?.statusCode);
  return [429, 500, 502, 503, 504].includes(status)
    || /\[(429|500|502|503|504)\s*\]/.test(error?.message || "")
    || /timed out/i.test(error?.message || "");
}

async function requestGeminiResponse({
  genAI,
  modelName,
  contents,
  systemInstruction,
  maxOutputTokens = 2048,
  responseMimeType,
  thinkingLevel
}) {
  const generationConfig = {
    temperature: 0.2,
    maxOutputTokens,
    ...(responseMimeType ? { responseMimeType } : {}),
    ...(thinkingLevel && modelName.startsWith('gemini-3')
      ? { thinkingConfig: { thinkingLevel } }
      : {})
  };
  const model = genAI.getGenerativeModel({
    model: modelName,
    ...(systemInstruction
      ? { systemInstruction: { parts: [{ text: systemInstruction }] } }
      : {}),
    generationConfig
  });

  const request = (async () => {
    const result = await model.generateContentStream({ contents });
    let generatedText = "";
    let finishReason = "";

    for await (const chunk of result.stream) {
      generatedText += chunk.text?.() || "";
      finishReason = String(chunk.candidates?.[0]?.finishReason || finishReason).toUpperCase();
    }

    const text = generatedText.trim();
    if (["MAX_TOKENS", "SAFETY", "RECITATION"].includes(finishReason)) {
      const error = new Error(`Gemini returned an incomplete response (${finishReason}).`);
      error.finishReason = finishReason;
      throw error;
    }
    if (!text) throw new Error("Gemini returned an empty response.");
    return text;
  })();
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Gemini response timed out.")), GEMINI_TIMEOUT_MS);
  });
  try {
    return await Promise.race([request, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function streamGeminiResponse({
  apiKey,
  contents,
  systemInstruction,
  maxOutputTokens = 2048,
  responseMimeType,
  thinkingLevel,
  retryOnMaxTokens = false
}) {
  if (!apiKey) {
    throw new Error("VITE_GEMINI_API_KEY is missing from your .env file.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const requestPrimary = (tokenLimit) => requestGeminiResponse({
    genAI,
    modelName: PRIMARY_GEMINI_MODEL,
    contents,
    systemInstruction,
    maxOutputTokens: tokenLimit,
    responseMimeType,
    thinkingLevel
  });

  let primaryError;
  try {
    return await requestPrimary(maxOutputTokens);
  } catch (error) {
    primaryError = error;
    if (retryOnMaxTokens && error.finishReason === 'MAX_TOKENS') {
      console.warn('Gemini scan response was truncated; retrying once with a larger output budget.', error);
      try {
        return await requestPrimary(maxOutputTokens + 4096);
      } catch (retryError) {
        primaryError = retryError;
      }
    }
  }

  if (!isTransientGeminiError(primaryError) || PRIMARY_GEMINI_MODEL === FALLBACK_GEMINI_MODEL) {
    throw primaryError;
  }

  console.warn(`Gemini model ${PRIMARY_GEMINI_MODEL} is unavailable; retrying with ${FALLBACK_GEMINI_MODEL}.`, primaryError);
  return await requestGeminiResponse({
    genAI,
    modelName: FALLBACK_GEMINI_MODEL,
    contents,
    systemInstruction,
    maxOutputTokens,
    responseMimeType,
    thinkingLevel
  });
}

export async function streamGeminiFoodAnalysis({ apiKey, imageData, prompt }) {
  if (!apiKey) {
    throw new Error("VITE_GEMINI_API_KEY is missing from your .env file.");
  }

  if (!imageData) {
    throw new Error("Please upload a food photo or start the camera first.");
  }

  const parts = imageData.split(",");
  const base64Image = parts[1];
  const mimeType =
    parts[0]?.match(/data:(.*?);base64/)?.[1] || "image/jpeg";

  return streamGeminiResponse({
    apiKey,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: prompt
          },
          {
            inlineData: {
              mimeType,
              data: base64Image
            }
          }
        ]
      }
    ],
    systemInstruction: undefined,
    maxOutputTokens: 8192,
    responseMimeType: 'application/json',
    thinkingLevel: 'low',
    retryOnMaxTokens: true
  });
}
