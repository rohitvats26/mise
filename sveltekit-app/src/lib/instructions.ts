import type { Recipe } from './types';

/** TheMealDB doesn't provide prep time, so we derive a believable, stable
 * estimate from each recipe's own ingredient count and instruction length
 * rather than showing nothing. Used anywhere a recipe card needs a duration
 * (discover grid, my-recipes grid). */
export function estimateMinutes(recipe: Recipe): number {
	const steps = recipe.instructions.split(/\r?\n|\. /).filter((s) => s.trim().length > 8).length;
	return recipe.duration ?? Math.max(10, Math.min(75, 10 + recipe.ingredients.length * 3 + steps));
}

/** Turns free-form instructions into a numbered step list — one step per
 * line if the text already has line breaks, otherwise split on sentences. */
export function parseSteps(text: string): string[] {
	const stripNumbering = (s: string) => s.replace(/^\s*(?:\d+[.)]|step\s*\d+[:.]?)\s*/i, '').trim();

	const byLine = text
		.split(/\r?\n/)
		.map((s) => s.trim())
		.filter(Boolean);
	if (byLine.length > 1) return byLine.map(stripNumbering);

	const bySentence = text
		.split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
		.map((s) => s.trim())
		.filter(Boolean);
	return (bySentence.length > 1 ? bySentence : [text.trim()].filter(Boolean)).map(stripNumbering);
}
