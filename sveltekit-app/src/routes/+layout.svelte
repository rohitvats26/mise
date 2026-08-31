<script lang="ts">
	import { onMount } from 'svelte';
	import { page, navigating } from '$app/state';
	import '../app.css';
	import miseLogo from '$lib/assets/mise-logo.png';
	import { theme } from '$lib/stores/theme.svelte';
    import { browser } from '$app/environment';
	// Side-effect imports...
	if (browser) {
    	import('@nagp/recipe-ui/rc-recipe-card');
    	import '@nagp/recipe-ui/rc-recipe-card';
    	import('@nagp/recipe-ui/rc-star-rating');
    	import '@nagp/recipe-ui/rc-star-rating';
    	import('@nagp/recipe-ui/rc-search-bar');
    	import '@nagp/recipe-ui/rc-search-bar';
    	import('@nagp/recipe-ui/rc-photo-carousel');
    	import '@nagp/recipe-ui/rc-photo-carousel';
}

	let { children } = $props();
	let navOpen = $state(false);

	// Keeps the applied appearance in sync with OS-level light/dark changes
	// while the user has 'system' selected.
	onMount(() => theme.watchSystem());

	let showRouteLoader = $state(false);
	$effect(() => {
		if (navigating.to) {
			const timer = setTimeout(() => (showRouteLoader = true), 150);
			return () => {
				clearTimeout(timer);
				showRouteLoader = false;
			};
		}
		showRouteLoader = false;
	});

	const links = [
		{ href: '/', label: 'Home' },
		{ href: '/discover', label: 'Discover' },
		{ href: '/favorites', label: 'Favorites' },
		{ href: '/meal-plan', label: 'Meal Plan' },
		{ href: '/my-recipes', label: 'My Recipes' },
		{ href: '/recipe/new', label: 'Add Recipe' }
	];

	const primaryLinks = [
		{ href: '/discover', label: 'Discover' },
		{ href: '/meal-plan', label: 'Meal plan' },
		{ href: '/favorites', label: 'Favorites' }
	];

	function isActive(href: string) {
		if (href === '/discover') return page.url.pathname === '/' || page.url.pathname.startsWith('/discover');
		if (href === '/recipe/new') return page.url.pathname === '/recipe/new';
		return page.url.pathname.startsWith(href);
	}
</script>

<svelte:head>
	<link rel="icon" href={miseLogo} />
</svelte:head>

<div class="grain" aria-hidden="true"></div>

{#if showRouteLoader}
	<div class="route-loader" role="status" aria-live="polite" aria-label="Loading page">
		<span class="route-loader-bar" aria-hidden="true"></span>
	</div>
{/if}

<div class="app-shell">
	<header>
		<div class="header-row">
			<a class="brand" href="/" onclick={() => (navOpen = false)}>
				<img class="brand-logo" src={miseLogo} alt="" aria-hidden="true" width="40" height="40" />
				<span class="brand-name">mise</span>
			</a>

			<nav class="nav-desktop" aria-label="Primary">
				{#each primaryLinks as link (link.href)}
					<a href={link.href} class:active={isActive(link.href)} aria-current={isActive(link.href) ? 'page' : undefined}>{link.label}</a>
				{/each}
			</nav>

			<div class="header-actions">
				<a class="my-recipes-btn" href="/my-recipes" class:active={isActive('/my-recipes')} aria-current={isActive('/my-recipes') ? 'page' : undefined}>
					<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4-7 4V4.5a1 1 0 0 1 1-1Z" />
					</svg>
					My recipes
				</a>

				<!-- MINIMAL THEME SWITCHER (desktop) -->
				<div class="theme-minimal" data-theme={theme.current}>
					<div class="theme-thumb" aria-hidden="true"></div>

					<button
						class="theme-minimal-btn theme-minimal-system"
						role="radio"
						aria-checked={theme.current === 'system'}
						onclick={() => theme.set('system')}
						aria-label="Use system theme"
						title="System theme"
					>
						<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<rect x="3" y="4" width="18" height="12" rx="2" />
							<path d="M12 16v4M8 20h8" />
						</svg>
					</button>

					<button
						class="theme-minimal-btn theme-minimal-light"
						role="radio"
						aria-checked={theme.current === 'light'}
						onclick={() => theme.set('light')}
						aria-label="Switch to light theme"
						title="Light theme"
					>
						<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<circle cx="12" cy="12" r="4" />
							<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
						</svg>
					</button>

					<button
						class="theme-minimal-btn theme-minimal-dark"
						role="radio"
						aria-checked={theme.current === 'dark'}
						onclick={() => theme.set('dark')}
						aria-label="Switch to dark theme"
						title="Dark theme"
					>
						<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
						</svg>
					</button>
				</div>

				<button
					class="nav-toggle"
					aria-label={navOpen ? 'Close menu' : 'Open menu'}
					aria-expanded={navOpen}
					onclick={() => (navOpen = !navOpen)}
				>
					{#if navOpen}
						<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M18 6 6 18" />
							<path d="m6 6 12 12" />
						</svg>
					{:else}
						<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M4 12h16" />
							<path d="M4 18h16" />
							<path d="M4 6h16" />
						</svg>
					{/if}
				</button>
			</div>
		</div>

		{#if navOpen}
			<nav class="nav-mobile" aria-label="Primary">
				{#each links as link (link.href)}
					<a href={link.href} class:active={isActive(link.href)} onclick={() => (navOpen = false)}>{link.label}</a>
				{/each}

				<!-- MINIMAL THEME SWITCHER (mobile) -->
				<div class="theme-minimal-mobile">
					<div class="theme-minimal" data-theme={theme.current}>
						<div class="theme-thumb" aria-hidden="true"></div>

						<button
							class="theme-minimal-btn theme-minimal-system"
							role="radio"
							aria-checked={theme.current === 'system'}
							onclick={() => theme.set('system')}
							aria-label="Use system theme"
							title="System theme"
						>
							<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<rect x="3" y="4" width="18" height="12" rx="2" />
								<path d="M12 16v4M8 20h8" />
							</svg>
						</button>

						<button
							class="theme-minimal-btn theme-minimal-light"
							role="radio"
							aria-checked={theme.current === 'light'}
							onclick={() => theme.set('light')}
							aria-label="Switch to light theme"
							title="Light theme"
						>
							<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<circle cx="12" cy="12" r="4" />
								<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
							</svg>
						</button>

						<button
							class="theme-minimal-btn theme-minimal-dark"
							role="radio"
							aria-checked={theme.current === 'dark'}
							onclick={() => theme.set('dark')}
							aria-label="Switch to dark theme"
							title="Dark theme"
						>
							<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
							</svg>
						</button>
					</div>
				</div>
			</nav>
		{/if}
	</header>

	<main>
		{@render children()}
	</main>

	<footer>
		<div class="footer-inner">
			<span class="eyebrow footer-eyebrow">A kitchen journal</span>
			<p class="footer-line">
				Cook with <em class="accent">intention</em>. Eat with <em>memory</em>.
			</p>

			<div class="footer-bottom">
				<nav class="footer-nav" aria-label="Footer">
					{#each links as link (link.href)}
						<a href={link.href} class:active={isActive(link.href)}>{link.label}</a>
					{/each}
				</nav>
				<span class="footer-copy">© 2026 mise — Recipes from TheMealDB</span>
			</div>
		</div>
	</footer>
</div>

<style>
	.app-shell {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	.route-loader {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 100;
		height: 3px;
		background: color-mix(in srgb, var(--color-sage) 18%, transparent);
		overflow: hidden;
	}

	.route-loader-bar {
		display: block;
		height: 100%;
		width: 40%;
		background: var(--color-accent);
		border-radius: 999px;
		animation: route-loader-sweep 1.1s ease-in-out infinite;
	}

	@keyframes route-loader-sweep {
		0% {
			transform: translateX(-100%);
		}
		50% {
			transform: translateX(60%);
		}
		100% {
			transform: translateX(250%);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.route-loader-bar {
			animation: none;
			width: 100%;
		}
	}

	header {
		position: sticky;
		top: 0;
		z-index: 50;
		background: var(--color-surface-raised);
		border-bottom: 1px solid var(--color-line);
	}

	.header-row {
		max-width: 1400px;
		margin: 0 auto;
		padding: 20px 24px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 14px;
	}

	.my-recipes-btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		border: 1px solid var(--color-line-strong);
		border-radius: 8px;
		padding: 9px 16px;
		font-size: 0.78rem;
		font-weight: 500;
		color: var(--color-ink);
		text-decoration: none;
		white-space: nowrap;
		transition: border-color 0.2s ease, background 0.2s ease;
	}

	.my-recipes-btn:hover {
		border-color: var(--color-sage);
		background: var(--color-surface);
	}

	.my-recipes-btn.active {
		border-color: var(--color-sage);
		background: var(--color-surface);
		color: var(--color-ink);
		font-weight: 600;
	}

	/* ===== MINIMAL THEME SWITCHER ===== */
	.theme-minimal {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 3px;
		background: var(--color-bg);
		border-radius: 10px;
		border: 1px solid color-mix(in srgb, var(--color-line-strong) 70%, transparent);
		box-shadow:
			inset 0 1px 3px rgba(0, 0, 0, 0.04),
			0 1px 2px rgba(0, 0, 0, 0.02);
		transition: border-color 0.3s ease;
	}

	.theme-minimal:hover {
		border-color: color-mix(in srgb, var(--color-sage) 35%, var(--color-line-strong));
	}

	/* Sliding puck that tracks the active option */
	.theme-thumb {
		position: absolute;
		top: 3px;
		left: 3px;
		width: 32px;
		height: 28px;
		border-radius: 7px;
		background: var(--color-surface-raised);
		box-shadow:
			0 2px 6px rgba(0, 0, 0, 0.08),
			0 1px 2px rgba(0, 0, 0, 0.04);
		transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
		pointer-events: none;
		z-index: 0;
	}

	.theme-minimal[data-theme='light'] .theme-thumb {
		transform: translateX(36px);
	}

	.theme-minimal[data-theme='dark'] .theme-thumb {
		transform: translateX(72px);
		background: color-mix(in srgb, var(--color-bg-deep) 80%, var(--color-sage) 20%);
	}

	.theme-minimal-btn {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 28px;
		border: none;
		background: transparent;
		color: color-mix(in srgb, var(--color-ink-muted) 60%, transparent);
		cursor: pointer;
		border-radius: 7px;
		transition: color 0.2s ease, transform 0.15s ease;
		padding: 0;
	}

	.theme-minimal-btn:hover {
		color: var(--color-ink);
	}

	.theme-minimal-btn:active {
		transform: scale(0.88);
	}

	.theme-minimal-btn:focus-visible {
		outline: none;
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent) 30%, transparent);
	}

	.theme-minimal-btn svg {
		width: 15px;
		height: 15px;
		transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.theme-minimal-btn[aria-checked='true'] {
		color: var(--color-accent);
	}

	.theme-minimal[data-theme='dark'] .theme-minimal-btn[aria-checked='true'] {
		color: var(--color-sage);
	}

	/* Small per-icon personality on activation */
	.theme-minimal-light[aria-checked='true'] svg {
		transform: rotate(90deg) scale(1.1);
	}

	.theme-minimal-dark[aria-checked='true'] svg {
		transform: scale(1.1) rotate(-8deg);
	}

	.theme-minimal-system[aria-checked='true'] svg {
		transform: scale(1.1);
	}

	@media (prefers-reduced-motion: reduce) {
		.theme-thumb,
		.theme-minimal-btn svg {
			transition: none;
		}
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 6px;
		text-decoration: none;
		color: var(--color-ink);
	}

	.brand-logo {
		display: block;
		width: 60px;
		height: 40px;
		flex-shrink: 0;
		object-fit: contain;
	}

	.brand-name {
		font-family: var(--font-display);
		font-style: normal;
		font-weight: 600;
		font-size: 1.55rem;
		letter-spacing: -0.01em;
		text-transform: lowercase;
	}

	.nav-desktop {
		display: flex;
		align-items: center;
		gap: 28px;
	}

	.nav-desktop a {
		position: relative;
		text-decoration: none;
		color: var(--color-ink-muted);
		font-size: 0.82rem;
		font-weight: 500;
		letter-spacing: 0;
		text-transform: none;
		padding-bottom: 4px;
		transition: color 0.2s ease;
	}

	.nav-desktop a::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 2px;
		background: var(--color-sage);
		transform: scaleX(0);
		transform-origin: right;
		transition: transform 0.25s ease;
	}

	.nav-desktop a:hover {
		color: var(--color-ink);
	}

	.nav-desktop a:hover::after,
	.nav-desktop a.active::after {
		transform: scaleX(1);
		transform-origin: left;
	}

	.nav-desktop a.active {
		color: var(--color-ink);
		font-weight: 600;
	}

	.nav-mobile a,
	.footer-nav a {
		text-decoration: none;
		color: color-mix(in srgb, var(--color-ink) 70%, transparent);
		font-size: 0.7rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		transition: color 0.2s ease;
	}

	.nav-mobile a:hover,
	.footer-nav a:hover {
		color: var(--color-ink);
	}

	.nav-mobile a.active,
	.footer-nav a.active {
		color: var(--color-ink);
	}

	.nav-toggle {
		display: none;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border: 1px solid var(--color-line-strong);
		background: transparent;
		color: var(--color-ink);
		cursor: pointer;
	}

	.nav-mobile {
		display: none;
	}

	main {
		flex: 1;
	}

	footer {
		border-top: 1px solid var(--color-line);
		background-color: var(--color-surface-raised);

	}

	.footer-inner {
		max-width: 1500px;
		margin: 0 auto;
		padding: 64px 24px 96px;
	}

	.footer-eyebrow {
		letter-spacing: 0.2em;
	}

	.footer-line {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: clamp(2.25rem, 5vw, 3.75rem);
		line-height: 1.25;
		letter-spacing: -0.02em;
		max-width: 42rem;
		margin: 24px 0 0;
		color: var(--color-ink);
	}

	.footer-line em {
		font-style: italic;
	}

	.footer-line em.accent {
		color: var(--color-accent);
	}

	.footer-bottom {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: 32px;
		border-top: 1px solid var(--color-line);
		padding-top: 32px;
		margin-top: 56px;
	}

	.footer-nav {
		display: flex;
		flex-wrap: wrap;
		column-gap: 32px;
		row-gap: 12px;
	}

	.footer-copy {
		font-size: 0.7rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-ink-muted);
	}

	@media (min-width: 768px) {
		.header-row {
			padding: 20px 48px;
		}

		.footer-inner {
			padding: 64px 48px 96px;
		}

		.footer-bottom {
			flex-direction: row;
			align-items: center;
		}
	}

	@media (max-width: 767px) {
		.nav-desktop {
			display: none;
		}

		.my-recipes-btn {
			font-size: 0;
			padding: 9px;
			gap: 0;
		}

		.my-recipes-btn svg {
			flex-shrink: 0;
		}

		.nav-toggle {
			display: flex;
		}

		.nav-mobile {
			display: flex;
			flex-direction: column;
			gap: 2px;
			padding: 4px 24px 20px;
		}

		.nav-mobile a {
			padding: 12px 4px;
			border-bottom: 1px solid var(--color-line);
			color: var(--color-ink);
		}
	}

	/* ===== MOBILE THEME SWITCHER ===== */
	.theme-minimal-mobile {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px 0;
		border-bottom: 1px solid var(--color-line);
		margin-top: 8px;
	}

	.theme-minimal-mobile .theme-minimal {
		padding: 2px;
	}

	.theme-minimal-mobile .theme-thumb {
		top: 2px;
		left: 2px;
		width: 30px;
		height: 26px;
	}

	.theme-minimal-mobile .theme-minimal[data-theme='light'] .theme-thumb {
		transform: translateX(34px);
	}

	.theme-minimal-mobile .theme-minimal[data-theme='dark'] .theme-thumb {
		transform: translateX(68px);
	}

	.theme-minimal-mobile .theme-minimal-btn {
		width: 30px;
		height: 26px;
	}

	.theme-minimal-mobile .theme-minimal-btn svg {
		width: 13px;
		height: 13px;
	}
	/* ================================= */
</style>