# rc-search-bar



<!-- Auto Generated Below -->


## Overview

A search input with a submit button. Extra filter controls (selects,
checkboxes, etc.) can be projected via the default slot, so the host
app controls filter UI while this component only owns the text query.

## Properties

| Property      | Attribute     | Description                                   | Type     | Default             |
| ------------- | ------------- | --------------------------------------------- | -------- | ------------------- |
| `placeholder` | `placeholder` | Placeholder text.                             | `string` | `'Search recipes…'` |
| `value`       | `value`       | Initial/controlled value of the search input. | `string` | `''`                |


## Events

| Event          | Description                                          | Type                              |
| -------------- | ---------------------------------------------------- | --------------------------------- |
| `searchInput`  | Fired on every keystroke with the current text.      | `CustomEvent<{ query: string; }>` |
| `searchSubmit` | Fired when the user submits (Enter or button click). | `CustomEvent<{ query: string; }>` |


## Slots

| Slot | Description      |
| ---- | ---------------- |
|      | The default slot |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
