import { signal } from '@preact/signals';

export type View = 'explore' | 'discover' | 'compare';

const PATH: Record<View, string> = { explore: '', discover: 'discover', compare: 'compare' };
const VIEW_OF = Object.fromEntries(Object.entries(PATH).map(([v, p]) => [p, v])) as Record<
  string,
  View
>;

export interface Route {
  view: View;
  params: URLSearchParams;
}

const isView = (v: string | null): v is View =>
  v === 'explore' || v === 'discover' || v === 'compare';

/**
 * Maps a location to a view and its state params. A normal URL names the view in its path (after
 * stripping the deploy base, for example `/disappearing-names/`). An embed URL (`?embed=1&view=...`)
 * names it in the query; `embed` and `view` are not part of a view's own state, so they are removed.
 */
export function parseLocation(pathname: string, search: string, base: string): Route {
  const params = new URLSearchParams(search);
  const embedded = params.get('embed') === '1';
  const requested = params.get('view');
  params.delete('embed');
  params.delete('view');
  if (embedded) return { view: isView(requested) ? requested : 'explore', params };
  const rest = pathname.startsWith(base)
    ? pathname.slice(base.length)
    : pathname.replace(/^\//, '');
  return { view: VIEW_OF[rest.replace(/\/+$/, '')] ?? 'explore', params };
}

export function buildHref(
  view: View,
  params: URLSearchParams | Record<string, string>,
  base: string,
  embedded = false,
) {
  if (embedded) {
    return `${base}?${new URLSearchParams({ embed: '1', view, ...Object.fromEntries(new URLSearchParams(params)) })}`;
  }
  const qs = new URLSearchParams(params).toString();
  return `${base}${PATH[view]}${qs ? `?${qs}` : ''}`;
}

const BASE = import.meta.env.BASE_URL;

/** True when the page was opened as an embed (`?embed=1`); stays true for the whole session. */
export const embed = new URLSearchParams(location.search).get('embed') === '1';

const here = () => parseLocation(location.pathname, location.search, BASE);

export const route = signal<Route>(here());

export function navigate(view: View, params: URLSearchParams | Record<string, string> = {}) {
  history.pushState(null, '', buildHref(view, params, BASE, embed));
  route.value = here();
}

/** Updates the query string of the current view without adding a history entry. */
export function replaceParams(params: URLSearchParams | Record<string, string>) {
  history.replaceState(null, '', buildHref(route.value.view, params, BASE, embed));
  route.value = here();
}

export const href = (view: View, params: Record<string, string> = {}) =>
  buildHref(view, params, BASE, embed);

/** Link to the same view on the full site (no embed), for the attribution in embed mode. */
export const fullSiteHref = () => buildHref(route.value.view, route.value.params, BASE);

window.addEventListener('popstate', () => {
  route.value = here();
});
