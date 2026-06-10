/**
 * Thin accessor for the preload-exposed API. Centralizing access here means
 * components/stores import `api` instead of reaching for `window.imageprep`
 * directly, which keeps the global usage in one place.
 */
export const api = window.imageprep
