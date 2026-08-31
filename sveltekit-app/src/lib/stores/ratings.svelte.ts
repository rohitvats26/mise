import { browser } from '$app/environment';

const STORAGE_KEY = 'recipe-planner:ratings';

function load(): Record<string, number> {
	if (!browser) return {};
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? (JSON.parse(raw) as Record<string, number>) : {};
	} catch {
		return {};
	}
}

class RatingsStore {
	byRecipeId = $state<Record<string, number>>(load());

	private persist() {
		if (browser) localStorage.setItem(STORAGE_KEY, JSON.stringify(this.byRecipeId));
	}

	get(id: string): number {
		return this.byRecipeId[id] ?? 0;
	}

	set(id: string, value: number) {
		this.byRecipeId[id] = value;
		this.persist();
	}
}

export const ratings = new RatingsStore();
