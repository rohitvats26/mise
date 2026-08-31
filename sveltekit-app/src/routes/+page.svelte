<script lang="ts">
	import { goto } from '$app/navigation';
	import { reveal } from '$lib/actions/reveal';
	import { favorites } from '$lib/stores/favorites.svelte';
	import { estimateNutritionPerServing } from '$lib/nutrition';
	import type { Recipe } from '$lib/types';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let withImage = $derived(data.recipes.filter((r) => r.image));

	let heroImage = $derived(withImage[0]?.image);
	let heroPeek = $derived(withImage[1]?.image ?? withImage[0]?.image);

	const filters = ['All', 'Quick & easy', 'Vegetarian', 'High protein', 'Under 30 min'];
	let activeFilter = $state('All');

	// Ingredient keywords that rule a recipe out of "Vegetarian". TheMealDB's
	// own "Vegetarian"/"Vegan" categories are trusted first; this list is the
	// fallback for everything else, since most recipes don't carry a category
	// that says one way or the other.
	const MEAT_KEYWORDS = [
		'chicken', 'beef', 'pork', 'turkey', 'bacon', 'sausage', 'ham', 'lamb', 'duck', 'veal',
		'anchovy', 'anchovies', 'shrimp', 'prawn', 'salmon', 'tuna', 'cod', 'fish', 'crab',
		'lobster', 'mussel', 'squid', 'octopus', 'chorizo', 'pepperoni', 'gammon', 'venison',
		'goat', 'mince', 'steak', 'meat', 'oxtail', 'liver', 'gelatin', 'gelatine'
	];

	function isVegetarian(recipe: Recipe): boolean {
		const category = recipe.category?.toLowerCase() ?? '';
		if (category.includes('vegetarian') || category.includes('vegan')) return true;
		if (category === 'beef' || category === 'chicken' || category === 'pork' || category === 'lamb' || category === 'goat' || category === 'seafood') {
			return false;
		}
		return !recipe.ingredients.some((ing) => MEAT_KEYWORDS.some((k) => ing.name.toLowerCase().includes(k)));
	}

	// TheMealDB carries no macro data, so fall back to the same rough
	// ingredient-based estimate used on the recipe detail page.
	function isHighProtein(recipe: Recipe): boolean {
		const protein = recipe.nutrition?.protein ?? estimateNutritionPerServing(recipe.ingredients, recipe.servings ?? 4).protein;
		return protein >= 20;
	}

	function matchesFilter(recipe: Recipe, filter: string, est: { time: number; difficulty: string }): boolean {
		switch (filter) {
			case 'Quick & easy':
				return est.time <= 30 && est.difficulty === 'Easy';
			case 'Vegetarian':
				return isVegetarian(recipe);
			case 'High protein':
				return isHighProtein(recipe);
			case 'Under 30 min':
				return est.time <= 30;
			default:
				return true;
		}
	}

	let filtered = $derived(
		activeFilter === 'All' ? withImage : withImage.filter((r) => matchesFilter(r, activeFilter, estimate(r)))
	);
	let shown = $derived(filtered.slice(0, 4));

	let query = $state('');

	function onSearchSubmit(e: SubmitEvent) {
		e.preventDefault();
		const q = query.trim();
		goto(q ? `/discover?q=${encodeURIComponent(q)}` : '/discover');
	}

	function openRecipe(id: string | undefined) {
		if (id) goto(`/recipe/${id}`);
	}

	// TheMealDB doesn't provide prep time/difficulty, so we derive a
	// believable, stable estimate from each recipe's own ingredient count
	// and instruction length rather than showing nothing.
	function estimate(recipe: Recipe): { time: number; difficulty: 'Easy' | 'Medium' | 'Hard' } {
	const steps = recipe.instructions.split(/\r?\n|\. /).filter((s) => s.trim().length > 8).length;
	const time = recipe.duration ?? Math.max(10, Math.min(75, 10 + recipe.ingredients.length * 3 + steps));
	const difficulty = recipe.ingredients.length <= 6 ? 'Easy' : recipe.ingredients.length <= 11 ? 'Medium' : 'Hard';
	return { time, difficulty };
}
</script>

<svelte:head>
	<title>mise — A Kitchen Journal</title>
</svelte:head>

<div class="page-bg">
<section class="hero">
	<div class="hero-copy" use:reveal>
		<span class="eyebrow">Your week, well fed</span>
		<h1 class="hero-title">Find something<br />worth cooking.</h1>
		<p class="hero-lede">
			Discover seasonal recipes you'll love and plan balanced, delicious meals for the week ahead.
		</p>

		<form class="search-bar" onsubmit={onSearchSubmit}>
			<svg class="search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<circle cx="11" cy="11" r="7" />
				<path d="m21 21-4.3-4.3" />
			</svg>
			<input type="search" placeholder="Search recipes" bind:value={query} aria-label="Search recipes" />
			<button type="submit" class="search-btn">Search</button>
		</form>
	</div>

	<div class="hero-media" use:reveal>
		<div class="hero-media-inner">
			{#if heroImage}
				<img src={heroImage} alt="" loading="lazy" />
			{:else}
				<div class="hero-placeholder"></div>
			{/if}
		</div>
		<div class="hero-peek">
			{#if heroPeek}
				<img src={heroPeek} alt="" loading="lazy" />
			{:else}
				<div class="hero-placeholder"></div>
			{/if}
		</div>
	</div>
</section>

<section class="explore">
	<div class="explore-head" use:reveal>
		<div class="explore-heading">
			<h2>Explore recipes</h2>
			<span class="explore-count">
				{activeFilter === 'All' ? `${data.recipes.length} recipes` : `${filtered.length} match${filtered.length === 1 ? '' : 'es'}`}
			</span>
		</div>

		<div class="filter-pills" role="tablist" aria-label="Recipe filters">
			{#each filters as filter (filter)}
				<button
					type="button"
					class="pill"
					class:active={activeFilter === filter}
					role="tab"
					aria-selected={activeFilter === filter}
					onclick={() => (activeFilter = filter)}
				>
					{filter}
				</button>
			{/each}
		</div>

		<a class="view-all-link" href="/discover">
			View all recipes
			<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="m9 6 6 6-6 6" />
			</svg>
		</a>
	</div>

	{#if shown.length > 0}
		<div class="recipe-grid" use:reveal>
			{#each shown as recipe, i (recipe.id)}
				{@const est = estimate(recipe)}
				<rc-recipe-card
					recipe-id={recipe.id}
					name={recipe.name}
					image={recipe.image}
					secondary-badge={activeFilter === 'All' && i === 0 ? 'Featured' : undefined}
					meta={`${est.time} min · ${est.difficulty}`}
					is-favorite={favorites.isFavorite(recipe.id)}
					variant='featured'
					onfavoriteToggle={() => favorites.toggle(recipe)}
					oncardSelect={() => openRecipe(recipe.id)}
				></rc-recipe-card>
			{/each}
		</div>
	{:else}
		<p class="no-matches" use:reveal>
			Nothing tagged "{activeFilter}" in this preview yet — <a href="/discover">search the full index</a> instead.
		</p>
	{/if}
</section>

<section class="planner-cta">
	<div class="planner-inner" use:reveal>
		<span class="planner-icon" aria-hidden="true">
			<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M7 20h10" />
				<path d="M10 20c5.5-2.5.8-6.4 3-10" />
				<path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" />
				<path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" />
			</svg>
		</span>
		<div class="planner-copy">
			<h3>Plan the week before the week plans you.</h3>
			<p>Build a plan in minutes and shop with confidence.</p>
		</div>
		<a class="planner-btn" href="/meal-plan">
			<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<rect x="3" y="5" width="18" height="16" rx="2" />
				<path d="M3 10h18M8 3v4M16 3v4" />
			</svg>
			Open meal planner
		</a>
	</div>
</section>
</div>

<style>
	/* Screenshot's page is crisp, uniform white end-to-end, unlike the warm
	   cream body background + radial tints used site-wide. This wrapper
	   pins the homepage to the theme's raised-surface token (pure white in
	   light mode) so no body texture shows through the gaps between
	   sections. */
	.page-bg {
		background: var(--color-surface);
		overflow-x: hidden;
	}

	/* ---- Hero ---- */
	.hero {
		max-width: 1415px;
		margin: 0 auto;
		padding: 40px 24px 0;
		display: grid;
		grid-template-columns: 1fr;
		gap: 32px;
		align-items: center;
	}

	.hero-title {
		margin: 14px 0 0;
		font-family: var(--font-display);
		font-weight: 600;
		font-size: clamp(2.1rem, 4.6vw, 4.5rem);
		line-height: 1.08;
		letter-spacing: -0.02em;
		color: var(--color-ink);
	}

	.hero-lede {
		margin: 14px 0 0;
		max-width: 28rem;
		font-size: 1.125rem;
		line-height: 1.625;
		color: var(--color-ink-muted);
	}

	.search-bar {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-top: 24px;
		max-width: 32rem;
		background: var(--color-surface-raised);
		border: 1px solid var(--color-line-strong);
		border-radius: 999px;
		padding: 10px 10px 10px 20px;
	}

	.search-icon {
		flex-shrink: 0;
		color: var(--color-ink-muted);
	}

	.search-bar input {
		flex: 1;
		min-width: 0;
		border: none;
		outline: none;
		background: transparent;
		font-family: inherit;
		font-size: 0.85rem;
		color: var(--color-ink);
	}

	.search-bar input::placeholder {
		color: var(--color-ink-muted);
	}

	.search-btn {
		flex-shrink: 0;
		border: none;
		border-radius: 999px;
		background: var(--color-accent);
		color: var(--color-on-photo);
		font-family: inherit;
		font-size: 0.8rem;
		font-weight: 600;
		padding: 10px 22px;
		cursor: pointer;
		transition: background 0.2s ease;
	}

	.search-btn:hover {
		background: var(--color-accent-bright);
	}

	.hero-media {
		position: relative;
	}

	.hero-media-inner {
		aspect-ratio: 7 / 5;
		overflow: hidden;
		border-radius: 120px 40px 120px 40px;
	}

	.hero-media-inner img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.hero-placeholder {
		width: 100%;
		height: 100%;
		background: linear-gradient(150deg, var(--color-bg-deep), var(--color-line-strong));
	}

	.hero-peek {
		position: absolute;
		right: -6%;
		bottom: 10%;
		width: 24%;
		min-width: 96px;
		aspect-ratio: 1;
		border-radius: 40px 20px 40px 20px;
		overflow: hidden;
		padding: 8px;
		background: var(--color-surface);
		box-shadow: var(--shadow-floating);
	}

	.hero-peek img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 40px 20px 40px 20px;
	}

	/* ---- Explore recipes ---- */
	.explore {
		max-width: 1415px;
		margin: 0 auto;
		padding: 64px 24px 0;
	}

	.explore-head {
		display: grid;
		grid-template-columns: 1fr;
		align-items: center;
		gap: 16px;
	}

	.explore-heading {
		display: flex;
		align-items: baseline;
		gap: 10px;
	}

	.explore-heading h2 {
		margin: 0;
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 1.875rem;
		letter-spacing: -0.01em;
		color: var(--color-ink);
	}

	.explore-count {
		font-size: 0.875rem;
		color: var(--color-ink-muted);
	}

	.filter-pills {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-start;
		gap: 0.75rem;
		padding: 0.45rem;
	}

	.pill {
		border: 1px solid var(--color-line-strong);
		background: var(--color-surface-raised);
		color: var(--color-ink-muted);
		border-radius: 999px;
		padding: 7px 16px;
		font-family: inherit;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
	}

	.pill:hover {
		border-color: var(--color-sage);
		color: var(--color-ink);
	}

	.pill.active {
		background: var(--color-sage);
		border-color: var(--color-sage);
		color: var(--color-on-photo);
	}

	.view-all-link {
		display: inline-flex;
		align-items: center;
		justify-self: end;
		gap: 4px;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-sage);
		text-decoration: none;
	}

	.view-all-link:hover {
		color: var(--color-accent);
	}

	.recipe-grid {
		margin-top: 28px;
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 24px;
	}

	.no-matches {
		margin-top: 28px;
		padding: 32px 24px;
		text-align: center;
		border: 1px dashed var(--color-line-strong);
		border-radius: 16px;
		color: var(--color-ink-muted);
		font-size: 0.95rem;
	}

	.no-matches a {
		color: var(--color-accent);
		font-weight: 600;
		text-decoration: none;
		border-bottom: 1px solid var(--color-accent);
	}

	/* Recipe cards are the shared <rc-recipe-card> design-system component
	 * (see @nagp/recipe-ui) — it's shadow-encapsulated, so it brings its
	 * own card chrome, hover motion, favorite button, and badges. Nothing
	 * page-specific to style here beyond the grid itself. */

	/* ---- Meal planner CTA ---- */
	.planner-cta {
		max-width: 1415px;
		margin: 56px auto 0;
		padding: 0 24px 64px;
	}

	.planner-inner {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 20px;
		background: color-mix(in srgb, var(--color-sage) 16%, var(--color-surface-raised));
		border: 1px solid color-mix(in srgb, var(--color-sage) 10%, transparent);
		border-radius: 24px;
		padding: 32px;
	}

	.planner-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 64px;
		height: 64px;
		border-radius: 50%;
		background: var(--color-surface-raised);
		border: 1px solid var(--color-line);
		box-shadow: var(--shadow-card);
		color: var(--color-sage);
	}

	.planner-copy {
		flex: 1;
		min-width: 220px;
	}

	.planner-copy h3 {
		margin: 0;
		font-family: var(--font-display);
		font-weight: 600;
		font-size: clamp(1.2rem, 2.2vw, 1.5rem);
		letter-spacing: -0.01em;
		color: var(--color-ink);
	}

	.planner-copy p {
		margin: 6px 0 0;
		font-size: 0.85rem;
		color: var(--color-ink-muted);
	}

	.planner-btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
		border: 1px solid var(--color-sage);
		border-radius: 8px;
		padding: 11px 18px;
		background: transparent;
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--color-ink);
		text-decoration: none;
		transition: background 0.2s ease;
	}

	.planner-btn:hover {
		background: color-mix(in srgb, var(--color-sage) 8%, transparent);
	}

	@media (min-width: 640px) {
		.recipe-grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	@media (min-width: 768px) {
		.hero {
			padding: 56px 56px 0;
		}

		.explore {
			padding: 56px 48px 0;
		}

		.planner-cta {
			padding: 0 48px 96px;
		}
	}

	@media (min-width: 860px) {
		.hero {
			grid-template-columns: 1fr 1.35fr;
			gap: 40px;
		}

		.explore-head {
			grid-template-columns: 1fr auto 1fr;
		}
	}
</style>

