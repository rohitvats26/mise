import { Component, Prop, Event, EventEmitter, State, Watch, h } from '@stencil/core';

/**
 * A photo carousel: a main image with prev/next buttons, an optional
 * "n / total" counter, and an optional thumbnail strip — driven by
 * keyboard (arrow keys), touch (swipe), and mouse alike.
 *
 * Consolidates the two carousels that used to be hand-rolled independently
 * for the recipe detail hero and the recipe-form photo preview: same
 * WAI-ARIA pattern (a focusable `role="group"` region owning arrow-key
 * nav, with prev/next also reachable as real buttons), same swipe
 * gesture, same broken-image handling — just themed differently via
 * `counterPosition`/`thumbsLayout` and the `--rc-carousel-*` CSS
 * properties instead of two copies of the logic.
 */
@Component({
  tag: 'rc-photo-carousel',
  styleUrl: 'rc-photo-carousel.css',
  shadow: true,
})
export class RcPhotoCarousel {
  /** Image URLs to show. A single image renders without any nav chrome. */
  @Prop() images: string[] = [];

  /** Alt text for the main image (e.g. the recipe name). Thumbnails are decorative. */
  @Prop() alt: string = '';

  /** Accessible label for the carousel region, e.g. "Recipe photos". */
  @Prop() label: string = 'Photos';

  /** Initial/controlled slide index. */
  @Prop() activeIndex: number = 0;

  /** Show the "n / total" counter when there's more than one photo. */
  @Prop() showCounter: boolean = true;

  /** Show the thumbnail strip when there's more than one photo. */
  @Prop() showThumbs: boolean = true;

  /** Where the counter pill sits over the image. */
  @Prop() counterPosition: 'top-right' | 'bottom-right' = 'top-right';

  /** `overlay` floats thumbnails over the bottom of the image (recipe hero);
   * `inline` places them in normal flow below it (form preview, smaller card). */
  @Prop() thumbsLayout: 'overlay' | 'inline' = 'overlay';

  /** Fired whenever the active slide changes, however it was triggered. */
  @Event() slideChange!: EventEmitter<{ index: number }>;

  @State() current: number = 0;
  @State() direction: 1 | -1 = 1;
  @State() brokenImages: Record<string, boolean> = {};

  private touchStartX = 0;

  // Seed `current` from `activeIndex` here rather than a field initializer —
  // see rc-search-bar's componentWillLoad for why (prop lands after the
  // constructor runs).
  componentWillLoad() {
    this.current = this.activeIndex;
  }

  @Watch('activeIndex')
  onActiveIndexChange(next: number) {
    this.current = next;
  }

  private get length() {
    return this.images.length;
  }

  private goTo(index: number, direction: 1 | -1) {
    if (this.length < 2) return;
    this.direction = direction;
    this.current = (index + this.length) % this.length;
    this.slideChange.emit({ index: this.current });
  }

  private next = () => this.goTo(this.current + 1, 1);
  private prev = () => this.goTo(this.current - 1, -1);

  private onThumbClick(i: number) {
    if (i === this.current) return;
    this.goTo(i, i > this.current ? 1 : -1);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.length < 2) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this.prev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      this.next();
    }
  };

  private onTouchStart = (e: TouchEvent) => {
    this.touchStartX = e.changedTouches[0].screenX;
  };

  private onTouchEnd = (e: TouchEvent) => {
    const diff = this.touchStartX - e.changedTouches[0].screenX;
    if (Math.abs(diff) > 40) {
      diff > 0 ? this.next() : this.prev();
    }
  };

  private onImgError(url: string) {
    this.brokenImages = { ...this.brokenImages, [url]: true };
  }

  render() {
    const photos = this.images;
    const total = photos.length;
    const current = total > 0 ? Math.min(this.current, total - 1) : 0;
    const activeUrl = photos[current];
    const showChrome = total > 1;

    return (
      <div
        class="carousel"
        role="group"
        aria-label={this.label}
        tabindex={showChrome ? 0 : -1}
        onKeyDown={this.onKeyDown}
        onTouchStart={this.onTouchStart}
        onTouchEnd={this.onTouchEnd}
      >
        <div class="stage">
          {activeUrl && !this.brokenImages[activeUrl] ? (
            <img
              key={current}
              class="photo"
              style={{ '--dir': String(this.direction) }}
              src={activeUrl}
              alt={this.alt}
              onError={() => this.onImgError(activeUrl)}
            />
          ) : (
            <div class="placeholder"></div>
          )}

          <div class="overlay" aria-hidden="true"></div>

          <slot name="corner" />

          {showChrome && (
            <button class="nav prev" onClick={this.prev} aria-label="Previous photo">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
          {showChrome && (
            <button class="nav next" onClick={this.next} aria-label="Next photo">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          )}
          {showChrome && this.showCounter && (
            <span class={{ counter: true, [this.counterPosition]: true }} aria-live="polite" aria-atomic="true">
              {current + 1} / {total}
            </span>
          )}

          {showChrome && this.showThumbs && this.thumbsLayout === 'overlay' && (
            <div class="thumbs overlay-thumbs" role="tablist" aria-label={`${this.label} thumbnails`}>
              {photos.map((url, i) => (
                <button
                  key={url + i}
                  class={{ thumb: true, active: i === current }}
                  role="tab"
                  aria-selected={i === current ? 'true' : 'false'}
                  aria-label={`Photo ${i + 1}`}
                  onClick={() => this.onThumbClick(i)}
                >
                  {this.brokenImages[url] ? (
                    <span class="thumb-error" aria-hidden="true">✕</span>
                  ) : (
                    <img src={url} alt="" loading="lazy" onError={() => this.onImgError(url)} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {showChrome && this.showThumbs && this.thumbsLayout === 'inline' && (
          <div class="thumbs inline-thumbs" role="tablist" aria-label={`${this.label} thumbnails`}>
            {photos.map((url, i) => (
              <button
                key={url + i}
                class={{ thumb: true, active: i === current }}
                role="tab"
                aria-selected={i === current ? 'true' : 'false'}
                aria-label={`Photo ${i + 1}`}
                onClick={() => this.onThumbClick(i)}
              >
                {this.brokenImages[url] ? (
                  <span class="thumb-error" aria-hidden="true">✕</span>
                ) : (
                  <img src={url} alt="" loading="lazy" onError={() => this.onImgError(url)} />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
}
