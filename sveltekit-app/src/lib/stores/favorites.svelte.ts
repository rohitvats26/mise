import { browser } from '$app/environment';
import type { Recipe } from '$lib/types';

const STORAGE_KEY = 'recipe-planner:favorites';

function load(): Recipe[] {
	if (!browser) return [];
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? (JSON.parse(raw) as Recipe[]) : [];
	} catch {
		return [];
	}
}

class FavoritesStore {
	items = $state<Recipe[]>(load());

	private persist() {
		if (browser) localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
	}

	isFavorite(id: string): boolean {
		return this.items.some((r) => r.id === id);
	}

	add(recipe: Recipe) {
		if (!this.isFavorite(recipe.id)) {
			this.items.push(recipe);
			this.persist();
		}
	}

	remove(id: string) {
		this.items = this.items.filter((r) => r.id !== id);
		this.persist();
	}

	toggle(recipe: Recipe) {
		if (this.isFavorite(recipe.id)) {
			this.remove(recipe.id);
		} else {
			this.add(recipe);
		}
	}
}

export const favorites = new FavoritesStore();
