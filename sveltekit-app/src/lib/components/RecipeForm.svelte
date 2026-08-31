<script lang="ts">
	import type { Snippet } from 'svelte';
	import { browser } from '$app/environment';
	import { listAreas, listCategories } from '$lib/api/mealdb';
	import { parseSteps } from '$lib/instructions';
	import { userRecipes, validateDraft, type RecipeDraft } from '$lib/stores/userRecipes.svelte';
	import type { Ingredient } from '$lib/types';
	interface Props {
		initial?: RecipeDraft;
		submitLabel?: string;
		onsubmit: (draft: RecipeDraft) => void;
		cancelHref?: string;
		eyebrow?: string;
		heading?: Snippet;
		lede?: string;
		/** When editing an existing recipe, its id — excluded from the duplicate check. */
		excludeId?: string;
	}

	let {
		initial,
		submitLabel = 'Save recipe',
		onsubmit,
		cancelHref = '/discover',
		eyebrow = 'User recipes',
		heading,
		lede = "Get your own recipe onto the board — it'll show up under \"Your recipes\" once saved.",
		excludeId
	}: Props = $props();

	// svelte-ignore state_referenced_locally -- intentional: these are form
	// defaults seeded once from `initial`, not meant to stay in sync with it.
	let name = $state(initial?.name ?? '');
	// svelte-ignore state_referenced_locally -- see above
	let category = $state(initial?.category ?? '');
	// svelte-ignore state_referenced_locally -- see above
	let area = $state(initial?.area ?? '');

	// Suggestions for the category/area fields, pulled from TheMealDB's own
	// lists so the dropdown reflects real categories/cuisines — but both
	// fields stay plain text inputs underneath, so typing anything not in
	// the list is always allowed too.
	let categoryOptions = $state<string[]>([]);
	let areaOptions = $state<string[]>([]);
	$effect(() => {
		if (!browser) return;
		listCategories()
			.then((c) => (categoryOptions = c))
			.catch(() => {});
		listAreas()
			.then((a) => (areaOptions = a))
			.catch(() => {});
	});

	// svelte-ignore state_referenced_locally -- see note above: `initial` seeds
	// one-time form defaults and is never meant to stay reactive to prop changes.
	let servings = $state(initial?.servings ?? 4);
	// svelte-ignore state_referenced_locally -- see above
	let duration = $state<number | ''>(initial?.duration ?? '');
	// svelte-ignore state_referenced_locally -- see above
	let images = $state<string[]>(
		initial?.images?.length ? [...initial.images] : initial?.image ? [initial.image] : []
	);
	let newImageUrl = $state('');
	let imageErrors = $state<Record<string, boolean>>({});
	// svelte-ignore state_referenced_locally -- see above
	let youtube = $state(initial?.youtube ?? '');
	// svelte-ignore state_referenced_locally -- see above
	let tags = $state<string[]>(initial?.tags?.length ? [...initial.tags] : []);
        let newTag = $state('');
	// svelte-ignore state_referenced_locally -- see above
	let instructions = $state(initial?.instructions ?? '');
	// svelte-ignore state_referenced_locally -- see above
	let ingredients = $state<Ingredient[]>(initial?.ingredients?.length ? [...initial.ingredients] : [{ name: '', measure: '' }]);
	// svelte-ignore state_referenced_locally -- see above
	let showNutrition = $state(!!initial?.nutrition);
	// svelte-ignore state_referenced_locally -- see above
	let calories = $state(initial?.nutrition?.calories?.toString() ?? '');
	// svelte-ignore state_referenced_locally -- see above
	let protein = $state(initial?.nutrition?.protein?.toString() ?? '');
	// svelte-ignore state_referenced_locally -- see above
	let carbs = $state(initial?.nutrition?.carbs?.toString() ?? '');
	// svelte-ignore state_referenced_locally -- see above
	let fat = $state(initial?.nutrition?.fat?.toString() ?? '');
	let errors = $state<Record<string, string>>({});
	let previewSteps = $derived(instructions.trim() ? parseSteps(instructions) : []);
	let previewServings = $derived(Math.max(1, Math.round(Number(servings) || 4)));
	let isSubmitting = $state(false);

	function commitImageUrl() {
		const url = newImageUrl.trim();
		if (!url) return;
		images.push(url);
		newImageUrl = '';
	}

	function handleImageKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			commitImageUrl();
		}
	}

	function commitTag() {
                const tag = newTag.trim();
                if (!tag) return;
                if (!tags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
                        tags.push(tag);
                }
                newTag = '';
        }
        function handleTagKeydown(e: KeyboardEvent) {
                if (e.key === 'Enter') {
                        e.preventDefault();
                        commitTag();
                } else if (e.key === 'Backspace' && !newTag && tags.length) {
                        tags.pop();
                }
        }
        function removeTag(i: number) {
                tags.splice(i, 1);
        }

	function removeImage(i: number) {
		images.splice(i, 1);
	}

	function makeCover(i: number) {
		if (i === 0) return;
		const [chosen] = images.splice(i, 1);
		images.unshift(chosen);
	}

	function moveImage(i: number, dir: -1 | 1) {
		const j = i + dir;
		if (j < 0 || j >= images.length) return;
		const tmp = images[i];
		images[i] = images[j];
		images[j] = tmp;
	}

	function addIngredientRow() {
		ingredients.push({ name: '', measure: '' });
	}

	function removeIngredientRow(i: number) {
		ingredients.splice(i, 1);
		if (ingredients.length === 0) ingredients.push({ name: '', measure: '' });
	}

	async function handleSubmit(e: SubmitEvent) {
	e.preventDefault();
	if (isSubmitting) return;

	commitImageUrl();
	commitTag();
	const nutrition =
		showNutrition
			? {
					calories: Math.max(0, Math.round(Number(calories) || 0)),
					protein: Math.max(0, Math.round(Number(protein) || 0)),
					carbs: Math.max(0, Math.round(Number(carbs) || 0)),
					fat: Math.max(0, Math.round(Number(fat) || 0))
				}
			: undefined;
	const cleanImages = images.map((i) => i.trim()).filter(Boolean);
	const draft: RecipeDraft = {
		name: name.trim(),
		category: category.trim() || undefined,
		area: area.trim() || undefined,
		image: cleanImages[0] || undefined,
		images: cleanImages.length ? cleanImages : undefined,
		instructions: instructions.trim(),
		ingredients: ingredients
			.filter((i) => i.name.trim())
			.map((i) => ({ name: i.name.trim(), measure: i.measure.trim() })),
		youtube: youtube.trim() || undefined,
		tags: tags.length ? [...tags] : undefined,
		servings: Math.max(1, Math.min(24, Math.round(Number(servings) || 4))),
		duration: Number(duration) > 0 ? Math.round(Number(duration)) : undefined,
		nutrition
	};
	const validation = validateDraft(draft, { existing: userRecipes.items, excludeId });
	errors = validation;
	if (Object.keys(validation).length === 0) {
		isSubmitting = true;
		try {
			await onsubmit(draft);
		} finally {
			isSubmitting = false;
		}
	}
}
</script>

<div class="page-shell">
	<aside class="brand-panel">
		<div class="brand-panel-inner">
			<span class="eyebrow">{eyebrow}</span>
			<h1 class="display-1">{@render heading?.()}</h1>
			{#if lede}<p class="lede">{lede}</p>{/if}

			<div class="preview-card">
				<!-- The carousel itself (nav/keyboard/touch/thumbs/broken-image
				     handling) is owned by the shared <rc-photo-carousel> (see
				     @nagp/recipe-ui) — this call site just supplies the compact
				     sizing tokens and the "no photos yet" empty state, which is
				     form-specific copy the generic component shouldn't own.

				     `images` is spread into a new array here on purpose: it's
				     mutated in place below (push/splice/reorder) for Svelte's
				     own reactivity, but rc-photo-carousel is a Stencil custom
				     element whose @Prop diffing is reference-based — handing it
				     the same array object back after an in-place mutation looks
				     like "no change" and it won't re-render. A fresh array each
				     time keeps the preview in sync. -->
				{#if images.length > 0}
					<rc-photo-carousel
						images={[...images]}
						label="Recipe photos"
						counter-position="bottom-right"
						thumbs-layout="inline"
					></rc-photo-carousel>
				{:else}
					<div class="preview-photo empty">
						<span class="preview-photo-label">Preview</span>
					</div>
				{/if}
				<div class="preview-lines">
					{#if name.trim()}
						<p class="preview-name">{name.trim()}</p>
					{:else}
						<span class="skeleton-line wide"></span>
					{/if}
					{#if category.trim()}
						<p class="preview-sub">{category.trim()}{area.trim() ? ` · ${area.trim()}` : ''} · {previewServings} serving{previewServings === 1 ? '' : 's'}{Number(duration) > 0 ? ` · ${Math.round(Number(duration))} min` : ''}</p>
					{:else}
						<span class="skeleton-line narrow"></span>
					{/if}
				</div>
			</div>

			<p class="tagline">Cook with <em class="accent font-italic">intention</em>.<br />Eat with <em class="font-italic">memory</em>.</p>
		</div>
	</aside>

	<div class="form-pane">
		<form onsubmit={handleSubmit} class="recipe-form">
			<section>
				<span class="step-num" aria-hidden="true">01</span>
				<h2>The basics</h2>

				<label>
					<span>Recipe name <span class="required" aria-hidden="true">*</span></span>
					<input type="text" bind:value={name} placeholder="e.g. Grandma's Lasagna" />
					{#if errors.name}<span class="error">{errors.name}</span>{/if}
				</label>

				<div class="four-col">
					<label>
						<span>Category <span class="required" aria-hidden="true">*</span></span>
						<input type="text" list="category-options" bind:value={category} placeholder="e.g. Dessert" autocomplete="off" />
						{#if errors.category}<span class="error">{errors.category}</span>{/if}
					</label>

					<label>
						Area
						<input type="text" list="area-options" bind:value={area} placeholder="e.g. Italian" autocomplete="off" />
					</label>
	
					<label>
						Duration (min)
						<input type="number" min="1" max="999" bind:value={duration} placeholder="e.g. 30" />
					</label>
					
					<label>
						Serves
						<input type="number" min="1" max="24" bind:value={servings} />
					</label>
				</div>
				<datalist id="category-options">
					{#each categoryOptions as c (c)}
						<option value={c}></option>
					{/each}
				</datalist>
				<datalist id="area-options">
					{#each areaOptions as a (a)}
						<option value={a}></option>
					{/each}
				</datalist>
				<p class="field-hint">Area is the country or region a recipe comes from — it's how people browse by cuisine.</p>

				<div class="two-col">
					<label>
						Image URL 
						<input
							type="url"
							bind:value={newImageUrl}
							onkeydown={handleImageKeydown}
							onblur={commitImageUrl}
							placeholder="https://…"
						/>
					</label>

					<label>
						YouTube link 
						<input type="url" bind:value={youtube} placeholder="https://youtube.com/watch?v=…" />
						{#if errors.youtube}<span class="error">{errors.youtube}</span>{/if}
					</label>
				</div>
				<p class="field-hint">Press Enter after pasting an image URL to add it — add as many as you like.</p>
				{#if errors.images}<span class="error">{errors.images}</span>{/if}
				<label>
                                        Tags
                                        <input
                                                type="text"
                                                bind:value={newTag}
                                                onkeydown={handleTagKeydown}
                                                onblur={commitTag}
                                                placeholder="e.g. vegan, quick, weeknight"
                                        />
                                </label>
                                <p class="field-hint">Press Enter after each tag to add it — tags help people find this recipe faster.</p>
                                {#if tags.length > 0}
                                        <div class="tag-chip-list">
                                                {#each tags as tag, i (tag)}
                                                        <span class="tag-chip">
                                                                {tag}
                                                                <button type="button" onclick={() => removeTag(i)} aria-label={`Remove tag ${tag}`}>✕</button>
                                                        </span>
                                                {/each}
                                        </div>
                                {/if}
				<div class="photo-dropzone">
					{#if images.length > 0}
						<div class="image-grid">
							{#each images as url, i (i + '::' + url)}
								<div class="image-tile" class:cover={i === 0}>
									{#if imageErrors[url]}
										<div class="tile-error">
											<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
												<circle cx="12" cy="12" r="9" />
												<path d="M12 8v5M12 16h.01" />
											</svg>
											<span>Couldn't load</span>
										</div>
									{:else}
										<img src={url} alt="Recipe photo {i + 1}" onerror={() => (imageErrors[url] = true)} />
									{/if}

									{#if i === 0}<span class="cover-badge">Cover</span>{/if}

									<div class="tile-actions">
										{#if i !== 0}
											<button type="button" onclick={() => makeCover(i)} title="Make cover photo" aria-label="Make cover photo">★</button>
										{/if}
										{#if i > 0}
											<button type="button" onclick={() => moveImage(i, -1)} title="Move left" aria-label="Move left">←</button>
										{/if}
										{#if i < images.length - 1}
											<button type="button" onclick={() => moveImage(i, 1)} title="Move right" aria-label="Move right">→</button>
										{/if}
										<button type="button" class="tile-remove" onclick={() => removeImage(i)} title="Remove photo" aria-label="Remove photo">✕</button>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<div class="dropzone-empty">
							<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
								<rect x="3" y="5" width="18" height="14" rx="2" />
								<circle cx="9" cy="10" r="1.6" />
								<path d="m21 16-5.5-5.5a2 2 0 0 0-2.8 0L4 19" />
							</svg>
							<p class="dropzone-title">No photos yet</p>
							<p class="dropzone-hint">Paste an image URL above and press Enter</p>
						</div>
					{/if}
				</div>
			</section>

			<section>
				<span class="step-num" aria-hidden="true">02</span>
				<h2>Ingredients <span class="required" aria-hidden="true">*</span></h2>
				<div class="ingredient-list">
					{#each ingredients as ingredient, i (i)}
						<div class="ingredient-row">
							<span class="row-num">{i + 1}</span>
							<input type="text" bind:value={ingredient.name} placeholder="Ingredient (e.g. Flour)" />
							<input type="text" bind:value={ingredient.measure} placeholder="Amount (e.g. 2 cups)" />
							<button type="button" class="remove" onclick={() => removeIngredientRow(i)} aria-label="Remove ingredient">✕</button>
						</div>
					{/each}
				</div>
				<button type="button" class="add" onclick={addIngredientRow}>+ Add ingredient</button>
				{#if errors.ingredients}<span class="error">{errors.ingredients}</span>{/if}
			</section>

			<section>
				<span class="step-num" aria-hidden="true">03</span>
				<h2>Instructions <span class="required" aria-hidden="true">*</span></h2>
				<label class="instructions-label">
					<span class="hint">One step per line works best — each line becomes its own numbered step.</span>
					<textarea bind:value={instructions} rows="6" placeholder={'Preheat the oven to 400°F.\nToss vegetables with olive oil and roast for 25 minutes.\n…'}
					></textarea>
					{#if errors.instructions}<span class="error">{errors.instructions}</span>{/if}
				</label>

				{#if previewSteps.length > 0}
					<div class="steps-preview">
						<span class="preview-label">Preview — {previewSteps.length} step{previewSteps.length === 1 ? '' : 's'}</span>
						<ol>
							{#each previewSteps as step, i (i)}
								<li><span class="step-num-badge">{i + 1}</span>{step}</li>
							{/each}
						</ol>
					</div>
				{/if}
			</section>

			<section class="no-divider">
				<span class="step-num" aria-hidden="true">04</span>
				<h2>Nutrition <span class="optional-tag">Optional</span></h2>

				<label class="checkbox-label">
					<input type="checkbox" bind:checked={showNutrition} />
					Enter nutrition per serving myself
				</label>

				{#if showNutrition}
					<div class="nutrition-grid">
						<div class="stat-field">
							<span class="stat-label">Calories</span>
							<div class="stat-input-row">
								<input type="number" min="0" bind:value={calories} placeholder="480" />
								<span class="stat-unit">kcal</span>
							</div>
						</div>
						<div class="stat-field">
							<span class="stat-label">Protein</span>
							<div class="stat-input-row">
								<input type="number" min="0" bind:value={protein} placeholder="28" />
								<span class="stat-unit">g</span>
							</div>
						</div>
						<div class="stat-field">
							<span class="stat-label">Carbs</span>
							<div class="stat-input-row">
								<input type="number" min="0" bind:value={carbs} placeholder="40" />
								<span class="stat-unit">g</span>
							</div>
						</div>
						<div class="stat-field">
							<span class="stat-label">Fat</span>
							<div class="stat-input-row">
								<input type="number" min="0" bind:value={fat} placeholder="18" />
								<span class="stat-unit">g</span>
							</div>
						</div>
					</div>
				{:else}
					<div class="auto-note">
						<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
							<path d="M12 2a5 5 0 0 0-5 5c0 2 1 3 1 5v1h8v-1c0-2 1-3 1-5a5 5 0 0 0-5-5Z" />
							<path d="M9 19h6M10 22h4" />
						</svg>
						<p>Leave this unchecked and mise will estimate calories and macros per serving from your ingredient list.</p>
					</div>
				{/if}
			</section>

			<div class="submit-row">
				<a class="cancel-link" href={cancelHref}>Cancel</a>
				<button type="submit" class="submit">
					{submitLabel}
					<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M5 12h14" />
						<path d="m12 5 7 7-7 7" />
					</svg>
				</button>
			</div>
		</form>
	</div>

	{#if isSubmitting}
		<div class="page-loader" role="alert" aria-busy="true" aria-live="polite">
			<div class="page-loader-inner">
				<span class="page-spinner" aria-hidden="true"></span>
				<p>Saving your recipe…</p>
			</div>
		</div>
	{/if}
</div>

<style>
	.page-shell {
		position: relative;
		display: grid;
		grid-template-columns: minmax(260px, min(38%, 460px)) minmax(0, 1fr);
		align-items: stretch;
		overflow-x: hidden; /* decorative step numbers are allowed to bleed visually but must never force a page-level horizontal scrollbar */
	}

	/* ---- Sidebar ---- */

	.brand-panel {
		background: var(--color-bg);
		border-right: 1px solid var(--color-line-strong);
	}

	.brand-panel-inner {
		position: sticky;
		top: 80px;
		display: flex;
		flex-direction: column;
		gap: 20px;
		/* Fluid padding: full-size on wide desktops, scales down smoothly on
		 * laptops/tablets rather than jumping only at the 980px breakpoint. */
		padding: clamp(28px, 4vw, 38px) clamp(28px, 6vw, 56px) clamp(40px, 6vw, 64px) clamp(28px, 6vw, 64px);
		max-height: calc(100vh - 80px);
		overflow-y: auto;
	}

	.display-1 {
		font-size: clamp(2rem, 3vw, 4.5rem);
		margin: 14px 0 0;
		line-height: 1.05;
	}

	.lede {
		color: var(--color-ink-muted);
		font-size: 0.96rem;
		line-height: 1.6;
		margin: 0;
	}

	.accent {
		color: var(--color-accent);
	}

	.preview-card {
		border-radius: var(--radius-lg);
		overflow: hidden;
		background: var(--color-surface);
		border: 1px solid var(--color-line);
	}

	/* Only the "no photos yet" empty state is still rendered here — the
	   carousel itself (image, nav, counter, thumbs) is rc-photo-carousel,
	   styled via its --rc-carousel-* custom properties below. */
	.preview-card rc-photo-carousel {
		--rc-carousel-nav-size: 30px;
		--rc-carousel-thumb-size: 36px;
		--rc-carousel-radius: 0px;
		--rc-carousel-aspect-ratio: 4 / 4;
	}

	.preview-photo {
		position: relative;
		aspect-ratio: 4 / 4;
		background: linear-gradient(135deg, var(--color-bg-deep), var(--color-line));
		overflow: hidden;
	}

	.preview-photo.empty {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.preview-photo-label {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.16em;
		color: var(--color-ink-faint);
	}

	.preview-lines {
		padding: 16px 18px 18px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.preview-name {
		margin: 0;
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 1.02rem;
		color: var(--color-ink);
		overflow-wrap: anywhere;
	}

	.preview-sub {
		margin: 0;
		font-size: 0.78rem;
		color: var(--color-ink-muted);
	}

	.skeleton-line {
		display: block;
		height: 9px;
		border-radius: 5px;
		background: var(--color-line);
	}

	.skeleton-line.wide {
		width: 78%;
	}

	.skeleton-line.narrow {
		width: 45%;
	}

	.tagline {
		font-family: var(--font-display);
		font-style: italic;
		font-weight: 440;
		font-size: 1.05rem;
		line-height: 1.5;
		color: var(--color-ink);
		margin: 8px 0 0;
	}

	/* ---- Form pane ---- */

	.form-pane {
		min-width: 0;
		background: var(--color-surface-raised);
		/* Fluid padding so the pane doesn't feel cramped right above the
		 * 980px stacking breakpoint, and doesn't need a hard jump to look right. */
		padding: clamp(40px, 6vw, 72px) clamp(28px, 5vw, 64px) 60px;
	}

	.recipe-form {
		display: flex;
		flex-direction: column;
		max-width: 800px;
		/* Scales down with viewport above the stacking breakpoint so the
		 * decorative left offset never eats into space the form fields need. */
		padding-left: clamp(40px, 8vw, 96px);
	}

	section {
		position: relative;
		padding: 72px 0 0;
		display: flex;
		flex-direction: column;
		gap: 22px;
	}

	.recipe-form section:first-child {
		padding-top: 0;
	}

	.step-num {
		position: absolute;
		top: -0.2em;
		left: -80px;
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 10rem;
		line-height: 1;
		color: var(--color-ink);
		opacity: 0.03;
		pointer-events: none;
		user-select: none;
		z-index: 0;
	}

	.recipe-form section:first-child .step-num {
		top: -0.6em;
	}

	h2 {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: baseline;
		gap: 10px;
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 1.55rem;
		margin: 0 0 16px;
		padding-bottom: 16px;
		border-bottom: 1px solid var(--color-line);
		color: var(--color-ink);
	}

	.required {
		font-weight: 600;
		color: var(--color-accent);
	}

	.optional-tag {
		font-family: var(--font-body);
		font-size: 0.72rem;
		font-weight: 500;
		color: var(--color-ink-muted);
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 8px;
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-ink-muted);
	}

	.four-col,
	.two-col {
		display: grid;
		gap: 20px;
	}

	/* Fluid grids: instead of fixed-width tracks (which overflow once the
	 * available width shrinks — e.g. in the two-column layout just above the
	 * 980px stacking breakpoint), each field claims a minimum comfortable
	 * width and the grid reflows its own column count at every viewport
	 * size. No extra media queries needed for these three. */
	.four-col {
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
	}

	.nutrition-grid {
		display: grid;
		gap: 20px;
		grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
	}

	.two-col {
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
	}

	.field-hint {
		margin: -10px 0 0;
		font-size: 0.76rem;
		color: var(--color-ink-faint);
	}

	.tag-chip-list {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin: -8px 0 0;
        }
        .tag-chip {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                background: var(--color-surface);
                border: 1px solid var(--color-line);
                color: var(--color-ink-muted);
                font-size: 0.78rem;
                font-weight: 600;
                padding: 5px 8px 5px 12px;
                border-radius: 999px;
        }
        .tag-chip button {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 16px;
                height: 16px;
                border: none;
                border-radius: 50%;
                background: transparent;
                color: var(--color-ink-faint);
                font-size: 0.6rem;
                cursor: pointer;
                padding: 0;
                transition: background 0.15s ease, color 0.15s ease;
        }
        .tag-chip button:hover {
                background: var(--color-danger);
                color: #fff;
        }

	.checkbox-label {
		flex-direction: row;
		align-items: center;
		gap: 9px;
		text-transform: none;
		letter-spacing: 0;
		font-weight: 500;
		font-size: 0.9rem;
		color: var(--color-ink);
	}

	.checkbox-label input[type='checkbox'] {
		width: 16px;
		height: 16px;
		accent-color: var(--color-accent);
	}

	/* Flat underline inputs everywhere except the textarea, which keeps a box */
	input {
		width: 100%;
		box-sizing: border-box;
		font-family: var(--font-body);
		font-weight: 400;
		font-size: 1rem;
		color: var(--color-ink);
		background: transparent;
		border: none;
		border-bottom: 1.5px solid var(--color-line);
		border-radius: 0;
		padding: 9px 2px;
		transition: border-color 0.15s ease;
	}

	input:focus {
		outline: none;
		border-color: var(--color-accent);
	}

	input[type='checkbox'] {
		width: auto;
		border: none;
	}

	input::placeholder,
	textarea::placeholder {
		color: var(--color-ink-faint);
	}

	textarea {
		width: 100%;
		box-sizing: border-box;
		font-family: var(--font-body);
		font-weight: 400;
		font-size: 0.95rem;
		color: var(--color-ink);
		background: var(--color-surface);
		border: 1.5px solid var(--color-line);
		border-radius: var(--radius-sm);
		padding: 14px 16px;
		transition: border-color 0.15s ease, box-shadow 0.15s ease;
	}

	textarea:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 12%, transparent);
	}

	/* ---- Photos ---- */

	.photo-dropzone {
		border: 1.5px dashed var(--color-line-strong);
		border-radius: var(--radius-md);
		padding: 22px;
		background: color-mix(in srgb, var(--color-bg) 55%, transparent);
	}

	.dropzone-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 20px 16px;
		color: var(--color-ink-faint);
		text-align: center;
	}

	.dropzone-title {
		margin: 6px 0 0;
		font-size: 0.86rem;
		font-weight: 600;
		color: var(--color-ink-muted);
	}

	.dropzone-hint {
		margin: 0;
		font-size: 0.78rem;
		color: var(--color-ink-faint);
	}

	.image-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
		gap: 12px;
	}

	.image-tile {
		position: relative;
		aspect-ratio: 1 / 1;
		border-radius: var(--radius-sm);
		overflow: hidden;
		border: 1.5px solid var(--color-line);
		background: var(--color-surface);
	}

	.image-tile.cover {
		border-color: var(--color-accent);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 16%, transparent);
	}

	.image-tile img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.cover-badge {
		position: absolute;
		top: 6px;
		left: 6px;
		background: var(--color-accent);
		color: #fff;
		font-size: 0.58rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 3px 7px;
		border-radius: 999px;
		z-index: 1;
	}

	.tile-error {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 6px;
		color: var(--color-danger);
		background: color-mix(in srgb, var(--color-danger) 8%, var(--color-bg));
		font-size: 0.6rem;
		text-align: center;
		padding: 6px;
	}

	.tile-actions {
		position: absolute;
		inset: auto 0 0 0;
		display: flex;
		justify-content: center;
		gap: 4px;
		padding: 6px;
		background: linear-gradient(to top, rgba(20, 16, 8, 0.68), transparent);
		opacity: 0;
		transition: opacity 0.15s ease;
	}

	.image-tile:hover .tile-actions,
	.image-tile:focus-within .tile-actions {
		opacity: 1;
	}

	@media (hover: none) {
		.tile-actions {
			opacity: 1;
			background: linear-gradient(to top, rgba(20, 16, 8, 0.55), transparent 70%);
			padding: 8px 6px;
		}

		/* Touch devices get no hover affordance, so bump the hit targets up
		 * toward the ~28-32px range instead of the mouse-oriented 22px. */
		.tile-actions button {
			width: 28px;
			height: 28px;
			font-size: 0.72rem;
		}

		.preview-card rc-photo-carousel {
			--rc-carousel-nav-size: 36px;
		}
	}

	.tile-actions button {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		border: none;
		background: rgba(255, 255, 255, 0.92);
		color: var(--color-ink);
		font-size: 0.64rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
		padding: 0;
		transition: transform 0.15s ease, background 0.15s ease;
	}

	.tile-actions button:hover {
		transform: scale(1.1);
	}

	.tile-actions .tile-remove {
		background: var(--color-danger);
		color: #fff;
	}

	/* ---- Ingredients ---- */

	.ingredient-list {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.ingredient-row {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) minmax(0, 1fr) auto;
		align-items: center;
		gap: 12px;
		padding: 6px 0;
	}

	.ingredient-row input {
		min-width: 0;
	}

	.row-num {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: var(--color-bg);
		border: 1px solid var(--color-line);
		color: var(--color-ink-muted);
		font-family: var(--font-mono);
		font-size: 0.66rem;
		font-weight: 600;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.remove {
		border: none;
		background: transparent;
		color: var(--color-ink-faint);
		border-radius: 50%;
		width: 30px;
		height: 30px;
		flex-shrink: 0;
		cursor: pointer;
		font-size: 0.78rem;
		transition: background 0.15s ease, color 0.15s ease;
	}

	.remove:hover {
		background: color-mix(in srgb, var(--color-danger) 12%, transparent);
		color: var(--color-danger);
	}

	.add {
		align-self: flex-start;
		border: 1px solid var(--color-line-strong);
		background: var(--color-surface);
		color: var(--color-ink);
		border-radius: var(--radius-sm);
		padding: 9px 16px;
		cursor: pointer;
		font-size: 0.82rem;
		font-weight: 600;
		text-transform: none;
		letter-spacing: 0;
		margin-top: 6px;
		box-shadow: 0 2px 6px color-mix(in srgb, var(--color-ink) 12%, transparent);
		transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
	}

	.add:hover {
		border-color: var(--color-primary);
		background: var(--color-bg);
		box-shadow: 0 4px 12px color-mix(in srgb, var(--color-ink) 18%, transparent);
		transform: translateY(-1px);
	}

	/* ---- Instructions ---- */

	.instructions-label {
		gap: 8px;
	}

	.hint {
		font-weight: 400;
		font-size: 0.8rem;
		text-transform: none;
		letter-spacing: 0;
		color: var(--color-ink-muted);
	}

	.auto-note {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 14px 16px;
		border-radius: var(--radius-md);
		background: var(--color-primary-soft);
		color: var(--color-primary-dark);
	}

	.auto-note svg {
		flex-shrink: 0;
		margin-top: 1px;
	}

	.auto-note p {
		margin: 0;
		font-size: 0.84rem;
		line-height: 1.5;
	}

	.steps-preview {
		background: var(--color-bg);
		border: 1px dashed var(--color-line-strong);
		border-radius: var(--radius-md);
		padding: 16px 18px;
	}

	.preview-label {
		display: block;
		font-family: var(--font-mono);
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-primary);
		font-weight: 600;
		margin-bottom: 12px;
	}

	.steps-preview ol {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 9px;
	}

	.steps-preview li {
		display: flex;
		gap: 11px;
		font-size: 0.88rem;
		line-height: 1.5;
		color: var(--color-ink);
	}

	.step-num-badge {
		flex-shrink: 0;
		width: 21px;
		height: 21px;
		border-radius: 50%;
		background: var(--color-accent);
		color: #fff;
		font-family: var(--font-mono);
		font-size: 0.68rem;
		font-weight: 600;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-top: 1px;
	}

	.error {
		display: block;
		color: var(--color-danger);
		font-weight: 400;
		font-size: 0.8rem;
		text-transform: none;
		letter-spacing: 0;
	}

	/* ---- Nutrition ---- */

	.stat-field {
		display: flex;
		flex-direction: column;
		gap: 10px;
		min-width: 0;
	}

	.stat-label {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-ink-muted);
	}

	.stat-input-row {
		display: flex;
		align-items: baseline;
		gap: 6px;
		border-bottom: 1.5px solid var(--color-line);
		padding-bottom: 8px;
		transition: border-color 0.15s ease;
	}

	.stat-input-row:focus-within {
		border-color: var(--color-accent);
	}

	.stat-input-row input {
		border: none;
		padding: 0;
		flex: 1;
		min-width: 0;
		font-size: 1.05rem;
	}

	.stat-unit {
		font-size: 0.72rem;
		color: var(--color-ink-muted);
		white-space: nowrap;
	}

	/* ---- Submit ---- */

	.submit-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
		padding-top: 48px;
	}

	.cancel-link {
		color: var(--color-ink-muted);
		font-weight: 600;
		font-size: 0.9rem;
		text-decoration: none;
		transition: color 0.15s ease;
	}

	.cancel-link:hover {
		color: var(--color-ink);
	}

	.submit {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		justify-content: center;
		border: none;
		background: var(--color-accent);
		color: #fff;
		font-weight: 600;
		padding: 15px 26px;
		border-radius: 999px;
		cursor: pointer;
		font-size: 0.92rem;
		transition: background 0.15s ease, transform 0.15s ease;
	}

	.submit:hover {
		background: var(--color-accent-bright);
		transform: translateY(-1px);
	}

	.page-loader {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
		background: color-mix(in srgb, var(--color-bg-deep) 78%, transparent);
		backdrop-filter: blur(2px);
	}

	.page-loader-inner {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		width: 100%;
		max-width: 320px;
		padding: 32px 40px;
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		border: 1px solid var(--color-line);
		box-shadow: 0 12px 32px color-mix(in srgb, var(--color-ink) 20%, transparent);
	}

	.page-loader-inner p {
		margin: 0;
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 0.95rem;
		color: var(--color-ink);
		text-align: center;
	}

	.page-spinner {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		border: 3px solid var(--color-line);
		border-top-color: var(--color-accent);
		animation: page-spin 0.7s linear infinite;
		flex-shrink: 0;
	}

	@keyframes page-spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* ===== Breakpoints ===== */

	/* Large desktop / ultra-wide: cap how far the decorative step numbers
	 * and sidebar can stretch so the layout doesn't look sparse on very
	 * wide monitors. */
	@media (min-width: 1600px) {
		.recipe-form {
			padding-left: 96px;
		}
	}

	/* Small laptops / tablet landscape (e.g. iPad landscape at 1024px):
	 * the two-column split still applies here, so give the form pane a
	 * little more breathing room before the 980px stack point. */
	@media (max-width: 1150px) {
		.form-pane {
			padding-top: clamp(32px, 5vw, 48px);
		}
	}

	@media (max-width: 980px) {
		.page-shell {
			grid-template-columns: 1fr;
			gap: 0;
		}

		.brand-panel {
			border-right: none;
			border-bottom: 1px solid var(--color-line-strong);
		}

		.brand-panel-inner {
			position: static;
			max-height: none;
			overflow: visible;
			padding: 40px 24px 48px;
		}

		.form-pane {
			padding: 48px 24px 90px;
		}

		.preview-card {
			max-width: 380px;
		}

		.recipe-form {
			max-width: none;
			padding-left: 0;
		}

		section {
			padding-top: 56px;
		}

		.step-num {
			left: auto;
			right: 0;
			top: -0.3em;
			font-size: 4.5rem;
			opacity: 0.06;
		}

		.recipe-form section:first-child .step-num {
			top: -0.15em;
		}
	}

	/* Small phones: tighten paddings/gaps further and stack rows that are
	 * still two-up above this point. */
	@media (max-width: 560px) {
		.ingredient-row {
			grid-template-columns: auto 1fr auto;
			grid-template-areas:
				'num name name'
				'. measure remove';
			row-gap: 6px;
		}

		.ingredient-row .row-num {
			grid-area: num;
		}

		.ingredient-row input:first-of-type {
			grid-area: name;
		}

		.ingredient-row input:last-of-type {
			grid-area: measure;
		}

		.ingredient-row .remove {
			grid-area: remove;
		}
	}

	@media (max-width: 480px) {
		.submit-row {
			flex-direction: column-reverse;
			align-items: stretch;
			gap: 16px;
		}

		.submit {
			width: 100%;
		}

		.cancel-link {
			text-align: center;
		}
	}

	@media (max-width: 380px) {
		.brand-panel-inner {
			padding: 32px 16px 36px;
		}

		.form-pane {
			padding: 40px 16px 72px;
		}

		.photo-dropzone {
			padding: 16px;
		}

		.page-loader-inner {
			padding: 24px 20px;
		}
	}
</style>