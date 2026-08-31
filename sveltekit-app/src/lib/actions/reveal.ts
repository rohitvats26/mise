import { browser } from '$app/environment';

interface RevealOptions {
	/** Extra delay in ms, useful for staggering a list of elements. */
	delay?: number;
}

/**
 * Svelte action: fades + lifts an element into place the first time it
 * scrolls into view. Falls back to always-visible during SSR and when
 * IntersectionObserver isn't available. `prefers-reduced-motion` is
 * handled globally in app.css (`[data-reveal]` rules), not here.
 */
export function reveal(node: HTMLElement, options: RevealOptions = {}) {
	if (!browser || typeof IntersectionObserver === 'undefined') {
		node.dataset.reveal = 'in';
		return {};
	}

	node.dataset.reveal = 'out';
	const delay = options.delay ?? 0;

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					window.setTimeout(() => {
						node.dataset.reveal = 'in';
					}, delay);
					observer.unobserve(node);
				}
			}
		},
		{ threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
	);

	observer.observe(node);

	return {
		destroy() {
			observer.disconnect();
		}
	};
}
