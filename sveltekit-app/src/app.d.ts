// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

// Ambient typing for the published @nagp/recipe-ui web components so
// Svelte's template type-checker accepts their tags, props, and custom events.
// See https://svelte.dev/docs/svelte/custom-elements#Typing-custom-elements
declare namespace svelteHTML {
	interface IntrinsicElements {
		'rc-recipe-card': {
			'recipe-id': string;
			name: string;
			image?: string;
			category?: string;
			'is-favorite'?: boolean;
			variant?: 'default' | 'featured';
			onfavoriteToggle?: (e: CustomEvent<{ recipeId: string; isFavorite: boolean }>) => void;
			oncardSelect?: (e: CustomEvent<{ recipeId: string }>) => void;
		};
		'rc-star-rating': {
			value?: number;
			max?: number;
			readonly?: boolean;
			onratingChange?: (e: CustomEvent<{ value: number }>) => void;
		};
		'rc-search-bar': {
			value?: string;
			placeholder?: string;
			onsearchInput?: (e: CustomEvent<{ query: string }>) => void;
			onsearchSubmit?: (e: CustomEvent<{ query: string }>) => void;
		};
		'rc-photo-carousel': {
			images?: string[];
			alt?: string;
			label?: string;
			'active-index'?: number;
			'show-counter'?: boolean;
			'show-thumbs'?: boolean;
			'counter-position'?: 'top-right' | 'bottom-right';
			'thumbs-layout'?: 'overlay' | 'inline';
			onslideChange?: (e: CustomEvent<{ index: number }>) => void;
		};
	}
}

export {};
