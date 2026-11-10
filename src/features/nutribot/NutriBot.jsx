import React, { useEffect, useRef, useState } from 'react';
import { generateAiResponse } from '../../services/aiService';
import { getSpeechRecognition } from '../../platform/speech';
import { getTextToSpeechProvider } from '../../platform/textToSpeech';
import {
  createNutriBotConversation,
  getNutriBotContext,
  getNutriBotConversationTitle,
  loadNutriBotConversations
} from '../../utils/nutribotConversations';

const INITIAL_MESSAGE = {
  role: 'assistant',
  text: 'Mabuhay! Ano ang maitutulong ko sa iyo tungkol sa pagkain o nutrisyon?'
};

const THINKING_MESSAGE = {
  role: 'assistant',
  text: 'NutriBot is thinking...',
  isThinking: true
};
function cleanAssistantText(text = '') {
  return String(text)
    .replace(/[*#]/g, '')
    .replace(/^\s*[-+]\s+/gm, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function persistConversations(storageKey, state) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch (error) {
    console.warn('NutriBot chat history could not be saved:', error);
  }
}

export default function NutriBot({ profile, bmi, targets }) {
  const chatStorageKey = `food-for-fitness:nutribot-chat:${profile.name || 'guest'}`;
  const conversationsStorageKey = `${chatStorageKey}:segments:v1`;
  const [conversationState, setConversationState] = useState(() => {
    try {
      const loadedState = loadNutriBotConversations(
        window.localStorage.getItem(conversationsStorageKey),
        window.localStorage.getItem(chatStorageKey),
        INITIAL_MESSAGE
      );
      return {
        ...loadedState,
        conversations: loadedState.conversations.map((conversation) => ({
          ...conversation,
          messages: conversation.messages.map((message) => message.role === 'assistant'
            ? { ...message, text: cleanAssistantText(message.text) }
            : message)
        }))
      };
    } catch (error) {
      console.warn('NutriBot conversations could not be loaded:', error);
      const conversation = createNutriBotConversation(INITIAL_MESSAGE);
      return { conversations: [conversation], activeConversationId: conversation.id };
    }
  });
  const [conversationToDelete, setConversationToDelete] = useState(null);
  const activeConversation = conversationState.conversations.find(
    ({ id }) => id === conversationState.activeConversationId
  ) || conversationState.conversations[0];
  const activeConversationId = activeConversation.id;
  const chatMessages = activeConversation.messages;
  const conversationToDeleteTitle = conversationState.conversations.find(
    ({ id }) => id === conversationToDelete
  )?.title;
  const isWelcomeConversation = chatMessages.length === 1 && chatMessages[0].role === 'assistant';
  const [chatInput, setChatInput] = useState('');
  const [loadingConversationId, setLoadingConversationId] = useState(null);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const chatScrollRef = useRef(null);
  const recognitionRef = useRef(null);
  const speechRunRef = useRef(0);
  const speechProviderRef = useRef(null);
  const speechActiveRef = useRef(false);
  const utteranceRef = useRef(null);

  const isChatLoading = loadingConversationId !== null;
  const isActiveChatLoading = loadingConversationId === activeConversationId;

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isChatLoading]);

  useEffect(() => {
    persistConversations(conversationsStorageKey, conversationState);
  }, [conversationState, conversationsStorageKey]);

  useEffect(() => {
    if (!conversationToDelete) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setConversationToDelete(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [conversationToDelete]);

  useEffect(() => () => {
    recognitionRef.current?.stop();
    speechRunRef.current += 1;
    speechActiveRef.current = false;
    const speechProvider = speechProviderRef.current;
    if (utteranceRef.current) {
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
      utteranceRef.current = null;
    }
    if (speechProvider) {
      if (window.speechSynthesis) {
        window.speechSynthesis.pause();
        window.speechSynthesis.cancel();
        window.setTimeout(() => window.speechSynthesis.cancel(), 50);
      }
      const stopResult = speechProvider.cancel ? speechProvider.cancel() : speechProvider.stop();
      Promise.resolve(stopResult).catch(() => undefined);
    }
  }, []);

  const toggleSpeechToText = () => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setSpeechError('Hindi supported ng browser na ito ang speech-to-text. Subukan ang Chrome o Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      let transcriptText = '';
      let silenceTimer = null;
      recognition.lang = 'fil-PH';
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;
      recognition.onstart = () => {
        setSpeechError('');
        setIsListening(true);
      };
      recognition.onresult = (event) => {
        const result = event.results[event.resultIndex] || event.results[event.results.length - 1];
        if (!result) return;
        transcriptText = result[0].transcript
          .replace(/\b(\S+)(?:\s+\1)+\b/gi, '$1')
          .trim();
        setChatInput(transcriptText);
        window.clearTimeout(silenceTimer);
        silenceTimer = window.setTimeout(() => recognition.stop(), 1200);
      };
      recognition.onspeechend = () => recognition.stop();
      recognition.onerror = (event) => {
        setIsListening(false);
        const messages = {
          'not-allowed': 'Hindi pinayagan ng browser ang microphone. I-check ang site microphone permission at subukan ulit.',
          'service-not-allowed': 'Hindi available ang speech service. Subukan ang Chrome o Edge at siguraduhing may internet.',
          network: 'May problema sa speech service connection. I-check ang internet at subukan ulit.',
          'no-speech': 'Walang narinig na boses. Magsalita nang mas malapit sa microphone.',
          'audio-capture': 'Walang microphone na available. I-check kung ginagamit ito ng ibang app.'
        };
        setSpeechError(messages[event.error] || `Hindi nakuha ang boses (${event.error || 'unknown error'}). Puwedeng subukan ulit o i-type ang tanong.`);
      };
      recognition.onend = () => {
        window.clearTimeout(silenceTimer);
        setIsListening(false);
        recognitionRef.current = null;
        if (transcriptText.trim()) handleChatSubmit(null, transcriptText);
      };
      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      setIsListening(false);
      recognitionRef.current = null;
      setSpeechError(`Hindi ma-start ang microphone (${error.name || 'unknown error'}). I-check ang browser permission.`);
    }
  };

  const stopSpeaking = () => {
    speechRunRef.current += 1;
    speechActiveRef.current = false;
    const speechProvider = speechProviderRef.current;
    if (utteranceRef.current) {
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
      utteranceRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.pause();
      window.speechSynthesis.cancel();
      window.setTimeout(() => window.speechSynthesis.cancel(), 50);
    }
    if (speechProvider?.stop) Promise.resolve(speechProvider.stop()).catch(() => undefined);
    speechProviderRef.current = null;
    setIsSpeaking(false);
  };

  const speakMessage = (text) => {
    const speechProvider = getTextToSpeechProvider();
    if (!speechProvider) {
      setSpeechError('Text-to-speech is not supported in this browser.');
      return;
    }
    speechProviderRef.current = speechProvider;

    const speechRunId = speechRunRef.current + 1;
    speechRunRef.current = speechRunId;
    speechActiveRef.current = true;
    if (speechProvider.cancel && typeof SpeechSynthesisUtterance !== 'undefined') {
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;
      utterance.lang = 'fil-PH';
      utterance.rate = 0.95;
      utterance.onend = () => {
        if (speechRunRef.current === speechRunId) {
          speechActiveRef.current = false;
          speechProviderRef.current = null;
          utteranceRef.current = null;
          setIsSpeaking(false);
        }
      };
      utterance.onerror = () => {
        if (speechRunRef.current === speechRunId) {
          speechActiveRef.current = false;
          speechProviderRef.current = null;
          utteranceRef.current = null;
          setIsSpeaking(false);
        }
      };
      speechProvider.cancel();
      speechProvider.speak(utterance);
      setIsSpeaking(true);
      return;
    }

    speechProvider.speak({ text, lang: 'fil-PH', rate: 0.95, queueStrategy: 0 })
      .then(() => {
        if (speechRunRef.current === speechRunId) {
          speechActiveRef.current = false;
          speechProviderRef.current = null;
          setIsSpeaking(false);
        }
      })
      .catch(() => {
        if (speechRunRef.current === speechRunId) {
          speechActiveRef.current = false;
          speechProviderRef.current = null;
          setIsSpeaking(false);
          setSpeechError('Hindi ma-play ang text-to-speech sa device na ito.');
        }
      });
    setIsSpeaking(true);
  };

  const updateConversationMessages = (conversationId, messages) => {
    setConversationState((currentState) => ({
      ...currentState,
      conversations: currentState.conversations.map((conversation) => (
        conversation.id === conversationId
          ? {
            ...conversation,
            title: getNutriBotConversationTitle(messages),
            updatedAt: Date.now(),
            messages
          }
          : conversation
      ))
    }));
  };

  const startNewConversation = () => {
    if (isChatLoading) return;
    const emptyConversation = conversationState.conversations.find((conversation) => (
      conversation.messages.filter((message) => message.role === 'user').length === 0
    ));
    if (emptyConversation) {
      selectConversation(emptyConversation.id);
      return;
    }
    const conversation = createNutriBotConversation(INITIAL_MESSAGE);
    setConversationState((currentState) => ({
      conversations: [conversation, ...currentState.conversations],
      activeConversationId: conversation.id
    }));
    setChatInput('');
    setShowChatHistory(false);
  };

  const selectConversation = (conversationId) => {
    setConversationState((currentState) => ({
      ...currentState,
      activeConversationId: conversationId
    }));
    setChatInput('');
    setShowChatHistory(false);
  };

  const deleteConversation = () => {
    if (!conversationToDelete || loadingConversationId === conversationToDelete) return;

    setConversationState((currentState) => {
      const remainingConversations = currentState.conversations
        .filter((conversation) => conversation.id !== conversationToDelete)
        .sort((first, second) => (Number(second.updatedAt) || 0) - (Number(first.updatedAt) || 0));
      if (remainingConversations.length === 0) {
        const replacementConversation = createNutriBotConversation(INITIAL_MESSAGE);
        return {
          conversations: [replacementConversation],
          activeConversationId: replacementConversation.id
        };
      }

      return {
        conversations: remainingConversations,
        activeConversationId: currentState.activeConversationId === conversationToDelete
          ? remainingConversations[0].id
          : currentState.activeConversationId
      };
    });
    setConversationToDelete(null);
    setChatInput('');
  };

  const handleChatSubmit = async (e, customQuery = null) => {
    if (e) e.preventDefault();
    const userQuery = customQuery || chatInput;
    if (!userQuery.trim() || isChatLoading) return;

    const conversationId = activeConversationId;
    const currentMessages = chatMessages.filter(message => !message.isThinking);
    const newMessages = [...currentMessages, { role: 'user', text: userQuery }];
    const messagesWhileThinking = [...newMessages, THINKING_MESSAGE];
    updateConversationMessages(conversationId, messagesWhileThinking);
    setChatInput('');
    setLoadingConversationId(conversationId);

    try {
      const activeCondList = Object.entries(profile.conditions)
        .filter(([k, v]) => v && k !== 'none')
        .map(([k]) => k)
        .join(', ');

      const systemInstruction = `You are NutriBot, a cautious nutrition education assistant specializing in Filipino food culture.
User Context:
    - Age: ${profile.age}, Weight: ${profile.weight} kg, Height: ${profile.height} cm
    - App-calculated BMI: ${bmi || 'unavailable'}
    - Health Focus / Conditions: ${activeCondList || 'General Wellness'}
    - Fitness Goal: ${profile.goal}
    - Targets: ${targets.cal} kcal, ${targets.protein}g Protein, ${targets.carbs}g Carbs, ${targets.fat}g Fat, ${targets.sugar}g Sugar limit, ${targets.sodium}mg Sodium limit.

Instructions:
1. Provide concise, encouraging responses in clear Taglish or English.
2. Use plain text only. Avoid Markdown formatting, headings, bullet lists, and emphasis. Use short paragraphs and simple standalone labels when needed.
3. Use the user's listed health conditions only to tailor general food education; do not infer diagnoses or assume a condition that is not listed.
4. If user has Gout, mention that purine guidance is general. If Diabetes, discuss balanced carbohydrate choices. If CKD, note that potassium and sodium needs are individualized.
5. Treat the app-calculated BMI above as the only authoritative BMI. Never recalculate it from weight and height, infer a different BMI, or give a conflicting number. If asked about BMI, repeat the app-calculated value exactly to one decimal place when available; if unavailable, say the profile needs both height and weight. If an earlier chat message gives a different BMI, clarify that the earlier number was incorrect and use the app-calculated value above.
6. Explain that nutrient estimates vary by recipe and serving, and avoid unsupported exact values.`;

      const apiContents = getNutriBotContext(newMessages).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.text }]
      }));

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const generatedText = await generateAiResponse({
        apiKey,
        contents: apiContents,
        systemInstruction
      });

      const assistantMessage = { role: 'assistant', text: cleanAssistantText(generatedText) };
      updateConversationMessages(
        conversationId,
        [...newMessages.filter(message => !message.isThinking), assistantMessage]
      );
    } catch (err) {
      console.error('Gemini AI response error:', err);
      const assistantMessage = {
        role: 'assistant',
        text: 'Hindi ko ma-access ang NutriBot analysis ngayon. Pakisubukan ulit kapag stable na ang internet o Gemini service para hindi ako magbigay ng tantyang sagot na hindi na-verify.'
      };
      updateConversationMessages(
        conversationId,
        [...newMessages.filter(message => !message.isThinking), assistantMessage]
      );
    } finally {
      setLoadingConversationId((currentId) => currentId === conversationId ? null : currentId);
    }
  };

  return (
    <div className="native-screen native-screen--chat flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#f7faef] dark:bg-slate-950">
      <header className="native-chat-header z-10 shrink-0 border-b border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900 lg:bg-[#f7faef] lg:dark:bg-slate-950">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-sm text-white">🤖</span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">NutriBot</h3>
              <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{activeConversation.title}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setShowChatHistory((visible) => !visible)}
              aria-expanded={showChatHistory}
              className="rounded-lg px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {showChatHistory ? 'Close chats' : `Chats (${conversationState.conversations.length})`}
            </button>
            <button
              type="button"
              onClick={startNewConversation}
              disabled={isChatLoading}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              + New chat
            </button>
          </div>
        </div>
        {showChatHistory && (
          <div className="mx-auto mt-2 max-h-56 w-full max-w-3xl space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 dark:border-slate-700 dark:bg-slate-900">
            {[...conversationState.conversations]
              .sort((first, second) => (Number(second.updatedAt) || 0) - (Number(first.updatedAt) || 0))
              .map((conversation) => {
                const questionCount = conversation.messages.filter((message) => message.role === 'user').length;
                return (
                  <div
                    key={conversation.id}
                    className={`flex min-w-0 items-center gap-2 rounded-lg px-2 ${conversation.id === activeConversationId ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                    <button
                      type="button"
                      onClick={() => selectConversation(conversation.id)}
                      disabled={loadingConversationId === conversation.id}
                      className="flex min-w-0 flex-1 items-center justify-between gap-3 py-2 text-left disabled:cursor-wait"
                    >
                      <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700 dark:text-slate-200">{conversation.title}</span>
                      <span className="shrink-0 text-[10px] text-slate-400 dark:text-slate-500">
                        {questionCount === 0 ? 'Empty' : `${questionCount} questions`}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConversationToDelete(conversation.id)}
                      disabled={loadingConversationId === conversation.id}
                      aria-label={`Delete chat: ${conversation.title}`}
                      title="Delete chat"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-100 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-rose-900/40 dark:hover:text-rose-300"
                    >
                      <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18" />
                        <path d="M8 6V4h8v2" />
                        <path d="m19 6-1 14H6L5 6" />
                        <path d="M10 11v5M14 11v5" />
                      </svg>
                    </button>
                  </div>
                );
              })}
          </div>
        )}
      </header>

      <div ref={chatScrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:py-8">
        <div className={`mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6 ${isWelcomeConversation ? 'justify-center' : 'justify-start'}`}>
          {isWelcomeConversation && (
            <div className="mx-auto w-full max-w-2xl pb-2">
              <h1 className="mb-2 text-xl font-semibold tracking-tight text-slate-800 dark:text-slate-100 sm:text-2xl">
                Kumusta! Ano ang nasa isip mo?
              </h1>
              <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
                Magtanong tungkol sa pagkaing Pinoy, meal ideas, o pangkalahatang nutrisyon.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[
                  '🥗 Low Purine Ulam for Gout',
                  '🩸 Low-GI Rice Alternatives',
                  '❤️ Heart-Healthy Low Sodium Dishes',
                  '💪 High Protein Filipino Meals'
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleChatSubmit(null, chip)}
                    disabled={isChatLoading}
                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-left text-xs font-medium text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-700 dark:hover:bg-slate-800"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}
          {!isWelcomeConversation && chatMessages.map((msg, i) => !msg.isThinking && (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[92%] sm:max-w-[85%] ${msg.role === 'user' ? 'rounded-2xl rounded-br-md bg-emerald-600 px-4 py-3 text-white dark:bg-emerald-700' : 'w-full max-w-3xl text-slate-800 dark:text-slate-100'}`}>
                <div className="whitespace-pre-line text-sm leading-7">
                  {msg.text}
                </div>
                {msg.role === 'assistant' && !msg.isThinking && (
                  <button
                    type="button"
                    onClick={() => (speechActiveRef.current ? stopSpeaking() : speakMessage(msg.text))}
                    className="mt-2 text-[11px] text-slate-400 transition hover:text-emerald-700 dark:text-slate-500 dark:hover:text-emerald-300"
                    aria-label={isSpeaking ? 'Stop reading message' : 'Read message aloud'}
                    title={isSpeaking ? 'Stop reading' : 'Read aloud'}
                  >
                    {isSpeaking ? '◼ Stop' : '🔊 Listen'}
                  </button>
                )}
              </div>
            </div>
          ))}

          {isActiveChatLoading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1.5 py-2" role="status" aria-label="NutriBot is thinking">
                <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500 [animation-delay:0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500 [animation-delay:0.3s]" />
                </div>
            </div>
          )}
        </div>
      </div>

      <form data-tour-target="nutribot-chat-input" onSubmit={handleChatSubmit} className="z-10 shrink-0 border-t border-slate-200 bg-white px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] dark:border-slate-800 dark:bg-slate-900 sm:px-4 lg:border-0 lg:bg-[#f7faef] lg:pb-4 lg:dark:bg-slate-950">
        <div className="mx-auto w-full max-w-3xl">
          {speechError && <p className="mb-2 px-2 text-xs text-rose-600 dark:text-rose-300" role="status">{speechError}</p>}
          <div className="flex w-full items-center gap-2 rounded-2xl border border-slate-300 bg-white px-2 py-1.5 shadow-sm focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:focus-within:ring-emerald-900/40 lg:rounded-3xl lg:px-3">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask about Filipino ulam, gout, diabetes..."
            className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 outline-none dark:text-slate-100 dark:placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={toggleSpeechToText}
            disabled={isChatLoading}
            onFocus={() => setSpeechError('')}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm transition ${isListening ? 'border-rose-300 bg-rose-50 text-rose-600 dark:border-rose-700 dark:bg-rose-900/30 dark:text-rose-300' : 'border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-emerald-500 dark:hover:text-emerald-300'} disabled:cursor-not-allowed disabled:opacity-50`}
            aria-label={isListening ? 'Stop listening' : 'Use speech to text'}
            title={isListening ? 'Stop listening' : 'Speak your question'}
          >
            {isListening ? '◼' : '🎙️'}
          </button>
          <button
            type="submit"
            disabled={isChatLoading}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Send message"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
          <details className="mx-auto mt-2 max-w-3xl text-[10px] leading-4 text-slate-500 dark:text-slate-400">
            <summary className="w-fit cursor-pointer select-none">
              General nutrition information only · Not medical advice
            </summary>
            <p className="mt-1 max-w-2xl">
              NutriBot is for general nutrition information only. It does not provide diagnosis or treatment and does not replace a doctor, registered dietitian, or other qualified healthcare professional. Consult your provider about medical conditions, medication, allergies, or a personalized diet plan.
            </p>
          </details>
        </div>
      </form>

      {conversationToDelete && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setConversationToDelete(null);
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-chat-title"
            aria-describedby="delete-chat-description"
            className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="m19 6-1 14H6L5 6" />
                <path d="M10 11v5M14 11v5" />
              </svg>
            </div>
            <h2 id="delete-chat-title" className="text-base font-bold text-slate-900 dark:text-slate-100">Delete this chat?</h2>
            <p id="delete-chat-description" className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {conversationToDeleteTitle
                ? `“${conversationToDeleteTitle}” and its messages will be removed from this device. This cannot be undone.`
                : 'This chat and its messages will be removed from this device. This cannot be undone.'}
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                autoFocus
                onClick={() => setConversationToDelete(null)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteConversation}
                className="flex-1 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
              >
                Delete chat
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
