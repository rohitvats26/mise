import { browseDefault, listAreas, listCategories, searchRecipes } from '$lib/api/mealdb';
import type { Recipe } from '$lib/types';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, url }) => {
	let recipes: Recipe[] = [];
	let categories: string[] = [];
	let areas: string[] = [];
	let error = '';

	const initialQuery = url.searchParams.get('q')?.trim() ?? '';

	try {
		recipes = initialQuery ? await searchRecipes(initialQuery, fetch) : await browseDefault(fetch);
	} catch {
		error = initialQuery
			? 'Search failed. Please try again.'
			: 'Could not load recipes right now. Please try again.';
	}

	try {
		categories = await listCategories(fetch);
	} catch {
		// Non-fatal — the category filter dropdown just stays empty.
	}

	try {
		areas = await listAreas(fetch);
	} catch {
		// Non-fatal — the area filter dropdown just stays empty.
	}

	return { recipes, categories, areas, error, initialQuery };
};
