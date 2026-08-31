/**
 * Whether `value` is safe to use as an `href`/image `src` that the app
 * builds from user-entered text (recipe photo URLs, the YouTube link field).
 *
 * Only `http:`/`https:` URLs are accepted. This exists because these values
 * flow straight from a plain <input> into `<a href>`/`<img src>` with no
 * other validation — without this check, a user (or malformed import) could
 * enter a `javascript:`/`data:` URI that executes when the link is clicked.
 * Relative/protocol-relative values are rejected too since there's no
 * legitimate reason a recipe photo or a "YouTube link" would be one.
 */
export function isSafeHttpUrl(value: string | undefined | null): boolean {
	if (!value) return false;
	try {
		const url = new URL(value);
		return url.protocol === 'http:' || url.protocol === 'https:';
	} catch {
		return false;
	}
}
