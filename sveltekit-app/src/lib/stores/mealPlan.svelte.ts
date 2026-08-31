import { browser } from '$app/environment';
import { DAYS, type Day, type MealEntry, type MealPlan, type Recipe } from '$lib/types';

const STORAGE_KEY = 'recipe-planner:meal-plan';

function emptyPlan(): MealPlan {
	return DAYS.reduce((acc, day) => {
		acc[day] = [];
		return acc;
	}, {} as MealPlan);
}

function makeEntryId(): string {
	return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `entry-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Normalizes one day's stored value into a MealEntry[], migrating the old
 * single-recipe-per-day shape ({ recipeId, recipeName, recipeImage } | null)
 * transparently so existing saved plans don't get wiped. */
function normalizeDay(raw: unknown): MealEntry[] {
	if (!raw) return [];
	if (Array.isArray(raw)) {
		return raw
			.filter((e): e is Partial<MealEntry> => !!e && typeof e === 'object' && 'recipeId' in e)
			.map((e) => ({
				entryId: typeof e.entryId === 'string' ? e.entryId : makeEntryId(),
				recipeId: String(e.recipeId),
				recipeName: String(e.recipeName ?? ''),
				recipeImage: e.recipeImage
			}));
	}
	if (typeof raw === 'object' && raw !== null && 'recipeId' in raw) {
		const e = raw as Partial<MealEntry>;
		return [
			{
				entryId: makeEntryId(),
				recipeId: String(e.recipeId),
				recipeName: String(e.recipeName ?? ''),
				recipeImage: e.recipeImage
			}
		];
	}
	return [];
}

function load(): MealPlan {
	if (!browser) return emptyPlan();
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return emptyPlan();
		const parsed = JSON.parse(raw) as Record<string, unknown>;
		const plan = emptyPlan();
		for (const day of DAYS) {
			plan[day] = normalizeDay(parsed[day]);
		}
		return plan;
	} catch {
		return emptyPlan();
	}
}

class MealPlanStore {
	plan = $state<MealPlan>(load());

	private persist() {
		if (browser) localStorage.setItem(STORAGE_KEY, JSON.stringify(this.plan));
	}

	/** Pins a recipe to a day. Multiple recipes can be pinned to the same day. */
	add(day: Day, recipe: Recipe) {
		this.plan[day] = [
			...this.plan[day],
			{ entryId: makeEntryId(), recipeId: recipe.id, recipeName: recipe.name, recipeImage: recipe.image }
		];
		this.persist();
	}

	/** Removes one pinned entry from a day by its entryId (not recipeId, so the
	 * same recipe pinned twice can be removed independently). */
	remove(day: Day, entryId: string) {
		this.plan[day] = this.plan[day].filter((e) => e.entryId !== entryId);
		this.persist();
	}

	/** Removes every pinned entry from a single day. */
	clearDay(day: Day) {
		this.plan[day] = [];
		this.persist();
	}

	clearAll() {
		this.plan = emptyPlan();
		this.persist();
	}
}

export const mealPlan = new MealPlanStore();
