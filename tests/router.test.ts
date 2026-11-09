import { describe, expect, it } from 'vitest';

// The router module registers a popstate listener and reads `location`, so it needs a DOM.
// @vitest-environment jsdom
const { parseLocation, buildHref } = await import('../src/router');

describe('parseLocation', () => {
  it.each([
    ['/', '/', 'explore'],
    ['/discover', '/', 'discover'],
    ['/compare/', '/', 'compare'],
    ['/disappearing-names/', '/disappearing-names/', 'explore'],
    ['/disappearing-names/discover', '/disappearing-names/', 'discover'],
    ['/disappearing-names/nonsense', '/disappearing-names/', 'explore'],
  ])('%s with base %s is %s', (path, base, view) => {
    expect(parseLocation(path, '', base).view).toBe(view);
  });

  it('keeps the query string', () => {
    const r = parseLocation('/discover', '?sector=druze&sex=F', '/');
    expect(r.params.get('sector')).toBe('druze');
    expect(r.params.get('sex')).toBe('F');
  });
});

describe('buildHref', () => {
  it('prefixes the base and appends params', () => {
    expect(buildHref('explore', {}, '/disappearing-names/')).toBe('/disappearing-names/');
    expect(buildHref('compare', { names: 'דנה,נועם' }, '/x/')).toBe(
      '/x/compare?names=%D7%93%D7%A0%D7%94%2C%D7%A0%D7%95%D7%A2%D7%9D',
    );
  });

  it('round-trips through parseLocation', () => {
    const href = buildHref('discover', { sector: 'muslim' }, '/base/');
    const [path, search] = href.split('?');
    const r = parseLocation(path, `?${search}`, '/base/');
    expect(r.view).toBe('discover');
    expect(r.params.get('sector')).toBe('muslim');
  });
});

describe('embed URLs', () => {
  it('reads the view from the query and keeps embed and view out of the state params', () => {
    const r = parseLocation('/', '?embed=1&view=compare&names=a,b&sector=druze', '/');
    expect(r.view).toBe('compare');
    expect([...r.params.keys()].sort()).toEqual(['names', 'sector']);
  });

  it('falls back to the explorer for a missing or unknown view', () => {
    expect(parseLocation('/', '?embed=1', '/').view).toBe('explore');
    expect(parseLocation('/', '?embed=1&view=nope', '/').view).toBe('explore');
  });

  it('ignores the view parameter when the page is not embedded', () => {
    expect(parseLocation('/discover', '?view=compare', '/').view).toBe('discover');
  });

  it('builds embed links that keep embed and view', () => {
    const href = buildHref('explore', { name: 'שרון' }, '/disappearing-names/', true);
    const u = new URL(href, 'https://x.test');
    expect(u.pathname).toBe('/disappearing-names/');
    expect(u.searchParams.get('embed')).toBe('1');
    expect(u.searchParams.get('view')).toBe('explore');
    expect(u.searchParams.get('name')).toBe('שרון');
  });
});
