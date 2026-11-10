import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

const UPDATE_MANIFEST_URL = 'https://food-for-fitness-2fe4d.web.app/app-update.json';

export async function getAndroidAppUpdateStatus() {
  const [appInfo, response] = await Promise.all([
    App.getInfo(),
    fetch(UPDATE_MANIFEST_URL, { cache: 'no-store' })
  ]);
  if (!response.ok) {
    throw new Error(`Update check failed with HTTP ${response.status}.`);
  }

  const manifest = await response.json();
  if (
    typeof manifest.enabled !== 'boolean'
    || typeof manifest.version !== 'string'
    || !Number.isInteger(Number(manifest.versionCode))
    || typeof manifest.downloadUrl !== 'string'
    || typeof manifest.releaseNotes !== 'string'
  ) {
    throw new Error('The app update manifest has an invalid format.');
  }

  const versionCode = Number(appInfo.build);
  if (!Number.isInteger(versionCode)) {
    throw new Error('Could not determine the installed Android app version.');
  }

  const downloadUrl = manifest.downloadUrl.trim();
  if (manifest.enabled && (!downloadUrl || new URL(downloadUrl).protocol !== 'https:')) {
    throw new Error('The update is enabled but does not have a valid HTTPS APK link.');
  }

  return {
    currentVersion: appInfo.version,
    currentVersionCode: versionCode,
    update: manifest.enabled && Number(manifest.versionCode) > versionCode
      ? {
        version: manifest.version,
        versionCode: Number(manifest.versionCode),
        downloadUrl,
        releaseNotes: manifest.releaseNotes
      }
      : null,
    isPublished: manifest.enabled
  };
}

export async function openAndroidApkDownload(url) {
  await Browser.open({ url });
}
