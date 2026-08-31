<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { reveal } from '$lib/actions/reveal';
  import { parseSteps } from '$lib/instructions';
  import { estimateNutritionPerServing, scaleNutrition } from '$lib/nutrition';
  import { isSafeHttpUrl } from '$lib/url';
  import { favorites } from '$lib/stores/favorites.svelte';
  import { mealPlan } from '$lib/stores/mealPlan.svelte';
  import { ratings } from '$lib/stores/ratings.svelte';
  import { userRecipes } from '$lib/stores/userRecipes.svelte';
  import { DAYS, type Day, type Recipe } from '$lib/types';

  interface Props {
    id: string;
    initialRecipe: Recipe | null;
    isUserRecipe: boolean;
    initialNotFound: boolean;
  }

  let { id, initialRecipe, isUserRecipe, initialNotFound }: Props = $props();

  // svelte-ignore state_referenced_locally -- intentional: the parent route
  // remounts this component (via `{#key page.params.id}`) on every id
  // change, so these are one-time seeds for a fresh instance, not meant to
  // stay in sync with the props across the component's own lifetime.
  let recipe = $state<Recipe | null>(initialRecipe);
  // svelte-ignore state_referenced_locally -- see above
  let loading = $state(isUserRecipe);
  // svelte-ignore state_referenced_locally -- see above
  let notFound = $state(initialNotFound);
  let checkedIngredients = $state<Record<number, boolean>>({});
  let viewServings = $state(4);
  let viewServingsInitialized = false;
  let showVideo = $state(false);
  let videoMeta = $state<{ title: string; author: string } | null>(null);
  let copied = $state(false);
  let plannerMenuOpen = $state(false);
  let justAddedDay = $state<Day | null>(null);
  let plannerWrapper: HTMLDivElement | undefined = $state();

  onMount(() => {
    if (isUserRecipe) {
      recipe = userRecipes.getById(id) ?? null;
      notFound = !recipe;
      loading = false;
    }
  });

  $effect(() => {
    if (recipe && !viewServingsInitialized) {
      viewServings = recipe.servings ?? 4;
      viewServingsInitialized = true;
    }
  });

  // Photo list for the hero carousel — keyboard nav, touch swipe, thumbs,
  // and the "n / total" counter all now live in <rc-photo-carousel>.
  let heroPhotos = $derived(recipe?.images?.length ? recipe.images : recipe?.image ? [recipe.image] : []);

  // --- Other functions ---
  function onFavoriteToggle() {
    if (recipe) favorites.toggle(recipe);
  }

  function onRatingChange(e: CustomEvent<{ value: number }>) {
    if (recipe) ratings.set(recipe.id, e.detail.value);
  }

  function deleteRecipe() {
    if (!recipe) return;
    if (confirm(`Delete "${recipe.name}"? This can't be undone.`)) {
      userRecipes.remove(recipe.id);
      favorites.remove(recipe.id);
      goto('/discover');
    }
  }

  function toggleIngredient(i: number) {
    checkedIngredients[i] = !checkedIngredients[i];
  }

  function adjustServings(delta: number) {
    viewServings = Math.max(1, Math.min(24, viewServings + delta));
  }

  function extractYouTubeId(url: string): string | null {
    const match = url.match(
      /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,15})/
    );
    return match ? match[1] : null;
  }

  async function copyVideoLink() {
    if (!recipe?.youtube) return;
    try {
      await navigator.clipboard.writeText(recipe.youtube);
      copied = true;
      setTimeout(() => (copied = false), 1600);
    } catch { /* ignore */ }
  }

  // --- Derived state ---
  let steps = $derived(recipe ? parseSteps(recipe.instructions) : []);
  let checkedCount = $derived(Object.values(checkedIngredients).filter(Boolean).length);
  let baseServings = $derived(recipe?.servings ?? 4);
  let isEstimated = $derived(!recipe?.nutrition);
  let nutritionAtBase = $derived(
    recipe ? recipe.nutrition ?? estimateNutritionPerServing(recipe.ingredients, baseServings) : null
  );
  let nutrition = $derived(
    nutritionAtBase ? scaleNutrition(nutritionAtBase, baseServings, viewServings) : null
  );
  let macroTotal = $derived(nutrition ? Math.max(1, nutrition.protein + nutrition.carbs + nutrition.fat) : 1);
  let youtubeId = $derived(recipe?.youtube ? extractYouTubeId(recipe.youtube) : null);
  // Belt-and-suspenders: even though the form validates this on save, older
  // localStorage data (or a future import feature) could still carry a
  // javascript:/data: URI — never render that as a real, clickable href.
  let safeYoutubeLink = $derived(recipe?.youtube && isSafeHttpUrl(recipe.youtube) ? recipe.youtube : null);
  let channelInitial = $derived(videoMeta?.author?.trim()?.[0]?.toUpperCase() ?? '▶');

  // --- Effects ---
  $effect(() => {
    if (!youtubeId) showVideo = false;
  });

  $effect(() => {
    if (!showVideo) return;
    function onKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') showVideo = false;
    }
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  });

  $effect(() => {
    const url = recipe?.youtube;
    videoMeta = null;
    if (!url) return;

    let cancelled = false;
    fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled) videoMeta = { title: data.title, author: data.author_name };
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  });

  // Focus management for video close button
  let closeVideoBtn: HTMLButtonElement | undefined = $state();
  let videoPlayBtn: HTMLButtonElement | undefined = $state();

  $effect(() => {
    if (showVideo && closeVideoBtn) {
      closeVideoBtn.focus();
    }
  });

  // --- Add to Planner ---
  let plannedDays = $derived(
    recipe ? DAYS.filter((day) => mealPlan.plan[day].some((e) => e.recipeId === recipe!.id)) : []
  );

  function togglePlannerMenu() {
    plannerMenuOpen = !plannerMenuOpen;
  }

  function closePlannerMenu() {
    plannerMenuOpen = false;
  }

  function addToPlanner(day: Day) {
    if (!recipe) return;
    mealPlan.add(day, recipe);
    justAddedDay = day;
    setTimeout(() => {
      if (justAddedDay === day) justAddedDay = null;
    }, 1600);
  }

  $effect(() => {
    if (!plannerMenuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (plannerWrapper && !plannerWrapper.contains(e.target as Node)) {
        plannerMenuOpen = false;
      }
    }
    function onKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') plannerMenuOpen = false;
    }
    window.addEventListener('click', onDocClick);
    window.addEventListener('keydown', onKeydown);
    return () => {
      window.removeEventListener('click', onDocClick);
      window.removeEventListener('keydown', onKeydown);
    };
  });
</script>

<svelte:head>
  <title>{recipe ? `${recipe.name} — Sprig` : 'Recipe — Sprig'}</title>
</svelte:head>

{#if loading}
  <p class="status">Loading recipe…</p>
{:else if notFound || !recipe}
  <div class="not-found">
    <p class="status error">Recipe not found.</p>
    <a class="back-link" href="/discover">← Back to the index</a>
  </div>
{:else}
  <article class="recipe">

    <!-- ===== HERO (image left, content right) ===== -->
    <div class="hero-wrapper">
      <div class="hero-inner">
        <!-- Image column — carousel navigation/keyboard/touch/thumbs are
             owned by the shared <rc-photo-carousel> (see @nagp/recipe-ui);
             this wrapper only supplies the hero's own size/shadow chrome
             and the "back" button slotted into its corner. -->
        <div class="hero-image">
          <rc-photo-carousel
            images={heroPhotos}
            alt={recipe.name}
            label="Recipe photos"
            counter-position="top-right"
            thumbs-layout="overlay"
          >
            <a slot="corner" class="back-btn" href="/discover" aria-label="Back to discover">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </a>
          </rc-photo-carousel>
        </div>

        <!-- Content column -->
        <div class="hero-content">
          {#if recipe.area}
            <span class="area-badge">{recipe.area}</span>
          {/if}
          <h1 class="recipe-title">{recipe.name}</h1>

          {#if recipe.tags?.length}
            <div class="tag-row" aria-label="Tags">
              {#each recipe.tags as tag (tag)}
                <span class="tag-pill">#{tag}</span>
              {/each}
            </div>
          {/if}

          <!-- Stats row: ingredients & steps count -->
          <div class="recipe-stats">
            <span class="stat">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              {recipe.ingredients.length} ingredients
            </span>
            <span class="stat-separator">•</span>
            <span class="stat">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 22v-4M4 12H2M6 12H4M20 12h-2M22 12h-2M19.07 4.93l-2.83 2.83M4.93 19.07l2.83-2.83M19.07 19.07l-2.83-2.83M4.93 4.93l2.83 2.83"/></svg>
              {steps.length} steps
            </span>
          </div>

          <!-- Rating -->
          <div class="rating-wrapper">
            <rc-star-rating value={ratings.get(recipe.id)} onratingChange={onRatingChange}></rc-star-rating>
          </div>

          <!-- Action buttons and links -->
          <div class="hero-actions">
            <button 
              class="btn btn-primary" 
              class:saved={favorites.isFavorite(recipe.id)} 
              onclick={onFavoriteToggle}
            >
              {#if favorites.isFavorite(recipe.id)}
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" stroke="none"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                Saved
              {:else}
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                Save
              {/if}
            </button>
            <div class="planner-wrapper" bind:this={plannerWrapper}>
              <button
                class="btn btn-secondary"
                class:planned={plannedDays.length > 0}
                onclick={(e) => {
                  e.stopPropagation();
                  togglePlannerMenu();
                }}
                aria-haspopup="true"
                aria-expanded={plannerMenuOpen}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                {plannedDays.length > 0 ? `Planned · ${plannedDays.length}` : 'Add to Planner'}
              </button>

              {#if plannerMenuOpen}
                <div class="planner-menu" role="menu">
                  <span class="planner-menu-title">Add to a day</span>
                  <ul class="planner-day-list">
                    {#each DAYS as day (day)}
                      {@const isPlanned = plannedDays.includes(day)}
                      <li>
                        <button
                          class="planner-day-btn"
                          class:added={isPlanned}
                          onclick={() => addToPlanner(day)}
                          role="menuitem"
                        >
                          <span>{day}</span>
                          {#if justAddedDay === day}
                            <span class="planner-check">✓ Added</span>
                          {:else if isPlanned}
                            <span class="planner-check subtle">✓ Added</span>
                          {:else}
                            <span class="planner-plus">+</span>
                          {/if}
                        </button>
                      </li>
                    {/each}
                  </ul>
                  <a class="planner-view-link" href="/meal-plan" onclick={closePlannerMenu}>View meal plan →</a>
                </div>
              {/if}
            </div>

            {#if recipe.isUserCreated}
              <span class="action-divider">|</span>
              <a class="action-link" href={`/recipe/${recipe.id}/edit`}>Edit</a>
              <button class="action-link danger" onclick={deleteRecipe}>Delete</button>
            {/if}
          </div>
        </div>
      </div>
    </div>

    <!-- ===== CONTENT GRID ===== -->
    <div class="content-grid">
      <!-- LEFT: Ingredients + Nutrition -->
      <aside class="left-column">
        <section class="card ingredients-card">
          <div class="card-header">
            <h2>Ingredients</h2>
            <span class="badge">{checkedCount}/{recipe.ingredients.length}</span>
          </div>
          <ul class="ingredient-list">
            {#each recipe.ingredients as ing, i (i)}
              <li>
                <label class="ingredient-item">
                  <input type="checkbox" checked={!!checkedIngredients[i]} onchange={() => toggleIngredient(i)} />
                  <span class="custom-checkbox"></span>
                  <span class:checked={checkedIngredients[i]} class="ingredient-text">
                    <span class="measure">{ing.measure}</span> {ing.name}
                  </span>
                </label>
              </li>
            {/each}
          </ul>
        </section>

        {#if nutrition}
          <section class="card nutrition-card">
            <div class="card-header">
              <h2>Nutrition</h2>
              <div class="serving-control">
                <button class="serving-btn" onclick={() => adjustServings(-1)} aria-label="Fewer servings">−</button>
                <span class="serving-value">{viewServings} <span class="serving-label">serving{viewServings === 1 ? '' : 's'}</span></span>
                <button class="serving-btn" onclick={() => adjustServings(1)} aria-label="More servings">+</button>
              </div>
            </div>
            <div class="calorie-display">
              <span class="calorie-number">{nutrition.calories}</span>
              <span class="calorie-unit">kcal per serving</span>
            </div>
            <div class="macro-group">
              <div class="macro-item">
                <span class="macro-name">Protein</span>
                <div class="macro-track"><div class="macro-fill protein" style={`width:${(nutrition.protein / macroTotal) * 100}%`}></div></div>
                <span class="macro-amount">{nutrition.protein}g</span>
              </div>
              <div class="macro-item">
                <span class="macro-name">Carbs</span>
                <div class="macro-track"><div class="macro-fill carbs" style={`width:${(nutrition.carbs / macroTotal) * 100}%`}></div></div>
                <span class="macro-amount">{nutrition.carbs}g</span>
              </div>
              <div class="macro-item">
                <span class="macro-name">Fat</span>
                <div class="macro-track"><div class="macro-fill fat" style={`width:${(nutrition.fat / macroTotal) * 100}%`}></div></div>
                <span class="macro-amount">{nutrition.fat}g</span>
              </div>
            </div>
            <p class="nutrition-note">{isEstimated ? 'Estimated — for guidance only' : 'As entered by author'}</p>
          </section>
        {/if}
      </aside>

      <!-- RIGHT: Instructions + YouTube -->
      <div class="right-column">
        <section class="card instructions-card">
          <h2>Preparation</h2>
          <ol class="step-list">
            {#each steps as step, i (i)}
              <li use:reveal={{ delay: Math.min(i, 6) * 40 }}>
                <span class="step-number">{String(i + 1).padStart(2, '0')}</span>
                <span class="step-description">{step}</span>
              </li>
            {/each}
          </ol>
        </section>

        {#if youtubeId}
          <section class="card video-card">
            <div class="card-header">
              <h2>Watch it made</h2>
              <span class="badge video-badge">▶ Video</span>
            </div>
            <div class="player-wrapper">
              {#if showVideo}
                <div class="player-active">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`}
                    title="Video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen
                  ></iframe>
                  <button
                    bind:this={closeVideoBtn}
                    class="close-player"
                    onclick={() => {
                      showVideo = false;
                      setTimeout(() => videoPlayBtn?.focus(), 50);
                    }}
                  >
                    ✕ Close
                  </button>
                </div>
              {:else}
                <button
                  bind:this={videoPlayBtn}
                  class="player-thumb"
                  onclick={() => (showVideo = true)}
                  aria-label="Play video"
                >
                  <img src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`} alt="" loading="lazy" />
                  <div class="thumb-overlay"></div>

                  {#if videoMeta}
                    <div class="channel-bar">
                      <span class="avatar">{channelInitial}</span>
                      <div class="channel-meta">
                        <span class="video-title">{videoMeta.title}</span>
                        <span class="video-author">{videoMeta.author}</span>
                      </div>
                    </div>
                  {/if}

                  <div class="play-button">
                    <span class="play-icon">▶</span>
                  </div>
                  <span class="watch-badge">
                    <svg viewBox="0 0 28 20" width="18" height="13"><rect width="28" height="20" rx="5" fill="#FF0000"/><path d="M11 5.5 20 10 11 14.5Z" fill="#fff"/></svg>
                    Watch
                  </span>
                </button>
              {/if}
            </div>
            <div class="video-actions">
              {#if safeYoutubeLink}
                <a class="link" href={safeYoutubeLink} target="_blank" rel="noopener noreferrer">Open on YouTube</a>
              {/if}
              <button class="link muted" onclick={copyVideoLink}>{copied ? '✓ Copied' : 'Copy link'}</button>
            </div>
          </section>
        {/if}
      </div>
    </div>

  </article>
{/if}

<style>
  /* ===== GLOBAL ===== */

  * {
    box-sizing: border-box;
    margin: 0;
  }

  .status {
    max-width: var(--content-max, 1200px);
    margin: 0 auto;
    padding: 60px 28px;
    color: var(--color-ink-muted);
    font-size: 1.1rem;
  }
  .status.error {
    color: var(--color-danger);
  }
  .not-found {
    max-width: var(--content-max, 1200px);
    margin: 0 auto;
    padding: 20px 28px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .back-link {
    color: var(--color-sage);
    font-weight: 600;
    text-decoration: none;
    transition: color 0.2s;
  }
  .back-link:hover {
    color: var(--color-accent);
  }

  .recipe {
    background: var(--color-bg);
    padding-bottom: 80px;
    font-family: var(--font-body);
    color: var(--color-ink);
  }

  /* ===== HERO ===== */
  .hero-wrapper {
    background: var(--color-surface-raised);
    border-bottom: 1px solid rgba(0, 0, 0, 0.02);
    position: relative;
    box-shadow: 0 4px 30px var(--color-line);
  }
  .hero-wrapper::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, var(--color-accent), var(--color-sage), var(--color-accent));
    opacity: 0.15;
  }

  .hero-inner {
    max-width: var(--content-max, 1200px);
    margin: 0 auto;
    padding: 32px 40px 20px;
    display: flex;
    gap: 64px;
    align-items: stretch;
  }

  /* Image column — the carousel itself (radius, aspect-ratio, hover-zoom,
     placeholder shimmer, gradient overlay) is owned by rc-photo-carousel;
     this wrapper just sets the hero's own sizing and drop shadow. */
  .hero-image {
    position: relative;
    flex: 0 0 45%;
    min-height: 320px;
    box-shadow: 0 20px 60px var(--color-line);
    transition: box-shadow 0.4s ease;
  }
  .hero-image:hover {
    box-shadow: 0 28px 80px rgba(26, 21, 18, 0.10);
  }
  .hero-image rc-photo-carousel {
    --rc-carousel-radius: 28px;
    aspect-ratio: 4 / 3;
  }

  /* Content column */
  .hero-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 24px 0;
    color: var(--color-ink);
    background: var(--color-surface-raised);
    padding: 32px 36px;
    border-left: 1px solid var(--color-line);
  }

  .area-badge {
    font-family: var(--font-mono);
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    background: var(--color-sage);
    color: var(--color-on-photo);
    padding: 4px 16px;
    border-radius: 999px;
    display: inline-block;
    align-self: flex-start;
    font-weight: 700;
    border: none;
    margin-bottom: 12px;
  }

  .recipe-title {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: clamp(2.6rem, 6.5vw, 4.6rem);
    letter-spacing: -0.03em;
    margin: 6px 0 14px;
    line-height: 1.04;
    color: var(--color-ink);
  }

  .tag-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: -4px 0 16px;
  }

  .tag-pill {
    font-family: var(--font-body);
    font-size: 0.76rem;
    font-weight: 600;
    color: var(--color-sage);
    background: color-mix(in srgb, var(--color-sage) 9%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-sage) 18%, transparent);
    padding: 4px 12px;
    border-radius: 999px;
  }

  .recipe-stats {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
    font-size: 0.95rem;
    color: var(--color-ink-muted);
  }
  .stat {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
  }
  .stat svg {
    stroke: var(--color-sage);
    flex-shrink: 0;
  }
  .stat-separator {
    color: var(--color-ink-faint);
    font-weight: 300;
  }

  .rating-wrapper {
    margin-bottom: 24px;
  }

  .hero-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 14px 20px;
    margin-top: 4px;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 12px 28px;
    border-radius: 999px;
    font-weight: 600;
    font-size: 0.9rem;
    border: none;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    text-decoration: none;
    background: transparent;
    color: var(--color-ink);
    font-family: inherit;
  }
  .btn svg {
    flex-shrink: 0;
  }

  .btn-primary {
    background: var(--color-sage);
    color: var(--color-on-photo);
    box-shadow: 0 4px 16px color-mix(in srgb, var(--color-sage) 20%, transparent);
    border: 1px solid rgba(255,255,255,0.05);
  }
  .btn-primary:hover {
    background: color-mix(in srgb, var(--color-sage) 82%, black);
    transform: translateY(-2px);
    box-shadow: 0 8px 28px color-mix(in srgb, var(--color-sage) 25%, transparent);
  }
  .btn-primary:active {
    transform: translateY(0);
    box-shadow: 0 2px 8px color-mix(in srgb, var(--color-sage) 15%, transparent);
  }
  .btn-primary.saved {
    background: var(--color-accent);
    box-shadow: 0 4px 16px color-mix(in srgb, var(--color-accent) 20%, transparent);
  }
  .btn-primary.saved:hover {
    background: color-mix(in srgb, var(--color-accent) 85%, black);
  }

  .btn-secondary {
    background: transparent;
    border: 2px solid var(--color-ink-faint);
    color: var(--color-ink-soft);
    padding: 10px 26px;
  }
  .btn-secondary:hover {
    border-color: var(--color-sage);
    color: var(--color-sage);
    transform: translateY(-2px);
  }
  .btn-secondary.planned {
    border-color: var(--color-sage);
    color: var(--color-sage);
    background: color-mix(in srgb, var(--color-sage) 6%, transparent);
  }

  /* ===== ADD TO PLANNER ===== */
  .planner-wrapper {
    position: relative;
    display: inline-flex;
  }

  .planner-menu {
    position: absolute;
    top: calc(100% + 10px);
    left: 0;
    z-index: 10;
    width: 240px;
    background: var(--color-surface-raised);
    border-radius: 16px;
    border: 1px solid var(--color-line);
    box-shadow: 0 16px 48px rgba(26, 21, 18, 0.14);
    padding: 14px;
    animation: planner-pop 0.18s ease;
  }
  @keyframes planner-pop {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .planner-menu-title {
    display: block;
    font-family: var(--font-mono);
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-weight: 700;
    color: var(--color-ink-muted);
    padding: 2px 6px 10px;
  }

  .planner-day-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-height: 260px;
    overflow-y: auto;
  }

  .planner-day-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 9px 10px;
    border: none;
    background: transparent;
    border-radius: 10px;
    font-family: inherit;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--color-ink-soft);
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }
  .planner-day-btn:hover {
    background: color-mix(in srgb, var(--color-sage) 7%, transparent);
    color: var(--color-sage);
  }
  .planner-day-btn.added {
    color: var(--color-sage);
  }

  .planner-plus {
    font-weight: 700;
    color: var(--color-ink-faint);
    font-size: 1rem;
  }
  .planner-day-btn:hover .planner-plus {
    color: var(--color-accent);
  }

  .planner-check {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--color-sage);
    white-space: nowrap;
  }
  .planner-check.subtle {
    color: color-mix(in srgb, var(--color-sage) 70%, var(--color-ink-muted));
  }

  .planner-view-link {
    display: block;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--color-line);
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-accent);
    text-decoration: none;
    text-align: center;
  }
  .planner-view-link:hover {
    text-decoration: underline;
  }

  @media (max-width: 560px) {
    .planner-menu {
      left: auto;
      right: 0;
      width: 220px;
    }
  }

  .action-divider {
    color: var(--color-ink-faint);
    font-weight: 300;
    margin: 0 2px;
    font-size: 1.2rem;
  }

  .action-link {
    background: none;
    border: none;
    color: var(--color-sage);
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    padding: 4px 0;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
    font-family: inherit;
  }
  .action-link:hover {
    color: var(--color-accent);
    border-bottom-color: var(--color-accent);
  }
  .action-link.danger {
    color: var(--color-danger);
  }
  .action-link.danger:hover {
    color: var(--color-danger);
    border-bottom-color: var(--color-danger);
  }

  /* Back button – stays on image */
  .back-btn {
    position: absolute;
    top: 20px;
    left: 20px;
    background: rgba(26, 21, 18, 0.15);
    backdrop-filter: blur(12px);
    width: 44px;
    height: 44px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-on-photo);
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.25s ease;
    z-index: 2;
    text-decoration: none;
  }
  .back-btn:hover {
    background: rgba(26, 21, 18, 0.30);
    transform: scale(1.05);
  }

  /* Responsive – stack */
  @media (max-width: 820px) {
    .hero-inner {
      flex-direction: column;
      gap: 32px;
      padding: 20px 24px 0;
    }
    .hero-image {
      flex: 0 0 auto;
      width: 100%;
      aspect-ratio: 4 / 3;
      min-height: 200px;
    }
    .hero-content {
      padding: 24px 28px;
    }
    .recipe-title {
      font-size: clamp(2.2rem, 6vw, 3rem);
    }
  }

  @media (max-width: 560px) {
    .hero-inner {
      padding: 12px 16px 0;
    }
    .back-btn {
      width: 38px;
      height: 38px;
    }
    .hero-content {
      padding: 20px;
    }
    .hero-actions {
      gap: 12px 16px;
    }
    .btn {
      padding: 10px 20px;
      font-size: 0.85rem;
    }
  }

  /* ===== CONTENT GRID ===== */
  .content-grid {
    max-width: var(--content-max, 1200px);
    margin: 0 auto;
    padding: 48px 40px 0;
    display: grid;
    grid-template-columns: minmax(280px, 340px) 1fr;
    gap: 64px;
    align-items: start;
  }
  @media (max-width: 760px) {
    .content-grid {
      grid-template-columns: 1fr;
      gap: 40px;
      padding: 32px 20px 0;
    }
  }

  .left-column {
    display: flex;
    flex-direction: column;
    gap: 32px;
    position: sticky;
    top: 28px;
  }

  .right-column {
    display: flex;
    flex-direction: column;
    gap: 44px;
  }

  h2 {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 1.4rem;
    color: var(--color-ink);
    margin: 0;
    letter-spacing: -0.01em;
  }

  /* ===== CARDS ===== */
  .card {
    background: var(--color-surface-raised);
    border-radius: 24px;
    padding: 32px 32px 28px;
    border: 1px solid var(--color-line);
    box-shadow: var(--shadow-card);
    transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    position: relative;
  }
  .card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--color-accent), var(--color-sage));
    opacity: 0;
    transition: opacity 0.4s ease;
    border-radius: 24px 24px 0 0;
  }
  .card:hover {
    box-shadow: var(--shadow-card-hover);
    transform: translateY(-4px);
  }
  .card:hover::before {
    opacity: 1;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 12px;
  }
  .badge {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--color-sage);
    background: color-mix(in srgb, var(--color-sage) 8%, transparent);
    padding: 4px 16px;
    border-radius: 999px;
    letter-spacing: 0.02em;
    border: 1px solid color-mix(in srgb, var(--color-sage) 6%, transparent);
  }
  .video-badge {
    color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 8%, transparent);
    border-color: color-mix(in srgb, var(--color-accent) 6%, transparent);
  }

  /* ===== INGREDIENTS ===== */
  .ingredient-list {
    margin: 8px 0 0;
    padding: 0;
    list-style: none;
  }
  .ingredient-list li {
    border-bottom: 1px solid var(--color-line);
  }
  .ingredient-list li:last-child {
    border-bottom: none;
  }
  .ingredient-item {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding: 14px 0;
    cursor: pointer;
    font-size: 0.95rem;
    line-height: 1.4;
    color: var(--color-ink-soft);
    transition: color 0.2s ease;
  }
  .ingredient-item:hover {
    color: var(--color-sage);
  }
  .ingredient-item input[type='checkbox'] {
    position: absolute;
    opacity: 0;
    width: 1px;
    height: 1px;
  }
  .custom-checkbox {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    margin-top: 1px;
    border-radius: 6px;
    border: 2px solid var(--color-mauve);
    background: var(--color-bg);
    transition: all 0.25s ease;
    position: relative;
  }
  .ingredient-item input:checked + .custom-checkbox {
    background: var(--color-sage);
    border-color: var(--color-sage);
  }
  .ingredient-item input:checked + .custom-checkbox::after {
    content: '';
    position: absolute;
    left: 6px;
    top: 2px;
    width: 6px;
    height: 11px;
    border-right: 2.5px solid var(--color-on-photo);
    border-bottom: 2.5px solid var(--color-on-photo);
    transform: rotate(40deg);
  }
  .ingredient-item input:focus-visible + .custom-checkbox {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }
  .measure {
    font-family: var(--font-mono);
    font-weight: 600;
    font-size: 0.85em;
    color: var(--color-sage);
  }
  .ingredient-text.checked {
    color: var(--color-ink-muted);
    text-decoration: line-through;
  }
  .ingredient-text.checked .measure {
    color: var(--color-ink-muted);
  }

  /* ===== NUTRITION ===== */
  .serving-control {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .serving-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 1.5px solid var(--color-ink-faint);
    background: var(--color-bg);
    color: var(--color-ink-soft);
    font-size: 1rem;
    line-height: 1;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .serving-btn:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 12%, var(--color-surface));
    transform: scale(1.05);
  }
  .serving-value {
    font-family: var(--font-mono);
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-sage);
    white-space: nowrap;
  }
  .serving-label {
    font-weight: 500;
    color: var(--color-ink-muted);
  }

  .calorie-display {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin: 18px 0 20px;
    padding-bottom: 20px;
    border-bottom: 2px solid color-mix(in srgb, var(--color-sage) 6%, transparent);
  }
  .calorie-number {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 3.2rem;
    color: var(--color-ink);
    line-height: 1;
    letter-spacing: -0.02em;
  }
  .calorie-unit {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--color-ink-muted);
  }

  .macro-group {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .macro-item {
    display: grid;
    grid-template-columns: 60px 1fr 48px;
    align-items: center;
    gap: 14px;
  }
  .macro-name {
    font-size: 0.85rem;
    color: var(--color-ink-muted);
    font-weight: 500;
  }
  .macro-track {
    height: 8px;
    border-radius: 999px;
    background: var(--color-bg-deep);
    overflow: hidden;
    box-shadow: inset 0 1px 2px rgba(0,0,0,0.02);
  }
  .macro-fill {
    height: 100%;
    border-radius: 999px;
    transition: width 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }
  .macro-fill.protein { background: var(--color-sage); }
  .macro-fill.carbs { background: var(--color-accent); }
  .macro-fill.fat { background: var(--color-mauve); }
  .macro-amount {
    font-family: var(--font-mono);
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-ink-soft);
    text-align: right;
  }
  .nutrition-note {
    margin: 20px 0 0;
    font-size: 0.75rem;
    color: var(--color-ink-muted);
    line-height: 1.5;
    border-top: 1px solid var(--color-line);
    padding-top: 18px;
  }

  /* ===== INSTRUCTIONS ===== */
  .instructions-card h2 {
    margin-bottom: 16px;
  }
  .step-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
  }
  .step-list li {
    display: grid;
    grid-template-columns: 44px 1fr;
    gap: 24px;
    padding: 26px 0;
    border-bottom: 1px solid var(--color-line);
    transition: background 0.2s ease;
    border-radius: 12px;
    padding-left: 10px;
    padding-right: 10px;
    border-left: 3px solid transparent;
  }
  .step-list li:hover {
    background: var(--color-line);
    border-left-color: var(--color-accent);
  }
  .step-list li:last-child {
    border-bottom: none;
  }
  .step-number {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 1.15rem;
    font-style: italic;
    color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 6%, transparent);
    width: 42px;
    height: 42px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.25s ease;
  }
  .step-list li:hover .step-number {
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
    transform: scale(1.05);
  }
  .step-description {
    font-size: 1.05rem;
    line-height: 1.7;
    color: var(--color-ink-soft);
    padding-top: 2px;
  }

  /* ===== YOUTUBE ===== */
  .video-card .card-header {
    margin-bottom: 16px;
  }

  .player-wrapper {
    border-radius: 20px;
    overflow: hidden;
    border: 1px solid var(--color-line);
    background: #0B0906;
    position: relative;
  }

  .player-thumb {
    position: relative;
    display: block;
    width: 100%;
    aspect-ratio: 16 / 9;
    padding: 0;
    border: none;
    cursor: pointer;
    background: none;
  }
  .player-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.4s ease;
  }
  .player-thumb:hover img {
    transform: scale(1.02);
  }
  .thumb-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(10, 8, 6, 0.6) 0%, transparent 40%), linear-gradient(to bottom, rgba(10, 8, 6, 0.25) 0%, transparent 25%);
    pointer-events: none;
  }
  .channel-bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
  }
  .avatar {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--color-accent);
    color: var(--color-on-photo);
    font-family: var(--font-body);
    font-weight: 700;
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  }
  .channel-meta {
    display: flex;
    flex-direction: column;
    min-width: 0;
    text-align: left;
  }
  .channel-meta .video-title {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--color-on-photo);
    text-shadow: 0 1px 12px rgba(0, 0, 0, 0.6);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .channel-meta .video-author {
    font-size: 0.75rem;
    font-weight: 500;
    color: rgba(251, 247, 240, 0.8);
    text-shadow: 0 1px 12px rgba(0, 0, 0, 0.6);
  }

  .play-button {
    position: absolute;
    inset: 0;
    margin: auto;
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--color-accent) 90%, transparent);
    color: var(--color-on-photo);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    box-shadow: 0 6px 40px rgba(0, 0, 0, 0.3);
  }
  .player-thumb:hover .play-button {
    background: var(--color-accent);
    transform: scale(1.1);
    box-shadow: 0 8px 56px color-mix(in srgb, var(--color-accent) 25%, transparent);
  }
  .play-icon {
    font-size: 1.6rem;
    margin-left: 4px;
  }

  .watch-badge {
    position: absolute;
    right: 18px;
    bottom: 18px;
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(10, 8, 6, 0.55);
    backdrop-filter: blur(10px);
    color: var(--color-on-photo);
    font-size: 0.8rem;
    font-weight: 600;
    padding: 8px 20px 8px 14px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.06);
  }

  .player-active {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
  }
  .player-active iframe {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: none;
  }
  .close-player {
    position: absolute;
    top: 16px;
    right: 16px;
    background: rgba(10, 8, 6, 0.55);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: var(--color-on-photo);
    font-size: 0.8rem;
    font-weight: 600;
    padding: 6px 20px;
    border-radius: 999px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .close-player:hover {
    background: rgba(10, 8, 6, 0.75);
    transform: scale(1.04);
  }

  .video-actions {
    display: flex;
    align-items: center;
    gap: 24px;
    margin-top: 8px;
    padding-top: 4px;
  }
  .link {
    background: none;
    border: none;
    padding: 0;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--color-sage);
    cursor: pointer;
    text-decoration: none;
    transition: all 0.2s ease;
  }
  .link:hover {
    color: var(--color-accent);
    text-decoration: underline;
  }
  .link.muted {
    color: var(--color-ink-muted);
  }
  .link.muted:hover {
    color: var(--color-ink);
  }

  /* ===== RESPONSIVE FINAL ===== */
  @media (max-width: 560px) {
    .channel-bar {
      padding: 12px 16px;
    }
    .channel-meta .video-title {
      max-width: 44vw;
    }
    .watch-badge {
      font-size: 0.7rem;
      padding: 6px 14px 6px 10px;
    }
    .play-button {
      width: 60px;
      height: 60px;
    }
    .play-icon {
      font-size: 1.2rem;
    }
    .card {
      padding: 22px 18px 20px;
    }
    .content-grid {
      padding: 24px 16px 0;
    }
    .step-list li {
      padding: 20px 0;
      gap: 16px;
    }
    .step-number {
      width: 36px;
      height: 36px;
      font-size: 1rem;
    }
  }

  @media (max-width: 400px) {
    .recipe-title {
      font-size: 1.8rem;
    }
    .hero-content {
      padding: 16px;
    }
    .calorie-number {
      font-size: 2.6rem;
    }
    .recipe-stats {
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
    }
    .stat-separator {
      display: none;
    }
  }
</style>