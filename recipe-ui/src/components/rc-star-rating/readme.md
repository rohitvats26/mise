# rc-star-rating



<!-- Auto Generated Below -->


## Overview

An interactive (or read-only) star rating control.
Used e.g. on the recipe details page for the user to rate a recipe.

## Properties

| Property   | Attribute  | Description                                                      | Type      | Default |
| ---------- | ---------- | ---------------------------------------------------------------- | --------- | ------- |
| `max`      | `max`      | Max number of stars.                                             | `number`  | `5`     |
| `readonly` | `readonly` | When false, stars are display-only (no hover/click interaction). | `boolean` | `false` |
| `value`    | `value`    | Current rating value.                                            | `number`  | `0`     |


## Events

| Event          | Description                                                          | Type                              |
| -------------- | -------------------------------------------------------------------- | --------------------------------- |
| `ratingChange` | Fired when the user picks a new rating (not fired in readonly mode). | `CustomEvent<{ value: number; }>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
