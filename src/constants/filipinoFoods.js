const rawFilipinoFoods = [
  // Pork Dishes
  { id: 1, name: "Pork Adobo", calories: 350, serving: "1 cup", category: "Pork", emoji: "🍲", allergens: ["Soy", "Garlic"], vitamins: ["Iron", "B6"], purines: "high" },
  { id: 6, name: "Lechon Kawali", calories: 450, serving: "100g", category: "Pork", emoji: "🥓", allergens: [], vitamins: ["Zinc"], purines: "high" },
  { id: 8, name: "Sisig (Pork)", calories: 400, serving: "1/2 cup", category: "Pork", emoji: "🍳", allergens: ["Pork", "Mayonnaise"], vitamins: ["Iron"], purines: "high" },
  { id: 12, name: "Pork Tocino", calories: 310, serving: "100g", category: "Pork", emoji: "🥓", allergens: [], vitamins: ["Sodium"], purines: "high" },
  { id: 38, name: "Bicol Express", calories: 390, serving: "1 cup", category: "Pork", emoji: "🌶️", allergens: ["Shrimp Paste"], vitamins: ["Capsaicin", "B6"], purines: "high" },
  { id: 40, name: "Dinuguan (Pork Blood Stew)", calories: 360, serving: "1 cup", category: "Pork", emoji: "🍲", allergens: ["Pork"], vitamins: ["Iron", "Protein"], purines: "high" },
  { id: 43, name: "Pork Mechado", calories: 340, serving: "1 cup", category: "Pork", emoji: "🍲", allergens: ["Soy", "Tomato"], vitamins: ["Vitamin C", "B12"], purines: "high" },
  { id: 45, name: "Pork Menudo", calories: 330, serving: "1 cup", category: "Pork", emoji: "🥘", allergens: ["Liver", "Soy"], vitamins: ["Vitamin A", "Iron"], purines: "high" },
  { id: 47, name: "Pork Afritada", calories: 310, serving: "1 cup", category: "Pork", emoji: "🍲", allergens: ["Tomato"], vitamins: ["Vitamin A", "C"], purines: "medium" },
  { id: 50, name: "Lumpia Shanghai", calories: 290, serving: "4 rolls", category: "Pork", emoji: "🥢", allergens: ["Wheat", "Egg"], vitamins: ["Protein"], purines: "medium" },
  { id: 57, name: "Chicharon Bulaklak", calories: 480, serving: "100g", category: "Pork", emoji: "🥓", allergens: ["Deep Fried"], vitamins: ["Fat"], purines: "high" },
  { id: 58, name: "Chicharon Baboy", calories: 540, serving: "100g", category: "Pork", emoji: "🥓", allergens: ["Sodium"], vitamins: ["Sodium"], purines: "high" },
  { id: 63, name: "Igado (Ilocano Pork Liver)", calories: 370, serving: "1 cup", category: "Pork", emoji: "🍲", allergens: ["Organ Meat", "Soy"], vitamins: ["Iron", "Vitamin A"], purines: "high" },
  { id: 64, name: "Dinakdakan", calories: 420, serving: "1 cup", category: "Pork", emoji: "🥩", allergens: ["Pork", "Mayonnaise"], vitamins: ["B12"], purines: "high" },
  { id: 65, name: "Bagnet (Crispy Pork Belly)", calories: 510, serving: "100g", category: "Pork", emoji: "🥓", allergens: [], vitamins: ["Zinc"], purines: "high" },
  { id: 85, name: "Pork Asado", calories: 360, serving: "1 cup", category: "Pork", emoji: "🍖", allergens: ["Soy", "Star Anise"], vitamins: ["Protein"], purines: "high" },
  { id: 86, name: "Pork Hamonado", calories: 380, serving: "1 cup", category: "Pork", emoji: "🍖", allergens: ["Pineapple Sugar"], vitamins: ["Vitamin C"], purines: "high" },
  { id: 89, name: "Nilagang Baboy", calories: 320, serving: "1 bowl", category: "Pork", emoji: "🥣", allergens: [], vitamins: ["Potassium", "B12"], purines: "medium" },
  { id: 97, name: "Inihaw na Liempo", calories: 430, serving: "1 slice", category: "Pork", emoji: "🥩", allergens: ["Soy"], vitamins: ["Protein", "B6"], purines: "high" },

  // Beef Dishes
  { id: 7, name: "Kare-Kare (Beef)", calories: 420, serving: "1 cup", category: "Beef", emoji: "🍲", allergens: ["Peanuts", "Shrimp Paste"], vitamins: ["Calcium", "Vitamin A"], purines: "high" },
  { id: 11, name: "Beef Tapa", calories: 250, serving: "100g", category: "Beef", emoji: "🥩", allergens: ["Soy"], vitamins: ["Iron", "Protein"], purines: "high" },
  { id: 41, name: "Beef Kaldereta", calories: 440, serving: "1 cup", category: "Beef", emoji: "🥘", allergens: ["Cheese", "Liver Spread"], vitamins: ["Iron", "Vitamin A"], purines: "high" },
  { id: 44, name: "Beef Mechado", calories: 370, serving: "1 cup", category: "Beef", emoji: "🍲", allergens: ["Soy"], vitamins: ["Iron", "Zinc"], purines: "high" },
  { id: 48, name: "Bulalo (Beef Shank Soup)", calories: 460, serving: "1 bowl", category: "Beef", emoji: "🥣", allergens: [], vitamins: ["Collagen", "Iron", "Zinc"], purines: "high" },
  { id: 54, name: "Goto (Beef Tripe Porridge)", calories: 280, serving: "1 bowl", category: "Beef", emoji: "🥣", allergens: ["Organ Meat", "Garlic"], vitamins: ["Iron"], purines: "high" },
  { id: 87, name: "Beef Morcon", calories: 410, serving: "1 slice", category: "Beef", emoji: "🥩", allergens: ["Eggs", "Cheese"], vitamins: ["Iron", "B12"], purines: "high" },
  { id: 88, name: "Nilagang Baka", calories: 330, serving: "1 bowl", category: "Beef", emoji: "🥣", allergens: [], vitamins: ["Potassium", "Iron"], purines: "medium" },
  { id: 90, name: "Pochero (Beef Stew)", calories: 390, serving: "1 bowl", category: "Beef", emoji: "🍲", allergens: [], vitamins: ["Vitamin A", "Fiber"], purines: "high" },

  // Chicken Dishes
  { id: 2, name: "Chicken Adobo", calories: 300, serving: "1 cup", category: "Chicken", emoji: "🍗", allergens: ["Soy"], vitamins: ["Niacin", "B12"], purines: "medium" },
  { id: 16, name: "Tinolang Manok", calories: 210, serving: "1 bowl", category: "Chicken", emoji: "🍲", allergens: ["Ginger"], vitamins: ["Vitamin B6", "Niacin"], purines: "medium" },
  { id: 26, name: "Chicken Tocino", calories: 260, serving: "100g", category: "Chicken", emoji: "🍗", allergens: [], vitamins: ["Protein"], purines: "medium" },
  { id: 42, name: "Chicken Kaldereta", calories: 350, serving: "1 cup", category: "Chicken", emoji: "🥘", allergens: ["Tomato"], vitamins: ["Vitamin A"], purines: "medium" },
  { id: 46, name: "Chicken Afritada", calories: 280, serving: "1 cup", category: "Chicken", emoji: "🍲", allergens: ["Tomato"], vitamins: ["Vitamin C"], purines: "medium" },
  { id: 53, name: "Arroz Caldo (Chicken)", calories: 260, serving: "1 bowl", category: "Chicken", emoji: "🥣", allergens: ["Garlic", "Ginger"], vitamins: ["B6", "Selenium"], purines: "medium" },
  { id: 60, name: "Chicken Inasal (Bacolod)", calories: 320, serving: "1 quarter", category: "Chicken", emoji: "🍗", allergens: ["Annatto Oil"], vitamins: ["Niacin", "Protein"], purines: "medium" },
  { id: 61, name: "Lechon Manok (Roasted)", calories: 290, serving: "1/4 chicken", category: "Chicken", emoji: "🍗", allergens: [], vitamins: ["B6", "Protein"], purines: "medium" },

  // Seafood Dishes
  { id: 4, name: "Sinigang na Hipon", calories: 210, serving: "1 bowl", category: "Seafood", emoji: "🦐", allergens: ["Shellfish"], vitamins: ["Selenium", "B12"], purines: "high" },
  { id: 13, name: "Bangus Inihaw", calories: 220, serving: "1/2 fish", category: "Seafood", emoji: "🐟", allergens: ["Fish"], vitamins: ["Omega-3", "Vitamin D"], purines: "high" },
  { id: 31, name: "Daing na Bangus", calories: 240, serving: "1 fillet", category: "Seafood", emoji: "🐟", allergens: ["Fish", "Garlic"], vitamins: ["Omega-3"], purines: "high" },
  { id: 32, name: "Rellenong Bangus", calories: 310, serving: "1 slice", category: "Seafood", emoji: "🐟", allergens: ["Fish", "Eggs"], vitamins: ["Protein", "Vitamin D"], purines: "high" },
  { id: 49, name: "Ukoy (Shrimp Fritters)", calories: 260, serving: "2 pieces", category: "Seafood", emoji: "🦐", allergens: ["Shellfish", "Wheat"], vitamins: ["Calcium"], purines: "high" },
  { id: 59, name: "Kinilaw na Tanigue", calories: 180, serving: "1 cup", category: "Seafood", emoji: "🥗", allergens: ["Raw Fish"], vitamins: ["Vitamin C", "Omega-3"], purines: "high" },
  { id: 62, name: "Pinangat na Isda", calories: 160, serving: "1 cup", category: "Seafood", emoji: "🐟", allergens: ["Fish"], vitamins: ["Potassium"], purines: "medium" },
  { id: 67, name: "Ginataang Tilapia", calories: 270, serving: "1 fish", category: "Seafood", emoji: "🐟", allergens: ["Fish", "Coconut"], vitamins: ["Healthy Fats", "B12"], purines: "medium" },
  { id: 84, name: "Escabeche (Sweet & Sour Fish)", calories: 290, serving: "1 slice", category: "Seafood", emoji: "🐟", allergens: ["Fish"], vitamins: ["Vitamin C"], purines: "medium" },
  { id: 96, name: "Pesang Isda", calories: 190, serving: "1 bowl", category: "Seafood", emoji: "🥣", allergens: ["Fish", "Ginger"], vitamins: ["Potassium"], purines: "medium" },
  { id: 98, name: "Inihaw na Pusit", calories: 200, serving: "1 squid", category: "Seafood", emoji: "🦑", allergens: ["Mollusks"], vitamins: ["Copper", "B12"], purines: "high" },

  // Vegetable Dishes
  { id: 10, name: "Pinakbet Tagalog", calories: 120, serving: "1 cup", category: "Veggie", emoji: "🥗", allergens: ["Shrimp Paste"], vitamins: ["Vitamin A", "Fiber", "Potassium"], purines: "low" },
  { id: 14, name: "Tortang Talong", calories: 180, serving: "1 piece", category: "Veggie", emoji: "🍆", allergens: ["Eggs"], vitamins: ["Fiber", "Antioxidants"], purines: "low" },
  { id: 22, name: "Pinakbet Ilocano", calories: 110, serving: "1 cup", category: "Veggie", emoji: "🥗", allergens: ["Fish Sauce"], vitamins: ["Fiber", "Vitamin C"], purines: "low" },
  { id: 39, name: "Laing (Taro Leaves in Coconut)", calories: 230, serving: "1 cup", category: "Veggie", emoji: "🥬", allergens: ["Coconut", "Shrimp Paste"], vitamins: ["Vitamin A", "Calcium", "Fiber"], purines: "low" },
  { id: 51, name: "Lumpiang Sariwa (Fresh)", calories: 210, serving: "1 roll", category: "Veggie", emoji: "🌯", allergens: ["Peanuts", "Soy"], vitamins: ["Fiber", "Vitamin A"], purines: "low" },
  { id: 52, name: "Lumpiang Togue", calories: 170, serving: "2 pieces", category: "Veggie", emoji: "🥢", allergens: ["Soy"], vitamins: ["Folate", "Fiber"], purines: "low", nutrition: { protein: 6, carbs: 27, fat: 4, sugar: 3, sodium: 330, micronutrients: { fiber: 3.5, calcium: 35, iron: 1.4, potassium: 210, vitaminA: 20, vitaminC: 8, vitaminD: 0, vitaminB12: 0, folate: 45, magnesium: 20, sodium: 330 } } },
  { id: 66, name: "Ginataang Kalabasa at Sitaw", calories: 190, serving: "1 cup", category: "Veggie", emoji: "🎃", allergens: ["Coconut"], vitamins: ["Vitamin A", "Fiber"], purines: "low" },
  { id: 68, name: "Ginataang Langka (Jackfruit)", calories: 210, serving: "1 cup", category: "Veggie", emoji: "🥥", allergens: ["Coconut"], vitamins: ["Fiber", "Potassium"], purines: "low" },
  { id: 91, name: "Suam na Corn (Corn Soup)", calories: 160, serving: "1 bowl", category: "Veggie", emoji: "🌽", allergens: [], vitamins: ["Fiber", "Thiamin"], purines: "low" },
  { id: 92, name: "Ginisang Sayote", calories: 110, serving: "1 cup", category: "Veggie", emoji: "🥗", allergens: [], vitamins: ["Vitamin C", "Folate"], purines: "low" },
  { id: 93, name: "Ginisang Ampalaya with Egg", calories: 140, serving: "1 cup", category: "Veggie", emoji: "🥒", allergens: ["Eggs"], vitamins: ["Charantin", "Vitamin C"], purines: "low" },
  { id: 94, name: "Adobong Sitaw", calories: 130, serving: "1 cup", category: "Veggie", emoji: "🌱", allergens: ["Soy"], vitamins: ["Fiber", "Vitamin A"], purines: "low" },
  { id: 95, name: "Adobong Kangkong", calories: 100, serving: "1 cup", category: "Veggie", emoji: "🥬", allergens: ["Soy", "Garlic"], vitamins: ["Iron", "Vitamin A"], purines: "low" },

  // Soups & Stews
  { id: 3, name: "Sinigang na Baboy", calories: 320, serving: "1 bowl", category: "Soup", emoji: "🥣", allergens: ["Fish Sauce"], vitamins: ["Vitamin C", "Potassium"], purines: "medium" },
  { id: 15, name: "Ginisang Munggo", calories: 190, serving: "1 cup", category: "Soup", emoji: "🍲", allergens: ["Shrimp"], vitamins: ["Folate", "Fiber"], purines: "medium" },
  { id: 21, name: "Sotanghon Soup", calories: 220, serving: "1 bowl", category: "Soup", emoji: "🍜", allergens: [], vitamins: ["Sodium"], purines: "low" },
  { id: 81, name: "La Paz Batchoy", calories: 380, serving: "1 bowl", category: "Soup", emoji: "🍜", allergens: ["Pork Organ", "Egg", "Wheat"], vitamins: ["Iron", "Protein"], purines: "high" },

  // Carbs & Rice
  // Cooked 1-cup rice micronutrients are portion-scaled from USDA FoodData Central SR Legacy entries 168878 and 169704.
  { id: 109, name: "White Rice (Kanin)", calories: 205, serving: "1 cup", category: "Carbs", emoji: "🍚", allergens: [], vitamins: ["Thiamin", "Folate"], purines: "low", nutrition: { protein: 4, carbs: 45, fat: 0.4, sugar: 0.1, sodium: 2, micronutrients: { fiber: 0.6, calcium: 16, iron: 1.9, potassium: 55, vitaminA: 0, vitaminC: 0, vitaminD: 0, vitaminB12: 0, folate: 153, magnesium: 19, sodium: 2 } } },
  { id: 5, name: "Garlic Fried Rice (Sinangag)", calories: 250, serving: "1 cup", category: "Carbs", emoji: "🧄", allergens: ["Garlic"], vitamins: ["Selenium"], purines: "low" },
  { id: 27, name: "Longganisa Vigan", calories: 310, serving: "2 links", category: "Carbs", emoji: "🌭", allergens: ["Garlic"], vitamins: ["Iron"], purines: "high" },
  { id: 28, name: "Longganisa Lucban", calories: 290, serving: "2 links", category: "Carbs", emoji: "🌭", allergens: ["Garlic", "Oregano"], vitamins: ["Protein"], purines: "high" },
  { id: 29, name: "Longganisa Sweet Pampanga", calories: 340, serving: "2 links", category: "Carbs", emoji: "🌭", allergens: ["Sugar"], vitamins: ["Sodium"], purines: "high" },
  { id: 55, name: "Lugaw with Egg", calories: 180, serving: "1 bowl", category: "Carbs", emoji: "🥣", allergens: ["Eggs"], vitamins: ["Protein", "Choline"], purines: "low" },
  { id: 56, name: "Champorado", calories: 290, serving: "1 bowl", category: "Carbs", emoji: "🥣", allergens: ["Milk"], vitamins: ["Iron", "Antioxidants"], purines: "low" },

  // Noodles
  { id: 9, name: "Pancit Canton", calories: 280, serving: "1 cup", category: "Noodles", emoji: "🍜", allergens: ["Wheat", "Soy"], vitamins: ["Sodium", "Iron"], purines: "low" },
  { id: 17, name: "Pancit Bihon", calories: 230, serving: "1 cup", category: "Noodles", emoji: "🍜", allergens: ["Soy"], vitamins: ["Fiber"], purines: "low" },
  { id: 18, name: "Pancit Malabon", calories: 340, serving: "1 cup", category: "Noodles", emoji: "🍜", allergens: ["Shrimp Paste", "Eggs"], vitamins: ["Protein", "Calcium"], purines: "high" },
  { id: 19, name: "Pancit Palabok", calories: 320, serving: "1 cup", category: "Noodles", emoji: "🍝", allergens: ["Shrimp", "Eggs", "Tinapa"], vitamins: ["Vitamin A"], purines: "high" },
  { id: 20, name: "Pancit Habhab", calories: 260, serving: "1 cup", category: "Noodles", emoji: "🍜", allergens: ["Wheat"], vitamins: ["Fiber"], purines: "low" },

  // Street Food & Snacks
  { id: 34, name: "Tortang Giniling", calories: 290, serving: "1 patty", category: "Snack", emoji: "🍳", allergens: ["Eggs"], vitamins: ["Protein", "Iron"], purines: "high" },
  { id: 82, name: "Ilocos Empanada", calories: 340, serving: "1 piece", category: "Snack", emoji: "🥟", allergens: ["Eggs", "Deep Fried"], vitamins: ["Vitamin A"], purines: "medium" },
  { id: 83, name: "Tokwa't Baboy", calories: 270, serving: "1 cup", category: "Snack", emoji: "🍢", allergens: ["Soy", "Pork"], vitamins: ["Isoflavones", "Protein"], purines: "high" },
  { id: 99, name: "Inasal na Isaw (Pork/Chicken Intestine)", calories: 210, serving: "2 skewers", category: "Snack", emoji: "🍢", allergens: ["Organ Meat"], vitamins: ["Iron"], purines: "high" },
  { id: 100, name: "Kwek-Kwek", calories: 240, serving: "4 pieces", category: "Snack", emoji: "🍡", allergens: ["Eggs", "Wheat"], vitamins: ["Protein", "Choline"], purines: "medium" },
  { id: 101, name: "Fish Balls with Sweet Chili Sauce", calories: 180, serving: "10 pieces", category: "Snack", emoji: "🍡", allergens: ["Fish", "Wheat"], vitamins: ["Sodium"], purines: "medium" },
  { id: 102, name: "Kikiam", calories: 210, serving: "5 pieces", category: "Snack", emoji: "🍢", allergens: ["Pork", "Fish", "Wheat"], vitamins: ["Protein"], purines: "medium" },

  // Desserts & Kakanin
  { id: 170, name: "Halo-Halo", calories: 350, serving: "1 glass", category: "Dessert", emoji: "🍧", allergens: ["Milk", "Beans"], vitamins: ["Calcium"], purines: "low" },
  { id: 69, name: "Puto (Steamed Rice Cake)", calories: 130, serving: "2 pieces", category: "Dessert", emoji: "🧁", allergens: ["Dairy"], vitamins: ["Carbs"], purines: "low" },
  { id: 70, name: "Kutsinta with Coconut", calories: 140, serving: "2 pieces", category: "Dessert", emoji: "🍮", allergens: ["Lye Water"], vitamins: ["Carbs"], purines: "low" },
  { id: 71, name: "Bibingka (Salted Egg & Cheese)", calories: 310, serving: "1 slice", category: "Dessert", emoji: "🥧", allergens: ["Eggs", "Milk", "Coconut"], vitamins: ["Calcium", "Protein"], purines: "low" },
  { id: 72, name: "Puto Bumbong", calories: 220, serving: "2 pieces", category: "Dessert", emoji: "🍠", allergens: ["Margarine", "Coconut"], vitamins: ["Fiber"], purines: "low" },
  { id: 73, name: "Biko (Sticky Rice Cake)", calories: 280, serving: "1 slice", category: "Dessert", emoji: "🍚", allergens: ["Coconut"], vitamins: ["Carbs"], purines: "low" },
  { id: 74, name: "Sapin-Sapin", calories: 240, serving: "1 slice", category: "Dessert", emoji: "🍰", allergens: ["Coconut"], vitamins: ["Carbs"], purines: "low" },
  { id: 75, name: "Taho (Warm Tofu & Arnibal)", calories: 170, serving: "1 cup", category: "Dessert", emoji: "🥤", allergens: ["Soy"], vitamins: ["Protein", "Calcium"], purines: "medium" },
  { id: 76, name: "Turon (Banana Spring Roll)", calories: 220, serving: "2 rolls", category: "Dessert", emoji: "🍌", allergens: ["Wheat"], vitamins: ["Potassium"], purines: "low" },
  { id: 77, name: "Banana Cue", calories: 240, serving: "2 pieces", category: "Dessert", emoji: "🍌", allergens: [], vitamins: ["Potassium", "Fiber"], purines: "low" },
  { id: 78, name: "Maruya (Banana Fritter)", calories: 210, serving: "1 piece", category: "Dessert", emoji: "🍌", allergens: ["Wheat", "Egg"], vitamins: ["Potassium"], purines: "low" },
  { id: 79, name: "Carioca (Sticky Rice Balls)", calories: 230, serving: "4 skewers", category: "Dessert", emoji: "🍡", allergens: ["Coconut"], vitamins: ["Carbs"], purines: "low" },
  { id: 80, name: "Kamote Cue", calories: 220, serving: "2 pieces", category: "Dessert", emoji: "🍠", allergens: [], vitamins: ["Vitamin A", "Fiber"], purines: "low" },
  { id: 103, name: "Ginataang Bilo-Bilo", calories: 310, serving: "1 bowl", category: "Dessert", emoji: "🥣", allergens: ["Coconut"], vitamins: ["Potassium", "Fiber"], purines: "low" },
  { id: 104, name: "Minatamis na Saging", calories: 180, serving: "1 bowl", category: "Dessert", emoji: "🍌", allergens: [], vitamins: ["Potassium"], purines: "low" },
  { id: 105, name: "Silvanas", calories: 190, serving: "1 piece", category: "Dessert", emoji: "🍪", allergens: ["Butter", "Cashews", "Eggs"], vitamins: [], purines: "low" },
  { id: 106, name: "Sans Rival", calories: 360, serving: "1 slice", category: "Dessert", emoji: "🍰", allergens: ["Nuts", "Butter", "Eggs"], vitamins: [], purines: "low" },
  { id: 107, name: "Cassava Cake", calories: 290, serving: "1 slice", category: "Dessert", emoji: "🥮", allergens: ["Coconut", "Milk", "Cheese"], vitamins: ["Vitamin C"], purines: "low" },
  { id: 108, name: "Leche Flan", calories: 240, serving: "1 slice", category: "Dessert", emoji: "🍮", allergens: ["Eggs", "Condensed Milk"], vitamins: ["Calcium", "Vitamin A"], purines: "low" },
  { id: 110, name: "Ensaladang Talong (Eggplant Salad)", calories: 120, serving: "1 bowl", category: "Veggie", emoji: "🥗", allergens: ["Eggs"], vitamins: ["Fiber", "Vitamin C"], purines: "low" },
  { id: 111, name: "Brown Rice (Kanin)", calories: 216, serving: "1 cup", category: "Carbs", emoji: "🍚", allergens: [], vitamins: ["Thiamin", "Magnesium", "Fiber"], purines: "low", nutrition: { protein: 5, carbs: 45, fat: 2, sugar: 1, sodium: 8, micronutrients: { fiber: 3.1, calcium: 6, iron: 1.1, potassium: 168, vitaminA: 0, vitaminC: 0, vitaminD: 0, vitaminB12: 0, folate: 18, magnesium: 76, sodium: 8 } } },
  { id: 112, name: "Steamed Kamote Bites", calories: 130, serving: "130g (1 medium)", category: "Carbs", emoji: "🍠", allergens: [], vitamins: ["Vitamin A", "Fiber", "Potassium"], purines: "low", nutrition: { protein: 2, carbs: 31, fat: 0, sugar: 7, sodium: 40, micronutrients: { fiber: 4.5, calcium: 40, iron: 0.8, potassium: 440, vitaminA: 1100, vitaminC: 20, vitaminD: 0, vitaminB12: 0, folate: 12, magnesium: 30, sodium: 40 } } },
  { id: 113, name: "Chicken and Cucumber Salad", calories: 180, serving: "1 bowl", category: "Chicken", emoji: "🥗", allergens: ["Dairy"], vitamins: ["Protein", "Vitamin C"], purines: "medium", nutrition: { protein: 28, carbs: 9, fat: 4, sugar: 5, sodium: 280, micronutrients: { fiber: 2, calcium: 65, iron: 1.2, potassium: 360, vitaminA: 35, vitaminC: 12, vitaminD: 0.2, vitaminB12: 0.4, folate: 20, magnesium: 28, sodium: 280 } } },
  { id: 114, name: "Tokwa Lettuce Cups", calories: 165, serving: "2 cups", category: "Veggie", emoji: "🥬", allergens: ["Soy"], vitamins: ["Protein", "Fiber", "Folate"], purines: "low", nutrition: { protein: 14, carbs: 13, fat: 7, sugar: 4, sodium: 300, micronutrients: { fiber: 3, calcium: 180, iron: 2.2, potassium: 340, vitaminA: 110, vitaminC: 8, vitaminD: 0, vitaminB12: 0, folate: 45, magnesium: 45, sodium: 300 } } },
  { id: 115, name: "Ensaladang Mangga (Green Mango Salad)", calories: 105, serving: "1 cup", category: "Veggie", emoji: "🥗", allergens: ["Fish"], vitamins: ["Vitamin C", "Fiber"], purines: "low", nutrition: { protein: 2, carbs: 20, fat: 2, sugar: 14, sodium: 380, micronutrients: { fiber: 4, calcium: 30, iron: 0.6, potassium: 260, vitaminA: 55, vitaminC: 35, vitaminD: 0, vitaminB12: 0, folate: 35, magnesium: 18, sodium: 380 } } },
  { id: 116, name: "Ensaladang Pako (Fiddlehead Fern Salad)", calories: 90, serving: "1 bowl", category: "Veggie", emoji: "🥗", allergens: ["Eggs", "Fish"], vitamins: ["Vitamin A", "Vitamin C", "Fiber"], purines: "low", nutrition: { protein: 3, carbs: 8, fat: 6, sugar: 3, sodium: 250, micronutrients: { fiber: 4, calcium: 80, iron: 1.5, potassium: 310, vitaminA: 180, vitaminC: 22, vitaminD: 0, vitaminB12: 0, folate: 45, magnesium: 28, sodium: 250 } } },
  { id: 117, name: "Boiled Sweet Corn", calories: 143, serving: "1 medium ear (100g)", category: "Carbs", emoji: "🌽", allergens: [], vitamins: ["Fiber", "Thiamin", "Folate"], purines: "low", nutrition: { protein: 5, carbs: 31, fat: 2, sugar: 6, sodium: 15, micronutrients: { fiber: 3.5, calcium: 3, iron: 0.5, potassium: 260, vitaminA: 10, vitaminC: 6, vitaminD: 0, vitaminB12: 0, folate: 42, magnesium: 37, sodium: 15 } } },
  { id: 118, name: "Oatmeal with Banana", calories: 230, serving: "1 bowl", category: "Carbs", emoji: "🥣", allergens: [], vitamins: ["Fiber", "Potassium", "Magnesium"], purines: "low", nutrition: { protein: 7, carbs: 43, fat: 4, sugar: 12, sodium: 70, micronutrients: { fiber: 7, calcium: 40, iron: 1.8, potassium: 390, vitaminA: 40, vitaminC: 5, vitaminD: 0, vitaminB12: 0, folate: 25, magnesium: 65, sodium: 70 } } },
  { id: 119, name: "Whole-Wheat Pandesal", calories: 190, serving: "2 small rolls (80g)", category: "Carbs", emoji: "🥖", allergens: ["Wheat", "Gluten"], vitamins: ["Fiber", "Iron", "B Vitamins"], purines: "low", nutrition: { protein: 8, carbs: 36, fat: 2, sugar: 4, sodium: 310, micronutrients: { fiber: 5, calcium: 55, iron: 2, potassium: 150, vitaminA: 0, vitaminC: 0, vitaminD: 0, vitaminB12: 0, folate: 45, magnesium: 45, sodium: 310 } } },
  { id: 120, name: "Grilled Chicken Breast", calories: 165, serving: "100g", category: "Chicken", emoji: "🍗", allergens: [], vitamins: ["Protein", "Niacin", "Vitamin B6"], purines: "medium", nutrition: { protein: 31, carbs: 0, fat: 4, sugar: 0, sodium: 74, micronutrients: { fiber: 0, calcium: 15, iron: 1, potassium: 256, vitaminA: 6, vitaminC: 0, vitaminD: 0.1, vitaminB12: 0.3, folate: 4, magnesium: 29, sodium: 74 } } },
  { id: 121, name: "Tuna and Cucumber Salad", calories: 185, serving: "1 bowl", category: "Seafood", emoji: "🥗", allergens: ["Fish", "Dairy"], vitamins: ["Protein", "Vitamin D", "Vitamin B12"], purines: "medium", nutrition: { protein: 25, carbs: 9, fat: 5, sugar: 5, sodium: 320, micronutrients: { fiber: 2, calcium: 70, iron: 1.2, potassium: 390, vitaminA: 30, vitaminC: 7, vitaminD: 2, vitaminB12: 4, folate: 18, magnesium: 35, sodium: 320 } } },
  { id: 122, name: "Tokwa and Mushroom Skewers", calories: 175, serving: "2 skewers", category: "Veggie", emoji: "🍢", allergens: ["Soy"], vitamins: ["Protein", "Copper", "Fiber"], purines: "low", nutrition: { protein: 15, carbs: 12, fat: 8, sugar: 3, sodium: 340, micronutrients: { fiber: 3, calcium: 150, iron: 2.5, potassium: 300, vitaminA: 5, vitaminC: 2, vitaminD: 0, vitaminB12: 0, folate: 20, magnesium: 45, sodium: 340 } } },
  { id: 123, name: "Ensaladang Pipino (Cucumber Salad)", calories: 65, serving: "1 cup", category: "Veggie", emoji: "🥗", allergens: [], vitamins: ["Vitamin K", "Vitamin C"], purines: "low", nutrition: { protein: 2, carbs: 10, fat: 2, sugar: 6, sodium: 180, micronutrients: { fiber: 2, calcium: 25, iron: 0.5, potassium: 240, vitaminA: 20, vitaminC: 8, vitaminD: 0, vitaminB12: 0, folate: 15, magnesium: 14, sodium: 180 } } },
  { id: 124, name: "Tomato and Cucumber Salad", calories: 75, serving: "1 bowl", category: "Veggie", emoji: "🥗", allergens: [], vitamins: ["Vitamin C", "Vitamin K", "Folate"], purines: "low", nutrition: { protein: 2, carbs: 11, fat: 3, sugar: 7, sodium: 160, micronutrients: { fiber: 3, calcium: 30, iron: 0.7, potassium: 420, vitaminA: 65, vitaminC: 18, vitaminD: 0, vitaminB12: 0, folate: 25, magnesium: 20, sodium: 160 } } },
  { id: 125, name: "Carrot and Cucumber Sticks with Yogurt Dip", calories: 95, serving: "1 cup with dip", category: "Veggie", emoji: "🥕", allergens: ["Dairy"], vitamins: ["Vitamin A", "Fiber", "Calcium"], purines: "low", nutrition: { protein: 4, carbs: 15, fat: 2, sugar: 9, sodium: 120, micronutrients: { fiber: 4, calcium: 85, iron: 0.5, potassium: 370, vitaminA: 520, vitaminC: 7, vitaminD: 0.1, vitaminB12: 0.2, folate: 20, magnesium: 22, sodium: 120 } } },
  { id: 126, name: "Ginisang Pechay with Garlic", calories: 85, serving: "1 cup", category: "Veggie", emoji: "🥬", allergens: [], vitamins: ["Vitamin A", "Vitamin C", "Calcium"], purines: "low", nutrition: { protein: 3, carbs: 8, fat: 5, sugar: 2, sodium: 180, micronutrients: { fiber: 3, calcium: 100, iron: 1.2, potassium: 360, vitaminA: 220, vitaminC: 30, vitaminD: 0, vitaminB12: 0, folate: 60, magnesium: 20, sodium: 180 } } },
  { id: 127, name: "Fresh Filipino Fruit Salad (No Added Sugar)", calories: 110, serving: "1 cup", category: "Fruit", emoji: "🍍", allergens: [], vitamins: ["Vitamin C", "Fiber", "Potassium"], purines: "low", nutrition: { protein: 1, carbs: 28, fat: 0, sugar: 21, sodium: 5, micronutrients: { fiber: 4, calcium: 25, iron: 0.5, potassium: 310, vitaminA: 45, vitaminC: 55, vitaminD: 0, vitaminB12: 0, folate: 30, magnesium: 22, sodium: 5 } } },
  { id: 128, name: "Lumpiang Sariwa (Fresh Vegetable Spring Rolls)", calories: 165, serving: "2 rolls", category: "Veggie", emoji: "🥬", allergens: ["Peanuts", "Soy", "Wheat"], vitamins: ["Fiber", "Vitamin A"], purines: "low", nutrition: { protein: 5, carbs: 24, fat: 6, sugar: 7, sodium: 260, micronutrients: { fiber: 4, calcium: 45, iron: 1.2, potassium: 280, vitaminA: 350, vitaminC: 12, vitaminD: 0, vitaminB12: 0, folate: 35, magnesium: 25, sodium: 260 } } },
  { id: 129, name: "Tortang Talong (Eggplant Omelet)", calories: 180, serving: "1 omelet", category: "Eggs", emoji: "🍳", allergens: ["Eggs"], vitamins: ["Protein", "Fiber"], purines: "low", nutrition: { protein: 10, carbs: 11, fat: 9, sugar: 3, sodium: 250, micronutrients: { fiber: 3, calcium: 55, iron: 1.4, potassium: 300, vitaminA: 80, vitaminC: 3, vitaminD: 0.8, vitaminB12: 0.5, folate: 35, magnesium: 20, sodium: 250 } } },
  { id: 130, name: "Ginisang Togue with Tofu", calories: 130, serving: "1 cup", category: "Veggie", emoji: "🍲", allergens: ["Soy"], vitamins: ["Protein", "Fiber", "Vitamin C"], purines: "low", nutrition: { protein: 9, carbs: 12, fat: 5, sugar: 4, sodium: 280, micronutrients: { fiber: 4, calcium: 120, iron: 2, potassium: 310, vitaminA: 45, vitaminC: 18, vitaminD: 0, vitaminB12: 0, folate: 45, magnesium: 38, sodium: 280 } } },
  { id: 131, name: "Atchara (Pickled Green Papaya)", calories: 65, serving: "1/2 cup", category: "Veggie", emoji: "🥗", allergens: [], vitamins: ["Fiber", "Vitamin C"], purines: "low", nutrition: { protein: 1, carbs: 14, fat: 0, sugar: 10, sodium: 240, micronutrients: { fiber: 2, calcium: 25, iron: 0.4, potassium: 150, vitaminA: 25, vitaminC: 18, vitaminD: 0, vitaminB12: 0, folate: 15, magnesium: 10, sodium: 240 } } },
  { id: 132, name: "Ginisang Kangkong with Garlic", calories: 90, serving: "1 cup", category: "Veggie", emoji: "🥬", allergens: [], vitamins: ["Vitamin A", "Vitamin C", "Iron"], purines: "low", nutrition: { protein: 3, carbs: 8, fat: 5, sugar: 2, sodium: 220, micronutrients: { fiber: 3, calcium: 80, iron: 1.8, potassium: 380, vitaminA: 320, vitaminC: 25, vitaminD: 0, vitaminB12: 0, folate: 55, magnesium: 28, sodium: 220 } } },
  { id: 133, name: "Pinakbet (Filipino Vegetable Stew)", calories: 140, serving: "1 cup", category: "Veggie", emoji: "🍲", allergens: ["Shrimp Paste"], vitamins: ["Vitamin A", "Fiber", "Vitamin C"], purines: "medium", nutrition: { protein: 5, carbs: 19, fat: 5, sugar: 7, sodium: 420, micronutrients: { fiber: 5, calcium: 70, iron: 1.8, potassium: 470, vitaminA: 420, vitaminC: 22, vitaminD: 0, vitaminB12: 0.2, folate: 60, magnesium: 30, sodium: 420 } } }
];

const dietaryFoodMetadata = {
  2: { foodGroup: 'grow', dishType: 'main-dish' },
  4: { foodGroup: 'grow', dishType: 'main-dish' },
  10: { foodGroup: 'glow', dishType: 'side-dish' },
  13: { foodGroup: 'grow', dishType: 'main-dish' },
  14: { foodGroup: 'glow', dishType: 'main-dish' },
  15: { foodGroup: 'grow', dishType: 'main-dish' },
  16: { foodGroup: 'grow', dishType: 'main-dish' },
  22: { foodGroup: 'glow', dishType: 'side-dish' },
  34: { foodGroup: 'grow', dishType: 'main-dish' },
  39: { foodGroup: 'glow', dishType: 'side-dish' },
  51: { foodGroup: 'glow', dishType: 'appetizer' },
  55: { foodGroup: 'go', dishType: 'main-dish' },
  61: { foodGroup: 'grow', dishType: 'main-dish' },
  62: { foodGroup: 'grow', dishType: 'main-dish' },
  66: { foodGroup: 'glow', dishType: 'side-dish' },
  68: { foodGroup: 'glow', dishType: 'side-dish' },
  91: { foodGroup: 'glow', dishType: 'side-dish' },
  92: { foodGroup: 'glow', dishType: 'side-dish' },
  93: { foodGroup: 'glow', dishType: 'side-dish' },
  94: { foodGroup: 'glow', dishType: 'side-dish' },
  95: { foodGroup: 'glow', dishType: 'side-dish' },
  96: { foodGroup: 'grow', dishType: 'main-dish' },
  109: { foodGroup: 'go', dishType: 'side-dish' },
  110: { foodGroup: 'glow', dishType: 'salad' },
  111: { foodGroup: 'go', dishType: 'side-dish' },
  112: { foodGroup: 'go', dishType: 'side-dish' },
  113: { foodGroup: 'grow', dishType: 'salad' },
  114: { foodGroup: 'grow', dishType: 'appetizer' },
  115: { foodGroup: 'glow', dishType: 'salad' },
  116: { foodGroup: 'glow', dishType: 'salad' },
  52: { foodGroup: 'glow', dishType: 'appetizer' },
  117: { foodGroup: 'go', dishType: 'side-dish' },
  118: { foodGroup: 'go', dishType: 'main-dish' },
  119: { foodGroup: 'go', dishType: 'side-dish' },
  120: { foodGroup: 'grow', dishType: 'main-dish' },
  121: { foodGroup: 'grow', dishType: 'salad' },
  122: { foodGroup: 'grow', dishType: 'appetizer' },
  123: { foodGroup: 'glow', dishType: 'salad' },
  124: { foodGroup: 'glow', dishType: 'salad' },
  125: { foodGroup: 'glow', dishType: 'appetizer' },
  126: { foodGroup: 'glow', dishType: 'side-dish' },
  127: { foodGroup: 'glow', dishType: 'salad' },
  128: { foodGroup: 'glow', dishType: 'appetizer' },
  129: { foodGroup: 'grow', dishType: 'appetizer' },
  130: { foodGroup: 'glow', dishType: 'appetizer' },
  131: { foodGroup: 'glow', dishType: 'side-dish' },
  132: { foodGroup: 'glow', dishType: 'side-dish' },
  133: { foodGroup: 'glow', dishType: 'side-dish' }
};

const micronutrientKeys = [
  'fiber', 'calcium', 'iron', 'potassium', 'vitaminA', 'vitaminC',
  'vitaminD', 'vitaminB12', 'folate', 'magnesium', 'sodium'
];

const filipinoFoods = rawFilipinoFoods.map(food => {
  let p = 0, c = 0, f = 0, sugar = 5, sodium = 300;
  if (food.category.includes('Pork') || food.category.includes('Beef')) { p = 22; c = 4; f = 24; sodium = 750; }
  else if (food.category.includes('Chicken') || food.category.includes('Seafood')) { p = 26; c = 3; f = 12; sodium = 580; }
  else if (food.category.includes('Carbs') || food.category.includes('Noodles')) { p = 6; c = 48; f = 5; sodium = 380; }
  else if (food.category.includes('Veggie')) { p = 4; c = 12; f = 6; sodium = 340; sugar = 6; }
  else if (food.category.includes('Dessert') || food.category.includes('Snack')) { p = 3; c = 42; f = 11; sugar = 28; sodium = 180; }
  else { p = 12; c = 18; f = 9; sodium = 450; }

  const dietaryMetadata = dietaryFoodMetadata[food.id];
  const { nutrition, ...foodDetails } = food;
  const micronutrients = Object.fromEntries(micronutrientKeys.map((nutrient) => [
    nutrient,
    nutrition?.micronutrients?.[nutrient] ?? null
  ]));
  return {
    ...foodDetails,
    isDietary: Boolean(dietaryMetadata),
    foodGroup: dietaryMetadata?.foodGroup || null,
    dishType: dietaryMetadata?.dishType || null,
    protein: nutrition?.protein ?? p,
    carbs: nutrition?.carbs ?? c,
    fat: nutrition?.fat ?? f,
    sugar: nutrition?.sugar ?? sugar,
    sodium: nutrition?.sodium ?? sodium,
    micronutrients
  };
});

export default filipinoFoods;
