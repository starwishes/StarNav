import { describe, it, expect } from 'vitest';
import { normalizeUrl } from '../../common/url.js';

describe('normalizeUrl', () => {
    it('should add https:// to URLs without protocol', () => {
        // URL API adds trailing slash for root path
        expect(normalizeUrl('example.com')).toBe('https://example.com/');
    });

    it('should keep http:// if specified', () => {
        expect(normalizeUrl('http://example.com')).toBe('http://example.com/');
    });

    it('should remove trailing slash for non-root paths', () => {
        expect(normalizeUrl('https://example.com/path/')).toBe('https://example.com/path');
    });

    it('should keep trailing slash for root path', () => {
        expect(normalizeUrl('https://example.com/')).toBe('https://example.com/');
    });

    it('should remove tracking parameters', () => {
        const url = 'https://example.com/page?utm_source=test&id=123';
        expect(normalizeUrl(url)).toBe('https://example.com/page?id=123');
    });

    it('should reject non-http protocols', () => {
        expect(normalizeUrl('ftp://example.com')).toBe('');
        expect(normalizeUrl('javascript:alert(1)')).toBe('');
    });

    it('should handle malformed URLs gracefully', () => {
        expect(normalizeUrl('')).toBe('');
        expect(normalizeUrl(null)).toBe('');
        expect(normalizeUrl(undefined)).toBe('');
    });

    it('should normalize hostname to lowercase', () => {
        expect(normalizeUrl('https://EXAMPLE.COM/Path')).toBe('https://example.com/Path');
    });

    it('should remove empty query string', () => {
        expect(normalizeUrl('https://example.com/?')).toBe('https://example.com/');
    });

    it('should remove empty hash', () => {
        expect(normalizeUrl('https://example.com/#')).toBe('https://example.com/');
    });
});
