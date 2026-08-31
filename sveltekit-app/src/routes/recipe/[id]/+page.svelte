<script lang="ts">
	import { page } from '$app/state';
	import RecipeDetailBody from '$lib/components/RecipeDetailBody.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

{#key page.params.id}
	<RecipeDetailBody
		id={page.params.id!}
		initialRecipe={data.recipe}
		isUserRecipe={data.isUserRecipe}
		initialNotFound={data.notFound}
	/>
{/key}
