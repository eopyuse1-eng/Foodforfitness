import { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_PROFILE, normalizeProfile } from '../constants/profile';
import { useAppDialog } from '../components/common/appDialogContext';
import NutriBot from '../features/nutribot/NutriBot';
import Vitals from '../features/vitals/Vitals';
import FoodLog from '../features/food-log/FoodLog';
import CameraScanner from '../features/camera-ai/CameraScanner';
import Profile from '../features/profile/Profile';
import Dashboard from '../features/dashboard/Dashboard';
import Settings from '../features/settings/Settings';
import {
  auth,
  db,
  appId,
  initializeAuthSession,
  subscribeToAuth,
  subscribeToUserData,
  saveUserProfile,
  saveUserReminders,
  addUserFoodLog,
  addUserHealthLog,
  removeUserHealthLog,
  removeUserFoodLog,
  updateUserFoodLogClassification
} from '../services/firebaseService';
import { calculateBmi, calculateTargets, calculateTotals, getFoodLogDate, MICRONUTRIENT_DATA_VERSION, normalizeGlucoseReading, refreshFoodLogMicronutrients, scaleNutrients } from '../utils/healthMetrics';
import { getReminderTimeKey, scheduleNativeReminders, showReminderNotification } from '../services/notificationService';

const FOOD_CATALOG_CACHE_KEY = 'food-for-fitness:filipino-foods:v3';
const HEALTH_LOG_STORAGE_PREFIX = 'food-for-fitness:vital-logs:';
const DELETED_HEALTH_LOGS_STORAGE_PREFIX = 'food-for-fitness:deleted-vital-logs:';
const FOOD_LOG_CLASSIFICATION_VERSION = 2;
const FOOD_GROUPS = new Set(['go', 'grow', 'glow']);
const DEFAULT_REMINDERS = [
  { id: 1, title: 'Hydration Alert (Tubig)', time: '10:00', repeat: 'daily', active: true, type: 'water' },
  { id: 2, title: 'Lunch Meal Reminder', time: '12:30', repeat: 'daily', active: true, type: 'meal' },
  { id: 3, title: 'Blood Glucose Check', time: '18:00', repeat: 'daily', active: false, type: 'health' }
];

function getLocalDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function readCachedHealthLogs(storageKey) {
  try {
    const savedHealthLogs = JSON.parse(window.localStorage.getItem(storageKey) || '[]');
    return Array.isArray(savedHealthLogs) ? savedHealthLogs : [];
  } catch (error) {
    console.warn('Vital history cache could not be loaded:', error);
    return [];
  }
}

function readDeletedHealthLogIds(storageKey) {
  try {
    const savedIds = JSON.parse(window.localStorage.getItem(storageKey) || '[]');
    return new Set(Array.isArray(savedIds) ? savedIds.filter((id) => typeof id === 'string') : []);
  } catch (error) {
    console.warn('Deleted vital reading markers could not be loaded:', error);
    return new Set();
  }
}

function saveDeletedHealthLogIds(storageKey, deletedIds) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify([...deletedIds]));
  } catch (error) {
    console.warn('Deleted vital reading markers could not be saved:', error);
  }
}

function mergePendingHealthLogs(cloudHealthLogs, cachedHealthLogs, deletedIds = new Set()) {
  const mergedLogs = new Map(cloudHealthLogs.map((entry) => [entry.id, { ...entry, syncPending: false }]));
  cachedHealthLogs
    .filter((entry) => entry.syncPending && !deletedIds.has(entry.id) && !mergedLogs.has(entry.id))
    .forEach((entry) => mergedLogs.set(entry.id, entry));

  return [...mergedLogs.values()]
    .filter((entry) => !deletedIds.has(entry.id))
    .sort((first, second) => (
    (first.timestamp || 0) - (second.timestamp || 0)
    ));
}

function normalizeFoodName(name = '') {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function getFoodLogClassification(food) {
  if (!food?.isDietary || !FOOD_GROUPS.has(food.foodGroup) || !food.dishType) {
    return {
      catalogFoodId: food?.id ?? null,
      isDietary: false,
      foodGroup: null,
      dishType: null,
      classificationVersion: FOOD_LOG_CLASSIFICATION_VERSION
    };
  }
  return {
    catalogFoodId: food.id,
    isDietary: true,
    foodGroup: food.foodGroup,
    dishType: food.dishType,
    classificationVersion: FOOD_LOG_CLASSIFICATION_VERSION
  };
}

export default function useFoodFitnessApp({ isDarkMode, setIsDarkMode, onStartOnboarding }) {
  const showAppAlert = useAppDialog();
  const [user, setUser] = useState(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [profileLoadedForUser, setProfileLoadedForUser] = useState(null);
  const [isAuthScreen, setIsAuthScreen] = useState(true);
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [log, setLog] = useState([]);
  const [foodCatalog, setFoodCatalog] = useState([]);
  const [healthLogs, setHealthLogs] = useState([]);
  const [healthLogsLoadedForUser, setHealthLogsLoadedForUser] = useState(null);
  const [healthLogError, setHealthLogError] = useState('');
  const [todayDateKey, setTodayDateKey] = useState(() => getLocalDateKey());
  const [newWeight, setNewWeight] = useState('');
  const [newBp, setNewBp] = useState('');
  const [newGlucose, setNewGlucose] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [reminders, setReminders] = useState(DEFAULT_REMINDERS);
  const [remindersLoadedForUser, setRemindersLoadedForUser] = useState(null);
  const foodLogMigrationsInProgress = useRef(new Set());
  const deletedHealthLogIds = useRef(new Set());

  useEffect(() => {
    initializeAuthSession().catch((err) => console.error('Auth init error:', err));
    const unsubscribe = subscribeToAuth((currentUser) => {
      setHealthLogError('');
      setUser(currentUser);
      setAuthInitialized(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const updateDate = () => {
      const currentDateKey = getLocalDateKey();
      setTodayDateKey((previousDateKey) => (
        previousDateKey === currentDateKey ? previousDateKey : currentDateKey
      ));
    };
    const intervalId = window.setInterval(updateDate, 60000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const persistenceId = user?.uid || 'guest';
    if (!user || !db) {
      const storageKey = `food-for-fitness:reminders:${persistenceId}`;
      const healthStorageKey = `${HEALTH_LOG_STORAGE_PREFIX}${persistenceId}`;
      deletedHealthLogIds.current = new Set();
      let cancelled = false;

      Promise.resolve().then(() => {
        if (cancelled) return;

        try {
          const savedReminders = JSON.parse(window.localStorage.getItem(storageKey) || 'null');
          if (Array.isArray(savedReminders)) setReminders(savedReminders);
        } catch (error) {
          console.warn('Reminder cache could not be loaded:', error);
        }
        setHealthLogs(readCachedHealthLogs(healthStorageKey));
        setHealthLogsLoadedForUser(persistenceId);
        setRemindersLoadedForUser(persistenceId);
      });

      return () => {
        cancelled = true;
      };
    }

    let receivedCloudHealthSnapshot = false;
    deletedHealthLogIds.current = readDeletedHealthLogIds(
      `${DELETED_HEALTH_LOGS_STORAGE_PREFIX}${user.uid}`
    );
    return subscribeToUserData(user.uid, {
      onProfile: (loadedProfile) => {
        const normalizedProfile = normalizeProfile(loadedProfile);
        const isGoogleUser = user.providerData?.some((provider) => provider.providerId === 'google.com');
        const isUnverifiedEmailUser = user.providerData?.some((provider) => provider.providerId === 'password')
          && !user.emailVerified;
        setProfile(normalizedProfile);
        setIsAuthScreen(
          !normalizedProfile.isSetup
          || isUnverifiedEmailUser
          || (isGoogleUser && normalizedProfile.googleRegistrationCompleted !== true)
        );
      },
      onProfileLoaded: (loadedProfile) => {
        if (!loadedProfile) {
          setProfile(DEFAULT_PROFILE);
          setIsAuthScreen(true);
        }
        setProfileLoadedForUser(user.uid);
      },
      onReminders: setReminders,
      onRemindersLoaded: () => setRemindersLoadedForUser(user.uid),
      onLogs: setLog,
      onHealthLogs: (loadedHealthLogs) => {
        receivedCloudHealthSnapshot = true;
        const deletedIds = deletedHealthLogIds.current;
        const resurrectedLogs = loadedHealthLogs.filter((entry) => deletedIds.has(entry.id));
        resurrectedLogs.forEach((entry) => {
          removeUserHealthLog(user.uid, entry.id).catch((error) => {
            console.error('Error removing a previously deleted vital reading:', error);
            setHealthLogError('A previously deleted vital reading is still syncing. It is hidden on this device while cloud deletion is retried.');
          });
        });
        const cachedHealthLogs = readCachedHealthLogs(`${HEALTH_LOG_STORAGE_PREFIX}${user.uid}`);
        setHealthLogs(mergePendingHealthLogs(loadedHealthLogs, cachedHealthLogs, deletedIds));
        setHealthLogError('');
      },
      onHealthLogsLoaded: () => setHealthLogsLoadedForUser(user.uid),
      onHealthLogsError: (error) => {
        console.error('Error loading vital readings:', error);
        if (receivedCloudHealthSnapshot) return;
        setHealthLogs(readCachedHealthLogs(`${HEALTH_LOG_STORAGE_PREFIX}${user.uid}`));
        setHealthLogsLoadedForUser(user.uid);
        setHealthLogError('Could not load vital readings from your account. Showing any copies saved on this device.');
      },
      onError: (error) => {
        console.error('Error loading user data:', error);
      }
    });
  }, [user]);

  useEffect(() => {
    const persistenceId = user?.uid || 'guest';
    if (healthLogsLoadedForUser !== persistenceId) return;

    try {
      window.localStorage.setItem(`${HEALTH_LOG_STORAGE_PREFIX}${persistenceId}`, JSON.stringify(healthLogs));
    } catch (error) {
      console.warn('Vital history cache could not be saved:', error);
    }
  }, [user, healthLogs, healthLogsLoadedForUser]);

  useEffect(() => {
    const persistenceId = user?.uid || 'guest';
    if (remindersLoadedForUser !== persistenceId) return undefined;

    try {
      window.localStorage.setItem(`food-for-fitness:reminders:${persistenceId}`, JSON.stringify(reminders));
    } catch (error) {
      console.warn('Reminder cache could not be saved:', error);
    }
    if (user && db) {
      saveUserReminders(user.uid, reminders).catch((error) => {
        console.error('Error saving reminders:', error);
      });
    }
    return undefined;
  }, [user, reminders, remindersLoadedForUser]);

  useEffect(() => {
    if (foodCatalog.length > 0) return undefined;

    let isMounted = true;
    import('../constants/filipinoFoods')
      .then(({ default: catalog }) => {
        if (!isMounted) return;
        setFoodCatalog(catalog);
        try {
          window.localStorage.setItem(FOOD_CATALOG_CACHE_KEY, JSON.stringify(catalog));
        } catch (error) {
          console.warn('Food catalog cache could not be saved:', error);
        }
      })
      .catch((error) => console.error('Food catalog load error:', error));

    return () => {
      isMounted = false;
    };
  }, [foodCatalog.length]);

  useEffect(() => {
    if (!user || !db || foodCatalog.length === 0) return;

    const foodsByName = new Map(
      foodCatalog.map((food) => [normalizeFoodName(food.name), food])
    );
    const migrationKeyFor = (item) => `${user.uid}:${item.id}`;
    const logsToClassify = log.filter(
      (item) => item.classificationVersion !== FOOD_LOG_CLASSIFICATION_VERSION
        && !foodLogMigrationsInProgress.current.has(migrationKeyFor(item))
    );
    if (logsToClassify.length === 0) return;

    logsToClassify.forEach((item) => {
      const migrationKey = migrationKeyFor(item);
      foodLogMigrationsInProgress.current.add(migrationKey);
      const food = foodsByName.get(normalizeFoodName(item.name));
      const classification = getFoodLogClassification(food);
      updateUserFoodLogClassification(user.uid, item.id, classification)
        .catch((error) => {
          console.error(`Error classifying food log ${item.id}:`, error);
        })
        .finally(() => {
          foodLogMigrationsInProgress.current.delete(migrationKey);
        });
    });
  }, [foodCatalog, log, user]);

  useEffect(() => {
    let retryTimer;
    let retryCount = 0;
    const scheduleReminders = () => scheduleNativeReminders(reminders).then((scheduled) => {
      if (!scheduled && retryCount < 5) {
        retryCount += 1;
        retryTimer = window.setTimeout(scheduleReminders, 3000);
      }
    }).catch((error) => {
      console.warn('Native reminder scheduling unavailable:', error);
      window.dispatchEvent(new CustomEvent('food-for-fitness:reminder-error', { detail: error }));
    });
    scheduleReminders();

    let isMounted = true;

    const checkReminders = async () => {
      if (!isMounted) return;

      const now = new Date();
      const isWeekend = now.getDay() === 0 || now.getDay() === 6;
      const isDue = (reminder) => {
        const timeKey = getReminderTimeKey(reminder.time);
        if (!timeKey) return false;
        const [hours, minutes] = timeKey.split(':').map(Number);
        const scheduledAt = new Date(now);
        scheduledAt.setHours(hours, minutes, 0, 0);
        const elapsedMs = now.getTime() - scheduledAt.getTime();
        return elapsedMs >= 0 && elapsedMs < 120000;
      };

      const triggeredReminders = await Promise.all(reminders
        .filter((reminder) => reminder.active && isDue(reminder))
        .filter((reminder) => reminder.repeat !== 'weekdays' || !isWeekend)
        .map(async (reminder) => {
          const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
          const inAppKey = `food-for-fitness:in-app-reminder:${reminder.id}:${dateKey}`;
          let didTriggerInApp = false;

          if (window.localStorage.getItem(inAppKey) !== 'sent') {
            window.localStorage.setItem(inAppKey, 'sent');
            window.dispatchEvent(new CustomEvent('food-for-fitness:reminder', { detail: reminder }));
            didTriggerInApp = true;
          }

          try {
            await showReminderNotification(reminder, now);
            return didTriggerInApp ? reminder : null;
          } catch (error) {
            console.warn('Reminder notification failed:', error);
            window.dispatchEvent(new CustomEvent('food-for-fitness:reminder-error', { detail: error }));
            return didTriggerInApp ? reminder : null;
          }
        }));

      const onceReminderIds = triggeredReminders
        .filter((reminder) => reminder?.repeat === 'once')
        .map((reminder) => reminder.id);
      if (onceReminderIds.length > 0) {
        setReminders((currentReminders) => currentReminders.map((reminder) => (
          onceReminderIds.includes(reminder.id) ? { ...reminder, active: false } : reminder
        )));
      }
    };

    checkReminders();
    const intervalId = setInterval(checkReminders, 30000);
    return () => {
      isMounted = false;
      clearInterval(intervalId);
      window.clearTimeout(retryTimer);
    };
  }, [reminders]);

  const saveProfileToCloud = async (updatedProfile) => {
    setProfile(updatedProfile);

    try {
      await saveUserProfile(user?.uid, updatedProfile);
    } catch (err) {
      console.error('Error saving profile:', err);
    }
  };

  const targets = useMemo(() => calculateTargets(profile), [profile]);
  const rawDietaryFoodLogs = useMemo(
    () => log.filter((item) => item.isDietary === true && FOOD_GROUPS.has(item.foodGroup)),
    [log]
  );
  const dietaryFoodLogs = useMemo(
    () => foodCatalog.length > 0
      ? refreshFoodLogMicronutrients(rawDietaryFoodLogs, foodCatalog)
      : rawDietaryFoodLogs,
    [rawDietaryFoodLogs, foodCatalog]
  );
  const todayLog = useMemo(
    () => dietaryFoodLogs.filter((item) => getFoodLogDate(item) === todayDateKey),
    [dietaryFoodLogs, todayDateKey]
  );
  const totals = useMemo(() => calculateTotals(todayLog), [todayLog]);
  const bmi = useMemo(() => calculateBmi(profile), [profile]);
  const isFoodCatalogLoading = ['tracker', 'scan'].includes(activeTab) && foodCatalog.length === 0;
  const persistenceId = user?.uid || 'guest';
  const currentHealthLogs = healthLogsLoadedForUser === persistenceId ? healthLogs : [];

  const filteredFoods = useMemo(() => {
    const dietaryFoods = foodCatalog.filter(
      (food) => food.isDietary === true && FOOD_GROUPS.has(food.foodGroup)
    );
    if (!searchQuery.trim()) return dietaryFoods;

    const queryStr = searchQuery.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    return dietaryFoods.filter((food) => (
      [food.name, food.category, food.foodGroup, food.dishType]
        .some((value) => normalizeFoodName(value).includes(queryStr))
    ));
  }, [foodCatalog, searchQuery]);

  const handleAddFood = async (food, customServing = 1, source = 'food-log') => {
    const classification = getFoodLogClassification(food);
    if (!classification.isDietary) {
      throw new Error('Only curated dietary Go, Grow, or Glow foods can be added to Food Logs.');
    }
    if (!Number.isSafeInteger(customServing) || customServing < 1) {
      throw new Error('Serving quantity must be a positive whole number.');
    }
    if (!['food-log', 'camera'].includes(source)) {
      throw new Error('Food log source is invalid.');
    }
    const multiplier = customServing;
    const newLogItem = {
      id: `food-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: food.name,
      emoji: food.emoji,
      serving: food.serving,
      category: food.category,
      source,
      ...classification,
      calories: Math.round(food.calories * multiplier),
      protein: Math.round(food.protein * multiplier),
      carbs: Math.round(food.carbs * multiplier),
      fat: Math.round(food.fat * multiplier),
      sugar: Math.round(food.sugar * multiplier),
      sodium: Math.round(food.sodium * multiplier),
      micronutrients: scaleNutrients(food.micronutrients, multiplier),
      micronutrientDataVersion: MICRONUTRIENT_DATA_VERSION,
      purines: food.purines || 'low',
      recordedServing: multiplier,
      timestamp: Date.now()
    };

    setLog((previousLog) => [newLogItem, ...previousLog]);

    if (!user) return;

    try {
      await addUserFoodLog(user.uid, newLogItem);
    } catch (err) {
      console.error('Error adding log:', err);
    }
  };

  const handleRemoveFood = async (logId) => {
    setLog((previousLog) => previousLog.filter((item) => item.id !== logId));

    if (!user || String(logId).startsWith('local-')) return;

    try {
      await removeUserFoodLog(user.uid, logId);
    } catch (err) {
      console.error('Error deleting log:', err);
    }
  };

  const handleAddHealthLog = (event) => {
    event.preventDefault();

    if (!newWeight && !newBp && !newGlucose) return;
    if (newWeight && (!/^\d*(?:\.\d*)?$/.test(newWeight) || !Number.isFinite(Number(newWeight)) || Number(newWeight) <= 0)) {
      showAppAlert('Please enter a valid weight greater than zero.');
      return;
    }
    if (newBp && (!/^\d+$/.test(newBp) || Number(newBp) <= 0)) {
      showAppAlert('Blood pressure must be a positive whole number.');
      return;
    }
    const normalizedGlucose = newGlucose ? normalizeGlucoseReading(newGlucose) : '';
    if (newGlucose && !normalizedGlucose) {
      showAppAlert('Enter glucose as a positive number or a range in mg/dL, such as 90 or 80-100.');
      return;
    }

    const enteredBp = Number.parseInt(newBp, 10);
    const enteredWeight = Number.parseFloat(newWeight);
    const timestamp = Date.now();
    const entry = {
      date: getLocalDateKey(),
      weight: newWeight ? enteredWeight : null,
      bp: newBp ? enteredBp : null,
      glucose: normalizedGlucose || null,
      timestamp,
      clientId: `vital-${timestamp}-${Math.random().toString(36).slice(2, 8)}`
    };

    const localEntry = {
      ...entry,
      id: entry.clientId,
      syncPending: Boolean(user && db)
    };
    setHealthLogError('');
    setHealthLogs((previousLogs) => {
      const currentLogs = healthLogsLoadedForUser === persistenceId ? previousLogs : [];
      return [...currentLogs, localEntry];
    });
    setHealthLogsLoadedForUser(persistenceId);

    if (user && db) {
      addUserHealthLog(user.uid, entry).catch((error) => {
        console.error('Error saving vital reading:', error);
        setHealthLogError('Could not sync this vital reading to your account. It is saved on this device and will remain available here.');
      });
    }

    if (newWeight && Number.isFinite(enteredWeight)) {
      saveProfileToCloud({ ...profile, weight: String(enteredWeight) });
    }

    setNewWeight('');
    setNewBp('');
    setNewGlucose('');
  };

  const handleRemoveHealthLog = async (logId) => {
    if (user && db) {
      deletedHealthLogIds.current.add(logId);
      saveDeletedHealthLogIds(
        `${DELETED_HEALTH_LOGS_STORAGE_PREFIX}${user.uid}`,
        deletedHealthLogIds.current
      );
    }
    setHealthLogs((currentLogs) => currentLogs.filter((entry) => entry.id !== logId));
    setHealthLogError('');

    if (!user || !db) return;

    try {
      await removeUserHealthLog(user.uid, logId);
    } catch (error) {
      console.error('Error deleting vital reading:', error);
      setHealthLogs((currentLogs) => currentLogs.filter((entry) => entry.id !== logId));
      setHealthLogError('Could not confirm cloud deletion. This reading is hidden here and the app will retry deleting it when it syncs.');
    }
  };

  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            profile={profile}
            log={todayLog}
            totals={totals}
            targets={targets}
            reminders={reminders}
            setReminders={setReminders}
            setActiveTab={setActiveTab}
          />
        );
      case 'tracker':
        return (
          <FoodLog
            log={dietaryFoodLogs}
            filteredFoods={filteredFoods}
            isFoodCatalogLoading={isFoodCatalogLoading}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            handleAddFood={handleAddFood}
            handleRemoveFood={handleRemoveFood}
          />
        );
      case 'scan':
        return (
          <CameraScanner
            isFoodCatalogLoading={isFoodCatalogLoading}
            foodLogs={todayLog}
            dietaryFoods={foodCatalog.filter((food) => (
              food.isDietary === true && FOOD_GROUPS.has(food.foodGroup)
            ))}
            handleAddFood={handleAddFood}
            setActiveTab={setActiveTab}
          />
        );
      case 'analytics':
        return (
          <Vitals
            profile={profile}
            bmi={bmi}
            log={dietaryFoodLogs}
            todayLog={todayLog}
            totals={totals}
            targets={targets}
            healthLogs={currentHealthLogs}
            healthLogError={healthLogError}
            newWeight={newWeight}
            setNewWeight={setNewWeight}
            newBp={newBp}
            setNewBp={setNewBp}
            newGlucose={newGlucose}
            setNewGlucose={setNewGlucose}
            handleAddHealthLog={handleAddHealthLog}
            handleRemoveHealthLog={handleRemoveHealthLog}
          />
        );
      case 'ai':
        return <NutriBot profile={profile} bmi={bmi} targets={targets} />;
      case 'profile':
        return (
          <Profile
            profile={profile}
            setProfile={setProfile}
            foodLogs={dietaryFoodLogs}
            reminders={reminders}
            healthLogs={currentHealthLogs}
            healthLogError={healthLogError}
            user={user}
            auth={auth}
            db={db}
            appId={appId}
            bmi={bmi}
            isAuthScreen={isAuthScreen}
            setIsAuthScreen={setIsAuthScreen}
             setActiveTab={setActiveTab} // Pass setActiveTab to Profile
          />
        );
      case 'settings':
        return (
            <Settings
              isDarkMode={isDarkMode}
              setIsDarkMode={setIsDarkMode}
              privacyDataControls={(
                <Profile
                  profile={profile}
                  setProfile={setProfile}
                  foodLogs={dietaryFoodLogs}
                  reminders={reminders}
                  healthLogs={currentHealthLogs}
                  user={user}
                  auth={auth}
                  db={db}
                  appId={appId}
                  bmi={bmi}
                  isAuthScreen={false}
                  setIsAuthScreen={setIsAuthScreen}
                  setActiveTab={setActiveTab}
                  settingsMode
                />
              )}
              onStartOnboarding={() => {
                setActiveTab('dashboard');
                onStartOnboarding();
              }}
            />
        );
      default:
        return null;
    }
  };

  return {
    user,
    isAppReady: authInitialized && (!user || !db || profileLoadedForUser === user.uid),
    profile,
    setProfile,
    activeTab,
    setActiveTab,
    isAuthScreen,
    setIsAuthScreen,
    reminders,
    setReminders,
    log,
    healthLogs,
    renderPage,
    bmi,
    targets,
    totals,
    auth,
    db,
    appId
  };
}
