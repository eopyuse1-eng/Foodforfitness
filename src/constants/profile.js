export const DEFAULT_PROFILE = {
  isSetup: false,
  name: 'Kababayan',
  gender: '',
  age: '',
  weight: '',
  height: '',
  activityLevel: '',
  goal: '',
  conditions: {
    diabetes: false,
    hypertension: false,
    gout: false,
    ckd: false,
    pcos: false,
    dyslipidemia: false,
    heartDisease: false,
    gerd: false,
    osteoporosis: false,
    anemia: false,
    none: true
  },
  allergens: [],
  dietaryPrefs: 'None'
};

export function normalizeProfile(profile = {}) {
  return {
    ...DEFAULT_PROFILE,
    ...profile,
    conditions: {
      ...DEFAULT_PROFILE.conditions,
      ...(profile.conditions || {})
    }
  };
}
