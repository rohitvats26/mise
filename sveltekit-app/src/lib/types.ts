/** A recipe, either fetched from TheMealDB or created locally by the user. */
export interface Recipe {
	id: string;
	name: string;
	category?: string;
	area?: string;
	image?: string;
	/** Full photo set for the recipe. `image` (above) always mirrors images[0] for back-compat with cards/hero. */
	images?: string[];
	instructions: string;
	ingredients: Ingredient[];
	/** true for recipes the user created themselves (editable/deletable) */
	isUserCreated: boolean;
	/** Number of servings the recipe/ingredients list is written for. Defaults to 4 when absent. */
	servings?: number;
	/** Per-serving macros, only present when the user (or a future data source) entered them explicitly. */
	duration?: number;
	nutrition?: NutritionInfo;
	youtube?: string;
	/** Free-form labels the user attaches to their own recipes, e.g. "vegan", "weeknight". */
	tags?: string[];
}

export interface Ingredient {
	name: string;
	measure: string;
}

/** Per-serving nutrition figures. Calories in kcal, the rest in grams. */
export interface NutritionInfo {
	calories: number;
	protein: number;
	carbs: number;
	fat: number;
}

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export type Day = (typeof DAYS)[number];

/** One recipe pinned to a day. `entryId` is unique per pin so the same recipe can be pinned more than once. */
export interface MealEntry {
	entryId: string;
	recipeId: string;
	recipeName: string;
	recipeImage?: string;
}

/** Weekly meal plan: any number of recipes pinned per day. */
export type MealPlan = Record<Day, MealEntry[]>;
