import React from 'react';

export default function AndroidUpdatePrompt({ update, error, onLater, onUpdate }) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="android-update-title"
        aria-describedby="android-update-description"
        className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100 text-2xl dark:bg-teal-900/50" aria-hidden="true">
          ⬆️
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">App update</p>
        <h2 id="android-update-title" className="mt-1 text-lg font-black text-slate-900 dark:text-slate-100">
          Version {update.version} is ready
        </h2>
        <p id="android-update-description" className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {update.releaseNotes}
        </p>
        <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
          Bubuksan ang APK download. Pagkatapos ma-download, i-tap ito at kumpirmahin ang update sa Android.
        </p>
        {error && (
          <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200">
            {error}
          </p>
        )}
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onLater}
            className="flex-1 rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Later
          </button>
          <button
            type="button"
            onClick={onUpdate}
            className="primary-action flex-1 rounded-xl px-3 py-3 text-sm font-bold"
          >
            Update now
          </button>
        </div>
      </section>
    </div>
  );
}
