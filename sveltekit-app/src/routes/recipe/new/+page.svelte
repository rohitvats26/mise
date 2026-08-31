<script lang="ts">
	import { goto } from '$app/navigation';
	import RecipeForm from '$lib/components/RecipeForm.svelte';
	import { userRecipes, type RecipeDraft } from '$lib/stores/userRecipes.svelte';

	function handleSubmit(draft: RecipeDraft) {
		const recipe = userRecipes.create(draft);
		goto(`/recipe/${recipe.id}`);
	}
</script>

<svelte:head>
	<title>mise — Add Recipe</title>
</svelte:head>

<RecipeForm submitLabel="Create recipe" onsubmit={handleSubmit} cancelHref="/discover">
	{#snippet heading()}
		Write it <br><span class="font-italic accent">down</span>
	{/snippet}
</RecipeForm>

<style>
	.accent {
		color: var(--color-accent);
	}
</style>