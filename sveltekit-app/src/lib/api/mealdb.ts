import type { Ingredient, Recipe } from '$lib/types';

// TheMealDB's free public test key ("1"). No signup required.
// https://www.themealdb.com/api.php
const BASE = 'https://www.themealdb.com/api/json/v1/1';

interface RawMeal {
	idMeal: string;
	strMeal: string;
	strCategory?: string;
	strArea?: string;
	strMealThumb?: string;
	strInstructions?: string;
	strYoutube?: string;
	[key: string]: string | undefined;
}

function mapMeal(raw: RawMeal): Recipe {
	const ingredients: Ingredient[] = [];
	for (let i = 1; i <= 20; i++) {
		const name = raw[`strIngredient${i}`];
		const measure = raw[`strMeasure${i}`];
		if (name && name.trim()) {
			ingredients.push({ name: name.trim(), measure: (measure ?? '').trim() });
		}
	}

	return {
		id: raw.idMeal,
		name: raw.strMeal,
		category: raw.strCategory,
		area: raw.strArea,
		image: raw.strMealThumb,
		instructions: raw.strInstructions ?? '',
		youtube: raw.strYoutube,
		ingredients,
		isUserCreated: false
	};
}

/** Search recipes by name. Empty query returns nothing (use browseDefault for that). */
export async function searchRecipes(query: string, fetchFn: typeof fetch = fetch): Promise<Recipe[]> {
	const res = await fetchFn(`${BASE}/search.php?s=${encodeURIComponent(query)}`);
	if (!res.ok) throw new Error(`Search failed: ${res.status}`);
	const data = await res.json();
	return (data.meals ?? []).map(mapMeal);
}

/** List all available categories, for the filter dropdown. Deduped
 * defensively for the same reason as listAreas below. */
export async function listCategories(fetchFn: typeof fetch = fetch): Promise<string[]> {
	const res = await fetchFn(`${BASE}/list.php?c=list`);
	if (!res.ok) throw new Error(`Categories failed: ${res.status}`);
	const data = await res.json();
	const categories: string[] = (data.meals ?? []).map((m: { strCategory: string }) => m.strCategory);
	return [...new Set(categories)];
}

/** List all available areas/cuisines, for the filter dropdown. TheMealDB's
 * own list has at least one duplicate entry (e.g. "Dominican" twice), so
 * dedupe defensively — otherwise the keyed {#each} in the dropdown throws. */
export async function listAreas(fetchFn: typeof fetch = fetch): Promise<string[]> {
	const res = await fetchFn(`${BASE}/list.php?a=list`);
	if (!res.ok) throw new Error(`Areas failed: ${res.status}`);
	const data = await res.json();
	const areas: string[] = (data.meals ?? []).map((m: { strArea: string }) => m.strArea);
	return [...new Set(areas)];
}

/** Fills in the ingredients/instructions that TheMealDB's filter.php omits,
 * by looking up each meal's full detail. Without this, every recipe from a
 * category/area filter carries empty ingredients/instructions, which makes
 * the discover page's "Quickest first" sort estimate the same duration for
 * every recipe and appear to do nothing. Falls back to the thumbnail-only
 * stub for any lookup that fails, so one bad id doesn't break the whole list. */
async function enrichWithDetails(
	stubs: { idMeal: string; strMeal: string; strMealThumb: string }[],
	area: string | undefined,
	fetchFn: typeof fetch
): Promise<Recipe[]> {
	return Promise.all(
		stubs.map(async (m) => {
			const full = await getRecipeById(m.idMeal, fetchFn).catch(() => null);
			if (full) return area ? { ...full, area } : full;
			return {
				id: m.idMeal,
				name: m.strMeal,
				area,
				image: m.strMealThumb,
				instructions: '',
				ingredients: [],
				isUserCreated: false
			};
		})
	);
}

/** Browse/filter recipes by category. */
export async function filterByCategory(category: string, fetchFn: typeof fetch = fetch): Promise<Recipe[]> {
	const res = await fetchFn(`${BASE}/filter.php?c=${encodeURIComponent(category)}`);
	if (!res.ok) throw new Error(`Filter failed: ${res.status}`);
	const data = await res.json();
	return enrichWithDetails(data.meals ?? [], undefined, fetchFn);
}

/** Browse/filter recipes by area/cuisine. */
export async function filterByArea(area: string, fetchFn: typeof fetch = fetch): Promise<Recipe[]> {
	const res = await fetchFn(`${BASE}/filter.php?a=${encodeURIComponent(area)}`);
	if (!res.ok) throw new Error(`Filter failed: ${res.status}`);
	const data = await res.json();
	return enrichWithDetails(data.meals ?? [], area, fetchFn);
}

/** A broad default browse list — a few letters' worth of recipes for the home grid. */
export async function browseDefault(fetchFn: typeof fetch = fetch): Promise<Recipe[]> {
	const letters = ['c', 'p', 's'];
	const results = await Promise.all(
		letters.map(async (l) => {
			const res = await fetchFn(`${BASE}/search.php?f=${l}`);
			if (!res.ok) return [];
			const data = await res.json();
			return (data.meals ?? []).map(mapMeal);
		})
	);
	return results.flat();
}

/** Full recipe details (ingredients + instructions) by id. */
export async function getRecipeById(id: string, fetchFn: typeof fetch = fetch): Promise<Recipe | null> {
	const res = await fetchFn(`${BASE}/lookup.php?i=${encodeURIComponent(id)}`);
	if (!res.ok) throw new Error(`Lookup failed: ${res.status}`);
	const data = await res.json();
	const raw = data.meals?.[0];
	return raw ? mapMeal(raw) : null;
}
