import React, { useCallback, useEffect, useState } from 'react';
import { AppDialogContext } from './appDialogContext';

export function AppDialogProvider({ children }) {
  const [message, setMessage] = useState('');
  const showAppAlert = useCallback((nextMessage) => setMessage(nextMessage), []);
  const dismissAppAlert = useCallback(() => setMessage(''), []);

  useEffect(() => {
    if (!message) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') dismissAppAlert();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dismissAppAlert, message]);

  return (
    <AppDialogContext.Provider value={showAppAlert}>
      {children}
      {message && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) dismissAppAlert();
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="app-dialog-title"
            aria-describedby="app-dialog-message"
            className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-xl text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" aria-hidden="true">
              !
            </div>
            <h2 id="app-dialog-title" className="text-base font-black text-slate-900 dark:text-slate-100">
              Please check
            </h2>
            <p id="app-dialog-message" className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {message}
            </p>
            <button
              type="button"
              autoFocus
              onClick={dismissAppAlert}
              className="primary-action mt-5 w-full rounded-xl py-3 text-sm font-bold"
            >
              Okay
            </button>
          </section>
        </div>
      )}
    </AppDialogContext.Provider>
  );
}
