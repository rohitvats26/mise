# Recipe Finder & Meal Planner

A recipe discovery + weekly meal planner app built with **Svelte 5 / SvelteKit**,
using a reusable **StencilJS** web component library (`recipe-ui`) published to npm
and consumed as a real dependency (not imported from source).

```
recipe-planner/
├── recipe-ui/         # StencilJS component library (publish this to npm)
└── sveltekit-app/      # SvelteKit application (consumes recipe-ui)
```

## Live links

| | |
|---|---|
| GitHub repo | [`rohitvats26/mise`](https://github.com/rohitvats26/mise) |
| Deployed app | [mise — A Kitchen Journal](https://mise-seven-fawn.vercel.app/) |
| npm package | [`@nagp/recipe-ui`](https://www.npmjs.com/package/@nagp/recipe-ui) |

## What's implemented

- **Recipe discovery** — search, category filter, and a grid of results, backed by
  [TheMealDB](https://www.themealdb.com/api.php)'s free public API (no key needed,
  uses the shared test key `1`). The initial browse list and category list are
  server-rendered via a SvelteKit `load` function (`src/routes/+page.ts`); search
  and filtering after that happen client-side.
- **Recipe details** — full ingredients + instructions page, star rating, photo
  carousel, and favorite toggle. Recipes from TheMealDB are server-rendered via
  `+page.ts`; user-created recipes (which only exist in `localStorage`) are
  resolved client-side on mount, and the details view is keyed by recipe id so
  navigating between two recipes resets state correctly instead of reusing stale
  data.
- **Recipe management** — create/edit/delete for user-created recipes, with validation
  (name, instructions, and at least one named ingredient are required). Recipes from
  TheMealDB are read-only (no edit/delete), since they aren't owned by the user.
- **Favorites** — add/remove/view, persisted locally.
- **Weekly meal planner** — assign a favorite recipe to any day, remove it, one plan
  slot per day, persisted locally.
- **Stencil component library** — `rc-recipe-card`, `rc-star-rating`, `rc-search-bar`,
  `rc-photo-carousel`. Each demonstrates props, custom events, and/or slots (see
  [Integration details](#integration-details) below).

## Assumptions

- **No custom backend.** The assignment doesn't require one, so "server-side" state
  (favorites, user-created recipes, the weekly plan, ratings) is persisted in the
  browser's `localStorage` via small Svelte 5 rune-based stores
  (`src/lib/stores/*.svelte.ts`). This is called out explicitly here since it's the
  biggest architectural judgment call — swapping to a real backend later would mean
  replacing the store internals with API calls; the component-facing API
  (`favorites.add()`, `mealPlan.assign()`, etc.) wouldn't need to change.
- **Public recipe API = TheMealDB.** It's free, needs no API key/signup, and is
  reliable for a class assignment. If you'd rather use Spoonacular or another API,
  only `src/lib/api/mealdb.ts` needs to change — everything else consumes the shared
  `Recipe` type in `src/lib/types.ts`.
- **"Favorites" is the pool for the meal planner.** Rather than re-searching the API
  from inside the planner, a day is assigned by picking from your current favorites —
  this keeps the planner fast and matches a typical "meal prep from what I've saved"
  workflow. Easy to change if your grader expects free search from the planner too.
- **User-created recipe IDs are prefixed `user-`** so the details page knows whether
  to fetch from TheMealDB or from local storage.

## Setup instructions

Requires Node 18+.

### 1. Build and link the component library

```bash
cd recipe-ui
npm install
npm run build
```

This produces `recipe-ui/dist` and `recipe-ui/loader`, which `sveltekit-app` depends
on locally (see [npm publishing](#npm-publishing) to swap this for the real
published package).

### 2. Install and run the SvelteKit app

```bash
cd sveltekit-app
npm install
npm run dev -- --open
```

The app runs at `http://localhost:5173`.

### Other useful commands

```bash
npm run check   # type-check (svelte-check)
npm run test    # unit tests (vitest) — validation logic + favorites/meal-plan stores
npm run build   # production build
npm run preview # preview the production build
```

## npm publishing

The library ships as a **published npm package**
([`@nagp/recipe-ui`](https://www.npmjs.com/package/@nagp/recipe-ui)), consumed
directly by `sveltekit-app`. To publish updates:

1. **Log in and publish** (from `recipe-ui/`):
   ```bash
   npm login
   npm run build
   npm publish --access public
   ```
   `publishConfig.access: "public"` is already set in `package.json` so a scoped
   package publishes publicly without an extra flag.
2. **Versioning.** Bump with `npm version patch|minor|major` before each publish —
   this follows semver and keeps a clean tag history.
3. **Consume the latest package** in `sveltekit-app`:
   ```bash
   cd sveltekit-app
   npm install @nagp/recipe-ui@latest
   ```

## Integration details

- **Props** — e.g. `rc-recipe-card` receives `recipe-id`, `name`, `image`,
  `category`, `is-favorite` as plain attributes from Svelte.
- **Custom events** — Stencil components emit native `CustomEvent`s
  (`favoriteToggle`, `cardSelect`, `ratingChange`, `searchSubmit`,
  `searchInput`); SvelteKit listens with the `on<EventName>` prop convention
  Stencil's custom-elements build supports (e.g. `onfavoriteToggle={...}`).
- **Slots** — `rc-recipe-card` has a named `actions` slot for host-provided buttons;
  `rc-search-bar` uses the default slot for filter controls.
- **Registration** — each component self-registers via `customElements.define()`
  when its module is imported. `sveltekit-app/src/routes/+layout.svelte`
  side-effect imports all four from the `dist-custom-elements` build (
  `rc-recipe-card`, `rc-star-rating`, `rc-search-bar`, `rc-photo-carousel`), but
  only inside `if (browser) { ... }`, using dynamic `import()` rather than static
  `import '...'`. This matters: a static `import` declaration is hoisted to
  module scope regardless of what block it's written in, so it would run
  unconditionally during SSR too — pulling this browser-only, `window`-touching
  library into the server bundle and crashing every route. Dynamic `import()`
  calls are the only form that actually respects the `browser` guard. See
  [Design system](#design-system) below for why `dist-custom-elements` is used
  instead of Stencil's lazy loader.
- **TypeScript** — `sveltekit-app/src/app.d.ts` ambient-types the `rc-*` tags (props +
  event handlers) so Svelte's template type-checker understands them.

## Design system

The UI follows a herb-and-citrus kitchen identity rather than default framework
styling: **Fraunces** (serif) for headings, **Inter** for body text, **IBM Plex
Mono** for ingredient quantities/day labels, on a sage-green/citrus-orange palette.
Tokens live in `sveltekit-app/src/app.css` as CSS custom properties on `:root` —
these are readable from inside the Stencil components' shadow DOM too, since custom
properties pierce shadow boundaries, so both packages share one system.

The weekly meal planner is the signature moment: days render as pinned, slightly
tilted index cards on a corkboard background instead of a generic grid.

### A real integration bug worth knowing about

Stencil's **lazy loader** (`@scope/recipe-ui/loader` + `defineCustomElements()`) is
the default Stencil quickstart pattern, but it does not survive being bundled
through Vite/Rollup — its dynamic per-component chunk imports use relative URLs
that Vite doesn't preserve, so components silently fail to upgrade
(`Constructor for "rc-x" was not found` in the console). The app instead imports
the **`dist-custom-elements`** output directly (`@nagp/recipe-ui/rc-recipe-card`,
etc., wired up in `+layout.svelte`) — plain ES modules that self-register via
`customElements.define()` on import, with no runtime chunk-loading involved. This
is the correct integration path for any bundler-based framework without an
official Stencil framework-output-target wrapper (Svelte doesn't have one).

## Deployment

The app is deployed at [mise](https://mise-seven-fawn.vercel.app/) using
`@sveltejs/adapter-vercel` directly (configured in `vite.config.ts`, not
`svelte.config.js` — see the note above). To deploy your own copy:

```bash
cd sveltekit-app
npm install -D @sveltejs/adapter-vercel
# then wire it into vite.config.ts's sveltekit({ adapter: ... }) call
```

Then connect the GitHub repo to Vercel and deploy from the `sveltekit-app`
directory (set it as the project root, since this is a monorepo).