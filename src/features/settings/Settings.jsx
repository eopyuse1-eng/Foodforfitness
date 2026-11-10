import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { getAndroidAppUpdateStatus, openAndroidApkDownload } from '../../services/appUpdateService';
import {
  getExactNotificationPermission,
  getNotificationPermission,
  isNativeApp,
  requestExactNotificationPermission,
  requestNotificationPermission
} from '../../services/notificationService';

function PermissionStatus({ status }) {
  const labels = {
    granted: 'Allowed',
    denied: 'Blocked',
    default: 'Not enabled',
    unsupported: 'Not available'
  };
  const label = labels[status] || 'Checking';
  const color = status === 'granted'
    ? 'text-emerald-700 dark:text-emerald-300'
    : status === 'denied'
      ? 'text-rose-700 dark:text-rose-300'
      : 'text-slate-600 dark:text-slate-300';

  return <span className={`text-xs font-bold ${color}`}>{label}</span>;
}

export default function Settings({
  isDarkMode,
  setIsDarkMode,
  onStartOnboarding,
  privacyDataControls
}) {
  const [isNative, setIsNative] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('checking');
  const [exactAlarmPermission, setExactAlarmPermission] = useState('unsupported');
  const [settingsError, setSettingsError] = useState('');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [appUpdateStatus, setAppUpdateStatus] = useState(null);
  const [isCheckingAppUpdate, setIsCheckingAppUpdate] = useState(false);

  useEffect(() => {
    let isMounted = true;
    Promise.resolve()
      .then(() => isNativeApp())
      .then(async (native) => {
        const [notificationStatus, exactStatus] = await Promise.all([
          getNotificationPermission(),
          native ? getExactNotificationPermission() : Promise.resolve('unsupported')
        ]);
        if (!isMounted) return;
        setIsNative(native);
        setNotificationPermission(notificationStatus);
        setExactAlarmPermission(exactStatus);
      })
      .catch((error) => {
        console.error('Notification settings could not be loaded:', error);
        if (!isMounted) return;
        setNotificationPermission('unsupported');
        setSettingsError('Could not check notification permissions. Review your device or browser notification settings.');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const enableNotifications = async () => {
    setIsRequestingPermission(true);
    setSettingsError('');
    try {
      const permission = await requestNotificationPermission();
      setNotificationPermission(permission);
      if (permission !== 'granted') {
        setSettingsError('Notifications were not enabled. Check your device or browser settings and try again.');
      }
    } catch (error) {
      console.error('Notification permission request failed:', error);
      setSettingsError('Could not request notification permission. Check your device or browser settings.');
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const enableExactAlarms = async () => {
    setSettingsError('');
    try {
      const permission = await requestExactNotificationPermission();
      setExactAlarmPermission(permission);
      if (permission !== 'granted') {
        setSettingsError('Exact alarms were not enabled. You can change this permission in Android settings.');
      }
    } catch (error) {
      console.error('Exact-alarm permission request failed:', error);
      setSettingsError('Could not open the exact-alarm permission setting. Check Android settings.');
    }
  };

  const checkForAppUpdate = async () => {
    setIsCheckingAppUpdate(true);
    setSettingsError('');
    try {
      const status = await getAndroidAppUpdateStatus();
      setAppUpdateStatus(status);
    } catch (error) {
      console.error('Android app update check failed:', error);
      setSettingsError('Hindi ma-check ang update ngayon. Subukan ulit kapag may internet connection.');
    } finally {
      setIsCheckingAppUpdate(false);
    }
  };

  const downloadAppUpdate = async () => {
    if (!appUpdateStatus?.update) return;
    setSettingsError('');
    try {
      await openAndroidApkDownload(appUpdateStatus.update.downloadUrl);
    } catch (error) {
      console.error('Android app update download could not be opened:', error);
      setSettingsError('Hindi mabuksan ang APK download. Subukan ulit o i-check ang internet connection.');
    }
  };

  return (
    <div className="native-screen native-screen--settings mx-auto grid min-h-full w-full max-w-5xl content-start gap-4 bg-gradient-to-br from-emerald-50/50 via-transparent to-amber-50/30 p-4 pb-8 dark:from-emerald-950/15 dark:via-transparent dark:to-amber-950/10 dark:bg-slate-950 sm:gap-5 sm:p-6 sm:pb-10 lg:grid-cols-2">
      <header className="rounded-[2rem] border border-emerald-100 bg-gradient-to-br from-amber-100 via-lime-100 to-emerald-200 p-6 dark:border-emerald-900/60 dark:from-emerald-950 dark:via-emerald-900 dark:to-green-800 sm:p-8 lg:col-span-2">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-800 dark:text-emerald-100">Preferences</p>
        <h2 className="mt-1 text-3xl font-black tracking-tight text-emerald-950 dark:text-white">Settings</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-900/75 dark:text-emerald-100/80">Manage your app appearance, notification permissions, privacy, and data preferences.</p>
      </header>

      {Capacitor.getPlatform() === 'android' && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">App updates</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Kusang titingin ang app kung may bagong APK. Kapag may update, dito rin puwedeng i-check at buksan ang download.
              </p>
              {appUpdateStatus && (
                <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Installed version: {appUpdateStatus.currentVersion}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={checkForAppUpdate}
              disabled={isCheckingAppUpdate}
              className="w-fit shrink-0 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-bold text-teal-800 hover:bg-teal-100 disabled:cursor-wait disabled:opacity-60 dark:border-teal-800 dark:bg-teal-900/30 dark:text-teal-200 dark:hover:bg-teal-900/50"
            >
              {isCheckingAppUpdate ? 'Checking…' : 'Check for updates'}
            </button>
          </div>
          {appUpdateStatus && (
            <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs dark:bg-slate-800">
              {appUpdateStatus.update ? (
                <>
                  <p className="font-bold text-teal-800 dark:text-teal-200">Version {appUpdateStatus.update.version} is available.</p>
                  <p className="mt-1 text-slate-600 dark:text-slate-300">{appUpdateStatus.update.releaseNotes}</p>
                  <button type="button" onClick={downloadAppUpdate} className="primary-action mt-3 rounded-xl px-4 py-2 font-bold">
                    Download update
                  </button>
                </>
              ) : appUpdateStatus.isPublished ? (
                <p className="font-semibold text-slate-600 dark:text-slate-300">You’re using the latest version.</p>
              ) : (
                <p className="font-semibold text-slate-600 dark:text-slate-300">Update reminders are ready. The new APK link will be activated after the release is uploaded.</p>
              )}
            </div>
          )}
        </section>
      )}

      <section className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">App walkthrough</h3>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Balikan ang guided tour ng dashboard at iba pang features kahit kailan.</p>
        </div>
        <button type="button" onClick={onStartOnboarding} className="w-fit rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-bold text-teal-800 hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-900/30 dark:text-teal-200 dark:hover:bg-teal-900/50">
          Start walkthrough
        </button>
      </section>

      <section data-tour-target="settings-appearance" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">Appearance</h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Choose a theme for the app and web/PWA.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isDarkMode}
            aria-label="Dark theme"
            onClick={() => setIsDarkMode((currentMode) => !currentMode)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${isDarkMode ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'}`}
          >
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${isDarkMode ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
        <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">{isDarkMode ? 'Dark theme' : 'Light theme'}</p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">Notifications</h3>
            <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">Manage notification access here. Create and schedule reminders from the Dashboard.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Permission:</span>
            <PermissionStatus status={notificationPermission} />
          </div>
        </div>
        {notificationPermission !== 'granted' && (
          <button
            type="button"
            disabled={isRequestingPermission || notificationPermission === 'unsupported'}
            onClick={enableNotifications}
            className="mt-4 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-bold text-teal-800 hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-teal-800 dark:bg-teal-900/30 dark:text-teal-200 dark:hover:bg-teal-900/50"
          >
            {isRequestingPermission ? 'Requesting permission…' : 'Enable notifications'}
          </button>
        )}
        {isNative && exactAlarmPermission !== 'unsupported' && (
          <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Exact reminders</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Android may require this permission for reminders to run at the selected time.</p>
            </div>
            <div className="flex items-center gap-3">
              <PermissionStatus status={exactAlarmPermission} />
              {exactAlarmPermission !== 'granted' && (
                <button type="button" onClick={enableExactAlarms} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                  Allow exact reminders
                </button>
              )}
            </div>
          </div>
        )}
        {settingsError && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200" role="alert">{settingsError}</p>}
      </section>

      <div className="lg:col-span-2">{privacyDataControls}</div>

    </div>
  );
}
