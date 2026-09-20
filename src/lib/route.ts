/**
 * The address bar as state: `#/speaking/sawatdi` is the Speaking tab with
 * that sentence, so a reload or a shared link lands on the same page.
 */

export interface Route {
  tab: string;
  /** Second segment, if any — the Speaking tab's phrase id. */
  sub?: string;
}

export function readRoute(): Route {
  const [tab = '', sub] = window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  return sub ? { tab, sub } : { tab };
}

export function writeRoute(tab: string, sub?: string): void {
  const hash = `#/${tab}${sub ? `/${sub}` : ''}`;
  if (window.location.hash !== hash) window.history.replaceState(null, '', hash);
}
