<script lang="ts">
	import { goto } from '$app/navigation';
	import { reveal } from '$lib/actions/reveal';
	import { estimateMinutes } from '$lib/instructions';
	import { favorites } from '$lib/stores/favorites.svelte';
	import { userRecipes } from '$lib/stores/userRecipes.svelte';

	let query = $state('');
	let searchBarKey = $state(0);

	const PAGE_SIZE = 12;
	let visibleCount = $state(PAGE_SIZE);

	let filtered = $derived(
		query.trim()
			? userRecipes.items.filter((r) => r.name.toLowerCase().includes(query.trim().toLowerCase()))
			: userRecipes.items
	);
	let visible = $derived(filtered.slice(0, visibleCount));
	let hasMore = $derived(visibleCount < filtered.length);

	// Reset pagination whenever the search query changes.
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

	function openRecipe(id: string) {
		goto(`/recipe/${id}`);
	}

	function deleteRecipe(e: MouseEvent, id: string, name: string) {
		e.stopPropagation();
		if (confirm(`Delete "${name}"? This can't be undone.`)) {
			userRecipes.remove(id);
			favorites.remove(id);
		}
	}
</script>

<svelte:head>
	<title>mise — My Recipes</title>
</svelte:head>

<header class="rg-page-head" use:reveal>
	<span class="eyebrow">Your kitchen</span>
	<h1 class="rg-display-1">Recipes you've written</h1>
	<p class="rg-lede">Everything you've added yourself, all in one place — edit, delete, or write a new one.</p>
</header>

{#if userRecipes.items.length === 0}
	<div class="rg-empty" use:reveal>
		<div class="rg-empty-card">
			<div class="rg-empty-icon">
				<svg viewBox="0 0 64 64" aria-hidden="true">
					<defs>
						<linearGradient id="bookGrad" x1="0%" y1="0%" x2="100%" y2="100%">
							<stop offset="0%" stop-color="var(--color-accent)" />
							<stop offset="100%" stop-color="var(--color-primary)" />
						</linearGradient>
					</defs>
					<path
						d="M32 52 C32 52 12 38 12 26 C12 18 20 12 28 14.4 C32 15.6 34 18.4 34 22 C34 18.4 36 15.6 40 14.4 C48 12 56 18 56 26 C56 38 36 52 32 52 Z"
						fill="url(#bookGrad)"
						fill-opacity="0.12"
						stroke="url(#bookGrad)"
						stroke-width="2.5"
						stroke-linejoin="round"
					/>
					<path d="M22 26h20M22 33h20M22 40h12" stroke="url(#bookGrad)" stroke-width="2" stroke-linecap="round" />
				</svg>
			</div>
			<h2 class="rg-empty-title">No recipes yet</h2>
			<p class="rg-empty-subtitle">Write down the first one — you can always come back and edit it later.</p>
			<a class="rg-empty-cta" href="/recipe/new">
				Add your first recipe
				<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<path d="M5 12h14M12 5l7 7-7 7" />
				</svg>
			</a>
		</div>
	</div>
{:else}
	<div class="rg-toolbar" use:reveal>
		{#key searchBarKey}
			<rc-search-bar placeholder="Search your recipes…" onsearchSubmit={onSearchSubmit}></rc-search-bar>
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
			<a class="add-recipe-btn" href="/recipe/new">
				<span class="add-icon" aria-hidden="true">+</span>
				Add New Recipe
			</a>
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
						secondary-badge="Mine"
						meta={`${estimateMinutes(recipe)}m${recipe.area ? ` · ${recipe.area}` : ''}`}
						is-favorite={favorites.isFavorite(recipe.id)}
						onfavoriteToggle={() => favorites.toggle(recipe)}
						oncardSelect={() => openRecipe(recipe.id)}
					>
						<a class="rg-mini-btn" slot="actions" href={`/recipe/${recipe.id}/edit`} onclickcapture={(e) => e.stopPropagation()}>Edit</a>
						<button class="rg-mini-btn danger" slot="actions" onclickcapture={(e) => deleteRecipe(e, recipe.id, recipe.name)}>Delete</button>
					</rc-recipe-card>
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

<style>
	/* Page-specific only — shared header/toolbar/grid/load-more/empty-state
	 * and the mini-btn action styling all live in the .rg-* rules in
	 * app.css. This page's one local addition is the "Add New Recipe" CTA,
	 * which doesn't appear on any other recipe-grid page. */
	.add-recipe-btn {
		display: inline-flex;
		align-items: center;
		gap: 9px;
		margin-left: auto;
		border: 1.5px solid var(--color-line);
		background: var(--color-surface);
		color: var(--color-ink);
		text-decoration: none;
		border-radius: 999px;
		padding: 9px 18px 9px 10px;
		font-size: 0.86rem;
		font-weight: 600;
		white-space: nowrap;
		transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
	}

	.add-recipe-btn:hover {
		border-color: var(--color-accent-bright);
		color: var(--color-accent-bright);
		background: var(--color-surface-raised);
	}

	.add-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: var(--color-accent-bright);
		color: #fdf9ef;
		font-size: 1.05rem;
		line-height: 1;
	}

	@media (max-width: 480px) {
		.add-recipe-btn {
			margin-left: 0;
		}
	}
</style>
