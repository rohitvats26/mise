import { browser } from '$app/environment';
import type { Ingredient, NutritionInfo, Recipe } from '$lib/types';
import { isSafeHttpUrl } from '$lib/url';

const STORAGE_KEY = 'recipe-planner:user-recipes';

function load(): Recipe[] {
	if (!browser) return [];
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? (JSON.parse(raw) as Recipe[]) : [];
	} catch {
		return [];
	}
}

export interface RecipeDraft {
	name: string;
	category?: string;
	area?: string;
	image?: string;
	images?: string[];
	instructions: string;
	ingredients: Ingredient[];
	servings?: number;
	duration?: number;
	nutrition?: NutritionInfo;
	youtube?: string;
	tags?: string[];
}

/** Options for checking a draft against a user's existing recipes. */
export interface ValidateDraftOptions {
	/** The user's current recipes, to check the draft for duplicates against. */
	existing?: Recipe[];
	/** When editing, the id of the recipe being edited — excluded from the duplicate check. */
	excludeId?: string;
}

function normalize(value: string | undefined): string {
	return (value ?? '').trim().toLowerCase();
}

/** True when `existing` already has a recipe with the same name, category, and area as `draft`. */
export function isDuplicateRecipe(
	draft: Pick<RecipeDraft, 'name' | 'category' | 'area'>,
	existing: Recipe[],
	excludeId?: string
): boolean {
	const name = normalize(draft.name);
	const category = normalize(draft.category);
	const area = normalize(draft.area);
	return existing.some(
		(r) =>
			r.id !== excludeId &&
			normalize(r.name) === name &&
			normalize(r.category) === category &&
			normalize(r.area) === area
	);
}

/** Returns a map of field -> error message. Empty object means valid. */
export function validateDraft(
	draft: RecipeDraft,
	options: ValidateDraftOptions = {}
): Record<string, string> {
	const errors: Record<string, string> = {};
	if (!draft.name.trim()) errors.name = 'Recipe name is required.';
	if (!draft.category || !draft.category.trim()) errors.category = 'Category is required.';
	if (!draft.instructions.trim()) errors.instructions = 'Instructions are required.';
	if (!draft.ingredients.length) {
		errors.ingredients = 'Add at least one ingredient.';
	} else if (draft.ingredients.some((i) => !i.name.trim())) {
		errors.ingredients = 'Every ingredient needs a name.';
	}
	if (draft.youtube && !isSafeHttpUrl(draft.youtube)) {
		errors.youtube = 'Enter a valid http(s) link.';
	}
	if (draft.images?.some((url) => !isSafeHttpUrl(url))) {
		errors.images = 'Photo URLs must be valid http(s) links.';
	}
	// Only bother checking for a duplicate once the fields it's keyed on are
	// themselves valid — no point flagging "already exists" on top of a
	// missing name/category.
	if (
		!errors.name &&
		!errors.category &&
		options.existing?.length &&
		isDuplicateRecipe(draft, options.existing, options.excludeId)
	) {
		errors.name = 'You already have a recipe with this name, category, and area.';
	}
	return errors;
}

class UserRecipesStore {
	items = $state<Recipe[]>(load());

	private persist() {
		if (browser) localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
	}

	getById(id: string): Recipe | undefined {
		return this.items.find((r) => r.id === id);
	}

	create(draft: RecipeDraft): Recipe {
		const recipe: Recipe = {
			id: `user-${crypto.randomUUID()}`,
			isUserCreated: true,
			...draft
		};
		this.items.push(recipe);
		this.persist();
		return recipe;
	}

	update(id: string, draft: RecipeDraft) {
		const idx = this.items.findIndex((r) => r.id === id);
		if (idx !== -1) {
			this.items[idx] = { ...this.items[idx], ...draft };
			this.persist();
		}
	}

	remove(id: string) {
		this.items = this.items.filter((r) => r.id !== id);
		this.persist();
	}
}

export const userRecipes = new UserRecipesStore();
