import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Recipe } from '$lib/types';

// The store checks `browser` before touching localStorage (SSR safety).
// Force it true here so persistence behavior is actually exercised.
vi.mock('$app/environment', () => ({ browser: true }));

const { favorites } = await import('./favorites.svelte');

function makeRecipe(id: string, name = 'Test Recipe'): Recipe {
	return { id, name, instructions: 'Do the thing.', ingredients: [], isUserCreated: false };
}

describe('favorites store', () => {
	beforeEach(() => {
		localStorage.clear();
		favorites.items = [];
	});

	it('starts empty', () => {
		expect(favorites.items).toEqual([]);
		expect(favorites.isFavorite('1')).toBe(false);
	});

	it('adds a recipe', () => {
		favorites.add(makeRecipe('1'));
		expect(favorites.isFavorite('1')).toBe(true);
		expect(favorites.items).toHaveLength(1);
	});

	it('does not duplicate an already-favorited recipe', () => {
		favorites.add(makeRecipe('1'));
		favorites.add(makeRecipe('1'));
		expect(favorites.items).toHaveLength(1);
	});

	it('removes a recipe', () => {
		favorites.add(makeRecipe('1'));
		favorites.remove('1');
		expect(favorites.isFavorite('1')).toBe(false);
		expect(favorites.items).toHaveLength(0);
	});

	it('toggle adds when absent and removes when present', () => {
		const recipe = makeRecipe('1');
		favorites.toggle(recipe);
		expect(favorites.isFavorite('1')).toBe(true);
		favorites.toggle(recipe);
		expect(favorites.isFavorite('1')).toBe(false);
	});

	it('persists to localStorage on add', () => {
		favorites.add(makeRecipe('1', 'Persisted Recipe'));
		const raw = localStorage.getItem('recipe-planner:favorites');
		expect(raw).toBeTruthy();
		expect(JSON.parse(raw!)).toHaveLength(1);
	});
});
