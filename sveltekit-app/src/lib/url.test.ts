import { describe, expect, it } from 'vitest';
import { isSafeHttpUrl } from './url';

describe('isSafeHttpUrl', () => {
	it('accepts https URLs', () => {
		expect(isSafeHttpUrl('https://youtube.com/watch?v=abc123')).toBe(true);
	});

	it('accepts http URLs', () => {
		expect(isSafeHttpUrl('http://example.com/photo.jpg')).toBe(true);
	});

	it('rejects javascript: URIs', () => {
		expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
	});

	it('rejects data: URIs', () => {
		expect(isSafeHttpUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
	});

	it('rejects empty/undefined/null values', () => {
		expect(isSafeHttpUrl('')).toBe(false);
		expect(isSafeHttpUrl(undefined)).toBe(false);
		expect(isSafeHttpUrl(null)).toBe(false);
	});

	it('rejects unparsable strings', () => {
		expect(isSafeHttpUrl('not a url')).toBe(false);
	});
});
