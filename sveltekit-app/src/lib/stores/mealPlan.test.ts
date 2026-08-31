import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DAYS } from '$lib/types';
import type { Recipe } from '$lib/types';

vi.mock('$app/environment', () => ({ browser: true }));

const { mealPlan } = await import('./mealPlan.svelte');

function makeRecipe(id: string, name = 'Test Recipe'): Recipe {
	return { id, name, instructions: 'Do the thing.', ingredients: [], isUserCreated: false };
}

describe('meal plan store', () => {
	beforeEach(() => {
		localStorage.clear();
		mealPlan.clearAll();
	});

	it('starts with every day empty', () => {
		for (const day of DAYS) {
			expect(mealPlan.plan[day]).toEqual([]);
		}
	});

	it('adds a recipe to a day', () => {
		mealPlan.add('Monday', makeRecipe('r1', 'Pancakes'));
		expect(mealPlan.plan.Monday).toHaveLength(1);
		expect(mealPlan.plan.Monday[0]).toMatchObject({ recipeId: 'r1', recipeName: 'Pancakes' });
	});

	it('allows multiple recipes pinned to the same day', () => {
		mealPlan.add('Monday', makeRecipe('r1', 'Pancakes'));
		mealPlan.add('Monday', makeRecipe('r2', 'Waffles'));
		expect(mealPlan.plan.Monday).toHaveLength(2);
		expect(mealPlan.plan.Monday.map((e) => e.recipeName)).toEqual(['Pancakes', 'Waffles']);
	});

	it('allows the same recipe pinned to a day more than once, as distinct entries', () => {
		mealPlan.add('Monday', makeRecipe('r1', 'Pancakes'));
		mealPlan.add('Monday', makeRecipe('r1', 'Pancakes'));
		expect(mealPlan.plan.Monday).toHaveLength(2);
		expect(mealPlan.plan.Monday[0].entryId).not.toBe(mealPlan.plan.Monday[1].entryId);
	});

	it('removes a single entry by entryId without affecting other entries on the same day', () => {
		mealPlan.add('Monday', makeRecipe('r1', 'Pancakes'));
		mealPlan.add('Monday', makeRecipe('r2', 'Waffles'));
		const toRemove = mealPlan.plan.Monday[0].entryId;
		mealPlan.remove('Monday', toRemove);
		expect(mealPlan.plan.Monday).toHaveLength(1);
		expect(mealPlan.plan.Monday[0].recipeName).toBe('Waffles');
	});

	it('does not affect other days', () => {
		mealPlan.add('Monday', makeRecipe('r1'));
		mealPlan.add('Tuesday', makeRecipe('r2'));
		mealPlan.clearDay('Monday');
		expect(mealPlan.plan.Monday).toEqual([]);
		expect(mealPlan.plan.Tuesday).toHaveLength(1);
	});

	it('clearDay empties just that day', () => {
		mealPlan.add('Monday', makeRecipe('r1'));
		mealPlan.add('Monday', makeRecipe('r2'));
		mealPlan.clearDay('Monday');
		expect(mealPlan.plan.Monday).toEqual([]);
	});

	it('clearAll resets every day', () => {
		mealPlan.add('Monday', makeRecipe('r1'));
		mealPlan.add('Sunday', makeRecipe('r2'));
		mealPlan.clearAll();
		for (const day of DAYS) {
			expect(mealPlan.plan[day]).toEqual([]);
		}
	});
});
