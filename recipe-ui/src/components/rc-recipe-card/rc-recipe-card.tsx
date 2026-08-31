import { Component, Prop, Event, EventEmitter, h } from '@stencil/core';

/**
 * A card that displays a recipe summary.
 * Consumers pass recipe data via props and listen for the `favoriteToggle`
 * custom event to react to favorite/unfavorite clicks. A named `actions`
 * slot lets the host app inject extra buttons (e.g. "Edit", "Delete") —
 * they appear as an overlay on the image, revealed on hover/focus.
 */
@Component({
  tag: 'rc-recipe-card',
  styleUrl: 'rc-recipe-card.css',
  shadow: true,
})
export class RcRecipeCard {
  /** Recipe unique id, forwarded back on events so the host can identify the recipe. */
  @Prop() recipeId!: string;

  /** Recipe title. */
  @Prop() name!: string;

  /** Image URL for the recipe. */
  @Prop() image?: string;

  /** Short category / cuisine label, e.g. "Dessert" or "Italian". */
  @Prop() category?: string;

  /** Optional secondary badge shown at the top-left of the image, e.g. "Mine" to mark a user-authored recipe apart from the category chip. */
  @Prop() secondaryBadge?: string;

  /** Optional one-line meta string shown under the title, e.g. "32m · Italian". */
  @Prop() meta?: string;

  /** Whether this recipe is currently in the user's favorites. */
  @Prop() isFavorite: boolean = false;

  /** Visual size variant. `featured` is used for editorial hero-style spots in the grid. */
  @Prop() variant: 'default' | 'featured' = 'default';

  /** Fired when the favorite (heart) button is clicked. */
  @Event() favoriteToggle!: EventEmitter<{ recipeId: string; isFavorite: boolean }>;

  /** Fired when the card body (not a button) is clicked — host can navigate to details. */
  @Event() cardSelect!: EventEmitter<{ recipeId: string }>;

  private onFavoriteClick = (e: MouseEvent) => {
    e.stopPropagation();
    this.favoriteToggle.emit({ recipeId: this.recipeId, isFavorite: !this.isFavorite });
  };

  private onCardClick = () => {
    this.cardSelect.emit({ recipeId: this.recipeId });
  };

  private onCardKeyDown = (e: KeyboardEvent) => {
    // Only react to Enter/Space when the card wrapper itself is the target,
    // not when it bubbles up from an inner control (the favorite button, or
    // slotted actions like Edit/Delete). Those controls are focusable in
    // their own right and handle their own activation; without this guard,
    // activating them by keyboard also fires card navigation, which mouse
    // users never hit because each inner control stops click propagation.
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.cardSelect.emit({ recipeId: this.recipeId });
    }
  };

  render() {
    return (
      <div
        class={{ card: true, featured: this.variant === 'featured' }}
        onClick={this.onCardClick}
        onKeyDown={this.onCardKeyDown}
        tabindex={0}
        role="button"
        aria-label={`View ${this.name}`}
      >
        <div class="media">
          {this.image ? <img src={this.image} alt={this.name} loading="lazy" /> : <div class="placeholder">Untitled dish</div>}
          <div class="scrim" aria-hidden="true"></div>
          <button
            class={{ 'fav-btn': true, active: this.isFavorite }}
            onClick={this.onFavoriteClick}
            aria-pressed={this.isFavorite ? 'true' : 'false'}
            aria-label="Toggle favorite"
          >
            <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
              <path
                d="M12 20.2s-7.6-4.6-10.2-9.2C.4 8.1 1.7 4.6 5 3.7c2-.5 4 .3 5.2 2 .3.4.9.4 1.2 0 1.2-1.7 3.2-2.5 5.2-2 3.3.9 4.6 4.4 3.2 7.3-2.6 4.6-10.2 9.2-10.2 9.2z"
                fill={this.isFavorite ? 'currentColor' : 'none'}
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          {this.secondaryBadge && <span class="secondary-badge">{this.secondaryBadge}</span>}
          {this.category && <span class="category-chip">{this.category}</span>}
          <div class="media-actions">
            <slot name="actions" />
          </div>
        </div>
        <div class="body">
          <h3 class="title">{this.name}</h3>
          {this.meta && <p class="meta">{this.meta}</p>}
        </div>
      </div>
    );
  }
}
