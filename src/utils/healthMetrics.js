export function normalizeGlucoseReading(value) {
  const match = String(value).trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
  if (!match) return null;

  const lowerValue = Number(match[1]);
  const upperValue = match[2] ? Number(match[2]) : lowerValue;
  if (!Number.isFinite(lowerValue) || !Number.isFinite(upperValue) || lowerValue <= 0 || upperValue < lowerValue) {
    return null;
  }

  return match[2] ? `${lowerValue}-${upperValue}` : String(lowerValue);
}

export function calculateTargets(profile) {
  const conditions = profile.conditions || {};
  let cal = 2000;
  let sugar = 50;
  let sodium = 2300;
  let protein = 110;
  let carbs = 250;
  let fat = 65;

  if (conditions.diabetes) sugar = 25;
  if (conditions.hypertension) sodium = 1500;
  if (conditions.ckd) { protein = 55; sodium = 1500; }
  if (conditions.dyslipidemia || conditions.heartDisease) fat = 45;
  if (conditions.pcos) { sugar = 20; carbs = 180; }
  if (conditions.osteoporosis) protein = 90;

  if (profile.weight && profile.height && profile.age) {
    let bmr = (10 * parseFloat(profile.weight)) + (6.25 * parseFloat(profile.height)) - (5 * parseFloat(profile.age)) + 5;
    if (profile.activityLevel === 'light') bmr *= 1.375;
    else if (profile.activityLevel === 'moderate') bmr *= 1.55;
    else if (profile.activityLevel === 'active') bmr *= 1.725;
    else bmr *= 1.2;

    if (profile.goal === 'lose') bmr -= 500;
    else if (profile.goal === 'gain') bmr += 400;
    cal = Math.round(bmr);
  }

  return { cal, sugar, sodium, protein, carbs, fat };
}

export const MICRONUTRIENT_DATA_VERSION = 2;

const MICRONUTRIENT_KEYS = [
  'fiber',
  'calcium',
  'iron',
  'potassium',
  'vitaminA',
  'vitaminC',
  'vitaminD',
  'vitaminB12',
  'folate',
  'magnesium',
  'sodium'
];

function createMicronutrientCoverage() {
  return Object.fromEntries(MICRONUTRIENT_KEYS.map((nutrient) => [
    nutrient,
    { known: 0, total: 0 }
  ]));
}

export function refreshFoodLogMicronutrients(log, foodCatalog) {
  const foodsById = new Map(foodCatalog.map((food) => [String(food.id), food]));
  const foodsByName = new Map(
    foodCatalog.map((food) => [
      String(food.name).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(),
      food
    ])
  );

  return log.map((item) => {
    const food = foodsById.get(String(item.catalogFoodId))
      || foodsByName.get(String(item.name).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim());
    if (!food) {
      return {
        ...item,
        micronutrients: Object.fromEntries(MICRONUTRIENT_KEYS.map((nutrient) => [nutrient, null])),
        micronutrientDataVersion: MICRONUTRIENT_DATA_VERSION
      };
    }

    const servingCount = Number(item.recordedServing);
    const multiplier = Number.isSafeInteger(servingCount) && servingCount > 0 ? servingCount : 1;
    return {
      ...item,
      micronutrients: scaleNutrients(food.micronutrients, multiplier),
      micronutrientDataVersion: MICRONUTRIENT_DATA_VERSION
    };
  });
}

export function calculateTotals(log) {
  return log.reduce((acc, item) => {
    const hasCurrentMicronutrientData = item.micronutrientDataVersion === MICRONUTRIENT_DATA_VERSION;
    const micronutrients = item.micronutrients || {};
    const micronutrientTotals = { ...acc.micronutrients };
    const micronutrientCoverage = { ...acc.micronutrientCoverage };

    MICRONUTRIENT_KEYS.forEach((nutrient) => {
      const value = hasCurrentMicronutrientData ? micronutrients[nutrient] : null;
      const isKnownValue = value !== null && value !== undefined && Number.isFinite(Number(value));
      const currentCoverage = micronutrientCoverage[nutrient];
      micronutrientCoverage[nutrient] = {
        known: currentCoverage.known + Number(isKnownValue),
        total: currentCoverage.total + 1
      };
      if (isKnownValue) micronutrientTotals[nutrient] += Number(value);
    });

    return {
      calories: acc.calories + (item.calories || 0),
      protein: acc.protein + (item.protein || 0),
      carbs: acc.carbs + (item.carbs || 0),
      fat: acc.fat + (item.fat || 0),
      sugar: acc.sugar + (item.sugar || 0),
      sodium: acc.sodium + (item.sodium ?? (hasCurrentMicronutrientData ? micronutrients.sodium : 0) ?? 0),
      micronutrients: micronutrientTotals,
      micronutrientCoverage
    };
  }, {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    sugar: 0,
    sodium: 0,
    micronutrients: {
      fiber: 0,
      calcium: 0,
      iron: 0,
      potassium: 0,
      vitaminA: 0,
      vitaminC: 0,
      vitaminD: 0,
      vitaminB12: 0,
      folate: 0,
      magnesium: 0,
      sodium: 0
    },
    micronutrientCoverage: createMicronutrientCoverage()
  });
}

export function scaleNutrients(nutrients = {}, multiplier = 1) {
  return Object.fromEntries(
    Object.entries(nutrients).map(([nutrient, value]) => [
      nutrient,
      value === null || value === undefined || !Number.isFinite(Number(value))
        ? null
        : Math.round(Number(value) * multiplier * 10) / 10
    ])
  );
}

export function getFoodLogDate(item) {
  if (item.date) return String(item.date).slice(0, 10);
  if (!item.timestamp) return '';
  const date = new Date(item.timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function summarizeFoodLogByDate(log, days = 7, referenceDate = new Date()) {
  const reference = new Date(referenceDate);
  reference.setHours(0, 0, 0, 0);

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(reference);
    date.setDate(reference.getDate() - (days - index - 1));
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const dailyItems = log.filter((item) => getFoodLogDate(item) === dateKey);

    return {
      date: dateKey,
      label: date.toLocaleDateString([], { weekday: 'short' }),
      totals: calculateTotals(dailyItems),
      itemCount: dailyItems.length
    };
  });
}

export function summarizeFoodLogForPeriod(log, days, referenceDate = new Date()) {
  const summaries = summarizeFoodLogByDate(log, days, referenceDate);
  return summaries.reduce((periodTotals, summary) => ({
    calories: periodTotals.calories + summary.totals.calories,
    protein: periodTotals.protein + summary.totals.protein,
    carbs: periodTotals.carbs + summary.totals.carbs,
    fat: periodTotals.fat + summary.totals.fat,
    sugar: periodTotals.sugar + summary.totals.sugar,
    sodium: periodTotals.sodium + summary.totals.sodium,
    micronutrients: Object.keys(periodTotals.micronutrients).reduce((nutrientTotals, nutrient) => ({
      ...nutrientTotals,
      [nutrient]: nutrientTotals[nutrient] + summary.totals.micronutrients[nutrient]
    }), periodTotals.micronutrients),
    micronutrientCoverage: Object.keys(periodTotals.micronutrientCoverage).reduce((coverageTotals, nutrient) => ({
      ...coverageTotals,
      [nutrient]: {
        known: coverageTotals[nutrient].known + summary.totals.micronutrientCoverage[nutrient].known,
        total: coverageTotals[nutrient].total + summary.totals.micronutrientCoverage[nutrient].total
      }
    }), periodTotals.micronutrientCoverage)
  }), {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    sugar: 0,
    sodium: 0,
    micronutrients: {
      fiber: 0,
      calcium: 0,
      iron: 0,
      potassium: 0,
      vitaminA: 0,
      vitaminC: 0,
      vitaminD: 0,
      vitaminB12: 0,
      folate: 0,
      magnesium: 0,
      sodium: 0
    },
    micronutrientCoverage: createMicronutrientCoverage()
  });
}

export function calculateBmi(profile) {
  if (!profile.weight || !profile.height) return 0;
  const heightInMeters = parseFloat(profile.height) / 100;
  return (parseFloat(profile.weight) / (heightInMeters * heightInMeters)).toFixed(1);
}

export function getBmiCategory(bmi, age) {
  const numericBmi = Number(bmi);
  if (!Number.isFinite(numericBmi) || numericBmi <= 0) return null;
  if (Number(age) > 0 && Number(age) < 20) {
    return {
      label: 'BMI-for-age needed',
      range: 'Adult BMI ranges do not apply under age 20.'
    };
  }
  if (numericBmi < 18.5) return { label: 'Underweight', range: 'Below 18.5' };
  if (numericBmi < 25) return { label: 'Healthy range', range: '18.5–24.9' };
  if (numericBmi < 30) return { label: 'Overweight', range: '25.0–29.9' };
  return { label: 'Obesity range', range: '30.0 and above' };
}
