import type { Ingredient, NutritionInfo } from '$lib/types';

/**
 * A lightweight, keyword-based nutrition estimator.
 *
 * TheMealDB doesn't provide nutrition data, and there's no nutrition API
 * wired into this app, so for recipes without explicit user-entered
 * macros we estimate from the ingredient list. This is intentionally rough
 * — a real product would call a food database — but it gives a useful,
 * clearly-labeled ballpark instead of leaving the section empty.
 */

/** Per-100g macros for common ingredient keywords. First matching keyword wins. */
const FOOD_TABLE: Array<{ keywords: string[]; per100g: NutritionInfo }> = [
	{ keywords: ['olive oil', 'vegetable oil', 'sunflower oil', 'oil'], per100g: { calories: 884, protein: 0, carbs: 0, fat: 100 } },
	{ keywords: ['butter'], per100g: { calories: 717, protein: 0.9, carbs: 0.1, fat: 81 } },
	{ keywords: ['bacon'], per100g: { calories: 541, protein: 37, carbs: 1.4, fat: 42 } },
	{ keywords: ['sausage', 'chorizo'], per100g: { calories: 300, protein: 15, carbs: 3, fat: 25 } },
	{ keywords: ['beef', 'steak', 'mince', 'ground beef'], per100g: { calories: 250, protein: 26, carbs: 0, fat: 17 } },
	{ keywords: ['pork', 'ham'], per100g: { calories: 242, protein: 27, carbs: 0, fat: 14 } },
	{ keywords: ['chicken', 'turkey', 'poultry'], per100g: { calories: 165, protein: 31, carbs: 0, fat: 3.6 } },
	{ keywords: ['salmon'], per100g: { calories: 208, protein: 20, carbs: 0, fat: 13 } },
	{ keywords: ['shrimp', 'prawn'], per100g: { calories: 99, protein: 24, carbs: 0.2, fat: 0.3 } },
	{ keywords: ['fish', 'cod', 'tuna', 'tilapia'], per100g: { calories: 130, protein: 24, carbs: 0, fat: 3.5 } },
	{ keywords: ['egg'], per100g: { calories: 155, protein: 13, carbs: 1.1, fat: 11 } },
	{ keywords: ['cheddar', 'cheese', 'parmesan', 'mozzarella'], per100g: { calories: 350, protein: 24, carbs: 2, fat: 28 } },
	{ keywords: ['cream cheese'], per100g: { calories: 342, protein: 6, carbs: 4, fat: 34 } },
	{ keywords: ['cream', 'double cream', 'heavy cream'], per100g: { calories: 340, protein: 2.1, carbs: 3, fat: 36 } },
	{ keywords: ['yogurt', 'yoghurt'], per100g: { calories: 61, protein: 3.5, carbs: 4.7, fat: 3.3 } },
	{ keywords: ['milk'], per100g: { calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3 } },
	{ keywords: ['coconut milk'], per100g: { calories: 230, protein: 2.3, carbs: 5.5, fat: 24 } },
	{ keywords: ['rice'], per100g: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 } },
	{ keywords: ['pasta', 'spaghetti', 'noodle', 'macaroni'], per100g: { calories: 158, protein: 5.8, carbs: 31, fat: 0.9 } },
	{ keywords: ['bread', 'baguette', 'bun', 'tortilla'], per100g: { calories: 265, protein: 9, carbs: 49, fat: 3.2 } },
	{ keywords: ['flour'], per100g: { calories: 364, protein: 10, carbs: 76, fat: 1 } },
	{ keywords: ['sugar'], per100g: { calories: 387, protein: 0, carbs: 100, fat: 0 } },
	{ keywords: ['honey', 'syrup'], per100g: { calories: 304, protein: 0.3, carbs: 82, fat: 0 } },
	{ keywords: ['chocolate', 'cocoa'], per100g: { calories: 546, protein: 5, carbs: 61, fat: 31 } },
	{ keywords: ['potato'], per100g: { calories: 77, protein: 2, carbs: 17, fat: 0.1 } },
	{ keywords: ['avocado'], per100g: { calories: 160, protein: 2, carbs: 8.5, fat: 15 } },
	{ keywords: ['nuts', 'almond', 'cashew', 'walnut', 'pecan'], per100g: { calories: 600, protein: 20, carbs: 20, fat: 52 } },
	{ keywords: ['peanut butter', 'peanut'], per100g: { calories: 588, protein: 25, carbs: 20, fat: 50 } },
	{ keywords: ['bean', 'lentil', 'chickpea', 'legume'], per100g: { calories: 127, protein: 8.7, carbs: 22, fat: 0.5 } },
	{ keywords: ['tofu'], per100g: { calories: 76, protein: 8, carbs: 1.9, fat: 4.8 } },
	{ keywords: ['tomato'], per100g: { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2 } },
	{ keywords: ['onion', 'shallot', 'leek'], per100g: { calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1 } },
	{ keywords: ['garlic'], per100g: { calories: 149, protein: 6.4, carbs: 33, fat: 0.5 } },
	{ keywords: ['carrot'], per100g: { calories: 41, protein: 0.9, carbs: 10, fat: 0.2 } },
	{ keywords: ['spinach', 'kale', 'lettuce', 'greens'], per100g: { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4 } },
	{ keywords: ['broccoli', 'cauliflower', 'cabbage'], per100g: { calories: 34, protein: 2.8, carbs: 7, fat: 0.4 } },
	{ keywords: ['pepper', 'chili', 'chilli'], per100g: { calories: 40, protein: 1.9, carbs: 9, fat: 0.4 } },
	{ keywords: ['mushroom'], per100g: { calories: 22, protein: 3.1, carbs: 3.3, fat: 0.3 } },
	{ keywords: ['lemon', 'lime', 'orange', 'apple', 'banana', 'fruit'], per100g: { calories: 52, protein: 0.5, carbs: 14, fat: 0.2 } },
	{ keywords: ['wine', 'stock', 'broth', 'water'], per100g: { calories: 15, protein: 0.2, carbs: 1, fat: 0 } }
];

/** Negligible-macro items we still want to "match" so they don't fall into the generic default. */
const NEGLIGIBLE_KEYWORDS = ['salt', 'pepper', 'spice', 'herb', 'basil', 'oregano', 'cumin', 'paprika', 'bay leaf', 'vanilla'];
const NEGLIGIBLE: NutritionInfo = { calories: 3, protein: 0.1, carbs: 0.5, fat: 0.1 };

/** Fallback for anything unmatched — a moderate, unremarkable estimate rather than zero. */
const DEFAULT_PER_100G: NutritionInfo = { calories: 120, protein: 3, carbs: 15, fat: 5 };

function lookup(ingredientName: string): NutritionInfo {
	const name = ingredientName.toLowerCase();
	for (const entry of FOOD_TABLE) {
		if (entry.keywords.some((k) => name.includes(k))) return entry.per100g;
	}
	if (NEGLIGIBLE_KEYWORDS.some((k) => name.includes(k))) return NEGLIGIBLE;
	return DEFAULT_PER_100G;
}

/**
 * Very rough measure -> grams conversion. Ingredient text in the wild is
 * inconsistent ("2", "1 1/2 cups", "a pinch"), so this only needs to be
 * good enough to produce a plausible estimate, not exact.
 */
function parseGrams(measure: string): number {
	const text = measure.toLowerCase().trim();
	if (!text) return 100; // no measure given — assume a typical single serving of the item

	const numMatch = text.match(/(\d+\s*\/\s*\d+|\d+\.\d+|\d+)/);
	let qty = 1;
	if (numMatch) {
		const raw = numMatch[0];
		if (raw.includes('/')) {
			const [a, b] = raw.split('/').map((n) => parseFloat(n.trim()));
			qty = b ? a / b : 1;
		} else {
			qty = parseFloat(raw);
		}
	}
	if (!Number.isFinite(qty) || qty <= 0) qty = 1;

	const gramsPerUnit: Array<[RegExp, number]> = [
		[/kg|kilogram/, 1000],
		[/\bg\b|gram/, 1],
		[/\bl\b|liter|litre/, 1000],
		[/ml|milliliter|millilitre/, 1],
		[/cup/, 240],
		[/tbsp|tablespoon/, 15],
		[/tsp|teaspoon/, 5],
		[/\boz\b|ounce/, 28],
		[/\blb\b|pound/, 454],
		[/pinch|dash/, 1],
		[/clove/, 5],
		[/slice/, 25],
		[/can|tin/, 400]
	];

	for (const [pattern, grams] of gramsPerUnit) {
		if (pattern.test(text)) return qty * grams;
	}

	// Bare count ("2 eggs", "3 potatoes") — assume ~100g per whole item.
	return qty * 100;
}

/** Estimates total (not per-serving) nutrition for a list of ingredients. */
function estimateTotal(ingredients: Ingredient[]): NutritionInfo {
	return ingredients.reduce<NutritionInfo>(
		(total, ing) => {
			const grams = parseGrams(ing.measure);
			const per100g = lookup(ing.name);
			const factor = grams / 100;
			return {
				calories: total.calories + per100g.calories * factor,
				protein: total.protein + per100g.protein * factor,
				carbs: total.carbs + per100g.carbs * factor,
				fat: total.fat + per100g.fat * factor
			};
		},
		{ calories: 0, protein: 0, carbs: 0, fat: 0 }
	);
}

/** Estimates per-serving nutrition. Used when a recipe has no explicit nutrition entered. */
export function estimateNutritionPerServing(ingredients: Ingredient[], servings: number): NutritionInfo {
	const safeServings = servings > 0 ? servings : 1;
	const total = estimateTotal(ingredients);
	return {
		calories: Math.round(total.calories / safeServings),
		protein: Math.round(total.protein / safeServings),
		carbs: Math.round(total.carbs / safeServings),
		fat: Math.round(total.fat / safeServings)
	};
}

/** Scales an already-per-serving nutrition figure to a different serving count relative to the original. */
export function scaleNutrition(perServing: NutritionInfo, fromServings: number, toServings: number): NutritionInfo {
	if (fromServings <= 0 || toServings <= 0 || fromServings === toServings) return perServing;
	const factor = fromServings / toServings;
	return {
		calories: Math.round(perServing.calories * factor),
		protein: Math.round(perServing.protein * factor),
		carbs: Math.round(perServing.carbs * factor),
		fat: Math.round(perServing.fat * factor)
	};
}
