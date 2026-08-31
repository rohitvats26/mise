<script lang="ts">
	import { onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { reveal } from '$lib/actions/reveal';
	import { searchRecipes } from '$lib/api/mealdb';
	import { favorites } from '$lib/stores/favorites.svelte';
	import { userRecipes } from '$lib/stores/userRecipes.svelte';
	import { mealPlan } from '$lib/stores/mealPlan.svelte';
	import { DAYS, type Day, type Recipe } from '$lib/types';

	// Which day's "add a recipe" picker is currently open, if any.
	let pickerOpenFor = $state<Day | null>(null);
	let searchQuery = $state('');
	let remoteResults = $state<Recipe[]>([]);
	let searching = $state(false);
	let searchError = $state('');
	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	// Bumped on every new search kicked off, so a slow, older request that
	// resolves after a newer one can recognize it's stale and not overwrite
	// remoteResults with out-of-date results.
	let searchRequestId = 0;

	onDestroy(() => {
		if (searchTimer) clearTimeout(searchTimer);
	});

	/** Every recipe already known locally — favorites plus recipes the user
	 * has created themselves — deduped by id. This is always available with
	 * no network round trip, so it's what the picker shows before/without a
	 * search query. */
	let knownRecipes = $derived.by(() => {
		const seen = new Map<string, Recipe>();
		for (const r of favorites.items) seen.set(r.id, r);
		for (const r of userRecipes.items) seen.set(r.id, r);
		return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
	});

	let localMatches = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return knownRecipes;
		return knownRecipes.filter((r) => r.name.toLowerCase().includes(q));
	});

	/** Local matches first, then any remote (TheMealDB) results not already
	 * covered locally — so the whole recipe index is reachable from here,
	 * not just favorites. */
	let pickerResults = $derived.by(() => {
		const localIds = new Set(localMatches.map((r) => r.id));
		return [...localMatches, ...remoteResults.filter((r) => !localIds.has(r.id))];
	});

	function openPicker(day: Day) {
		pickerOpenFor = day;
		searchQuery = '';
		remoteResults = [];
		searchError = '';
		searchRequestId++;
		if (searchTimer) clearTimeout(searchTimer);
	}

	function closePicker() {
		pickerOpenFor = null;
		searchQuery = '';
		remoteResults = [];
		searchError = '';
		searchRequestId++;
		if (searchTimer) clearTimeout(searchTimer);
	}

	/** Debounced live search against the full TheMealDB catalog, so recipes
	 * that aren't favorited or user-created can still be pinned. */
	function onSearchInput() {
		if (searchTimer) clearTimeout(searchTimer);
		const q = searchQuery.trim();
		if (q.length < 2) {
			remoteResults = [];
			searching = false;
			searchError = '';
			return;
		}
		const requestId = ++searchRequestId;
		searchTimer = setTimeout(async () => {
			searching = true;
			searchError = '';
			try {
				const results = await searchRecipes(q);
				if (requestId !== searchRequestId) return; // a newer search has since started
				remoteResults = results;
			} catch {
				if (requestId !== searchRequestId) return;
				searchError = 'Search failed. Please try again.';
			} finally {
				if (requestId === searchRequestId) searching = false;
			}
		}, 350);
	}

	/** Pins a recipe to the day, then clears the query so the picker stays
	 * open and ready — pinning several recipes to the same day in a row
	 * shouldn't require reopening the picker each time. */
	function addRecipe(day: Day, recipe: Recipe) {
		mealPlan.add(day, recipe);
		searchQuery = '';
		remoteResults = [];
	}

	function removeEntry(day: Day, entryId: string) {
		mealPlan.remove(day, entryId);
	}

	function clearDay(day: Day) {
		if (confirm(`Clear all recipes pinned to ${day}?`)) {
			mealPlan.clearDay(day);
		}
	}

	function clearAll() {
		if (confirm('Clear the entire week? This removes every recipe pinned to every day.')) {
			mealPlan.clearAll();
		}
	}

	function openRecipe(id: string) {
		goto(`/recipe/${id}`);
	}

	let totalPinned = $derived(DAYS.reduce((sum, d) => sum + mealPlan.plan[d].length, 0));
	let filledDayCount = $derived(DAYS.filter((d) => mealPlan.plan[d].length > 0).length);
</script>

<svelte:head>
	<title>mise — Weekly Meal Plan</title>
</svelte:head>

<header class="page-head">
	<span class="eyebrow">The signature board</span>
	<h1 class="display-1">Your week, <span class="font-italic accent">pinned</span> up</h1>
	<p class="lede">Pin as many favorites as you like to any day, unpin any time — nothing here is permanent.</p>
	<div class="stat-row">
		<span class="stat-pill is-accent"><strong>{totalPinned}</strong> recipe{totalPinned === 1 ? '' : 's'} pinned</span>
		<span class="stat-pill"><strong>{filledDayCount}</strong> of 7 days planned</span>
		{#if totalPinned > 0}
			<button class="clear-all-btn" onclick={clearAll}>Clear all</button>
		{/if}
	</div>
</header>

{#if knownRecipes.length === 0}
	<div class="empty-hint" use:reveal>
		<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
			<path
				d="M12 20.2s-7.6-4.6-10.2-9.2C.4 8.1 1.7 4.6 5 3.7c2-.5 4 .3 5.2 2 .3.4.9.4 1.2 0 1.2-1.7 3.2-2.5 5.2-2 3.3.9 4.6 4.4 3.2 7.3-2.6 4.6-10.2 9.2-10.2 9.2z"
			/>
		</svg>
		<span>Search all recipes right from the picker below, or favorite a few for quick access.</span>
		<a href="/discover">Browse the index →</a>
	</div>
{/if}

{#snippet recipePicker(day: Day)}
	<div class="picker">
		<input
			class="picker-search"
			type="text"
			placeholder="Search all recipes…"
			bind:value={searchQuery}
			oninput={onSearchInput}
			aria-label="Search all recipes"
		/>
		<div class="picker-results">
			{#if pickerResults.length > 0}
				{#each pickerResults as recipe (recipe.id)}
					<button class="result-item" onclick={() => addRecipe(day, recipe)}>
						{#if recipe.image}
							<img class="result-thumb" src={recipe.image} alt="" loading="lazy" />
						{:else}
							<span class="result-thumb result-thumb-placeholder" aria-hidden="true"></span>
						{/if}
						<span class="result-name">{recipe.name}</span>
						<span class="result-add" aria-hidden="true">+</span>
					</button>
				{/each}
			{:else if searching}
				<span class="picker-hint">Searching…</span>
			{:else if searchError}
				<span class="picker-hint">{searchError}</span>
			{:else if searchQuery.trim().length > 0 && searchQuery.trim().length < 2}
				<span class="picker-hint">Keep typing…</span>
			{:else if searchQuery.trim()}
				<span class="picker-hint">No recipes found.</span>
			{:else}
				<span class="picker-hint">Type to search, or favorite a few for quick access.</span>
			{/if}
		</div>
		<div class="picker-actions">
			<button class="done-btn" onclick={closePicker}>Done</button>
		</div>
	</div>
{/snippet}

<div class="board" use:reveal>
	<div class="week">
		{#each DAYS as day, i (day)}
			{@const entries = mealPlan.plan[day]}
			{@const recipeMeta = (id: string) => knownRecipes.find((r) => r.id === id)}
			<div class="day-col" use:reveal={{ delay: i * 55 }}>
				<div class="day-header">
					<span class="day-rule" aria-hidden="true"></span>
					<span class="day-name" class:has-meals={entries.length > 0}>{day}</span>
				</div>

				{#if entries.length > 0}
					<div class="filled-slot">
						<div class="meal-list">
							{#each entries as entry (entry.entryId)}
								{@const recipe = recipeMeta(entry.recipeId)}
								{@const meta = [recipe?.category, recipe?.servings ? `Serves ${recipe.servings}` : null].filter(Boolean).join(' · ')}
								<div class="meal-card">
									<button class="meal-thumb" onclick={() => openRecipe(entry.recipeId)} aria-label={`View ${entry.recipeName}`}>
										{#if entry.recipeImage}
											<img src={entry.recipeImage} alt="" loading="lazy" />
										{:else}
											<span class="meal-thumb-placeholder" aria-hidden="true"></span>
										{/if}
									</button>
									<div class="meal-info">
										<button class="meal-name" onclick={() => openRecipe(entry.recipeId)}>{entry.recipeName}</button>
										{#if meta}<span class="meal-meta">{meta}</span>{/if}
									</div>
									<button class="meal-remove" onclick={() => removeEntry(day, entry.entryId)} aria-label={`Remove ${entry.recipeName} from ${day}`}>
										✕
									</button>
								</div>
							{/each}
						</div>

						{#if pickerOpenFor === day}
							{@render recipePicker(day)}
						{:else}
							<button class="pin-outline-btn" onclick={() => openPicker(day)}>
								+ Pin a recipe
							</button>
						{/if}

						{#if entries.length > 1}
							<button class="clear-day-btn" onclick={() => clearDay(day)}>Clear day</button>
						{/if}
					</div>
				{:else}
					<div class="empty-slot">
						{#if pickerOpenFor === day}
							{@render recipePicker(day)}
						{:else}
							<button
								class="empty-cta"
								onclick={() => openPicker(day)}
								aria-label={`Pin a recipe to ${day}`}
							>
								<span class="empty-icon" aria-hidden="true">
									<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
										<rect x="5" y="11" width="14" height="7" rx="2" />
										<path d="M3 11h18" />
										<path d="M3 11c0-1 .6-1.6 1.3-1.9M21 11c0-1-.6-1.6-1.3-1.9" />
										<path d="M9 6.3c0-.7.4-1.1.7-1.5M12 6.3c0-.7.4-1.1.7-1.5M15 6.3c0-.7.4-1.1.7-1.5" />
									</svg>
								</span>
								<span class="empty-text">Nothing planned yet</span>
							</button>
						{/if}
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	.page-head {
		max-width: var(--content-max);
		margin: 0 auto;
		padding: 56px 28px 10px;
	}

	.display-1 {
		font-size: clamp(2rem, 4vw, 2.8rem);
		margin: 16px 0 12px;
	}

	.lede {
		color: var(--color-ink-muted);
		font-size: 1.02rem;
		line-height: 1.6;
		margin: 0 0 16px;
	}

	.accent {
		color: var(--color-accent);
	}

	.stat-row {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	.stat-pill {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		font-size: 0.78rem;
		color: var(--color-ink-muted);
		background: var(--color-surface);
		border: 1px solid var(--color-line);
		border-radius: 999px;
		padding: 7px 14px;
	}

	.stat-pill::before {
		content: '';
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--color-ink-faint);
		flex-shrink: 0;
	}

	.stat-pill.is-accent::before {
		background: var(--color-accent);
	}

	.stat-pill strong {
		font-weight: 600;
		color: var(--color-ink);
	}

	.clear-all-btn {
		margin-left: auto;
		border: 1px solid var(--color-line);
		background: var(--color-surface);
		color: var(--color-ink-muted);
		border-radius: 999px;
		padding: 7px 16px;
		font-size: 0.78rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
	}

	.clear-all-btn:hover {
		border-color: var(--color-danger);
		color: var(--color-danger);
	}

	.empty-hint {
		max-width: var(--content-max);
		margin: 0 auto;
		padding: 0 28px 8px;
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 10px;
		color: var(--color-ink-muted);
		font-size: 0.88rem;
	}

	.empty-hint svg {
		color: var(--color-accent);
		flex-shrink: 0;
	}

	.empty-hint a {
		color: var(--color-accent);
		font-weight: 600;
		text-decoration: none;
		border-bottom: 1px solid var(--color-accent);
	}

	.board {
		max-width: var(--content-max);
		margin: 28px auto 70px;
		padding: 0 28px;
	}

	.week {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(138px, 1fr));
		gap: 16px;
	}

	.day-col {
		display: flex;
		flex-direction: column;
		min-height: 420px;
	}

	.day-header {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 18px;
	}

	.day-rule {
		width: 22px;
		height: 1px;
		background: var(--color-line-strong);
		flex-shrink: 0;
	}

	.day-name {
		font-size: 0.76rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		color: var(--color-ink-faint);
	}

	.day-name.has-meals {
		color: var(--color-ink);
	}

	/* ---- Filled day wrapper (same dashed border language as .empty-slot) ---- */
	.filled-slot {
		flex: 1;
		display: flex;
		flex-direction: column;
		border: 1px dashed var(--color-line-strong);
		border-radius: 14px;
		padding: 14px;
	}

	.meal-list {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-bottom: 10px;
	}

	.meal-card {
		position: relative;
		display: flex;
		align-items: center;
		gap: 8px;
		background: var(--color-surface-raised);
		border: 1px solid var(--color-line);
		border-radius: 10px;
		padding: 6px;
		transition: box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
	}

	.meal-card:hover {
		box-shadow: 0 4px 12px rgba(20, 16, 8, 0.08);
		transform: translateY(-1px);
		border-color: var(--color-line-strong);
	}

	.meal-thumb {
		flex-shrink: 0;
		width: 34px;
		height: 34px;
		border-radius: 8px;
		overflow: hidden;
		border: none;
		padding: 0;
		cursor: pointer;
		background: var(--color-bg-deep);
	}

	.meal-thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.meal-thumb-placeholder {
		display: block;
		width: 100%;
		height: 100%;
		background: linear-gradient(135deg, var(--color-bg-deep), var(--color-line));
	}

	.meal-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.meal-name {
		text-align: left;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		font-family: var(--font-body);
		font-weight: 600;
		font-size: 0.86rem;
		line-height: 1.25;
		color: var(--color-ink);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.meal-name:hover {
		color: var(--color-accent);
	}

	.meal-meta {
		font-size: 0.72rem;
		color: var(--color-ink-faint);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.meal-remove {
		flex-shrink: 0;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		border: none;
		background: transparent;
		color: var(--color-ink-faint);
		font-size: 0.6rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		transition: background 0.15s ease, color 0.15s ease, opacity 0.15s ease;
	}

	.meal-card:hover .meal-remove,
	.meal-remove:focus-visible {
		opacity: 1;
	}

	.meal-remove:hover {
		background: var(--color-danger);
		color: #fff;
	}

	/* ---- "+ Pin a recipe" (filled day) ---- */
	.pin-outline-btn {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		border: 1px dashed var(--color-line-strong);
		background: transparent;
		color: var(--color-accent);
		border-radius: 10px;
		padding: 10px 12px;
		font-size: 0.78rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s ease, border-color 0.15s ease;
	}

	.pin-outline-btn:hover:not(:disabled) {
		background: var(--color-surface);
		border-color: var(--color-accent);
	}

	.pin-outline-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	/* ---- Empty day slot ---- */
	.empty-slot {
		flex: 1;
		display: flex;
		border: 1px dashed var(--color-line-strong);
		border-radius: 14px;
	}

	.empty-slot .picker {
		width: 100%;
		align-self: center;
		padding: 18px;
	}

	.empty-cta {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 10px;
		background: none;
		border: none;
		padding: 24px 12px;
		cursor: pointer;
	}

	.empty-cta:disabled {
		cursor: not-allowed;
	}

	.empty-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: var(--color-surface-raised);
		color: var(--color-ink-faint);
		box-shadow: 0 1px 3px rgba(20, 16, 8, 0.08);
		transition: background 0.15s ease, color 0.15s ease;
	}

	.empty-cta:hover:not(:disabled) .empty-icon {
		background: var(--color-accent);
		color: #fff;
	}

	.empty-text {
		font-size: 0.78rem;
		color: var(--color-ink-faint);
		transition: color 0.15s ease;
	}

	.empty-cta:hover:not(:disabled) .empty-text {
		color: var(--color-ink-muted);
	}

	/* ---- Shared picker (used in both filled & empty states) ---- */
	.picker {
		display: flex;
		flex-direction: column;
		gap: 7px;
		width: 100%;
	}

	.picker-search {
		font-size: 0.78rem;
		padding: 8px;
		border-radius: 8px;
		border: 1px solid var(--color-line);
		font-family: var(--font-body);
		background: var(--color-surface);
		color: var(--color-ink);
		width: 100%;
	}

	.picker-search:focus {
		outline: none;
		border-color: var(--color-accent);
	}

	.picker-results {
		display: flex;
		flex-direction: column;
		gap: 4px;
		max-height: 168px;
		overflow-y: auto;
	}

	.picker-hint {
		font-size: 0.72rem;
		color: var(--color-ink-faint);
		padding: 6px 2px;
	}

	.result-item {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		text-align: left;
		border: none;
		background: var(--color-surface);
		border-radius: 8px;
		padding: 6px;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.result-item:hover {
		background: var(--color-surface-raised);
	}

	.result-thumb {
		flex-shrink: 0;
		width: 26px;
		height: 26px;
		border-radius: 6px;
		object-fit: cover;
		display: block;
	}

	.result-thumb-placeholder {
		background: linear-gradient(135deg, var(--color-bg-deep), var(--color-line));
	}

	.result-name {
		flex: 1;
		min-width: 0;
		font-size: 0.78rem;
		color: var(--color-ink);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.result-add {
		flex-shrink: 0;
		color: var(--color-accent);
		font-weight: 700;
		font-size: 0.9rem;
	}

	.picker-actions {
		display: flex;
		gap: 6px;
	}

	.done-btn {
		border: 1px solid var(--color-line);
		background: var(--color-surface);
		color: var(--color-ink-muted);
		border-radius: 8px;
		padding: 8px 12px;
		font-size: 0.72rem;
		font-weight: 600;
		cursor: pointer;
	}

	.clear-day-btn {
		margin-top: 8px;
		width: 100%;
		border: none;
		background: none;
		color: var(--color-ink-faint);
		font-size: 0.66rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		text-decoration: underline;
		cursor: pointer;
		padding: 2px 0 0;
		opacity: 0;
		transition: opacity 0.15s ease, color 0.15s ease;
	}

	.day-col:hover .clear-day-btn,
	.clear-day-btn:focus-visible {
		opacity: 1;
	}

	.clear-day-btn:hover {
		color: var(--color-danger);
	}
</style>