import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { store } from '../data/store';
import type { Meta } from '../data/types';
import { embed, fullSiteHref, href, navigate, route, type View } from '../router';
import { t } from '../strings';

const VIEWS: View[] = ['explore', 'discover', 'compare'];

function NavLink({ view }: { view: View }) {
  const current = route.value.view === view;
  return (
    <a
      href={href(view)}
      aria-current={current ? 'page' : undefined}
      onClick={(e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        navigate(view);
      }}
    >
      {t.nav[view]}
    </a>
  );
}

export function Footer() {
  const [meta, setMeta] = useState<Meta | null>(null);
  useEffect(() => {
    store.meta().then(setMeta, () => {});
  }, []);
  const cbs = meta?.cbs;
  return (
    <footer class="site-footer">
      <p>{t.source}</p>
      {meta && <p>{t.release(meta.release, meta.firstYear, meta.lastYear)}</p>}
      {cbs && (
        <p class="credit">
          {t.credit.prefix}, "{cbs.title}", {t.credit.retrieved(formatDate(cbs.retrieved))}.{' '}
          <a href={cbs.url}>{t.credit.file}</a> · <a href={cbs.licenseUrl}>{t.credit.license}</a>
        </p>
      )}
      <p>{t.credit.notEndorsed}</p>
      <p>{t.threshold}</p>
      <p>{t.currentNames}</p>
    </footer>
  );
}

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

/** Compact source line for embeds: attribution and a link to the full site. */
function EmbedFooter() {
  const [meta, setMeta] = useState<Meta | null>(null);
  useEffect(() => {
    store.meta().then(setMeta, () => {});
  }, []);
  return (
    <footer class="embed-footer">
      {t.embed.source}
      {meta && ` · ${t.embed.release(meta.release)}`} ·{' '}
      <a href={fullSiteHref()} target="_blank" rel="noopener">
        {t.embed.full}
      </a>
      <p>{t.threshold}</p>
    </footer>
  );
}

export function Shell({ children }: { children: ComponentChildren }) {
  if (embed) {
    return (
      <>
        <main id="main">{children}</main>
        <EmbedFooter />
      </>
    );
  }
  return (
    <>
      <a class="skip" href="#main">
        {t.skip}
      </a>
      <header class="site-header">
        <div class="brand">
          <h1>{t.title}</h1>
          <p>{t.tagline}</p>
        </div>
        <nav aria-label={t.navLabel}>
          {VIEWS.map((v) => (
            <NavLink key={v} view={v} />
          ))}
        </nav>
      </header>
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
