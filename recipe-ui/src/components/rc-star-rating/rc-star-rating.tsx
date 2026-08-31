import { Component, Prop, Event, EventEmitter, State, Element, h } from '@stencil/core';

/**
 * An interactive (or read-only) star rating control.
 * Used e.g. on the recipe details page for the user to rate a recipe.
 */
@Component({
  tag: 'rc-star-rating',
  styleUrl: 'rc-star-rating.css',
  shadow: true,
})
export class RcStarRating {
  /** Current rating value. */
  @Prop({ mutable: true }) value: number = 0;

  /** Max number of stars. */
  @Prop() max: number = 5;

  /** When false, stars are display-only (no hover/click interaction). */
  @Prop() readonly: boolean = false;

  /** Fired when the user picks a new rating (not fired in readonly mode). */
  @Event() ratingChange!: EventEmitter<{ value: number }>;

  @State() hoverValue: number = 0;

  private select(v: number) {
    if (this.readonly) return;
    this.value = v;
    this.ratingChange.emit({ value: v });
  }

  private onKeyDown = (e: KeyboardEvent, current: number) => {
    if (this.readonly) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.select(current);
      return;
    }
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(this.max, current + 1);
      this.select(next);
      this.focusStar(next);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      const prev = Math.max(1, current - 1);
      this.select(prev);
      this.focusStar(prev);
    }
  };

  private focusStar(n: number) {
    const el = this.el?.shadowRoot?.querySelector<HTMLElement>(`[data-star="${n}"]`);
    el?.focus();
  }

  @Element() el!: HTMLElement;

  render() {
    const stars = Array.from({ length: this.max }, (_, i) => i + 1);
    const active = this.hoverValue || this.value;
    const tabbable = this.value || 1;

    return (
      <div class="stars" role={this.readonly ? undefined : 'radiogroup'} aria-label="Recipe rating">
        {stars.map((s) => (
          <span
            data-star={s}
            class={{ star: true, filled: s <= active, interactive: !this.readonly }}
            role={this.readonly ? undefined : 'radio'}
            aria-checked={this.readonly ? undefined : s === this.value ? 'true' : 'false'}
            aria-label={`${s} star${s === 1 ? '' : 's'}`}
            tabindex={this.readonly ? undefined : s === tabbable ? 0 : -1}
            onClick={() => this.select(s)}
            onKeyDown={(e: KeyboardEvent) => this.onKeyDown(e, s)}
            onMouseEnter={() => !this.readonly && (this.hoverValue = s)}
            onMouseLeave={() => !this.readonly && (this.hoverValue = 0)}
          >
            ★
          </span>
        ))}
      </div>
    );
  }
}
