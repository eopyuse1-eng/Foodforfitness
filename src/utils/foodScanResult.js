const FOOD_GROUPS = new Set(['go', 'grow', 'glow']);
const DISH_TYPES = new Set(['salad', 'appetizer', 'main-dish', 'side-dish']);
const SCAN_STATUSES = new Set(['raw_ingredients', 'not_raw_ingredients', 'uncertain']);
const MAX_COMPONENTS = 6;
const MAX_TEXT_LENGTH = 160;

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requiredText(value, fieldName) {
  if (typeof value !== 'string' || !value.trim() || value.length > MAX_TEXT_LENGTH) {
    throw new Error(`The scan result has an invalid ${fieldName}. Please scan again.`);
  }
  return value.trim();
}

function requiredNonNegativeNumber(value, fieldName) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`The scan result has an invalid ${fieldName}. Please scan again.`);
  }
  return value;
}

function parseAmountUnit(value, estimatedAmount) {
  if (typeof value === 'string' && value.trim() && value.length <= MAX_TEXT_LENGTH) {
    return { amountUnit: value.trim(), needsConfirmation: false };
  }
  return {
    amountUnit: estimatedAmount === null ? 'amount unclear' : 'unit unclear',
    needsConfirmation: true
  };
}

function getNameTokens(value) {
  return value.toLowerCase().match(/[a-z0-9]+/g) || [];
}

function parseComponent(component) {
  if (!isRecord(component)) {
    throw new Error('The scan result contains an invalid recipe component.');
  }

  const estimatedAmount = component.estimatedAmount === null
    ? null
    : requiredNonNegativeNumber(component.estimatedAmount, 'component amount');
  const parsedUnit = parseAmountUnit(component.amountUnit ?? component.unit, estimatedAmount);

  return {
    name: requiredText(component.name, 'component name'),
    estimatedAmount,
    amountUnit: parsedUnit.amountUnit,
    caloriesKcal: requiredNonNegativeNumber(component.caloriesKcal, 'component calories'),
    calorieBasis: requiredText(component.calorieBasis, 'component calorie basis'),
    needsConfirmation: component.needsConfirmation === true
      || estimatedAmount === null
      || parsedUnit.needsConfirmation
  };
}

function parseDetectedIngredient(ingredient) {
  if (!isRecord(ingredient)) {
    throw new Error('The scan result contains an invalid ingredient.');
  }
  if (typeof ingredient.confidence !== 'number'
    || !Number.isFinite(ingredient.confidence)
    || ingredient.confidence < 0
    || ingredient.confidence > 1) {
    throw new Error('The scan result contains an invalid ingredient confidence.');
  }

  const estimatedAmount = ingredient.estimatedAmount === null
    ? null
    : requiredNonNegativeNumber(ingredient.estimatedAmount, 'ingredient amount');
  const parsedUnit = parseAmountUnit(ingredient.amountUnit, estimatedAmount);

  return {
    name: requiredText(ingredient.name, 'ingredient name'),
    confidence: ingredient.confidence,
    estimatedAmount,
    amountUnit: parsedUnit.amountUnit,
    caloriesKcal: requiredNonNegativeNumber(ingredient.caloriesKcal, 'ingredient calories'),
    calorieBasis: requiredText(ingredient.calorieBasis, 'ingredient calorie basis'),
    needsConfirmation: ingredient.needsConfirmation === true
      || estimatedAmount === null
      || parsedUnit.needsConfirmation
  };
}

function parseRecommendation(recommendation, catalogById) {
  if (!isRecord(recommendation) || !FOOD_GROUPS.has(recommendation.foodGroup)) {
    throw new Error('The scan result contains an invalid dietary food recommendation.');
  }
  const catalogFood = catalogById.get(recommendation.catalogFoodId);
  if (!catalogFood
    || catalogFood.foodGroup !== recommendation.foodGroup
    || catalogFood.name !== recommendation.name
    || catalogFood.dishType !== recommendation.dishType) {
    throw new Error('The scan returned a food outside the reviewed dietary catalog. Please scan again.');
  }
  if (!Array.isArray(recommendation.components)
    || recommendation.components.length === 0
    || recommendation.components.length > MAX_COMPONENTS) {
    throw new Error('A recommended food is missing its ingredient calorie breakdown.');
  }

  const components = recommendation.components.map(parseComponent);
  const caloriesPerServing = requiredNonNegativeNumber(
    recommendation.caloriesPerServing,
    'serving calories'
  );
  const componentCalories = components.reduce((total, component) => total + component.caloriesKcal, 0);
  if (Math.abs(componentCalories - caloriesPerServing) > Math.max(10, caloriesPerServing * 0.1)) {
    throw new Error('A recommended food has inconsistent component and serving calorie estimates. Please scan again.');
  }

  return {
    catalogFoodId: catalogFood.id,
    name: catalogFood.name,
    emoji: catalogFood.emoji,
    foodGroup: catalogFood.foodGroup,
    dishType: catalogFood.dishType,
    serving: requiredText(recommendation.serving, 'recommended serving'),
    caloriesPerServing,
    components,
    needsConfirmation: recommendation.needsConfirmation === true
      || components.some((component) => component.needsConfirmation)
  };
}

function extractJsonObject(responseText) {
  try {
    return JSON.parse(responseText);
  } catch {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('The AI returned an unreadable scan result. Please try again.');
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error('The AI returned invalid scan data. Please try again.');
    }
  }
}

export function parseRawIngredientScanResult(responseText, dietaryFoods) {
  const result = extractJsonObject(responseText);
  if (!isRecord(result) || !SCAN_STATUSES.has(result.status)) {
    throw new Error('The AI returned an invalid scan status. Please try again.');
  }
  if (result.status !== 'raw_ingredients') {
    return {
      status: result.status,
      message: typeof result.message === 'string' && result.message.trim()
        ? result.message.trim().slice(0, MAX_TEXT_LENGTH)
        : 'I-scan lang ang larawan ng hilaw na ingredients o raw materials. Hindi ako nagre-recommend mula sa larawan ng lutong pagkain.'
    };
  }
  if (!Array.isArray(result.ingredients) || result.ingredients.length === 0) {
    throw new Error('Walang malinaw na raw ingredients sa larawan. Subukang kumuha ng mas malinaw na larawan.');
  }
  if (!Array.isArray(result.recommendations) || result.recommendations.length !== FOOD_GROUPS.size) {
    throw new Error('Hindi kumpleto ang Go, Grow, at Glow recommendations. Pakisubukan ulit.');
  }

  const catalogById = new Map(
    dietaryFoods
      .filter((food) => food.isDietary === true && FOOD_GROUPS.has(food.foodGroup) && DISH_TYPES.has(food.dishType))
      .map((food) => [food.id, food])
  );
  const ingredients = result.ingredients.map(parseDetectedIngredient);
  const recommendations = result.recommendations.map((recommendation) => (
    parseRecommendation(recommendation, catalogById)
  ));
  const detectedIngredientTokens = ingredients.map((ingredient) => new Set(getNameTokens(ingredient.name)));
  if (recommendations.some((recommendation) => !recommendation.components.some((component) => {
    const componentTokens = getNameTokens(component.name);
    return detectedIngredientTokens.some((ingredientTokens) => (
      componentTokens.some((token) => token.length >= 3 && ingredientTokens.has(token))
    ));
  }))) {
    throw new Error('Each recommendation must include at least one ingredient detected in the photo. Please scan again.');
  }
  const recommendationGroups = new Set(recommendations.map(({ foodGroup }) => foodGroup));
  if (recommendationGroups.size !== FOOD_GROUPS.size) {
    const error = new Error('The scan must provide one recommendation each for Go, Grow, and Glow.');
    error.code = 'INCOMPLETE_FOOD_GROUPS';
    throw error;
  }

  return { status: result.status, ingredients, recommendations };
}
