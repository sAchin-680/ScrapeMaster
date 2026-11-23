/**
 * The watchlist lives in a cookie in the visitor's own browser: no account,
 * nothing stored on the server, and the server can still render the page.
 */
export const WATCHLIST_COOKIE = 'sm_watchlist';
/** 24-character ids keep 60 entries well inside the 4 KB cookie limit. */
export const WATCHLIST_LIMIT = 60;
/** Products shown side by side on the compare page. */
export const COMPARE_LIMIT = 4;

const ID = /^[a-f\d]{24}$/i;

/** Valid, unique product ids from a cookie or query value, newest first. */
export function parseIds(value: string | undefined | null, limit = WATCHLIST_LIMIT) {
  if (!value) return [];
  const ids = decodeURIComponent(value)
    .split(/[\s,.]+/)
    .filter((id) => ID.test(id))
    .map((id) => id.toLowerCase());
  return [...new Set(ids)].slice(0, limit);
}

/** Add or remove an id; new saves go to the front. */
export function toggleId(ids: string[], id: string) {
  return ids.includes(id)
    ? ids.filter((x) => x !== id)
    : [id, ...ids].slice(0, WATCHLIST_LIMIT);
}

export function serializeIds(ids: string[]) {
  return ids.join('.');
}
