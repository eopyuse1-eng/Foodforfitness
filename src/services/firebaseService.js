import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithCustomToken,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  onSnapshot,
  deleteDoc,
  updateDoc,
  getDocs,
  writeBatch
} from 'firebase/firestore';

const injectedFirebaseConfig = typeof __firebase_config !== 'undefined'
  ? JSON.parse(__firebase_config)
  : null;

const firebaseConfig = injectedFirebaseConfig || {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
let firestorePersistenceEnabled = false;
let firestore;
if (app) {
  try {
    firestore = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
    firestorePersistenceEnabled = true;
  } catch (error) {
    console.warn('Persistent Firestore cache is unavailable; offline changes may not survive app restart:', error);
    firestore = getFirestore(app);
  }
}
export const db = firestore || null;
export const isFirestorePersistenceEnabled = firestorePersistenceEnabled;
export const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

export async function initializeAuthSession() {
  if (!isFirebaseConfigured || !auth) return;

  if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
    await signInWithCustomToken(auth, __initial_auth_token);
  }
}

export function subscribeToAuth(callback) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export function subscribeToUserData(userId, {
  onProfile,
  onProfileLoaded,
  onReminders,
  onRemindersLoaded,
  onLogs,
  onHealthLogs,
  onHealthLogsLoaded,
  onHealthLogsError,
  onError
}) {
  if (!db) return () => {};
  const profileRef = doc(db, 'artifacts', appId, 'users', userId, 'profile', 'data');
  getDoc(profileRef)
    .then(docSnap => {
      if (!docSnap.exists()) {
        onProfileLoaded?.(null);
        onRemindersLoaded?.();
        return;
      }
      const data = docSnap.data();
      onProfile(data);
      onProfileLoaded?.(data);
      if (Array.isArray(data.reminders)) onReminders?.(data.reminders);
      onRemindersLoaded?.();
    })
    .catch((error) => {
      onProfileLoaded?.(null);
      onError?.(error);
    });

  const logsCollection = collection(db, 'artifacts', appId, 'users', userId, 'foodLogs');
  const unsubscribeLogs = onSnapshot(query(logsCollection), snapshot => {
    const loadedLogs = [];
    snapshot.forEach(docSnap => loadedLogs.push({ id: docSnap.id, ...docSnap.data() }));
    loadedLogs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    onLogs(loadedLogs);
  }, onError);

  const healthLogsCollection = collection(db, 'artifacts', appId, 'users', userId, 'vitalLogs');
  const unsubscribeHealthLogs = onSnapshot(query(healthLogsCollection), snapshot => {
    const loadedHealthLogs = [];
    snapshot.forEach(docSnap => {
      const healthLog = docSnap.data();
      loadedHealthLogs.push({ ...healthLog, id: docSnap.id });
    });
    loadedHealthLogs.sort((first, second) => (first.timestamp || 0) - (second.timestamp || 0));
    onHealthLogs(loadedHealthLogs);
    onHealthLogsLoaded?.();
  }, onHealthLogsError || onError);

  return () => {
    unsubscribeLogs();
    unsubscribeHealthLogs();
  };
}

export async function saveUserProfile(userId, updatedProfile) {
  if (!db || !userId) return;
  const profileRef = doc(db, 'artifacts', appId, 'users', userId, 'profile', 'data');
  await setDoc(profileRef, updatedProfile);
}

export async function saveUserOnboardingCompletion(userId) {
  if (!db || !userId) {
    throw new Error('Account storage is unavailable. Please try again later.');
  }
  const profileRef = doc(db, 'artifacts', appId, 'users', userId, 'profile', 'data');
  await setDoc(profileRef, { onboardingCompleted: true }, { merge: true });
}

export async function saveUserReminders(userId, reminders) {
  if (!db || !userId) return;
  const profileRef = doc(db, 'artifacts', appId, 'users', userId, 'profile', 'data');
  await setDoc(profileRef, { reminders }, { merge: true });
}

export async function addUserFoodLog(userId, foodLog) {
  if (!db || !userId) return;
  if (!foodLog.id) throw new Error('Food log is missing its offline-safe ID.');
  const { id, ...logData } = foodLog;
  await setDoc(doc(db, 'artifacts', appId, 'users', userId, 'foodLogs', id), logData);
}

export async function updateUserFoodLogClassification(userId, logId, classification) {
  if (!db || !userId || !logId) {
    throw new Error('Food log classification could not be saved.');
  }
  await updateDoc(doc(db, 'artifacts', appId, 'users', userId, 'foodLogs', logId), classification);
}

export async function addUserHealthLog(userId, healthLog) {
  if (!db || !userId) {
    throw new Error('Firebase health log storage is unavailable.');
  }
  if (!healthLog.clientId) throw new Error('Vital reading is missing its offline-safe ID.');
  await setDoc(
    doc(db, 'artifacts', appId, 'users', userId, 'vitalLogs', healthLog.clientId),
    healthLog
  );
}

export async function removeUserHealthLog(userId, logId) {
  if (!db || !userId) return;
  await deleteDoc(doc(db, 'artifacts', appId, 'users', userId, 'vitalLogs', logId));
}

export async function removeUserFoodLog(userId, logId) {
  if (!db || !userId) return;
  await deleteDoc(doc(db, 'artifacts', appId, 'users', userId, 'foodLogs', logId));
}

export async function deleteUserAppData(userId) {
  if (!db || !userId) {
    throw new Error('Firebase data deletion is unavailable.');
  }

  const userPath = ['artifacts', appId, 'users', userId];
  const [logsSnapshot, healthLogsSnapshot] = await Promise.all([
    getDocs(collection(db, ...userPath, 'foodLogs')),
    getDocs(collection(db, ...userPath, 'vitalLogs'))
  ]);
  const documentReferences = [
    ...logsSnapshot.docs.map((logDocument) => logDocument.ref),
    ...healthLogsSnapshot.docs.map((healthLogDocument) => healthLogDocument.ref),
    doc(db, ...userPath, 'profile', 'data')
  ];

  for (let index = 0; index < documentReferences.length; index += 450) {
    const batch = writeBatch(db);
    documentReferences.slice(index, index + 450).forEach((documentReference) => {
      batch.delete(documentReference);
    });
    await batch.commit();
  }

  return {
    deletedFoodLogs: logsSnapshot.size,
    deletedHealthLogs: healthLogsSnapshot.size
  };
}
