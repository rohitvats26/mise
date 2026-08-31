import { describe, expect, it } from 'vitest';
import { isDuplicateRecipe, validateDraft, type RecipeDraft } from './userRecipes.svelte';
import type { Recipe } from '$lib/types';

function baseDraft(overrides: Partial<RecipeDraft> = {}): RecipeDraft {
	return {
		name: 'Tomato Soup',
		category: 'Soup',
		instructions: 'Simmer everything for 20 minutes.',
		ingredients: [{ name: 'Tomato', measure: '4' }],
		...overrides
	};
}

describe('validateDraft', () => {
	it('accepts a fully filled-in draft', () => {
		expect(validateDraft(baseDraft())).toEqual({});
	});

	it('requires a name', () => {
		const errors = validateDraft(baseDraft({ name: '' }));
		expect(errors.name).toBeDefined();
	});

	it('rejects a whitespace-only name', () => {
		const errors = validateDraft(baseDraft({ name: '   ' }));
		expect(errors.name).toBeDefined();
	});

	it('requires a category', () => {
		const errors = validateDraft(baseDraft({ category: '' }));
		expect(errors.category).toBeDefined();
	});

	it('rejects a whitespace-only category', () => {
		const errors = validateDraft(baseDraft({ category: '   ' }));
		expect(errors.category).toBeDefined();
	});

	it('requires instructions', () => {
		const errors = validateDraft(baseDraft({ instructions: '' }));
		expect(errors.instructions).toBeDefined();
	});

	it('requires at least one ingredient', () => {
		const errors = validateDraft(baseDraft({ ingredients: [] }));
		expect(errors.ingredients).toBeDefined();
	});

	it('rejects an ingredient with no name', () => {
		const errors = validateDraft(baseDraft({ ingredients: [{ name: '', measure: '1 cup' }] }));
		expect(errors.ingredients).toBeDefined();
	});

	it('is fine with an ingredient that has no measure', () => {
		const errors = validateDraft(baseDraft({ ingredients: [{ name: 'Salt', measure: '' }] }));
		expect(errors.ingredients).toBeUndefined();
	});

	it('reports multiple errors at once', () => {
		const errors = validateDraft({ name: '', category: '', instructions: '', ingredients: [] });
		expect(Object.keys(errors).sort()).toEqual(['category', 'ingredients', 'instructions', 'name']);
	});

	it('accepts a valid http(s) youtube link', () => {
		const errors = validateDraft(baseDraft({ youtube: 'https://youtube.com/watch?v=abc123' }));
		expect(errors.youtube).toBeUndefined();
	});

	it('rejects a javascript: URI in the youtube field', () => {
		const errors = validateDraft(baseDraft({ youtube: 'javascript:alert(1)' }));
		expect(errors.youtube).toBeDefined();
	});

	it('rejects a javascript: URI among the image URLs', () => {
		const errors = validateDraft(baseDraft({ images: ['https://example.com/a.jpg', 'javascript:alert(1)'] }));
		expect(errors.images).toBeDefined();
	});

	function existingRecipe(overrides: Partial<Recipe> = {}): Recipe {
		return {
			id: 'user-1',
			name: 'Tomato Soup',
			category: 'Soup',
			area: 'American',
			instructions: 'Simmer everything for 20 minutes.',
			ingredients: [{ name: 'Tomato', measure: '4' }],
			isUserCreated: true,
			...overrides
		};
	}

	it('rejects a draft matching an existing recipe on name, category, and area', () => {
		const existing = [existingRecipe()];
		const errors = validateDraft(baseDraft({ area: 'American' }), { existing });
		expect(errors.name).toBeDefined();
	});

	it('is case- and whitespace-insensitive when checking duplicates', () => {
		const existing = [existingRecipe()];
		const errors = validateDraft(baseDraft({ name: '  tomato soup  ', area: ' american ' }), { existing });
		expect(errors.name).toBeDefined();
	});

	it('allows a draft that differs by area', () => {
		const existing = [existingRecipe()];
		const errors = validateDraft(baseDraft({ area: 'Italian' }), { existing });
		expect(errors.name).toBeUndefined();
	});

	it('allows a draft that differs by category', () => {
		const existing = [existingRecipe()];
		const errors = validateDraft(baseDraft({ category: 'Starter', area: 'American' }), { existing });
		expect(errors.name).toBeUndefined();
	});

	it('excludes the recipe being edited from the duplicate check', () => {
		const existing = [existingRecipe({ id: 'user-1' })];
		const errors = validateDraft(baseDraft({ area: 'American' }), {
			existing,
			excludeId: 'user-1'
		});
		expect(errors.name).toBeUndefined();
	});
});

describe('isDuplicateRecipe', () => {
	it('matches on name, category, and area together, ignoring case and whitespace', () => {
		const existing: Recipe[] = [
			{
				id: 'user-1',
				name: 'Tomato Soup',
				category: 'Soup',
				area: 'American',
				instructions: '…',
				ingredients: [{ name: 'Tomato', measure: '4' }],
				isUserCreated: true
			}
		];
		expect(isDuplicateRecipe({ name: ' tomato soup ', category: 'soup', area: 'AMERICAN' }, existing)).toBe(
			true
		);
		expect(isDuplicateRecipe({ name: 'Tomato Soup', category: 'Soup', area: 'Italian' }, existing)).toBe(
			false
		);
	});

	it('treats a missing area consistently between draft and existing recipe', () => {
		const existing: Recipe[] = [
			{
				id: 'user-1',
				name: 'Chili',
				category: 'Stew',
				instructions: '…',
				ingredients: [{ name: 'Beans', measure: '1 can' }],
				isUserCreated: true
			}
		];
		expect(isDuplicateRecipe({ name: 'Chili', category: 'Stew', area: undefined }, existing)).toBe(true);
		expect(isDuplicateRecipe({ name: 'Chili', category: 'Stew', area: '' }, existing)).toBe(true);
	});
});
