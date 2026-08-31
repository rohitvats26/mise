import { Component, Prop, Event, EventEmitter, State, Watch, h } from '@stencil/core';

/**
 * A search input with a submit button. Extra filter controls (selects,
 * checkboxes, etc.) can be projected via the default slot, so the host
 * app controls filter UI while this component only owns the text query.
 */
@Component({
  tag: 'rc-search-bar',
  styleUrl: 'rc-search-bar.css',
  shadow: true,
})
export class RcSearchBar {
  /** Initial/controlled value of the search input. */
  @Prop() value: string = '';

  /** Placeholder text. */
  @Prop() placeholder: string = 'Search recipes…';

  /** Fired on every keystroke with the current text. */
  @Event() searchInput!: EventEmitter<{ query: string }>;

  /** Fired when the user submits (Enter or button click). */
  @Event() searchSubmit!: EventEmitter<{ query: string }>;

  @State() query: string = '';

  /**
   * Seed `query` from `value` here rather than in a class field initializer.
   * Field initializers run in the constructor, which fires before Stencil
   * has applied an incoming property value (e.g. the Svelte discover page
   * setting `value={activeQuery}` right after creating the element) — so
   * `this.value` would still read as the prop's default at that point.
   * `componentWillLoad` runs after that initial value has landed.
   */
  componentWillLoad() {
    this.query = this.value;
  }

  /**
   * Keeps the input in sync with `value` on subsequent changes too (e.g.
   * the discover page clearing filters and resetting `activeQuery`).
   * `@Watch` callbacks are skipped for the initial prop assignment, which
   * is why `componentWillLoad` above is still needed for the first load.
   */
  @Watch('value')
  onValueChange(newValue: string) {
    this.query = newValue;
  }

  private onInput = (e: InputEvent) => {
    this.query = (e.target as HTMLInputElement).value;
    this.searchInput.emit({ query: this.query });
  };

  private onSubmit = (e: Event) => {
    e.preventDefault();
    this.searchSubmit.emit({ query: this.query });
  };

  render() {
    return (
      <form class="bar" onSubmit={this.onSubmit}>
        <div class="field">
          <svg class="icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="1.8" />
            <line x1="21" y1="21" x2="16.2" y2="16.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
          <input
            type="text"
            value={this.query}
            placeholder={this.placeholder}
            onInput={this.onInput}
            aria-label="Search recipes"
          />
        </div>
        <div class="filters">
          <slot />
        </div>
        <button type="submit">Search</button>
      </form>
    );
  }
}
