const CONDITION_LABELS = {
  diabetes: 'Diabetes',
  hypertension: 'Hypertension',
  gout: 'Gout',
  ckd: 'Kidney health',
  pcos: 'PCOS',
  dyslipidemia: 'Cholesterol'
};

export function getFoodGroup(food) {
  if (['go', 'grow', 'glow'].includes(food.foodGroup)) return food.foodGroup;
  if (['Carbs', 'Noodles'].includes(food.category)) return 'go';
  if (['Pork', 'Beef', 'Chicken', 'Seafood', 'Eggs'].includes(food.category)) return 'grow';
  if (['Veggie', 'Fruit'].includes(food.category)) return 'glow';
  return 'other';
}

function getFoodScore(food, conditions, hasActiveConditions) {
  let conditionScore = 0;
  let generalScore = 0;
  const reasons = [];
  const calories = Number(food.calories) || 0;
  const carbs = Number(food.carbs) || 0;
  const sugar = Number(food.sugar) || 0;
  const sodium = Number(food.sodium) || 0;
  const fat = Number(food.fat) || 0;
  const protein = Number(food.protein) || 0;
  const purines = String(food.purines || '').toLowerCase();
  const group = getFoodGroup(food);

  if (!hasActiveConditions) {
    if (group === 'glow') generalScore += 2;
    if (group === 'grow') generalScore += 1;
    if (calories <= 350) generalScore += 1;
  }

  if (conditions.diabetes) {
    if (carbs <= 10) {
      conditionScore += 10;
      reasons.push('Lower-carb estimate');
    } else if (carbs <= 20) {
      conditionScore += 6;
      reasons.push('Lower-carb estimate');
    } else if (carbs <= 30) {
      conditionScore += 2;
      reasons.push('Moderate carb estimate');
    } else {
      conditionScore -= 6;
    }
    if (sugar <= 10) conditionScore += 2;
    else if (sugar > 15) conditionScore -= 3;
  }
  if (conditions.hypertension) {
    if (sodium <= 250) {
      conditionScore += 10;
      reasons.push('Lower sodium estimate');
    } else if (sodium <= 350) {
      conditionScore += 8;
      reasons.push('Lower sodium estimate');
    } else if (sodium <= 400) {
      conditionScore += 5;
      reasons.push('Moderate sodium estimate');
    } else if (sodium <= 500) {
      conditionScore += 2;
      reasons.push('Moderate sodium estimate');
    } else if (sodium > 700) {
      conditionScore -= 6;
    } else {
      conditionScore -= 3;
    }
    if (sugar > 15) conditionScore -= 12;
  }
  if (conditions.gout) {
    if (purines === 'low') {
      conditionScore += 10;
      reasons.push('Catalog lists low purines');
    } else if (purines === 'medium') {
      conditionScore += 1;
    } else if (purines === 'high') {
      conditionScore -= 8;
    }
  }
  if (conditions.ckd) {
    if (sodium <= 350 && protein <= 12) {
      conditionScore += 7;
      reasons.push('Lower sodium & protein estimates');
    } else if (sodium <= 500 && protein <= 22) {
      conditionScore += 3;
      reasons.push('Moderate sodium & protein estimates');
    }
  }
  if (conditions.pcos) {
    if (carbs <= 10) {
      conditionScore += 10;
      reasons.push('Lower-carb estimate');
    } else if (carbs <= 20) {
      conditionScore += 6;
      reasons.push('Lower-carb estimate');
    } else if (carbs <= 30) {
      conditionScore += 2;
      reasons.push('Moderate carb estimate');
    } else {
      conditionScore -= 6;
    }
    if (sugar <= 10) conditionScore += 2;
    else if (sugar > 15) conditionScore -= 3;
  }
  if (conditions.dyslipidemia) {
    if (fat <= 8) {
      conditionScore += 7;
      reasons.push('Lower fat estimate');
    } else if (fat <= 12) {
      conditionScore += 4;
      reasons.push('Moderate fat estimate');
    } else if (fat > 20) {
      conditionScore -= 5;
    }
  }
  return {
    conditionScore,
    generalScore,
    reason: reasons[0] || (hasActiveConditions ? 'Other option to explore' : 'General pick')
  };
}

export function getActiveConditionLabels(conditions = {}) {
  return Object.keys(CONDITION_LABELS)
    .filter((condition) => conditions[condition])
    .map((condition) => CONDITION_LABELS[condition]);
}

export function getPersonalizedFoodSuggestions(foods, loggedFoodNames, conditions = {}) {
  const activeConditions = getActiveConditionLabels(conditions);
  const rankedFoods = foods
    .filter((food) => !loggedFoodNames.has(food.name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()))
    .map((food, index) => ({
      food,
      index,
      ...getFoodScore(food, conditions, activeConditions.length > 0)
    }))
    .sort((firstFood, secondFood) => (
      secondFood.conditionScore - firstFood.conditionScore
      || secondFood.generalScore - firstFood.generalScore
      || firstFood.index - secondFood.index
    ));

  const selectedFoods = [];
  const categoryCounts = new Map();
  while (rankedFoods.length > 0 && selectedFoods.length < 10) {
    const nextIndex = rankedFoods.findIndex(({ food }) => (categoryCounts.get(food.category) || 0) < 2);
    const [nextFood] = rankedFoods.splice(nextIndex < 0 ? 0 : nextIndex, 1);
    selectedFoods.push(nextFood);
    categoryCounts.set(nextFood.food.category, (categoryCounts.get(nextFood.food.category) || 0) + 1);
  }

  return selectedFoods;
}
