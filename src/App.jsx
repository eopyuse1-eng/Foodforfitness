import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import AndroidUpdatePrompt from './components/common/AndroidUpdatePrompt';
import InstallAppPrompt from './components/common/InstallAppPrompt';
import Navigation from './components/common/Navigation';
import NutriBotTermsGate from './components/common/NutriBotTermsGate';
import OnboardingTour from './components/common/OnboardingTour';
import Profile from './features/profile/Profile';
import useFoodFitnessApp from './hooks/useFoodFitnessApp';
import { isFirestorePersistenceEnabled, saveUserOnboardingCompletion } from './services/firebaseService';
import { getAndroidAppUpdateStatus, openAndroidApkDownload } from './services/appUpdateService';

function OfflineNotice() {
  const [isOnline, setIsOnline] = useState(() => window.navigator.onLine);

  useEffect(() => {
    const updateConnection = () => setIsOnline(window.navigator.onLine);
    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);
    return () => {
      window.removeEventListener('online', updateConnection);
      window.removeEventListener('offline', updateConnection);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div role="status" className="fixed inset-x-3 top-3 z-[100] mx-auto max-w-lg rounded-xl border border-amber-300 bg-amber-50 p-3 text-center text-xs font-semibold text-amber-900 shadow-lg dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
      {isFirestorePersistenceEnabled
        ? 'Offline: changes are saved on this device and will sync when you reconnect.'
        : 'Offline: persistent storage is unavailable. Keep the app open until you reconnect to avoid losing unsynced changes.'}
    </div>
  );
}

const getInitialDarkMode = () => {
  try {
    const savedTheme = window.localStorage.getItem('food-for-fitness:theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      return savedTheme === 'dark';
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  } catch (error) {
    return false;
  }
};

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(getInitialDarkMode);
  const [isOnboardingReplayOpen, setIsOnboardingReplayOpen] = useState(false);
  const [androidUpdate, setAndroidUpdate] = useState(null);
  const [androidUpdateError, setAndroidUpdateError] = useState('');
  const {
    user,
    isAppReady,
    profile,
    setProfile,
    activeTab,
    setActiveTab,
    renderPage,
    auth,
    db,
    appId,
    bmi,
    isAuthScreen,
    setIsAuthScreen,
    log,
    reminders,
    healthLogs,
  } = useFoodFitnessApp({
    isDarkMode,
    setIsDarkMode,
    onStartOnboarding: () => setIsOnboardingReplayOpen(true)
  });
  const isOnboardingOpen = Boolean(
    user
    && profile.isSetup
    && (profile.onboardingCompleted === false || isOnboardingReplayOpen)
  );

  useEffect(() => {
    if (!isAppReady || Capacitor.getPlatform() !== 'android') return undefined;
    let isCancelled = false;
    const now = Date.now();
    let lastCheckedAt = 0;
    try {
      lastCheckedAt = Number(window.localStorage.getItem('food-for-fitness:android-update-checked-at')) || 0;
    } catch (error) {
      console.warn('Automatic update-check preference could not be read:', error);
    }

    if (now - lastCheckedAt < 12 * 60 * 60 * 1000) {
      return undefined;
    }

    getAndroidAppUpdateStatus()
      .then((status) => {
        if (isCancelled) return;
        try {
          window.localStorage.setItem('food-for-fitness:android-update-checked-at', String(now));
          if (status.update) {
            const dismissedUntil = Number(window.localStorage.getItem(`food-for-fitness:android-update-dismissed:${status.update.versionCode}`)) || 0;
            if (dismissedUntil <= now) setAndroidUpdate(status.update);
          }
        } catch (error) {
          console.warn('Update-check preference could not be saved:', error);
          if (status.update) setAndroidUpdate(status.update);
        }
      })
      .catch((error) => {
        console.error('Automatic Android update check failed:', error);
      });

    return () => {
      isCancelled = true;
    };
  }, [isAppReady]);

  const dismissAndroidUpdate = () => {
    if (androidUpdate) {
      try {
        window.localStorage.setItem(
          `food-for-fitness:android-update-dismissed:${androidUpdate.versionCode}`,
          String(Date.now() + 7 * 24 * 60 * 60 * 1000)
        );
      } catch (error) {
        console.warn('Update reminder dismissal could not be saved:', error);
      }
    }
    setAndroidUpdate(null);
    setAndroidUpdateError('');
  };

  const downloadAndroidUpdate = async () => {
    if (!androidUpdate) return;
    setAndroidUpdateError('');
    try {
      await openAndroidApkDownload(androidUpdate.downloadUrl);
      setAndroidUpdate(null);
    } catch (error) {
      console.error('Android update download could not be opened:', error);
      setAndroidUpdateError('Hindi mabuksan ang download. Subukan ulit o i-check ang internet connection.');
    }
  };

  const androidUpdatePrompt = androidUpdate && (
    <AndroidUpdatePrompt
      update={androidUpdate}
      error={androidUpdateError}
      onLater={dismissAndroidUpdate}
      onUpdate={downloadAndroidUpdate}
    />
  );

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDarkMode);
    root.classList.toggle('native-android', Capacitor.getPlatform() === 'android');
    root.style.colorScheme = isDarkMode ? 'dark' : 'light';

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute('content', isDarkMode ? '#020817' : '#0f766e');
    }

    try {
      window.localStorage.setItem('food-for-fitness:theme', isDarkMode ? 'dark' : 'light');
    } catch (error) {
      console.warn('Theme preference could not be saved:', error);
    }
  }, [isDarkMode]);

  if (!isAppReady) {
    return (
      <>
        <OfflineNotice />
        <div className="flex min-h-screen items-center justify-center bg-slate-50 font-sans text-sm font-semibold text-slate-600 dark:bg-slate-950 dark:text-slate-300">
          Loading your account...
        </div>
      </>
    );
  }

  if (!profile.isSetup || isAuthScreen) {
    return (
      <>
        <Profile
          profile={profile}
          setProfile={setProfile}
          foodLogs={log}
          reminders={reminders}
          healthLogs={healthLogs}
          user={user}
          auth={auth}
          db={db}
          appId={appId}
          bmi={bmi}
          isAuthScreen={isAuthScreen}
          setIsAuthScreen={setIsAuthScreen}
          setActiveTab={setActiveTab}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
        />
        {isAuthScreen && <InstallAppPrompt variant="inline" />}
        {androidUpdatePrompt}
      </>
    );
  }

  return (
    <div className="app-shell relative flex h-dvh min-h-dvh w-full flex-col overflow-hidden bg-[#f7faef] font-sans antialiased dark:bg-slate-950">
      <OfflineNotice />
      <Navigation profile={profile} activeTab={activeTab} setActiveTab={setActiveTab} />
      {androidUpdatePrompt}

      <main className={`flex h-0 min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden ${
        activeTab === 'scan'
          ? 'pb-[calc(7rem+env(safe-area-inset-bottom))]'
          : 'pb-[calc(5rem+env(safe-area-inset-bottom))]'
      } dark:bg-slate-950 lg:ml-24 lg:pb-0`}>
        <div className={activeTab === 'scan' ? 'flex min-h-0 flex-1 flex-col overflow-y-auto' : activeTab === 'ai' ? 'flex min-h-0 flex-1 flex-col' : 'shrink-0'}>
          {renderPage()}
        </div>
      </main>
      {isOnboardingOpen && user && (
        <OnboardingTour
          setActiveTab={setActiveTab}
          onComplete={async ({ skipped, activeTab: tourTab }) => {
            await saveUserOnboardingCompletion(user.uid);
            setProfile((currentProfile) => ({ ...currentProfile, onboardingCompleted: true }));
            setIsOnboardingReplayOpen(false);
            setActiveTab(skipped ? tourTab : 'dashboard');
          }}
        />
      )}
      <NutriBotTermsGate
        key={user?.uid || 'guest'}
        accountId={user?.uid || 'guest'}
        isOpen={activeTab === 'ai' && !isOnboardingOpen}
        onDecline={() => setActiveTab('dashboard')}
      />
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes scan {
              0% { top: 5%; opacity: 0; }
              10% { opacity: 1; }
              90% { opacity: 1; }
              100% { top: 95%; opacity: 0; }
            }
          `
        }}
      />
    </div>
  );
}