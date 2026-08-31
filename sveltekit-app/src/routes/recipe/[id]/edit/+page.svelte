<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import RecipeForm from '$lib/components/RecipeForm.svelte';
	import { userRecipes, type RecipeDraft } from '$lib/stores/userRecipes.svelte';
	import type { Recipe } from '$lib/types';

	const id = page.params.id!;

	// User-created recipes only exist in the browser's localStorage, which
	// isn't available during SSR — `userRecipes.items` is always empty on
	// the server. Reading it as a plain `const` at the top of the script (as
	// this used to do) would render the "not found" state during SSR and
	// then flash to the real form once the client hydrates with the actual
	// localStorage data. Deferring the lookup to onMount (same pattern as
	// RecipeDetailBody) avoids that flash by not rendering either state
	// until we're actually in the browser and the store is populated.
	let loading = $state(true);
	let recipe = $state<Recipe | undefined>(undefined);

	onMount(() => {
		recipe = userRecipes.getById(id);
		loading = false;
	});

	function handleSubmit(draft: RecipeDraft) {
		userRecipes.update(id, draft);
		goto(`/recipe/${id}`);
	}
</script>

<svelte:head>
	<title>mise — Edit Recipe</title>
</svelte:head>

{#if loading}
	<p class="status">Loading recipe…</p>
{:else if !recipe}
	<div class="not-found">
		<p class="status error">
			Only recipes you created can be edited. This one may have come from the recipe search, or been removed.
		</p>
		<a class="back-link" href="/discover">← Back to the index</a>
	</div>
{:else}
	{@const r = recipe}
	<RecipeForm
		initial={{
			name: r.name,
			category: r.category,
			area: r.area,
			image: r.image,
			images: r.images,
			instructions: r.instructions,
			ingredients: r.ingredients,
			servings: r.servings,
			duration: r.duration,
			nutrition: r.nutrition,
			youtube: r.youtube,
			tags: r.tags
		}}
		submitLabel="Save changes"
		onsubmit={handleSubmit}
		cancelHref={`/recipe/${id}`}
		excludeId={id}
		lede="Editing one of your own recipes — changes go live once you save."
	>
		{#snippet heading()}
			Edit &ldquo;{r.name}&rdquo;
		{/snippet}
	</RecipeForm>
{/if}

<style>
	.not-found {
		max-width: 640px;
		margin: 0 auto;
		padding: 56px 28px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.status.error {
		color: var(--color-danger);
	}
	.back-link {
		color: var(--color-primary);
		font-weight: 600;
		text-decoration: none;
	}
</style>
