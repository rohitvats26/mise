import { describe, expect, it, vi, beforeEach } from 'vitest';
import { mount, flushSync } from 'svelte';
import type { Recipe } from '$lib/types';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$app/environment', () => ({ browser: true }));

const { default: DiscoverPage } = await import('./+page.svelte');
const { userRecipes } = await import('$lib/stores/userRecipes.svelte');

function makeRecipe(id: string, name: string, ingredientCount: number, stepCount: number, extra: Partial<Recipe> = {}): Recipe {
	return {
		id,
		name,
		instructions: Array.from({ length: stepCount }, (_, i) => `Do step ${i} of the recipe`).join('. '),
		ingredients: Array.from({ length: ingredientCount }, (_, i) => ({ name: `ing${i}`, measure: '1' })),
		isUserCreated: false,
		...extra
	};
}

describe('discover page sort - user-created recipes', () => {
	beforeEach(() => {
		userRecipes.items = [];
	});

	it('includes a "mine" recipe in the merged sort alongside global ones', () => {
		userRecipes.items = [makeRecipe('mine-1', 'MyBanana', 1, 1, { isUserCreated: true })]; // should sort quick/early alphabetically

		const globalRecipes = [
			makeRecipe('g1', 'Zucchini', 1, 1),
			makeRecipe('g2', 'Apple', 20, 20) // slow, name sorts before MyBanana alphabetically though
		];

		const target = document.createElement('div');
		document.body.appendChild(target);

		mount(DiscoverPage, {
			target,
			props: {
				params: {},
				data: { recipes: globalRecipes, categories: [], areas: [], initialQuery: '', error: '' }
			}
		});
		flushSync();

		const namesInOrder = () => Array.from(target.querySelectorAll('rc-recipe-card')).map((el) => el.getAttribute('name'));

		const select = target.querySelector('select[aria-label="Sort recipes"]') as HTMLSelectElement;

		select.value = 'name';
		select.dispatchEvent(new Event('change'));
		flushSync();
		expect(namesInOrder()).toEqual(['Apple', 'MyBanana', 'Zucchini']);

		select.value = 'quick';
		select.dispatchEvent(new Event('change'));
		flushSync();
		expect(namesInOrder()).toEqual(['MyBanana', 'Zucchini', 'Apple']);
	});
});
