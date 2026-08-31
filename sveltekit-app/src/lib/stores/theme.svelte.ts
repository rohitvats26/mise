import { browser } from '$app/environment';

/** `current` is what the UI's three-way switcher shows/controls. `system`
 * means "follow the OS preference" rather than being a fixed appearance. */
export type Theme = 'light' | 'dark' | 'system';

/** The two concrete appearances `data-theme` on <html> can actually be. */
type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'sprig-theme';

function prefersDark(): boolean {
	return browser && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolve(theme: Theme): ResolvedTheme {
	return theme === 'system' ? (prefersDark() ? 'dark' : 'light') : theme;
}

/**
 * Reads the theme choice that's already stored (or 'system' if none is, or
 * it's unavailable). The inline script in app.html independently resolves
 * and applies the *appearance* before hydration to avoid a flash of the
 * wrong theme — this mirrors the same storage key so the two agree.
 */
function readInitial(): Theme {
	if (!browser) return 'system';
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored === 'dark' || stored === 'light' ? stored : 'system';
	} catch {
		return 'system';
	}
}

class ThemeStore {
	/** The user's choice: 'light', 'dark', or 'system'. */
	current = $state<Theme>(readInitial());

	private apply() {
		if (!browser) return;
		document.documentElement.dataset.theme = resolve(this.current);
		try {
			if (this.current === 'system') {
				localStorage.removeItem(STORAGE_KEY);
			} else {
				localStorage.setItem(STORAGE_KEY, this.current);
			}
		} catch {
			// Storage can be unavailable (private browsing, quota) — theme still
			// works for the session, it just won't persist. Not worth surfacing.
		}
	}

	toggle() {
		this.current = resolve(this.current) === 'dark' ? 'light' : 'dark';
		this.apply();
	}

	set(theme: Theme) {
		this.current = theme;
		this.apply();
	}

	/** Called once on mount to keep the applied appearance in sync with OS
	 * changes while the user has 'system' selected. */
	watchSystem(): () => void {
		if (!browser) return () => {};
		const mql = window.matchMedia('(prefers-color-scheme: dark)');
		const onChange = () => {
			if (this.current === 'system') this.apply();
		};
		mql.addEventListener('change', onChange);
		return () => mql.removeEventListener('change', onChange);
	}
}

export const theme = new ThemeStore();
