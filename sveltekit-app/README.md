# sveltekit-app

The **Svelte 5 / SvelteKit** frontend for the [Recipe Finder & Meal Planner](../README.md)
app. It consumes the `@nagp/recipe-ui` StencilJS component library from this repo
as a real npm dependency (currently linked locally via `file:../recipe-ui`).

See the [root README](../README.md) for the full picture — features, assumptions,
setup for the whole repo, design system, and deployment notes. This file covers
just the commands for working in this package.

## Layout

```
src/
├── lib/
│   ├── api/          # TheMealDB client
│   ├── components/   # Svelte components (wrap/compose the rc-* elements)
│   ├── stores/        # Svelte 5 rune-based stores (favorites, meal plan, user recipes)
│   ├── actions/
│   └── assets/
└── routes/
    ├── discover/      # recipe search + browse
    ├── recipe/[id]/   # recipe details
    ├── recipe/new/    # create/edit recipe
    ├── my-recipes/    # user-created recipes
    ├── favorites/
    └── meal-plan/     # weekly planner
```

## Developing

Requires the `recipe-ui` package to be built first — see the
[root README](../README.md#1-build-and-link-the-component-library).

```sh
npm install
npm run dev -- --open
```

Runs at `http://localhost:5173`.

## Other commands

```sh
npm run check    # type-check (svelte-check)
npm run test     # unit tests (vitest) — validation logic + favorites/meal-plan stores
npm run build    # production build
npm run preview  # preview the production build
```

> To deploy, you'll need to swap `@sveltejs/adapter-auto` for a host-specific
> adapter — see [Deployment](../README.md#deployment) in the root README.
