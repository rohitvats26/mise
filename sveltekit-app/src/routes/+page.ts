import { browseDefault } from '$lib/api/mealdb';
import type { Recipe } from '$lib/types';
import type { PageLoad } from './$types';

// The homepage is an editorial landing page — the photos here are purely
// decorative (hero backdrop, manifesto rows, "this week's edit" grid), so a
// failed fetch degrades quietly to placeholder treatments instead of an
// error state.
export const load: PageLoad = async ({ fetch }) => {
	let recipes: Recipe[] = [];
	try {
		recipes = await browseDefault(fetch);
	} catch {
		recipes = [];
	}
	return { recipes };
};
