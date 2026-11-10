import React, { useEffect, useState } from 'react';
import { isNativePlatform } from '../../platform/platform';

const DISMISSED_KEY = 'food-for-fitness:install-prompt-dismissed-v2';

export default function InstallAppPrompt({ variant = 'banner' }) {
  const isHostingBuild = import.meta.env.MODE === 'hosting';
  const androidApkUrl = import.meta.env.VITE_ANDROID_APK_URL;
  const [installEvent, setInstallEvent] = useState(null);
  const [showManualHelp, setShowManualHelp] = useState(false);
  const [isApkDownloading, setIsApkDownloading] = useState(false);
  const [apkDownloadError, setApkDownloadError] = useState('');
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  const [isInstalled, setIsInstalled] = useState(isStandalone);
  const [isDismissed, setIsDismissed] = useState(() => window.localStorage.getItem(DISMISSED_KEY) === 'true');

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) return undefined;

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallEvent(event);
    };
    const handleAppInstalled = () => {
      setInstallEvent(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (isNativePlatform() || isInstalled || (isDismissed && variant !== 'inline') || (!installEvent && variant !== 'inline')) return null;

  const dismissPrompt = () => {
    window.localStorage.setItem(DISMISSED_KEY, 'true');
    setIsDismissed(true);
  };

  const installApp = async () => {
    if (!installEvent) {
      setShowManualHelp(true);
      return;
    }

    installEvent.prompt();
    const result = await installEvent.userChoice;
    if (result.outcome === 'accepted') {
      setInstallEvent(null);
      setIsInstalled(true);
    }
  };

  const downloadAndroidApk = async () => {
    setIsApkDownloading(true);
    setApkDownloadError('');

    try {
      const response = await fetch('/downloads/FoodForFitness-1.2.6.apk', { cache: 'no-store' });
      if (!response.ok) throw new Error(`APK request failed (${response.status})`);

      const apkBlob = await response.blob();
      const downloadUrl = URL.createObjectURL(apkBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      downloadLink.download = 'FoodForFitness-1.2.6.apk';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('APK download failed:', error);
      setApkDownloadError('Hindi ma-download ang APK. Subukan ang direct link o i-restart ang local server.');
    } finally {
      setIsApkDownloading(false);
    }
  };

  return (
    <div className={variant === 'inline' ? 'relative flex items-center gap-3 rounded-2xl border border-emerald-800 bg-emerald-950 p-3 text-white shadow-lg shadow-emerald-950/20' : 'fixed inset-x-3 top-3 z-50 mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-teal-500 bg-teal-800 p-3 text-white shadow-2xl shadow-teal-950/30 sm:inset-x-auto sm:right-5 sm:mx-0 sm:p-4'}>
      <img src="/app-icon.svg" alt="" className="h-14 w-14 shrink-0 rounded-2xl border-2 border-white/70" />
      <div className="min-w-0 flex-1">
        <p className={`text-base font-black ${variant === 'inline' ? 'text-white' : ''}`}>Download Food for Fitness</p>
        <p className={`mt-0.5 text-sm ${variant === 'inline' ? 'text-emerald-100' : 'text-teal-50'}`}>Install it for quicker access and a cleaner app experience.</p>
        {showManualHelp && <p className={`mt-2 text-xs font-semibold ${variant === 'inline' ? 'text-emerald-100' : 'text-teal-50'}`}>Open your browser menu and choose <strong>Install Food for Fitness</strong> or <strong>Add to Home screen</strong>.</p>}
      </div>
      <div className="flex shrink-0 flex-col gap-1.5">
        <button type="button" onClick={installApp} className="rounded-xl bg-white px-4 py-3 text-sm font-black text-teal-800 shadow-sm hover:bg-teal-50">Install web app</button>
        {isHostingBuild && androidApkUrl ? (
          <a
            href={androidApkUrl}
            target="_blank"
            rel="noreferrer"
            className={`rounded-xl border px-3 py-2 text-center text-xs font-bold ${variant === 'inline' ? 'border-white/60 text-white hover:bg-white/10' : 'border-white/50 text-white hover:bg-teal-700'}`}
          >
            Download Android APK
          </a>
        ) : !isHostingBuild && (
          <button type="button" onClick={downloadAndroidApk} disabled={isApkDownloading} className={`rounded-xl border px-3 py-2 text-center text-xs font-bold disabled:cursor-wait disabled:opacity-60 ${variant === 'inline' ? 'border-white/60 text-white hover:bg-white/10' : 'border-white/50 text-white hover:bg-teal-700'}`}>
            {isApkDownloading ? 'Preparing APK...' : 'Download Android APK'}
          </button>
        )}
      </div>
      {apkDownloadError && <p className="absolute left-3 right-3 top-full mt-2 rounded-xl bg-rose-50 p-2 text-xs font-semibold text-rose-700">{apkDownloadError}</p>}
      {variant !== 'inline' && <button type="button" onClick={dismissPrompt} className="self-start rounded-lg p-2 text-xl leading-none text-teal-100 hover:bg-teal-700" aria-label="Dismiss install prompt">&times;</button>}
    </div>
  );
}
