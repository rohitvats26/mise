import { getRecipeById } from '$lib/api/mealdb';
import type { Recipe } from '$lib/types';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const { id } = params;

	// User-created recipes only exist in the browser's localStorage — the
	// recipe details page resolves these client-side on mount instead.
	if (id.startsWith('user-')) {
		return { recipe: null as Recipe | null, isUserRecipe: true, notFound: false };
	}

	try {
		const recipe = await getRecipeById(id, fetch);
		return { recipe, isUserRecipe: false, notFound: !recipe };
	} catch {
		return { recipe: null as Recipe | null, isUserRecipe: false, notFound: true };
	}
};
