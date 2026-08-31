<script lang="ts">
	import { goto } from '$app/navigation';
	import { reveal } from '$lib/actions/reveal';
	import { browseDefault, filterByArea, filterByCategory, searchRecipes } from '$lib/api/mealdb';
	import { estimateMinutes } from '$lib/instructions';
	import { favorites } from '$lib/stores/favorites.svelte';
	import { userRecipes } from '$lib/stores/userRecipes.svelte';
	import type { Recipe } from '$lib/types';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// svelte-ignore state_referenced_locally -- intentional: these seed local,
	// user-mutable state from the initial load result. Client-side handlers
	// below (loadDefault, onSearchSubmit, onCategoryChange, ...) subsequently
	// own and reassign them directly; they're not meant to stay synced to `data`.
	let recipes = $state<Recipe[]>(data.recipes); // global (TheMealDB) results
	// svelte-ignore state_referenced_locally -- see above
	let categories = $state<string[]>(data.categories);
	// svelte-ignore state_referenced_locally -- see above
	let areas = $state<string[]>(data.areas);
	let selectedCategory = $state('');
	let selectedArea = $state('');
	// svelte-ignore state_referenced_locally -- see above
	let activeQuery = $state(data.initialQuery);
	let loading = $state(false);
	// svelte-ignore state_referenced_locally -- see above
	let error = $state(data.error);

	type SourceFilter = 'all' | 'mine' | 'global';
	let sourceFilter = $state<SourceFilter>('all');
	let favoritesOnly = $state(false);
	let sortBy = $state<'relevance' | 'name' | 'quick'>('relevance');

	// Bumped whenever filters are cleared, to force rc-search-bar to remount
	// and drop its own internal (uncontrolled) query text.
	let searchBarKey = $state(0);

	// How many global cards are shown before "Load more recipes" is needed.
	// The user's own recipes are never paginated — there's rarely enough of
	// them to need it, and they should always be fully reachable.
	const PAGE_SIZE = 15;
	let visibleCount = $state(PAGE_SIZE);

	const matchesFilters = (r: Recipe) => {
		if (favoritesOnly && !favorites.isFavorite(r.id)) return false;
		if (selectedCategory && r.category !== selectedCategory) return false;
		if (selectedArea && r.area !== selectedArea) return false;
		if (activeQuery && !r.name.toLowerCase().includes(activeQuery.toLowerCase())) return false;
		return true;
	};

	type TaggedRecipe = { recipe: Recipe; source: 'mine' | 'global' };

	function sortTagged(list: TaggedRecipe[]): TaggedRecipe[] {
		if (sortBy === 'name') return [...list].sort((a, b) => a.recipe.name.localeCompare(b.recipe.name));
		if (sortBy === 'quick')
			return [...list].sort((a, b) => estimateMinutes(a.recipe) - estimateMinutes(b.recipe));
		return list;
	}

	// TheMealDB only supports filtering by one of query/category/area per
	// request (see runQuery's priority order above), so whichever dimensions
	// weren't used for the fetch are applied here, client-side, via
	// matchesFilters. That's what makes selecting a search term, a category,
	// and an area together actually narrow results down to recipes matching
	// ALL of them, instead of each new selection wiping out the others.
	let filteredGlobal = $derived(recipes.filter(matchesFilters));
	// The user's own recipes never touched the API, so every filter is applied
	// client-side — this is what actually makes "my recipes" and "global
	// recipes" behave like one merged, filterable collection.
	let filteredMine = $derived(userRecipes.items.filter(matchesFilters));

	let showMine = $derived(sourceFilter !== 'global');
	let showGlobal = $derived(sourceFilter !== 'mine');

	// Mine and global are merged into a single pool and sorted TOGETHER here.
	// Sorting each collection separately and rendering "mine" as its own
	// block above "global" (as this used to do) means the chosen sort only
	// ever reorders within each block — "mine" always stays pinned above
	// "global" regardless of sort — which makes every sort option look
	// broken to anyone who has at least one recipe of their own. Global
	// items are only folded in once the fetch has actually settled; while
	// loading or errored there's nothing real to merge in yet, so the grid
	// shows mine (still fully sorted) plus skeletons/an error message for
	// the global slot instead.
	let sortedItems = $derived(
		sortTagged([
			...(showMine ? filteredMine.map((recipe) => ({ recipe, source: 'mine' as const })) : []),
			...(showGlobal && !loading && !error
				? filteredGlobal.map((recipe) => ({ recipe, source: 'global' as const }))
				: [])
		])
	);

	let visibleItems = $derived(sortedItems.slice(0, visibleCount));
	let hasMore = $derived(visibleItems.length < sortedItems.length);

	let totalShown = $derived(sortedItems.length);
	let isEmpty = $derived(!loading && !error && totalShown === 0);

	let anyFilterActive = $derived(
		!!activeQuery ||
			!!selectedCategory ||
			!!selectedArea ||
			sourceFilter !== 'all' ||
			favoritesOnly ||
			sortBy !== 'relevance'
	);

	// Reset pagination whenever the shape of the visible list changes for a
	// reason other than "fetch a fresh global list" (those handlers already
	// reset it themselves).
	$effect(() => {
		sortBy;
		favoritesOnly;
		sourceFilter;
		visibleCount = PAGE_SIZE;
	});

	// Bumped on every new fetch kicked off by loadDefault/runQuery, so a
	// slow, older request (e.g. a category change that resolves after a
	// subsequent area change) can recognize it's stale and not overwrite
	// `recipes` with out-of-date results.
	let fetchRequestId = 0;

	async function loadDefault() {
		const requestId = ++fetchRequestId;
		loading = true;
		error = '';
		visibleCount = PAGE_SIZE;
		try {
			const results = await browseDefault();
			if (requestId !== fetchRequestId) return;
			recipes = results;
		} catch {
			if (requestId !== fetchRequestId) return;
			error = 'Could not load recipes right now. Please try again.';
		} finally {
			if (requestId === fetchRequestId) loading = false;
		}
	}

	// Search input, category, and area can all be active at once. TheMealDB
	// only supports filtering by ONE of name/category/area per request, so
	// we fetch on whichever dimension is most specific (query first, since
	// name search already returns full per-recipe details; then category;
	// then area — both of which are enriched with full details via
	// enrichWithDetails) and let `matchesFilters` (used by `filteredGlobal`
	// above) narrow the fetched list down by whichever OTHER dimensions are
	// also selected. This is what makes it possible to type a search term
	// *and* pick a category *and* pick an area, and have all three apply
	// together instead of each one clobbering the others.
	async function runQuery() {
		const requestId = ++fetchRequestId;
		loading = true;
		error = '';
		visibleCount = PAGE_SIZE;
		try {
			const results = activeQuery
				? await searchRecipes(activeQuery)
				: selectedCategory
					? await filterByCategory(selectedCategory)
					: selectedArea
						? await filterByArea(selectedArea)
						: await browseDefault();
			if (requestId !== fetchRequestId) return;
			recipes = results;
		} catch {
			if (requestId !== fetchRequestId) return;
			error = 'Search failed. Please try again.';
		} finally {
			if (requestId === fetchRequestId) loading = false;
		}
	}

	async function onSearchSubmit(e: CustomEvent<{ query: string }>) {
		activeQuery = e.detail.query.trim();
		await runQuery();
	}

	async function onCategoryChange(e: Event) {
		selectedCategory = (e.target as HTMLSelectElement).value;
		await runQuery();
	}

	async function onAreaChange(e: Event) {
		selectedArea = (e.target as HTMLSelectElement).value;
		await runQuery();
	}

	function setSourceFilter(value: SourceFilter) {
		sourceFilter = value;
	}

	function toggleFavoritesOnly() {
		favoritesOnly = !favoritesOnly;
	}

	function clearFilters() {
		selectedCategory = '';
		selectedArea = '';
		activeQuery = '';
		sourceFilter = 'all';
		favoritesOnly = false;
		sortBy = 'relevance';
		searchBarKey += 1;
		loadDefault();
	}

	function loadMore() {
		visibleCount += PAGE_SIZE;
	}

	function openRecipe(id: string) {
		goto(`/recipe/${id}`);
	}

	function deleteUserRecipe(e: MouseEvent, id: string, name: string) {
		e.stopPropagation();
		if (confirm(`Delete "${name}"? This can't be undone.`)) {
			userRecipes.remove(id);
			favorites.remove(id);
		}
	}
</script>

{#snippet recipeCard(recipe: Recipe, source: 'mine' | 'global')}
	<div class="grid-item" use:reveal>
		<rc-recipe-card
			recipe-id={recipe.id}
			name={recipe.name}
			image={recipe.image}
			category={recipe.category}
			secondary-badge={source === 'mine' ? 'Mine' : undefined}
			meta={`${estimateMinutes(recipe)}m${recipe.area ? ` · ${recipe.area}` : ''}`}
			is-favorite={favorites.isFavorite(recipe.id)}
			onfavoriteToggle={() => favorites.toggle(recipe)}
			oncardSelect={() => openRecipe(recipe.id)}
		>
			{#if source === 'mine'}
				<a class="rg-mini-btn" slot="actions" href={`/recipe/${recipe.id}/edit`} onclickcapture={(e) => e.stopPropagation()}>Edit</a>
				<button class="rg-mini-btn danger" slot="actions" onclickcapture={(e) => deleteUserRecipe(e, recipe.id, recipe.name)}>Delete</button>
			{/if}
		</rc-recipe-card>
	</div>
{/snippet}

<svelte:head>
	<title>mise — The Index</title>
</svelte:head>

<header class="page-head" use:reveal>
	<span class="eyebrow">The index</span>
	<h1 class="display-1 hero-title">
		Search the <span class="font-italic">whole</span> archive
	</h1>
	<p class="hero-lede">
		Your own kitchen and thousands of dishes from around the world, in one place — filter by
		craving, by category, by curiosity. Save the ones worth repeating.
	</p>
</header>

<div class="toolbar" use:reveal>
	{#key searchBarKey}
		<rc-search-bar placeholder="Search by recipe name…" value={activeQuery} onsearchSubmit={onSearchSubmit}>
			<div class="select-wrap">
				<select onchange={onCategoryChange} value={selectedCategory} aria-label="Filter by category">
					<option value="">All categories</option>
					{#each categories as category (category)}
						<option value={category}>{category}</option>
					{/each}
				</select>
			</div>
			<div class="select-wrap">
				<select onchange={onAreaChange} value={selectedArea} aria-label="Filter by area">
					<option value="">All areas</option>
					{#each areas as area (area)}
						<option value={area}>{area}</option>
					{/each}
				</select>
			</div>
		</rc-search-bar>
	{/key}

	<div class="filter-row">
		<div class="chip-group" role="group" aria-label="Filter by collection">
			<button type="button" class="chip" class:active={sourceFilter === 'all'} onclick={() => setSourceFilter('all')}>
				All recipes
			</button>
			<button type="button" class="chip" class:active={sourceFilter === 'mine'} onclick={() => setSourceFilter('mine')}>
				My kitchen
			</button>
			<button
				type="button"
				class="chip"
				class:active={sourceFilter === 'global'}
				onclick={() => setSourceFilter('global')}
			>
				Global archive
			</button>
		</div>

		<button
			type="button"
			class="chip favorite-chip"
			class:active={favoritesOnly}
			aria-pressed={favoritesOnly}
			onclick={toggleFavoritesOnly}
		>
			<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
				<path
					d="M12 20.2s-7.6-4.6-10.2-9.2C.4 8.1 1.7 4.6 5 3.7c2-.5 4 .3 5.2 2 .3.4.9.4 1.2 0 1.2-1.7 3.2-2.5 5.2-2 3.3.9 4.6 4.4 3.2 7.3-2.6 4.6-10.2 9.2-10.2 9.2z"
					fill={favoritesOnly ? 'currentColor' : 'none'}
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linejoin="round"
				/>
			</svg>
			Favorites only
		</button>

		<div class="select-wrap sort-wrap">
			<select bind:value={sortBy} aria-label="Sort recipes">
				<option value="relevance">Sort: Relevance</option>
				<option value="name">Sort: Name A–Z</option>
				<option value="quick">Sort: Quickest first</option>
			</select>
		</div>

		{#if anyFilterActive}
			<button type="button" class="clear-btn" onclick={clearFilters}>
				Clear filters
				<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
					<path d="M18 6 6 18M6 6l12 12" />
				</svg>
			</button>
		{/if}
	</div>
</div>

<section class="browse" use:reveal>
	<div class="section-head-row">
		<div class="section-head">
			<span class="eyebrow">
				{[
					activeQuery ? `"${activeQuery}"` : '',
					selectedCategory,
					selectedArea
				]
					.filter(Boolean)
					.join(' · ') || 'Your kitchen + the global database'}
			</span>
			<h2 class="display-2">{activeQuery || selectedCategory || selectedArea ? 'Search results' : 'All Recipes'}</h2>
		</div>

		<div class="head-actions">
			{#if !loading && !error}
				<span class="results-count">{totalShown} recipe{totalShown === 1 ? '' : 's'}</span>
			{/if}
			<a class="add-recipe-btn" href="/recipe/new">
				<span class="add-icon" aria-hidden="true">+</span>
				Add New Recipe
			</a>
		</div>
	</div>

	{#if isEmpty}
		<p class="status">Nothing turned up. Try a different search, category, or filter.</p>
	{:else}
		<div class="spread-grid">
			{#each visibleItems as { recipe, source } (recipe.id)}
				{@render recipeCard(recipe, source)}
			{/each}

			{#if showGlobal && loading}
				{#each Array(PAGE_SIZE) as _, i (i)}
					<div class="skeleton-card">
						<div class="skeleton-media"></div>
						<div class="skeleton-line short"></div>
						<div class="skeleton-line"></div>
					</div>
				{/each}
			{/if}
		</div>

		{#if showGlobal && error && !loading}
			<p class="status error">{error}</p>
		{/if}

		{#if hasMore}
			<div class="load-more-row">
				<button class="load-more-btn" onclick={loadMore}>Load more recipes</button>
			</div>
		{/if}
	{/if}
</section>

<style>
	.page-head {
		max-width: var(--content-max);
		margin: 0 auto;
		padding: 64px 28px 40px;
		max-width: 700px;
	}

	.hero-title {
		font-size: clamp(2.2rem, 4.6vw, 3.4rem);
		margin: 18px 0 20px;
	}

	.hero-lede {
		color: var(--color-ink-muted);
		font-size: 1.05rem;
		line-height: 1.6;
		max-width: 50ch;
		margin: 0;
	}

	.toolbar {
		max-width: var(--content-max);
		margin: 0 auto;
		padding: 0 28px 8px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.select-wrap {
		position: relative;
	}

	.select-wrap::after {
		content: '';
		position: absolute;
		right: 13px;
		top: 50%;
		width: 7px;
		height: 7px;
		border-right: 1.6px solid var(--color-ink-muted);
		border-bottom: 1.6px solid var(--color-ink-muted);
		transform: translateY(-70%) rotate(45deg);
		pointer-events: none;
	}

	.select-wrap select {
		appearance: none;
		padding: 13px 34px 13px 16px;
		border-radius: var(--radius-md);
		border: 1.5px solid var(--color-line);
		background: var(--color-surface);
		font-family: var(--font-body);
		color: var(--color-ink);
		font-size: 0.88rem;
		font-weight: 500;
		cursor: pointer;
	}

	/* ---- Filter row: source chips, favorites toggle, sort, clear ---- */
	.filter-row {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 10px;
	}

	.chip-group {
		display: inline-flex;
		gap: 6px;
		padding: 4px;
		background: var(--color-bg-deep);
		border-radius: 999px;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		border: 1.5px solid transparent;
		background: transparent;
		color: var(--color-ink-muted);
		font-family: var(--font-body);
		font-size: 0.82rem;
		font-weight: 600;
		padding: 8px 14px;
		border-radius: 999px;
		cursor: pointer;
		white-space: nowrap;
		transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
	}

	.chip-group .chip.active {
		background: var(--color-surface-raised);
		color: var(--color-ink);
		box-shadow: 0 1px 3px rgba(20, 16, 8, 0.12);
	}

	.favorite-chip {
		border-color: var(--color-line);
		background: var(--color-surface);
	}

	.favorite-chip.active {
		border-color: var(--color-accent-bright);
		color: var(--color-accent-bright);
		background: color-mix(in srgb, var(--color-accent-bright) 10%, var(--color-surface));
	}

	.favorite-chip:hover {
		border-color: var(--color-accent-bright);
	}

	.sort-wrap {
		margin-left: auto;
	}

	.clear-btn {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		border: none;
		background: none;
		padding: 8px 4px;
		color: var(--color-ink-muted);
		font-size: 0.82rem;
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
	}

	.clear-btn:hover {
		color: var(--color-accent);
	}

	@media (max-width: 640px) {
		.sort-wrap {
			margin-left: 0;
		}
	}

	.browse {
		max-width: var(--content-max);
		margin: 0 auto;
		padding: 44px 28px 8px;
	}

	.section-head {
		margin-bottom: 26px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.section-head-row {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 20px;
		flex-wrap: wrap;
	}

	.section-head-row .section-head {
		margin-bottom: 26px;
	}

	.section-head .display-2 {
		font-size: clamp(1.4rem, 2.4vw, 1.85rem);
	}

	/* ---- Header-right cluster: sits opposite the section title, so
	 * "Add New Recipe" is a persistent page-level action rather than a
	 * tile buried inside the recipe grid. ---- */
	.head-actions {
		display: flex;
		align-items: center;
		gap: 18px;
		margin-bottom: 26px;
	}

	.results-count {
		color: var(--color-ink-muted);
		font-size: 0.86rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.add-recipe-btn {
		display: inline-flex;
		align-items: center;
		gap: 9px;
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
		.section-head-row {
			align-items: flex-start;
		}

		.head-actions {
			flex-direction: column-reverse;
			align-items: flex-start;
			gap: 10px;
		}
	}

	.status {
		margin-top: 20px;
		color: var(--color-ink-muted);
	}

	.status.error {
		color: var(--color-danger);
	}

	/* ---- Unified recipe grid (mine + global together) ---- */
	.spread-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
		gap: 24px;
	}

	/* Recipe cards themselves are the shared <rc-recipe-card> design-system
	 * component (see @nagp/recipe-ui) — only the slotted "actions" buttons
	 * are page-specific markup; their styling (.rg-mini-btn) lives in
	 * app.css since my-recipes' cards use the identical treatment. */

	.load-more-row {
		display: flex;
		justify-content: center;
		margin: 40px 0 24px;
	}

	.load-more-btn {
		border: 1.5px solid var(--color-line);
		background: var(--color-surface);
		color: var(--color-ink);
		border-radius: 999px;
		padding: 13px 28px;
		font-size: 0.88rem;
		font-weight: 600;
		cursor: pointer;
		transition: border-color 0.15s ease, background 0.15s ease;
	}

	.load-more-btn:hover {
		color: var(--color-surface, #fffdf8);
		border-color: var(--color-accent-bright);
		background: var(--color-ink, #211d16);
	}

	.skeleton-card {
		border: 1px solid var(--color-line);
		border-radius: var(--radius-md);
		overflow: hidden;
		background: var(--color-surface);
	}

	.skeleton-media {
		aspect-ratio: 4 / 3;
		background: linear-gradient(90deg, var(--color-bg) 25%, var(--color-line) 37%, var(--color-bg) 63%);
		background-size: 400% 100%;
		animation: shimmer 1.4s ease infinite;
	}

	.skeleton-line {
		height: 12px;
		margin: 16px 4px;
		border-radius: 6px;
		background: linear-gradient(90deg, var(--color-bg) 25%, var(--color-line) 37%, var(--color-bg) 63%);
		background-size: 400% 100%;
		animation: shimmer 1.4s ease infinite;
	}

	.skeleton-line.short {
		width: 50%;
	}

	@keyframes shimmer {
		0% {
			background-position: 100% 0;
		}
		100% {
			background-position: -100% 0;
		}
	}
</style>
