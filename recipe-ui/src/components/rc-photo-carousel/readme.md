# rc-photo-carousel

## CSS Custom Properties

| Property                      | Description                        | Default              |
| ------------------------------ | ----------------------------------- | ---------------------- |
| `--rc-carousel-radius`         | Corner radius of the image stage.   | `var(--radius-md)`   |
| `--rc-carousel-aspect-ratio`   | Aspect ratio of the image stage.    | `4 / 3`               |
| `--rc-carousel-nav-size`       | Diameter of the prev/next buttons.  | `44px`                |
| `--rc-carousel-thumb-size`     | Width/height of each thumbnail.     | `50px`                |
| `--rc-carousel-scrim`          | Background of nav buttons/counter.  | `rgba(26,21,18,.15)` |
| `--rc-carousel-scrim-strong`   | Hover background of nav buttons.    | `rgba(26,21,18,.3)`  |

<!-- Auto Generated Below -->


## Overview

A photo carousel: a main image with prev/next buttons, an optional
"n / total" counter, and an optional thumbnail strip — driven by
keyboard (arrow keys), touch (swipe), and mouse alike.

Consolidates the two carousels that used to be hand-rolled independently
for the recipe detail hero and the recipe-form photo preview: same
WAI-ARIA pattern (a focusable `role="group"` region owning arrow-key
nav, with prev/next also reachable as real buttons), same swipe
gesture, same broken-image handling — just themed differently via
`counterPosition`/`thumbsLayout` and the `--rc-carousel-*` CSS
properties instead of two copies of the logic.

## Properties

| Property          | Attribute          | Description                                                                                                                                        | Type                            | Default       |
| ----------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------------- |
| `activeIndex`     | `active-index`     | Initial/controlled slide index.                                                                                                                    | `number`                        | `0`           |
| `alt`             | `alt`              | Alt text for the main image (e.g. the recipe name). Thumbnails are decorative.                                                                     | `string`                        | `''`          |
| `counterPosition` | `counter-position` | Where the counter pill sits over the image.                                                                                                        | `"bottom-right" \| "top-right"` | `'top-right'` |
| `images`          | --                 | Image URLs to show. A single image renders without any nav chrome.                                                                                 | `string[]`                      | `[]`          |
| `label`           | `label`            | Accessible label for the carousel region, e.g. "Recipe photos".                                                                                    | `string`                        | `'Photos'`    |
| `showCounter`     | `show-counter`     | Show the "n / total" counter when there's more than one photo.                                                                                     | `boolean`                       | `true`        |
| `showThumbs`      | `show-thumbs`      | Show the thumbnail strip when there's more than one photo.                                                                                         | `boolean`                       | `true`        |
| `thumbsLayout`    | `thumbs-layout`    | `overlay` floats thumbnails over the bottom of the image (recipe hero); `inline` places them in normal flow below it (form preview, smaller card). | `"inline" \| "overlay"`         | `'overlay'`   |


## Events

| Event         | Description                                                        | Type                              |
| ------------- | ------------------------------------------------------------------ | --------------------------------- |
| `slideChange` | Fired whenever the active slide changes, however it was triggered. | `CustomEvent<{ index: number; }>` |


## Slots

| Slot       | Description |
| ---------- | ----------- |
| `"corner"` |             |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
