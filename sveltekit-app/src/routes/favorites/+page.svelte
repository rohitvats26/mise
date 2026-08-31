<script lang="ts">
	import { goto } from '$app/navigation';
	import { reveal } from '$lib/actions/reveal';
	import { favorites } from '$lib/stores/favorites.svelte';

	let query = $state('');
	let searchBarKey = $state(0);

	const PAGE_SIZE = 15;
	let visibleCount = $state(PAGE_SIZE);

	let filtered = $derived(
		query.trim()
			? favorites.items.filter((r) => r.name.toLowerCase().includes(query.trim().toLowerCase()))
			: favorites.items
	);
	let visible = $derived(filtered.slice(0, visibleCount));
	let hasMore = $derived(visibleCount < filtered.length);

	$effect(() => {
		query;
		visibleCount = PAGE_SIZE;
	});

	function onSearchSubmit(e: CustomEvent<{ query: string }>) {
		query = e.detail.query;
	}

	function clearSearch() {
		query = '';
		searchBarKey += 1;
	}

	function loadMore() {
		visibleCount += PAGE_SIZE;
	}

	function onFavoriteToggle(e: CustomEvent<{ recipeId: string }>) {
		favorites.remove(e.detail.recipeId);
	}

	function onCardSelect(e: CustomEvent<{ recipeId: string }>) {
		goto(`/recipe/${e.detail.recipeId}`);
	}
</script>

<svelte:head>
	<title>mise — Favorites</title>
</svelte:head>

<header class="rg-page-head">
	<span class="eyebrow">Your saved collection</span>
	<h1 class="rg-display-1">The ones worth cooking again</h1>
	<p class="rg-lede">Tap the heart on any recipe to keep it here, then pin it to your weekly plan.</p>
</header>

{#if favorites.items.length === 0}
	<div class="rg-empty" use:reveal>
		<div class="rg-empty-card">
			<div class="rg-empty-icon">
				<svg viewBox="0 0 64 64" aria-hidden="true">
					<defs>
						<linearGradient id="heartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
							<stop offset="0%" stop-color="var(--color-accent)" />
							<stop offset="100%" stop-color="var(--color-primary)" />
						</linearGradient>
					</defs>
					<!-- Glow -->
					<circle cx="32" cy="32" r="24" fill="url(#heartGrad)" fill-opacity="0.08" />
					<!-- Heart -->
					<path
						d="M32 52 C32 52 12 38 12 26 C12 18 20 12 28 14.4 C32 15.6 34 18.4 34 22 C34 18.4 36 15.6 40 14.4 C48 12 56 18 56 26 C56 38 36 52 32 52 Z"
						fill="url(#heartGrad)"
						fill-opacity="0.25"
						stroke="url(#heartGrad)"
						stroke-width="2.5"
						stroke-linejoin="round"
					/>
				</svg>
			</div>
			<h2 class="rg-empty-title">No favourites yet?</h2>
			<p class="rg-empty-subtitle">Tap the heart on any recipe card to keep it here for later.</p>
			<a class="rg-empty-cta" href="/discover">
				Browse recipes
				<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<path d="M5 12h14M12 5l7 7-7 7" />
				</svg>
			</a>
		</div>
	</div>
{:else}
	<div class="rg-toolbar" use:reveal>
		{#key searchBarKey}
			<rc-search-bar placeholder="Search your favorites…" onsearchSubmit={onSearchSubmit}></rc-search-bar>
		{/key}
		<div class="rg-results-row">
			<span class="rg-results-count">{filtered.length} recipe{filtered.length === 1 ? '' : 's'}</span>
			{#if query.trim()}
				<button type="button" class="rg-clear-btn" onclick={clearSearch}>
					Clear search
					<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
						<path d="M18 6 6 18M6 6l12 12" />
					</svg>
				</button>
			{/if}
		</div>
	</div>

	{#if filtered.length === 0}
		<p class="rg-status" use:reveal>Nothing matches "{query.trim()}". Try a different search.</p>
	{:else}
		<div class="rg-grid">
			{#each visible as recipe, i (recipe.id)}
				<div class="grid-item" use:reveal={{ delay: (i % 6) * 60 }}>
					<rc-recipe-card
						recipe-id={recipe.id}
						name={recipe.name}
						image={recipe.image}
						category={recipe.category}
						is-favorite={true}
						onfavoriteToggle={onFavoriteToggle}
						oncardSelect={onCardSelect}
					></rc-recipe-card>
				</div>
			{/each}
		</div>

		{#if hasMore}
			<div class="rg-load-more-row">
				<button class="rg-load-more-btn" onclick={loadMore}>Load more recipes</button>
			</div>
		{/if}
	{/if}
{/if}

<!-- No page-local styles: header, toolbar, grid, load-more, and empty-state
     styling all live in the shared .rg-* rules in app.css. -->
