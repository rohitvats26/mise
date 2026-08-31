# rc-recipe-card



<!-- Auto Generated Below -->


## Overview

A card that displays a recipe summary.
Consumers pass recipe data via props and listen for the `favoriteToggle`
custom event to react to favorite/unfavorite clicks. A named `actions`
slot lets the host app inject extra buttons (e.g. "Edit", "Delete") —
they appear as an overlay on the image, revealed on hover/focus.

## Properties

| Property                | Attribute         | Description                                                                                                                           | Type                      | Default     |
| ----------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ----------- |
| `category`              | `category`        | Short category / cuisine label, e.g. "Dessert" or "Italian".                                                                          | `string`                  | `undefined` |
| `image`                 | `image`           | Image URL for the recipe.                                                                                                             | `string`                  | `undefined` |
| `isFavorite`            | `is-favorite`     | Whether this recipe is currently in the user's favorites.                                                                             | `boolean`                 | `false`     |
| `meta`                  | `meta`            | Optional one-line meta string shown under the title, e.g. "32m · Italian".                                                            | `string`                  | `undefined` |
| `name` _(required)_     | `name`            | Recipe title.                                                                                                                         | `string`                  | `undefined` |
| `recipeId` _(required)_ | `recipe-id`       | Recipe unique id, forwarded back on events so the host can identify the recipe.                                                       | `string`                  | `undefined` |
| `secondaryBadge`        | `secondary-badge` | Optional secondary badge shown at the top-left of the image, e.g. "Mine" to mark a user-authored recipe apart from the category chip. | `string`                  | `undefined` |
| `variant`               | `variant`         | Visual size variant. `featured` is used for editorial hero-style spots in the grid.                                                   | `"default" \| "featured"` | `'default'` |


## Events

| Event            | Description                                                                        | Type                                                      |
| ---------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `cardSelect`     | Fired when the card body (not a button) is clicked — host can navigate to details. | `CustomEvent<{ recipeId: string; }>`                      |
| `favoriteToggle` | Fired when the favorite (heart) button is clicked.                                 | `CustomEvent<{ recipeId: string; isFavorite: boolean; }>` |


## Slots

| Slot        | Description |
| ----------- | ----------- |
| `"actions"` |             |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
