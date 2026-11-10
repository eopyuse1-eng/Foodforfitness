import React, { useState } from 'react';

const TERMS_VERSION = '1.1';

function getConsentKey(accountId) {
  return `food-for-fitness:nutribot-terms:${accountId || 'guest'}`;
}

function hasCurrentConsent(accountId) {
  try {
    const savedConsent = window.localStorage.getItem(getConsentKey(accountId));
    return savedConsent === TERMS_VERSION;
  } catch (error) {
    console.warn('NutriBot terms acceptance could not be read:', error);
    return false;
  }
}

export default function NutriBotTermsGate({ accountId, isOpen, onDecline }) {
  const [hasAccepted, setHasAccepted] = useState(() => hasCurrentConsent(accountId));
  const [saveError, setSaveError] = useState('');

  const acceptTerms = () => {
    try {
      window.localStorage.setItem(getConsentKey(accountId), TERMS_VERSION);
      setHasAccepted(true);
      setSaveError('');
    } catch (error) {
      console.error('NutriBot terms acceptance could not be saved:', error);
      setSaveError('Hindi ma-save ang acceptance mo sa device. I-enable ang storage at subukang muli.');
    }
  };

  if (!isOpen || hasAccepted) return null;

  return (
    <div className="fixed inset-0 z-[115] flex items-center justify-center bg-slate-950/75 p-3 sm:p-5">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="nutribot-terms-title"
        aria-describedby="nutribot-terms-intro"
        onKeyDown={(event) => {
          if (event.key !== 'Tab') return;
          const buttons = event.currentTarget.querySelectorAll('button:not(:disabled)');
          const firstButton = buttons[0];
          const lastButton = buttons[buttons.length - 1];
          if (event.shiftKey && document.activeElement === firstButton) {
            event.preventDefault();
            lastButton?.focus();
          } else if (!event.shiftKey && document.activeElement === lastButton) {
            event.preventDefault();
            firstButton?.focus();
          }
        }}
        className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="shrink-0 border-b border-slate-200 p-5 dark:border-slate-700 sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">
            Before using the chatbot
          </p>
          <h2 id="nutribot-terms-title" className="mt-1 text-xl font-black text-slate-900 dark:text-slate-100">
            NutriBot AI — Terms of Service &amp; Disclaimer
          </h2>
          <p id="nutribot-terms-intro" className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Welcome to NutriBot AI. Please read these terms before using the AI-assisted chatbot.
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm leading-6 text-slate-700 dark:text-slate-200 sm:px-6">
          <section>
            <h3 className="font-bold text-slate-900 dark:text-white">1. Informational Purpose Only</h3>
            <p>NutriBot AI provides general nutritional information and food guidance. It is not a certified medical practitioner, licensed dietitian, or professional nutritionist.</p>
          </section>
          <section>
            <h3 className="font-bold text-slate-900 dark:text-white">2. No Medical Advice</h3>
            <p>AI-generated suggestions, food analysis, and answers are for general information only. They are not medical diagnoses, prescriptions, or personalized treatment, and are not a replacement for a doctor, registered dietitian, or other qualified healthcare professional. Consult your healthcare provider before making major dietary changes, especially if you have a medical condition or food allergy.</p>
          </section>
          <section>
            <h3 className="font-bold text-slate-900 dark:text-white">3. AI Accuracy and Verification</h3>
            <p>AI responses may contain inaccuracies. Verify important dietary and calorie information with reliable sources or a qualified professional.</p>
          </section>
          <section>
            <h3 className="font-bold text-slate-900 dark:text-white">4. Data Processing</h3>
            <p>Chat prompts, selected profile context such as health conditions and nutrition targets, and uploaded food images may be sent to the AI service configured for the feature (including Google Gemini) to generate responses or food analysis. AI providers process requests under their own terms and privacy practices; FoodForFitness cannot control provider-side data retention. Chat history is saved in this app on this device. Avoid sharing information that is not needed.</p>
          </section>
          <section>
            <h3 className="font-bold text-slate-900 dark:text-white">5. Limitation of Liability</h3>
            <p>To the extent permitted by applicable law, FoodForFitness developers are not liable for health issues, misinterpretations, or decisions made based on AI output. This does not exclude liability that cannot legally be excluded.</p>
          </section>
          <p className="rounded-xl bg-teal-50 p-3 text-xs font-medium text-teal-900 dark:bg-teal-900/30 dark:text-teal-100">
            By selecting “I Agree,” you confirm that you have read, understood, and accepted these terms. You can choose “Not now” to return to the dashboard without using NutriBot.
          </p>
        </div>

        <div className="shrink-0 border-t border-slate-200 p-4 dark:border-slate-700 sm:px-6">
          {saveError && (
            <p role="alert" className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200">
              {saveError}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onDecline}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Not now
            </button>
            <button
              type="button"
              autoFocus
              onClick={acceptTerms}
              className="primary-action rounded-xl px-5 py-3 text-sm font-bold"
            >
              I Agree
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
