import React, { useState } from 'react';
import { useAppDialog } from '../../components/common/appDialogContext';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  reload,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithCredential,
  signOut,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { DEFAULT_PROFILE, normalizeProfile } from '../../constants/profile';
import { deleteUserAppData, isFirebaseConfigured } from '../../services/firebaseService';
import { cancelNativeReminders } from '../../services/notificationService';
import { calculateTotals, getFoodLogDate } from '../../utils/healthMetrics';

const REGISTRATION_CONDITION_OPTIONS = [
  { key: 'diabetes', label: 'Diabetes' },
  { key: 'hypertension', label: 'Hypertension' },
  { key: 'gout', label: 'Gout / uric acid' },
  { key: 'ckd', label: 'Chronic kidney disease' },
  { key: 'pcos', label: 'PCOS' },
  { key: 'dyslipidemia', label: 'Dyslipidemia / cholesterol' },
  { key: 'heartDisease', label: 'Heart disease' },
  { key: 'gerd', label: 'GERD' },
  { key: 'osteoporosis', label: 'Osteoporosis' },
  { key: 'anemia', label: 'Anemia' }
];

function createRegistrationConditions(conditions = {}) {
  return {
    none: Boolean(conditions.none),
    ...Object.fromEntries(
      REGISTRATION_CONDITION_OPTIONS.map(({ key }) => [key, Boolean(conditions[key])])
    )
  };
}

function clearLocalAppData() {
  const keys = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith('food-for-fitness:')) keys.push(key);
  }
  keys.forEach((key) => window.localStorage.removeItem(key));
  return keys.length;
}

function hasCompletedRegistration(profile) {
  return Boolean(
    profile?.googleRegistrationCompleted === true
    &&
    profile?.isSetup
    && profile.name?.trim()
    && profile.gender
    && profile.age
    && profile.weight
    && profile.height
    && profile.activityLevel
    && profile.goal
    && profile.conditions
  );
}

function isNetworkError(error) {
  const errorDetails = error && typeof error === 'object'
    ? [error.code, error.message].filter((value) => typeof value === 'string').join(' ')
    : String(error || '');
  return /network[-_\s]?request[-_\s]?failed|network[-_\s]?error|no[-_\s]?network|not connected to (the )?internet|internet disconnected|name_not_resolved|err_internet_disconnected|err_name_not_resolved/i
    .test(errorDetails);
}

function getClinicalFocus(profileConditions = {}) {
  const selected = REGISTRATION_CONDITION_OPTIONS
    .filter(({ key }) => profileConditions[key])
    .map(({ label }) => label);
  return selected.length ? selected.join(', ') : 'None / no known conditions';
}

function buildDailyFoodHistory(foodLogs) {
  const groupedLogs = new Map();
  foodLogs.forEach((entry) => {
    const date = getFoodLogDate(entry);
    if (!date) return;
    if (!groupedLogs.has(date)) groupedLogs.set(date, []);
    groupedLogs.get(date).push(entry);
  });

  return [...groupedLogs.entries()]
    .sort(([firstDate], [secondDate]) => firstDate.localeCompare(secondDate))
    .map(([date, entries]) => ({
      date,
      foods: entries.map((entry) => ({
        name: entry.name || 'Food',
        serving: entry.serving || '',
        calories: Number(entry.calories) || 0
      })),
      totals: calculateTotals(entries)
    }));
}

function addPdfLine(document, text, options = {}) {
  const pageWidth = document.internal.pageSize.getWidth();
  const margin = 16;
  const lineHeight = options.lineHeight || 6;
  const fontSize = options.fontSize || 10;
  document.setFontSize(fontSize);
  document.setFont('helvetica', options.bold ? 'bold' : 'normal');
  const lines = document.splitTextToSize(String(text), pageWidth - margin * 2);
  const requiredHeight = lines.length * lineHeight + (options.gapAfter ?? 1);
  let cursorY = options.cursorY;
  if (cursorY + requiredHeight > document.internal.pageSize.getHeight() - margin) {
    document.addPage();
    cursorY = margin;
  }
  document.text(lines, margin, cursorY);
  return cursorY + requiredHeight;
}

export default function Profile({
  profile,
  setProfile,
  foodLogs = [],
  reminders = [],
  healthLogs = [],
  user,
  auth,
  db,
  appId,
  bmi,
  isAuthScreen = false,
  settingsMode = false,
  setIsAuthScreen,
  setActiveTab,
  isDarkMode,
  setIsDarkMode
}) {
  const showAppAlert = useAppDialog();
  const hasPendingGoogleRegistration = Boolean(
    isAuthScreen
    && user?.providerData?.some((provider) => provider.providerId === 'google.com')
    && !hasCompletedRegistration(profile)
  );
  const [authMode, setAuthMode] = useState(hasPendingGoogleRegistration ? 'signup' : 'signin');
  const [nameInput, setNameInput] = useState(() => (
    hasPendingGoogleRegistration
      ? profile.name && profile.name !== DEFAULT_PROFILE.name ? profile.name : user.displayName || ''
      : ''
  ));
  const [genderInput, setGenderInput] = useState(hasPendingGoogleRegistration ? profile.gender || '' : '');
  const [heightInput, setHeightInput] = useState(() => (
    hasPendingGoogleRegistration && profile.height ? String(Number(profile.height) / 100) : ''
  ));
  const [ageInput, setAgeInput] = useState(() => (
    hasPendingGoogleRegistration && profile.age ? String(profile.age) : ''
  ));
  const [weightInput, setWeightInput] = useState(() => (
    hasPendingGoogleRegistration && profile.weight ? String(profile.weight) : ''
  ));
  const [activityLevelInput, setActivityLevelInput] = useState(hasPendingGoogleRegistration ? profile.activityLevel || '' : '');
  const [goalInput, setGoalInput] = useState(hasPendingGoogleRegistration ? profile.goal || '' : '');
  const [conditionInputs, setConditionInputs] = useState(() => createRegistrationConditions(
    hasPendingGoogleRegistration ? profile.conditions : {}
  ));
  const [profileHeightDraft, setProfileHeightDraft] = useState(null);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [profileError, setProfileError] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileEditSnapshot, setProfileEditSnapshot] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [googleRegistrationUser, setGoogleRegistrationUser] = useState(
    hasPendingGoogleRegistration ? user : null
  );
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(
    hasPendingGoogleRegistration && Boolean(profile.termsAcceptedAt)
  );
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isDataOpen, setIsDataOpen] = useState(false);
  const [accountData, setAccountData] = useState(null);
  const [isClearLocalOpen, setIsClearLocalOpen] = useState(false);
  const [clearConfirmation, setClearConfirmation] = useState('');
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletionPassword, setDeletionPassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [dataControlError, setDataControlError] = useState('');
  const [verificationMessage, setVerificationMessage] = useState('');

  const profileHeightSource = `${user?.uid || 'guest'}:${profile.height || ''}`;
  const profileHeightInput = profileHeightDraft?.source === profileHeightSource
    ? profileHeightDraft.value
    : profile.height ? String(Number(profile.height) / 100) : '';

  const saveProfileToCloud = async (updatedProfile) => {
    try {
      if (user) {
        if (!db) throw new Error('Cloud storage is unavailable. Please try again later.');
        const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data');
        await setDoc(profileRef, updatedProfile);
      }
      setProfile(updatedProfile);
      setProfileError('');
      return true;
    } catch (err) {
      console.error('Error saving profile:', err);
      setProfileError(err.message || 'Could not save your profile. Please try again.');
      return false;
    }
  };

  const handleNumericProfileChange = (field, value, integerOnly = false) => {
    const pattern = integerOnly ? /^\d*$/ : /^\d*(?:\.\d*)?$/;
    if (!pattern.test(value)) {
      showAppAlert(integerOnly
        ? 'Please enter numbers only (whole numbers, no text or decimals).'
        : 'Please enter a valid number using digits only.');
      return;
    }
    setProfile((currentProfile) => ({ ...currentProfile, [field]: value }));
    setProfileError('');
  };

  const hasRegistrationCondition = Object.entries(conditionInputs)
    .some(([condition, selected]) => condition !== 'none' && selected);

  const validateRegistrationProfile = (name = nameInput) => {
    if (!name.trim()) return 'Please enter your full name.';
    if (!genderInput) return 'Please select a gender option.';
    if (!/^\d+$/.test(ageInput) || Number(ageInput) < 1 || Number(ageInput) > 120) {
      return 'Please enter a whole-number age between 1 and 120.';
    }
    if (!/^\d+(?:\.\d+)?$/.test(weightInput) || Number(weightInput) < 1 || Number(weightInput) > 500) {
      return 'Please enter a weight between 1 and 500 kg.';
    }
    if (!/^\d+(?:\.\d+)?$/.test(heightInput) || Number(heightInput) < 0.5 || Number(heightInput) > 3) {
      return 'Please enter a height between 0.5 and 3 meters.';
    }
    if (!activityLevelInput) return 'Please select your activity level.';
    if (!goalInput) return 'Please select your nutrition goal.';
    if (!conditionInputs.none && !hasRegistrationCondition) {
      return 'Select a health condition or choose “None / no known conditions”.';
    }
    return '';
  };

  const getRegistrationProfile = (name = nameInput.trim()) => ({
    ...profile,
    name,
    gender: genderInput,
    age: ageInput,
    weight: weightInput,
    height: String(Number(heightInput) * 100),
    activityLevel: activityLevelInput,
    goal: goalInput,
    conditions: conditionInputs,
    termsAcceptedAt: new Date().toISOString(),
    termsVersion: '1.1',
    privacyAcknowledgedAt: new Date().toISOString(),
    privacyVersion: '1.0',
    isSetup: true,
    onboardingCompleted: false
  });

  const prepareGoogleRegistration = (googleUser, savedProfile = {}) => {
    const displayName = googleUser.displayName || savedProfile.name || '';
    setGoogleRegistrationUser(googleUser);
    setAuthMode('signup');
    setNameInput(savedProfile.name || displayName);
    setGenderInput(savedProfile.gender || '');
    setHeightInput(savedProfile.height ? String(Number(savedProfile.height) / 100) : '');
    setAgeInput(savedProfile.age ? String(savedProfile.age) : '');
    setWeightInput(savedProfile.weight ? String(savedProfile.weight) : '');
    setActivityLevelInput(savedProfile.activityLevel || '');
    setGoalInput(savedProfile.goal || '');
    setConditionInputs(createRegistrationConditions(savedProfile.conditions));
    setHasAcceptedTerms(Boolean(savedProfile.termsAcceptedAt));
    setAuthError('');
  };

  const resetGoogleRegistration = async () => {
    setAuthLoading(true);
    setAuthError('');

    try {
      if (auth) await signOut(auth);
      setGoogleRegistrationUser(null);
      setAuthMode('signin');
      setNameInput('');
      setGenderInput('');
      setHeightInput('');
      setAgeInput('');
      setWeightInput('');
      setActivityLevelInput('');
      setGoalInput('');
      setConditionInputs(createRegistrationConditions());
      setHasAcceptedTerms(false);
    } catch (error) {
      console.error('Could not cancel Google registration:', error);
      setAuthError('Could not sign out of the incomplete Google registration. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const isEmailVerificationPending = Boolean(
    user
    && !user.emailVerified
    && user.providerData?.some((provider) => provider.providerId === 'password')
  );

  const handleResendVerification = async () => {
    if (!user) return;
    setAuthLoading(true);
    setAuthError('');
    setVerificationMessage('');
    try {
      await sendEmailVerification(user);
      setVerificationMessage(`A new verification link was sent to ${user.email}.`);
    } catch (error) {
      console.error('Could not send email verification:', error);
      setAuthError(error.message || 'Could not send the verification email. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCheckEmailVerification = async () => {
    if (!user) return;
    setAuthLoading(true);
    setAuthError('');
    setVerificationMessage('');
    try {
      await reload(user);
      if (!user.emailVerified) {
        setAuthError('Your email is not verified yet. Open the link in your inbox, then try again.');
        return;
      }

      if (!db) throw new Error('Cloud storage is unavailable. Please try again later.');
      const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data');
      const savedProfile = await getDoc(profileRef);
      if (!savedProfile.exists() || !savedProfile.data().isSetup) {
        throw new Error('Email verified, but the profile could not be found. Please contact support.');
      }

      setProfile(normalizeProfile(savedProfile.data()));
      setIsAuthScreen(false);
      setActiveTab('dashboard');
    } catch (error) {
      console.error('Could not confirm email verification:', error);
      setAuthError(error.message || 'Could not confirm email verification. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCompleteProfile = async () => {
    const age = Number(profile.age);
    const weight = Number(profile.weight);
    const height = Number(profileHeightInput);
    const hasSelectedCondition = Object.entries(profile.conditions || {})
      .some(([condition, selected]) => condition !== 'none' && selected);

    if (!profile.name?.trim()) return setProfileError('Please enter your name.');
    if (!profile.gender) return setProfileError('Please select a gender option.');
    if (!profile.age || !Number.isInteger(age) || age < 1 || age > 120) {
      return setProfileError('Please enter a whole-number age between 1 and 120.');
    }
    if (!profile.weight || !Number.isFinite(weight) || weight < 1 || weight > 500) {
      return setProfileError('Please enter a weight between 1 and 500 kg.');
    }
    if (!profileHeightInput || !Number.isFinite(height) || height < 0.5 || height > 3) {
      return setProfileError('Please enter a height between 0.5 and 3 meters.');
    }
    if (!profile.activityLevel) return setProfileError('Please select your activity level.');
    if (!profile.goal) return setProfileError('Please select your nutrition goal.');
    if (!profile.conditions?.none && !hasSelectedCondition) {
      return setProfileError('Select a health condition or choose “None / no known conditions”.');
    }

    const saved = await saveProfileToCloud({ ...profile, height: String(height * 100), isSetup: true });
    if (saved) {
      setIsEditingProfile(false);
      setProfileEditSnapshot(null);
      setProfileHeightDraft(null);
    }
  };

  const handleSignOut = async () => {
    try {
      if (auth) await signOut(auth);
      setProfile({ ...profile, isSetup: false });
      setIsAuthScreen(true);
      setActiveTab('dashboard');
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const handleEmailAuth = async (event) => {
    event.preventDefault();
    if (!isFirebaseConfigured || !auth) {
      setAuthError('Account access is unavailable until Firebase is configured.');
      return;
    }

    if (googleRegistrationUser) {
      const registrationError = validateRegistrationProfile(googleRegistrationUser.displayName || nameInput);
      if (registrationError) {
        setAuthError(registrationError);
        return;
      }
      if (!hasAcceptedTerms) {
        setAuthError('Please accept the Terms and Conditions to create an account.');
        return;
      }

      setAuthLoading(true);
      setAuthError('');
      try {
        if (!db) throw new Error('Cloud storage is unavailable. Please try again later.');
        const profileRef = doc(db, 'artifacts', appId, 'users', googleRegistrationUser.uid, 'profile', 'data');
        const newProfile = {
          ...getRegistrationProfile(googleRegistrationUser.displayName || nameInput.trim()),
          googleRegistrationCompleted: true,
          onboardingCompleted: false
        };
        await setDoc(profileRef, newProfile);
        setProfile(newProfile);
        setGoogleRegistrationUser(null);
        setIsAuthScreen(false);
        setActiveTab('dashboard');
      } catch (error) {
        setAuthError(error.message || 'Could not complete Google registration. Please try again.');
      } finally {
        setAuthLoading(false);
      }
      return;
    }

    const normalizedEmail = emailInput.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(normalizedEmail)) {
      setAuthError('Please enter a valid email address.');
      return;
    }
    if (passwordInput.length < 6) {
      setAuthError('Your password must be at least 6 characters.');
      return;
    }
    if (authMode === 'signup') {
      const registrationError = validateRegistrationProfile();
      if (registrationError) {
        setAuthError(registrationError);
        return;
      }
      if (!hasAcceptedTerms) {
        setAuthError('Please accept the Terms and Conditions to create an account.');
        return;
      }
    }

    setAuthLoading(true);
    setAuthError('');
    try {
      if (authMode === 'signup') {
        if (!db) throw new Error('Cloud storage is unavailable. Please try again later.');
        const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, passwordInput);
        await updateProfile(credential.user, { displayName: nameInput.trim() });
        const registeredProfile = getRegistrationProfile();
        const profileRef = doc(db, 'artifacts', appId, 'users', credential.user.uid, 'profile', 'data');
        await setDoc(profileRef, registeredProfile);
        await sendEmailVerification(credential.user);
        setProfile(registeredProfile);
        setIsAuthScreen(true);
        setVerificationMessage(`We sent a verification link to ${credential.user.email}. Verify your email before continuing.`);
        return;
      } else {
        const credential = await signInWithEmailAndPassword(auth, normalizedEmail, passwordInput);
        if (!credential.user.emailVerified) {
          setIsAuthScreen(true);
          setVerificationMessage(`Verify ${credential.user.email} to continue. Check your inbox for the verification link.`);
          return;
        }
      }
      setIsAuthScreen(false);
      if (authMode === 'signin') setActiveTab('dashboard');
    } catch (error) {
      console.error('Email authentication failed:', error?.code || 'unknown error');
      setAuthError(
        authMode === 'signup'
          ? 'We could not complete registration. Check your details and try again.'
          : 'We could not sign you in. Check your email and password and try again.'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    if (!isFirebaseConfigured || !auth) {
      setAuthError('Google sign-in is unavailable until Firebase is configured.');
      return;
    }
    if (!Capacitor.isNativePlatform() && !window.navigator.onLine) {
      setAuthError('No internet connection. Please connect to the internet and try again.');
      return;
    }

    setAuthLoading(true);
    setAuthError('');
    try {
      let credential;
      if (Capacitor.isNativePlatform()) {
        const nativeResult = await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true });
        const idToken = nativeResult.credential?.idToken;
        if (!idToken) throw new Error('Google sign-in did not return an ID token. Please try again.');
        const googleCredential = GoogleAuthProvider.credential(idToken);
        credential = await signInWithCredential(auth, googleCredential);
      } else {
        credential = await signInWithPopup(auth, new GoogleAuthProvider());
      }
      const profileRef = doc(db, 'artifacts', appId, 'users', credential.user.uid, 'profile', 'data');
      const savedProfile = await getDoc(profileRef);

      if (
        savedProfile.exists()
        && savedProfile.data().googleRegistrationCompleted === true
        && hasCompletedRegistration(savedProfile.data())
      ) {
        const existingProfile = savedProfile.data();
        setProfile(normalizeProfile(existingProfile));
        setIsAuthScreen(false);
        setActiveTab('dashboard');
        return;
      }

      const incompleteProfile = savedProfile.exists() ? savedProfile.data() : {};
      setProfile(normalizeProfile({ ...incompleteProfile, isSetup: false }));
      prepareGoogleRegistration(credential.user, incompleteProfile);
      setIsAuthScreen(true);
    } catch (error) {
      const errorMessage = error && typeof error === 'object' && 'message' in error
        && typeof error.message === 'string'
        ? error.message
        : '';
      setAuthError(
        (!Capacitor.isNativePlatform() && !window.navigator.onLine) || isNetworkError(error)
          ? 'No internet connection. Please connect to the internet and try again.'
          : Capacitor.isNativePlatform() && /cancel(?:led|ed)?/i.test(errorMessage)
          ? 'Google sign-in was closed before completion. Tap Continue with Google to try again.'
          : errorMessage || 'Google sign-in failed. Please try again.',
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDemoSignIn = () => {
    setProfile({ ...profile, isSetup: true });
    setIsAuthScreen(false);
    setActiveTab('dashboard');
  };

  const viewAccountData = () => {
    setDataControlError('');
    try {
      setAccountData({
        exportedAt: new Date().toISOString(),
        profile: {
          name: profile.name || '',
          gender: profile.gender || '',
          age: profile.age || '',
          weight: profile.weight || '',
          heightMeters: profile.height ? Number(profile.height) / 100 : null,
          clinicalFocus: getClinicalFocus(profile.conditions)
        },
        dailyFoodHistory: buildDailyFoodHistory(foodLogs),
        ...(healthLogs.some((entry) => entry.weight != null || entry.bp != null || entry.glucose != null) ? {
          vitalHistory: healthLogs
            .filter((entry) => entry.weight != null || entry.bp != null || entry.glucose != null)
            .map((entry) => ({
            date: entry.date || '',
            weight: entry.weight ?? null,
            bloodPressure: entry.bp ?? null,
            glucose: entry.glucose ?? null
            }))
        } : {})
      });
      setIsDataOpen(true);
    } catch (error) {
      console.error('App data could not be read:', error);
      setDataControlError('App data could not be read from this device.');
    }
  };

  const downloadAccountData = async () => {
    if (!accountData) return;
    try {
      const { jsPDF } = await import('jspdf');
      const document = new jsPDF();
      let cursorY = 18;
      cursorY = addPdfLine(document, 'FoodForFitness - My Data', {
        cursorY,
        bold: true,
        fontSize: 18,
        lineHeight: 9,
        gapAfter: 2
      });
      cursorY = addPdfLine(document, `Generated: ${new Date(accountData.exportedAt).toLocaleString()}`, {
        cursorY,
        fontSize: 9,
        gapAfter: 5
      });

      cursorY = addPdfLine(document, 'PROFILE', { cursorY, bold: true, fontSize: 13, lineHeight: 7, gapAfter: 2 });
      const profileRows = [
        ['Name', accountData.profile.name || 'Not provided'],
        ['Gender', accountData.profile.gender ? accountData.profile.gender.replaceAll('-', ' ') : 'Not provided'],
        ['Age', accountData.profile.age ? `${accountData.profile.age} years` : 'Not provided'],
        ['Weight', accountData.profile.weight ? `${accountData.profile.weight} kg` : 'Not provided'],
        ['Height', accountData.profile.heightMeters ? `${accountData.profile.heightMeters} m` : 'Not provided'],
        ['Clinical focus', accountData.profile.clinicalFocus]
      ];
      profileRows.forEach(([label, value]) => {
        cursorY = addPdfLine(document, `${label}: ${value}`, { cursorY, gapAfter: 0 });
      });

      cursorY = addPdfLine(document, 'FOOD AND NUTRITION HISTORY', {
        cursorY: cursorY + 5,
        bold: true,
        fontSize: 13,
        lineHeight: 7,
        gapAfter: 2
      });
      if (accountData.dailyFoodHistory.length === 0) {
        cursorY = addPdfLine(document, 'No food logs recorded.', { cursorY });
      } else {
        accountData.dailyFoodHistory.forEach((day) => {
          cursorY = addPdfLine(document, day.date, { cursorY: cursorY + 2, bold: true, fontSize: 11, lineHeight: 6 });
          day.foods.forEach((food) => {
            const serving = food.serving ? ` (${food.serving})` : '';
            cursorY = addPdfLine(document, `- ${food.name}${serving}: ${food.calories} kcal`, {
              cursorY,
              fontSize: 9,
              lineHeight: 5,
              gapAfter: 0
            });
          });
          const totals = day.totals;
          cursorY = addPdfLine(document, `Daily totals: ${Math.round(totals.calories)} kcal | Protein ${Math.round(totals.protein)} g | Carbs ${Math.round(totals.carbs)} g | Fat ${Math.round(totals.fat)} g`, {
            cursorY: cursorY + 1,
            bold: true,
            fontSize: 9,
            lineHeight: 5
          });
          cursorY = addPdfLine(document, `Clinical intake: Sugar ${Math.round(totals.sugar)} g | Sodium ${Math.round(totals.sodium)} mg`, {
            cursorY,
            fontSize: 9,
            lineHeight: 5,
            gapAfter: 1
          });
        });
      }

      if (accountData.vitalHistory?.length) {
        cursorY = addPdfLine(document, 'VITAL HISTORY', {
          cursorY: cursorY + 5,
          bold: true,
          fontSize: 13,
          lineHeight: 7,
          gapAfter: 2
        });
        accountData.vitalHistory.forEach((entry) => {
          const readings = [
            entry.weight != null ? `Weight ${entry.weight} kg` : null,
            entry.bloodPressure != null ? `Blood pressure ${entry.bloodPressure} mmHg` : null,
            entry.glucose != null ? `Glucose ${entry.glucose} mg/dL` : null
          ].filter(Boolean);
          if (readings.length) {
            cursorY = addPdfLine(document, `${entry.date}: ${readings.join(' | ')}`, {
              cursorY,
              fontSize: 9,
              lineHeight: 5
            });
          }
        });
      }

      const pageCount = document.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) {
        document.setPage(page);
        document.setFont('helvetica', 'normal');
        document.setFontSize(8);
        document.text(`Page ${page} of ${pageCount}`, document.internal.pageSize.getWidth() - 16, document.internal.pageSize.getHeight() - 8, { align: 'right' });
      }
      document.save('food-for-fitness-my-data.pdf');
    } catch (error) {
      console.error('App data export failed:', error);
      setDataControlError('Could not create the PDF export. Please try again.');
    }
  };

  const handleClearLocalData = () => {
    if (clearConfirmation !== 'CLEAR') return;
    try {
      clearLocalAppData();
      window.location.reload();
    } catch (error) {
      console.error('Local app data could not be cleared:', error);
      setDataControlError('Some app data on this device could not be cleared. Check device storage permissions and try again.');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE' || !user || !auth || !db) return;

    setIsDeletingAccount(true);
    setDataControlError('');
    let cloudDataDeleted = false;
    try {
      const providerIds = user.providerData.map((provider) => provider.providerId);
      if (providerIds.includes('password')) {
        if (!deletionPassword) {
          setDataControlError('Enter your current password to confirm account deletion.');
          return;
        }
        await reauthenticateWithCredential(
          user,
          EmailAuthProvider.credential(user.email, deletionPassword)
        );
      } else if (providerIds.includes('google.com')) {
        await reauthenticateWithPopup(user, new GoogleAuthProvider());
      } else {
        throw new Error('Please sign in again with your account provider before deleting your account.');
      }

      await deleteUserAppData(user.uid);
      cloudDataDeleted = true;
      await cancelNativeReminders(reminders);
      await deleteUser(user);
      clearLocalAppData();
      window.location.reload();
    } catch (error) {
      console.error('Account and data deletion failed:', error);
      if (cloudDataDeleted) {
        setDataControlError('Your saved profile and food logs were deleted, but Firebase could not finish deleting the account. Sign in again and retry, or contact the project administrator.');
      } else if (error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential') {
        setDataControlError('The password was not accepted. Check it and try again.');
      } else if (error?.code === 'auth/requires-recent-login') {
        setDataControlError('For your security, sign in again and retry account deletion.');
      } else {
        setDataControlError(error.message || 'Could not delete your account and saved data. Please try again.');
      }
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const privacyPolicyDialog = isPrivacyOpen && (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4" onClick={() => setIsPrivacyOpen(false)}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-title"
        className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="privacy-title" className="text-xl font-black text-slate-900 dark:text-white">Privacy Policy</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Last updated: October 15, 2026</p>
          </div>
          <button type="button" onClick={() => setIsPrivacyOpen(false)} className="rounded-lg px-2 py-1 text-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close Privacy Policy">&times;</button>
        </div>
        <div className="mt-5 space-y-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          <p>This notice describes how the current FoodForFitness application handles information. It reflects the current app implementation and should be reviewed and completed by the project owner before public deployment.</p>
          <section>
            <h3 className="font-bold text-slate-900 dark:text-white">1. Information handled by the app</h3>
            <p>Depending on the features you use, FoodForFitness handles your account email and Firebase user ID; profile details such as name, gender, age, height, weight, activity level, goals, dietary preferences, allergens, and health conditions; food log entries and reminders; and NutriBot conversation history. Vital readings entered on the Health screen are saved to your device's local storage. When signed in with Firebase, readings are also saved in Cloud Firestore under your user account.</p>
          </section>
          <section>
            <h3 className="font-bold text-slate-900 dark:text-white">2. How information is used</h3>
            <p>Information is used to provide sign-in, save and display your profile and food logs, calculate estimated nutrition summaries, personalize food suggestions, show reminders, and respond to AI chat or meal-photo analysis requests. These outputs are estimates and are not medical advice.</p>
          </section>
          <section>
            <h3 className="font-bold text-slate-900 dark:text-white">3. Where information is stored</h3>
            <p>When Firebase is configured and you sign in, account identity is handled by Firebase Authentication, while the app stores profile/reminder data, food logs, and vital readings in Cloud Firestore under your user ID. Vital readings are also cached in local storage on the current device/browser, including when cloud syncing is unavailable. App preferences, reminder cache, food catalog cache, and NutriBot chat history may also be stored locally. Demo/guest food logs and vital readings are stored only on the current device.</p>
          </section>
          <section>
            <h3 className="font-bold text-slate-900 dark:text-white">4. AI services and photos</h3>
            <p>When configured, recent NutriBot chat messages are sent to the FoodForFitness model service for a response; the service does not receive your profile system context. If that model is unavailable or cannot answer, the chat and selected profile context (which may include health conditions and nutrition targets) are sent to Google Gemini as a fallback. When you analyze a meal photo, the image and analysis prompt are sent to Google Gemini. The app does not save the submitted meal image as a Firestore record. AI providers process requests under their own terms and privacy practices; FoodForFitness cannot control provider-side retention. Avoid including information that is not needed for the feature.</p>
          </section>
          <section>
            <h3 className="font-bold text-slate-900 dark:text-white">5. Sharing</h3>
            <p>The app sends information to Firebase to provide account and cloud-storage features, and to the AI providers described above when you actively use those features. The current source code does not contain an advertising or analytics integration. The project owner should review provider settings and policies before release.</p>
          </section>
          <section>
            <h3 className="font-bold text-slate-900 dark:text-white">6. Your access and deletion controls</h3>
            <p>In Settings, use <strong>View / download my data</strong> to inspect or export the data currently available to the app. Use <strong>Clear data on this device</strong> to remove FoodForFitness local-storage entries on this device. This does not delete cloud data. Signed-in users can choose <strong>Delete account and app data</strong>; after re-authentication, the app attempts to delete the Firebase profile document, food-log documents, vital-reading documents, and Firebase Authentication account. This action does not delete copies already sent to AI providers, data on other devices, or platform backups/logs outside the app's control. If a deletion step fails, the app will report that it could not finish.</p>
          </section>
          <section>
            <h3 className="font-bold text-slate-900 dark:text-white">7. Retention and security</h3>
            <p>Cloud data remains in the configured Firebase project until it is deleted through the app or by the project administrator, subject to the platform's operational retention and backup practices. Local data remains on the device/browser until cleared or browser storage is removed. No online service can be described as completely secure; do not use the app as an emergency medical record or enter information you do not want processed by its enabled services.</p>
          </section>
          <section>
            <h3 className="font-bold text-slate-900 dark:text-white">8. Changes and contact</h3>
            <p>This notice may be updated when the app's data practices change. The project owner must publish an official privacy contact channel before public deployment. Until then, privacy questions or requests should be directed to the FoodForFitness project administrator through the channel provided by the project team.</p>
          </section>
        </div>
        <button type="button" onClick={() => setIsPrivacyOpen(false)} className="primary-action mt-6 w-full rounded-xl py-3 text-sm font-bold">Close</button>
      </section>
    </div>
  );

  const deleteAccountDialog = isDeleteAccountOpen && (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4" onClick={() => !isDeletingAccount && setIsDeleteAccountOpen(false)}>
      <section role="dialog" aria-modal="true" aria-labelledby="delete-account-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900" onClick={(event) => event.stopPropagation()}>
        <h2 id="delete-account-title" className="text-lg font-black text-rose-700 dark:text-rose-300">Delete account and app data?</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">This permanently deletes your FoodForFitness Firebase profile, saved food logs, and Firebase Authentication account. Local app data on this device will also be cleared. This cannot be undone. It cannot remove information already sent to AI providers or data on other devices.</p>
        {user?.providerData.some((provider) => provider.providerId === 'password') && (
          <label className="mt-4 block text-xs font-bold text-slate-700 dark:text-slate-200">Current password
            <input type="password" value={deletionPassword} onChange={(event) => setDeletionPassword(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" autoComplete="current-password" />
          </label>
        )}
        <label className="mt-4 block text-xs font-bold text-slate-700 dark:text-slate-200">Type DELETE to confirm
          <input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" autoComplete="off" />
        </label>
        {dataControlError && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700" role="alert">{dataControlError}</p>}
        <div className="mt-5 flex gap-2">
          <button type="button" disabled={isDeletingAccount || deleteConfirmation !== 'DELETE'} onClick={handleDeleteAccount} className="flex-1 rounded-xl bg-rose-600 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{isDeletingAccount ? 'Deleting...' : 'Delete permanently'}</button>
          <button type="button" disabled={isDeletingAccount} onClick={() => setIsDeleteAccountOpen(false)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200">Cancel</button>
        </div>
      </section>
    </div>
  );

  if (settingsMode) {
    return (
      <>
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-lg dark:bg-teal-900/40" aria-hidden="true">🔐</span>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300">Privacy & data</p>
              <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-slate-100">Your information, your choice</h3>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">Review or download a copy of your app data, manage this device’s saved data, or permanently delete your account and its cloud records.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={viewAccountData} className="rounded-2xl border border-teal-200 bg-teal-50 p-4 text-left transition hover:border-teal-300 hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-900/20 dark:hover:bg-teal-900/40">
              <span className="block text-sm font-extrabold text-teal-900 dark:text-teal-100">View or download my data</span>
              <span className="mt-1 block text-xs leading-5 text-teal-800/80 dark:text-teal-200/80">Review your profile, food logs, and recorded vital readings.</span>
            </button>
            <button type="button" onClick={() => setIsPrivacyOpen(true)} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700">
              <span className="block text-sm font-extrabold text-slate-800 dark:text-slate-100">Privacy Policy</span>
              <span className="mt-1 block text-xs leading-5 text-slate-600 dark:text-slate-400">See what information the app stores and how it is used.</span>
            </button>
            <button type="button" onClick={() => { setClearConfirmation(''); setDataControlError(''); setIsClearLocalOpen(true); }} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left transition hover:border-amber-300 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/20 dark:hover:bg-amber-900/40">
              <span className="block text-sm font-extrabold text-amber-900 dark:text-amber-100">Clear data on this device</span>
              <span className="mt-1 block text-xs leading-5 text-amber-800/80 dark:text-amber-200/80">Remove local app data without deleting cloud account records.</span>
            </button>
            {user && auth && db && (
              <button type="button" onClick={() => { setDeleteConfirmation(''); setDeletionPassword(''); setDataControlError(''); setIsDeleteAccountOpen(true); }} className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-left transition hover:border-rose-300 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/30 dark:hover:bg-rose-900/40">
                <span className="block text-sm font-extrabold text-rose-800 dark:text-rose-200">Delete account and app data</span>
                <span className="mt-1 block text-xs leading-5 text-rose-700/80 dark:text-rose-200/80">Permanently remove your signed-in account and saved cloud data.</span>
              </button>
            )}
          </div>
          {dataControlError && !isClearLocalOpen && !isDeleteAccountOpen && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:bg-rose-900/20 dark:text-rose-200" role="alert">{dataControlError}</p>}
        </section>
        {privacyPolicyDialog}
        {isDataOpen && accountData && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4" onClick={() => setIsDataOpen(false)}>
            <section role="dialog" aria-modal="true" aria-labelledby="account-data-title" className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900 sm:p-6" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="account-data-title" className="text-xl font-black text-slate-900 dark:text-white">Your app data</h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Profile details, daily food and nutrition history, and vital history when you have recorded readings.</p>
                </div>
                <button type="button" onClick={() => setIsDataOpen(false)} className="rounded-lg px-2 py-1 text-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close data view">&times;</button>
              </div>
              {dataControlError && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700" role="alert">{dataControlError}</p>}
              <div className="mt-4 max-h-[58vh] space-y-4 overflow-y-auto pr-1">
                <section className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">Profile</h3>
                  <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                    {[
                      ['Name', accountData.profile.name || 'Not provided'],
                      ['Gender', accountData.profile.gender ? accountData.profile.gender.replaceAll('-', ' ') : 'Not provided'],
                      ['Age', accountData.profile.age ? `${accountData.profile.age} years` : 'Not provided'],
                      ['Weight', accountData.profile.weight ? `${accountData.profile.weight} kg` : 'Not provided'],
                      ['Height', accountData.profile.heightMeters ? `${accountData.profile.heightMeters} m` : 'Not provided'],
                      ['Clinical focus', accountData.profile.clinicalFocus]
                    ].map(([label, value]) => <p key={label} className="text-slate-700 dark:text-slate-200"><strong>{label}:</strong> {value}</p>)}
                  </div>
                </section>
                <section className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">Food and nutrition history</h3>
                  {accountData.dailyFoodHistory.length === 0 ? <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">No food logs recorded.</p> : (
                    <div className="mt-3 space-y-3">
                      {accountData.dailyFoodHistory.map((day) => (
                        <div key={day.date} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                          <h4 className="text-xs font-black text-slate-800 dark:text-slate-100">{day.date}</h4>
                          <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                            {day.foods.map((food, index) => <li key={`${food.name}-${index}`}>{food.name}{food.serving ? ` (${food.serving})` : ''} — {food.calories} kcal</li>)}
                          </ul>
                          <p className="mt-2 text-xs font-bold text-slate-700 dark:text-slate-200">Daily totals: {Math.round(day.totals.calories)} kcal · Protein {Math.round(day.totals.protein)} g · Carbs {Math.round(day.totals.carbs)} g · Fat {Math.round(day.totals.fat)} g</p>
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Clinical intake: Sugar {Math.round(day.totals.sugar)} g · Sodium {Math.round(day.totals.sodium)} mg</p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
                {accountData.vitalHistory?.length > 0 && (
                  <section className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">Vital history</h3>
                    <ul className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                      {accountData.vitalHistory.map((entry, index) => (
                        <li key={`${entry.date}-${index}`}><strong>{entry.date}:</strong> {[entry.weight != null ? `Weight ${entry.weight} kg` : null, entry.bloodPressure != null ? `BP ${entry.bloodPressure} mmHg` : null, entry.glucose != null ? `Glucose ${entry.glucose} mg/dL` : null].filter(Boolean).join(' · ')}</li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={downloadAccountData} className="primary-action flex-1 rounded-xl py-3 text-sm font-bold">Download PDF</button>
                <button type="button" onClick={() => setIsDataOpen(false)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">Close</button>
              </div>
            </section>
          </div>
        )}
        {isClearLocalOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4" onClick={() => setIsClearLocalOpen(false)}>
            <section role="dialog" aria-modal="true" aria-labelledby="clear-local-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900" onClick={(event) => event.stopPropagation()}>
              <h2 id="clear-local-title" className="text-lg font-black text-slate-900 dark:text-white">Clear data on this device?</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">This removes FoodForFitness local-storage data on this browser/device, including cached reminders, preferences, and NutriBot chat history. It does <strong>not</strong> delete your Firebase account or cloud profile/food logs. To delete those too, use Delete account and app data.</p>
              {dataControlError && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700" role="alert">{dataControlError}</p>}
              <label className="mt-4 block text-xs font-bold text-slate-700 dark:text-slate-200">Type CLEAR to confirm
                <input value={clearConfirmation} onChange={(event) => setClearConfirmation(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" autoComplete="off" />
              </label>
              <div className="mt-5 flex gap-2">
                <button type="button" disabled={clearConfirmation !== 'CLEAR'} onClick={handleClearLocalData} className="flex-1 rounded-xl bg-rose-600 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">Clear local data</button>
                <button type="button" onClick={() => setIsClearLocalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">Cancel</button>
              </div>
            </section>
          </div>
        )}
        {deleteAccountDialog}
      </>
    );
  }

  if (isAuthScreen && isEmailVerificationPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-[#f7faef] to-emerald-100 p-4 font-sans dark:from-slate-950 dark:via-slate-950 dark:to-emerald-950">
        <section className="w-full max-w-md rounded-[2rem] border border-white/80 bg-white p-6 shadow-xl shadow-emerald-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-slate-950/30 sm:p-8">
          <div className="text-center">
            <span className="mb-3 inline-block text-3xl">✉️</span>
            <h1 className="text-2xl font-black text-emerald-900 dark:text-emerald-300">Verify your email</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              We sent a verification link to <strong>{user.email}</strong>. Open that email and click the link before continuing to your dashboard.
            </p>
          </div>
          {authError && <p className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-relaxed text-rose-700" role="alert">{authError}</p>}
          {verificationMessage && <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-200" role="status">{verificationMessage}</p>}
          <div className="mt-6 space-y-3">
            <button type="button" onClick={handleCheckEmailVerification} disabled={authLoading} className="primary-action w-full rounded-xl py-3 text-xs font-bold disabled:opacity-60">
              {authLoading ? 'Checking...' : 'I verified my email'}
            </button>
            <button type="button" onClick={handleResendVerification} disabled={authLoading} className="w-full rounded-xl border border-slate-200 py-3 text-xs font-bold text-slate-700 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200">
              Resend verification email
            </button>
            <button type="button" onClick={handleSignOut} disabled={authLoading} className="w-full py-2 text-xs font-bold text-slate-500 underline disabled:opacity-60">
              Sign out
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (isAuthScreen) {
    return (
      <div className="native-auth-screen box-border flex min-h-screen items-start justify-center overflow-y-auto bg-gradient-to-br from-amber-50 via-[#f7faef] to-emerald-100 p-4 font-sans sm:items-center sm:p-6 dark:from-slate-950 dark:via-slate-950 dark:to-emerald-950">
        <div className="native-auth-card my-2 w-full max-w-md rounded-[2rem] border border-white/80 bg-white p-6 shadow-xl shadow-emerald-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-slate-950/30 sm:my-auto sm:p-8">
          <div className="native-auth-brand mb-8 select-none text-center">
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={() => setIsDarkMode((value) => !value)}
                className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-700 transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                {isDarkMode ? 'Light' : 'Dark'}
              </button>
            </div>
            <span className="mb-2 inline-block text-3xl">🇵🇭</span>
            <h1 className="text-2xl font-black tracking-tight text-emerald-900 dark:text-emerald-300">FoodForFitness</h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Your Filipino nutrition companion</p>
            {!isFirebaseConfigured && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-200">Firebase is not configured. Use Demo Sign In to explore, or configure Firebase for accounts.</p>}
          </div>

          <div className="mb-5 flex rounded-xl bg-slate-100 p-1">
            {(googleRegistrationUser ? [['cancel-google-signup', 'Back to Sign In']] : [
              ['signin', 'Sign In'],
              ['signup', 'Register'],
              ...(!isFirebaseConfigured ? [['demo', 'Demo Sign In']] : [])
            ]).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  if (mode === 'demo') {
                    handleDemoSignIn();
                    return;
                  }
                  if (mode === 'cancel-google-signup') {
                    resetGoogleRegistration();
                    return;
                  }
                  setAuthMode(mode);
                  setAuthError('');
                }}
                className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${authMode === mode || googleRegistrationUser ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mb-5 select-none">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">{authMode === 'signup' ? 'Get started' : 'Welcome back'}</p>
            <h2 className="mt-1 text-lg font-black text-slate-900">{authMode === 'signup' ? googleRegistrationUser ? 'Complete your Google registration' : 'Create your account' : 'Sign in to continue'}</h2>
          </div>
          <form onSubmit={handleEmailAuth} noValidate className="space-y-4">
            {googleRegistrationUser && (
              <p className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-xs leading-relaxed text-teal-800 dark:border-teal-900/60 dark:bg-teal-900/20 dark:text-teal-200">
                Your Google account is connected. Complete your profile and accept the terms to finish registration.
              </p>
            )}
            {authError && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-relaxed text-rose-700" role="alert">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 font-black text-rose-600">!</span>
                <span>{authError}</span>
              </div>
            )}
            {!googleRegistrationUser && (
              <>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Email address
                  <input type="email" required value={emailInput} onChange={(event) => setEmailInput(event.target.value)} disabled={!isFirebaseConfigured} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-60" placeholder="you@example.com" autoComplete="email" />
                </label>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Password
                  <input type="password" required minLength={6} value={passwordInput} onChange={(event) => setPasswordInput(event.target.value)} disabled={!isFirebaseConfigured} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-60" placeholder="At least 6 characters" autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} />
                </label>
              </>
            )}
            {authMode === 'signup' && (
              <>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Full name
                  <input type="text" required value={nameInput} onChange={(event) => setNameInput(event.target.value)} disabled={!isFirebaseConfigured} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-60" placeholder="Juan dela Cruz" autoComplete="name" />
                </label>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Gender
                  <select required value={genderInput} onChange={(event) => setGenderInput(event.target.value)} disabled={!isFirebaseConfigured} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-60">
                    <option value="">Select an option</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="non-binary">Non-binary</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                </label>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Height (m) <span className="text-rose-600">*</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={heightInput}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value && !/^\d*(?:\.\d*)?$/.test(value)) {
                        showAppAlert('Please enter height using numbers only.');
                        return;
                      }
                      setHeightInput(value);
                      setAuthError('');
                    }}
                    disabled={!isFirebaseConfigured}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
                    placeholder="e.g. 1.65"
                    autoComplete="off"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Age (years) <span className="text-rose-600">*</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={ageInput}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (value && !/^\d*$/.test(value)) {
                          showAppAlert('Please enter age as a whole number using digits only.');
                          return;
                        }
                        setAgeInput(value);
                        setAuthError('');
                      }}
                      disabled={!isFirebaseConfigured}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
                      placeholder="e.g. 23"
                    />
                  </label>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Weight (kg) <span className="text-rose-600">*</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      value={weightInput}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (value && !/^\d*(?:\.\d*)?$/.test(value)) {
                          showAppAlert('Please enter weight using numbers only.');
                          return;
                        }
                        setWeightInput(value);
                        setAuthError('');
                      }}
                      disabled={!isFirebaseConfigured}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
                      placeholder="e.g. 60"
                    />
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Activity level <span className="text-rose-600">*</span>
                    <select required value={activityLevelInput} onChange={(event) => { setActivityLevelInput(event.target.value); setAuthError(''); }} disabled={!isFirebaseConfigured} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-60">
                      <option value="">Select activity level</option>
                      <option value="sedentary">Sedentary</option>
                      <option value="light">Lightly active</option>
                      <option value="moderate">Moderate</option>
                      <option value="active">Very active</option>
                    </select>
                  </label>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Goal <span className="text-rose-600">*</span>
                    <select required value={goalInput} onChange={(event) => { setGoalInput(event.target.value); setAuthError(''); }} disabled={!isFirebaseConfigured} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-60">
                      <option value="">Select your goal</option>
                      <option value="maintain">Maintain weight</option>
                      <option value="lose">Lose weight</option>
                      <option value="gain">Gain muscle</option>
                    </select>
                  </label>
                </div>
                <fieldset className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
                  <legend className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Health conditions <span className="text-rose-600">*</span>
                  </legend>
                  <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">Choose all that apply, or select “None / no known conditions”.</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      { key: 'none', label: 'None / no known conditions' },
                      ...REGISTRATION_CONDITION_OPTIONS
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={conditionInputs[key]}
                          disabled={!isFirebaseConfigured}
                          onChange={(event) => {
                            const checked = event.target.checked;
                            setConditionInputs((current) => key === 'none'
                                ? createRegistrationConditions({ none: checked })
                              : { ...current, [key]: checked, none: checked ? false : current.none });
                            setAuthError('');
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="flex items-start gap-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  <input
                    id="terms-acceptance"
                    type="checkbox"
                    required
                    checked={hasAcceptedTerms}
                    onChange={(event) => {
                      setHasAcceptedTerms(event.target.checked);
                      setAuthError('');
                    }}
                    disabled={!isFirebaseConfigured}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-teal-600 focus:ring-teal-500 disabled:opacity-60"
                  />
                  <div>
                    <label htmlFor="terms-acceptance">I agree to the </label>
                    <button
                      type="button"
                      onClick={() => setIsTermsOpen(true)}
                      className="font-bold text-teal-700 underline hover:text-teal-900 dark:text-teal-400 dark:hover:text-teal-300"
                    >
                      Terms and Conditions
                    </button>
                    {' '}and acknowledge the{' '}
                    <button
                      type="button"
                      onClick={() => setIsPrivacyOpen(true)}
                      className="font-bold text-teal-700 underline hover:text-teal-900 dark:text-teal-400 dark:hover:text-teal-300"
                    >
                      Privacy Policy
                    </button>
                    .
                  </div>
                </div>
              </>
            )}
            <button type="submit" disabled={authLoading || !isFirebaseConfigured} className="primary-action w-full rounded-xl py-3 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-60">
              {authLoading ? 'Please wait...' : googleRegistrationUser ? 'Complete Registration' : authMode === 'signup' ? 'Create Account' : 'Sign In'}
            </button>
          </form>
          {authMode === 'signin' && (
            <>
              <div className="my-4 flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                or
                <span className="h-px flex-1 bg-slate-200" />
              </div>
              <button type="button" onClick={handleGoogleAuth} disabled={authLoading || !isFirebaseConfigured} className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
                <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 font-black text-teal-700">G</span>
                Continue with Google
              </button>
            </>
          )}
          {user && auth && db && <button type="button" onClick={() => { setDeleteConfirmation(''); setDeletionPassword(''); setDataControlError(''); setIsDeleteAccountOpen(true); }} className="mt-3 w-full text-xs font-bold text-rose-700 underline dark:text-rose-300">Delete account and app data</button>}
        </div>
        {isTermsOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4" onClick={() => setIsTermsOpen(false)}>
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="terms-title"
              className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <h2 id="terms-title" className="text-xl font-black text-slate-900 dark:text-white">Terms and Conditions</h2>
                <button type="button" onClick={() => setIsTermsOpen(false)} className="rounded-lg px-2 py-1 text-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close Terms and Conditions">&times;</button>
              </div>
              <div className="mt-4 space-y-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                <p className="font-semibold text-slate-800 dark:text-slate-100">Last Updated: October 15, 2026</p>
                <p>Welcome to <strong>FoodForFitness</strong>! These Terms and Conditions (&quot;Agreement&quot;) govern your access to and use of our application, website, and related services (&quot;System&quot;). By creating an account, accessing, or using FoodForFitness, you agree to be bound by these terms.</p>

                <section>
                  <h3 className="font-bold text-slate-900 dark:text-white">1. Acceptance of Terms</h3>
                  <p>By registering for an account or using FoodForFitness, you acknowledge that you have read, understood, and agreed to these terms. If you do not agree with any part of this Agreement, you must not use or access the System.</p>
                </section>

                <section>
                  <h3 className="font-bold text-slate-900 dark:text-white">2. Health and Medical Disclaimer</h3>
                  <ul className="list-disc space-y-2 pl-5">
                    <li><strong>For Informational Purposes Only:</strong> All content, tools, calculations (e.g., BMI, daily calorie requirements, macronutrient breakdown), and meal plan recommendations provided by FoodForFitness are for <strong>educational and informational purposes only</strong>.</li>
                    <li><strong>Not Medical Advice:</strong> FoodForFitness is <strong>not</strong> a licensed medical provider and does not provide medical advice, diagnosis, or treatment. The System is not intended to replace professional guidance from a doctor, registered dietitian, or certified nutritionist.</li>
                    <li><strong>User Responsibility:</strong> You are strongly advised to consult a medical professional before starting any new diet, meal plan, or lifestyle program. You are solely responsible for verifying ingredients and ensuring that recommended meal plans do not conflict with your personal health conditions, dietary restrictions, or food allergies.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="font-bold text-slate-900 dark:text-white">3. Accuracy of User Data</h3>
                  <ul className="list-disc space-y-2 pl-5">
                    <li>The effectiveness and accuracy of the recommendations or calculations generated by FoodForFitness depend entirely on the information you provide (such as weight, height, age, activity level, and health goals).</li>
                    <li>You agree to provide accurate, current, and complete information and to update your profile as necessary to maintain its accuracy.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="font-bold text-slate-900 dark:text-white">4. User Accounts and Security</h3>
                  <ul className="list-disc space-y-2 pl-5">
                    <li>You are responsible for maintaining the confidentiality of your account credentials (username/email and password).</li>
                    <li>You assume full responsibility for all activities that occur under your account. You agree to notify us immediately of any unauthorized access or security breach regarding your account.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="font-bold text-slate-900 dark:text-white">5. Acceptable Use Policy</h3>
                  <p>You agree to use FoodForFitness only for lawful purposes. You agree <strong>not</strong> to:</p>
                  <ol className="list-decimal space-y-1 pl-5">
                    <li>Use the System for any illegal purpose or in violation of any local or international laws.</li>
                    <li>Attempt to hack, reverse engineer, probe, or compromise the security, infrastructure, or database of FoodForFitness.</li>
                    <li>Introduce automated bots, viruses, malware, or any other harmful code into the System.</li>
                  </ol>
                </section>

                <section>
                  <h3 className="font-bold text-slate-900 dark:text-white">6. Intellectual Property</h3>
                  <p>All elements of FoodForFitness—including logos, user interfaces, graphic designs, software algorithms, databases, and written content—are the exclusive property of the developers of FoodForFitness and are protected by applicable intellectual property laws. Reproduction or distribution without prior written consent is strictly prohibited.</p>
                </section>

                <section>
                  <h3 className="font-bold text-slate-900 dark:text-white">7. Limitation of Liability</h3>
                  <p>To the maximum extent permitted by applicable law, the developers and administrators of FoodForFitness shall <strong>not be held liable</strong> for:</p>
                  <ul className="list-disc space-y-2 pl-5">
                    <li>Any health issues, allergic reactions, adverse physical effects, or injuries resulting directly or indirectly from following the meal plans, nutritional targets, or suggestions provided by the System.</li>
                    <li>Any system downtime, data loss, service interruption, or technical errors encountered while using the System.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="font-bold text-slate-900 dark:text-white">8. Data Privacy</h3>
                  <p>Your privacy is important to us. The collection, processing, and protection of your personal information (such as your name, email, and health metrics) are governed by our <strong>Privacy Policy</strong> in compliance with applicable data privacy laws (e.g., Data Privacy Act of 2012).</p>
                </section>

                <section>
                  <h3 className="font-bold text-slate-900 dark:text-white">9. Modifications to the Terms</h3>
                  <p>We reserve the right to update or modify these Terms and Conditions at any time. In the event of material changes, we will notify you by posting an in-app notice, sending an email notification, or updating the &quot;Last Updated&quot; date at the top of this document at least <strong>7 days</strong> before the changes take effect. Your continued use of FoodForFitness after the effective date constitutes your acceptance of the revised terms.</p>
                </section>

                <section>
                  <h3 className="font-bold text-slate-900 dark:text-white">10. Contact Information</h3>
                  <p>If you have any questions or concerns regarding these Terms and Conditions, please contact us at:</p>
                  <p><strong>Email:</strong> support@foodforfitness.com</p>
                </section>
              </div>
              <button type="button" onClick={() => setIsTermsOpen(false)} className="primary-action mt-6 w-full rounded-xl py-3 text-sm font-bold">Close</button>
            </section>
          </div>
        )}
        {privacyPolicyDialog}
        {deleteAccountDialog}
      </div>
    );
  }

  if (!profile.isSetup || isEditingProfile) {
    return (
      <div className="native-screen native-screen--profile-setup min-h-full bg-slate-50 px-4 py-8 font-sans dark:bg-slate-950 sm:px-6 sm:py-12">
        <div className="mx-auto w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-slate-950/30 sm:p-10">
          <div className="mb-8 text-center">
            <span className="mb-2 inline-block text-3xl">🇵🇭</span>
            <h1 className="text-2xl font-black tracking-tight text-teal-900 dark:text-teal-400">FoodForFitness</h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{isEditingProfile ? 'Update your personal details and health preferences' : 'Clinical Nutrition & Filipino Health Tracker'}</p>
            {isEditingProfile && (
              <button
                type="button"
                onClick={() => {
                  if (profileEditSnapshot) setProfile(profileEditSnapshot);
                  setProfileEditSnapshot(null);
                  setProfileHeightDraft(null);
                  setProfileError('');
                  setIsEditingProfile(false);
                }}
                className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            )}
          </div>
          <div className="space-y-5">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400">Your Name <span className="text-rose-600">*</span></label>
              <input type="text" required value={profile.name || ''} onChange={e => { setProfile({...profile, name: e.target.value}); setProfileError(''); }} className="mt-1 w-full rounded-2xl border border-slate-200 bg-gray-50 p-3 text-xs font-medium outline-none focus:ring-2 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" placeholder="e.g. Juan dela Cruz"/>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400">Gender <span className="text-rose-600">*</span></label>
              <select required value={profile.gender || ''} onChange={e => { setProfile({...profile, gender: e.target.value}); setProfileError(''); }} className="mt-1 w-full rounded-2xl border border-slate-200 bg-gray-50 p-3 text-xs font-medium outline-none focus:ring-2 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                <option value="">Select an option</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="non-binary">Non-binary</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400">Age <span className="text-rose-600">*</span></label>
                <input type="text" inputMode="numeric" required value={profile.age || ''} onChange={e => handleNumericProfileChange('age', e.target.value, true)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-gray-50 p-3 text-center text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"/>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400">Wt (kg) <span className="text-rose-600">*</span></label>
                <input type="text" inputMode="decimal" required value={profile.weight || ''} onChange={e => handleNumericProfileChange('weight', e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-gray-50 p-3 text-center text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"/>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400">Ht (m) <span className="text-rose-600">*</span></label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={profileHeightInput}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value && !/^\d*(?:\.\d*)?$/.test(value)) {
                      showAppAlert('Please enter height in meters using numbers only.');
                      return;
                    }
                    setProfileHeightDraft({ source: profileHeightSource, value });
                    setProfileError('');
                  }}
                  placeholder="e.g. 1.65"
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-gray-50 p-3 text-center text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400">Activity <span className="text-rose-600">*</span></label>
                <select required value={profile.activityLevel || ''} onChange={e => { setProfile({...profile, activityLevel: e.target.value}); setProfileError(''); }} className="mt-1 w-full rounded-2xl border border-slate-200 bg-gray-50 p-3 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                  <option value="">Select activity</option>
                  <option value="sedentary">Sedentary</option><option value="light">Lightly Active</option><option value="moderate">Moderate</option><option value="active">Very Active</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400">Goal <span className="text-rose-600">*</span></label>
                <select required value={profile.goal || ''} onChange={e => { setProfile({...profile, goal: e.target.value}); setProfileError(''); }} className="mt-1 w-full rounded-2xl border border-slate-200 bg-gray-50 p-3 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                  <option value="">Select goal</option>
                  <option value="maintain">Maintain</option><option value="lose">Weight Loss</option><option value="gain">Muscle Gain</option>
                </select>
              </div>
            </div>
            <div className="border-t pt-4">
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400">Clinical Conditions & Focus <span className="text-rose-600">*</span></label>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-gray-50 p-3 transition hover:bg-teal-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700">
                  <input type="checkbox" checked={Boolean(profile.conditions?.none)} onChange={e => setProfile({...profile, conditions: createRegistrationConditions({ none: e.target.checked })})} className="h-4 w-4 rounded text-teal-600"/>
                  <span className="text-xs font-medium text-gray-700 dark:text-slate-200">None / no known conditions</span>
                </label>
                {REGISTRATION_CONDITION_OPTIONS.map(cond => (
                  <label key={cond.key} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-gray-50 p-3 transition hover:bg-teal-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700">
                    <input type="checkbox" checked={Boolean(profile.conditions?.[cond.key])} onChange={e => setProfile({...profile, conditions: {...createRegistrationConditions(profile.conditions), [cond.key]: e.target.checked, none: e.target.checked ? false : profile.conditions?.none}})} className="h-4 w-4 rounded text-teal-600"/>
                    <span className="text-xs font-medium text-gray-700 dark:text-slate-200">{cond.label}</span>
                  </label>
                ))}
              </div>
            </div>
            {profileError && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-200" role="alert">{profileError}</p>}
            <button type="button" onClick={handleCompleteProfile} className="primary-action mt-2 w-full rounded-2xl py-4 font-bold">
              {isEditingProfile ? 'Save changes' : 'Continue to Dashboard'}
            </button>
            <div className="flex flex-wrap justify-center gap-4 pt-2 text-xs font-bold">
              <button type="button" onClick={() => setIsPrivacyOpen(true)} className="text-teal-700 underline dark:text-teal-300">Privacy Policy</button>
              {user && auth && db && <button type="button" onClick={() => { setDeleteConfirmation(''); setDeletionPassword(''); setDataControlError(''); setIsDeleteAccountOpen(true); }} className="text-rose-700 underline dark:text-rose-300">Delete account and app data</button>}
              {user && <button type="button" onClick={handleSignOut} className="text-slate-600 underline dark:text-slate-300">Sign out</button>}
            </div>
          </div>
        </div>
        {privacyPolicyDialog}
        {deleteAccountDialog}
      </div>
    );
  }

  return (
    <div className="native-screen native-screen--profile mx-auto min-h-full w-full max-w-6xl space-y-6 bg-gradient-to-br from-emerald-50/60 via-transparent to-amber-50/40 p-4 pb-8 dark:from-emerald-950/20 dark:via-transparent dark:to-amber-950/10 dark:bg-slate-950 sm:space-y-7 sm:p-6 sm:pb-10">
      <header className="overflow-hidden rounded-[2rem] border border-emerald-100 bg-gradient-to-br from-amber-100 via-lime-100 to-emerald-200 p-6 shadow-sm dark:border-emerald-900/60 dark:from-emerald-950 dark:via-emerald-900 dark:to-green-800 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-white/80 text-2xl font-black text-emerald-800 shadow-sm dark:bg-white/15 dark:text-emerald-50">
              {profile.name ? profile.name[0].toUpperCase() : 'U'}
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-800 dark:text-emerald-100">Your account</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-emerald-950 dark:text-white sm:text-3xl">{profile.name || 'Your Profile'}</h2>
              <p className="mt-1 text-sm text-emerald-900/75 dark:text-emerald-100/80">Personal details and nutrition preferences</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => { setProfileEditSnapshot(profile); setProfileError(''); setIsEditingProfile(true); }} className="rounded-xl border border-white/70 bg-white/80 px-4 py-2.5 text-sm font-bold text-emerald-900 shadow-sm transition hover:bg-white dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/20">Edit profile</button>
            <button type="button" onClick={() => setActiveTab('settings')} className="rounded-xl border border-emerald-800/20 bg-emerald-900/10 px-4 py-2.5 text-sm font-bold text-emerald-950 transition hover:bg-emerald-900/15 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20">Settings</button>
            <button type="button" onClick={handleSignOut} className="rounded-xl border border-rose-200 bg-rose-50/90 px-4 py-2.5 text-sm font-bold text-rose-700 transition hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-900/50">Sign out</button>
          </div>
        </div>
      </header>
      <section data-tour-target="profile-clinical-summary" className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 px-5 py-5 dark:border-slate-800 sm:px-6">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300">Personal details</p>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
            <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">Profile overview</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Your saved measurements and health preferences</p>
          </div>
        </div>
        <div className="p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['Gender', profile.gender ? profile.gender.replaceAll('-', ' ').replace(/\b\w/g, character => character.toUpperCase()) : 'Not specified'],
              ['Age', profile.age ? `${profile.age} years` : 'Not specified'],
              ['BMI', bmi || 'Add height and weight'],
              ['Weight', profile.weight ? `${profile.weight} kg` : 'Not specified'],
              ['Height', profile.height ? `${profile.height} cm` : 'Not specified']
            ].map(([label, value]) => (
              <div key={label} className="group min-w-0 rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white p-4 transition-colors hover:border-teal-200 dark:border-slate-700 dark:from-slate-800 dark:to-slate-800/60 dark:hover:border-teal-800">
                <span className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{label}</span>
                <span className="mt-2 block break-words text-base font-extrabold text-slate-900 dark:text-slate-100">{value}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl bg-teal-50/70 p-4 dark:bg-teal-950/25 sm:p-5">
            <div>
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Health conditions</h4>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">Used to personalize food and nutrition guidance.</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {REGISTRATION_CONDITION_OPTIONS.filter(({ key }) => profile.conditions?.[key]).map(({ key, label }) => (
                <span key={key} className="rounded-full border border-teal-200/80 bg-white px-3 py-1.5 text-xs font-bold text-teal-900 dark:border-teal-800 dark:bg-slate-900 dark:text-teal-100">{label}</span>
              ))}
              {(!profile.conditions || profile.conditions.none || !REGISTRATION_CONDITION_OPTIONS.some(({ key }) => profile.conditions[key])) && (
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">None / no known conditions</span>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
