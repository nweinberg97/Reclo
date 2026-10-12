/**
 * Reclo's only JavaScript. Everything works without it except instant search;
 * with it, you also get the search dialog, one-tap sharing and the theme switch.
 * No tracking, no third parties, no storage beyond your own theme choice.
 */
import { type SearchDoc, search } from '../../search/search.ts';

const script = document.currentScript as HTMLScriptElement | null;
const BASE = script ? new URL('../', script.src).pathname : '/';

// ---------- Search ----------

let indexPromise: Promise<SearchDoc[]> | null = null;
function loadIndex(): Promise<SearchDoc[]> {
  indexPromise ??= fetch(`${BASE}search-index.json`)
    .then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json() as Promise<SearchDoc[]>;
    })
    .catch((err) => {
      indexPromise = null;
      throw err;
    });
  return indexPromise;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const SUGGESTIONS = ['Vancouver', 'pizza', 'museum', 'bakery', 'Brooklyn', 'boutique hotel'];

function renderResults(container: HTMLElement, status: HTMLElement | null, query: string, docs: SearchDoc[], input: HTMLInputElement | null): void {
  const q = query.trim();
  if (!q) {
    container.innerHTML = `<div class="search-hint"><p>Search ten cities, every list and every pick.</p><ul>${SUGGESTIONS.map((s) => `<li><button type="button" data-suggest="${esc(s)}">${esc(s)}</button></li>`).join('')}</ul></div>`;
    if (status) status.textContent = '';
    input?.setAttribute('aria-expanded', 'false');
    return;
  }
  const hits = search(docs, q, 20);
  if (hits.length === 0) {
    container.innerHTML = `<div class="search-empty" role="status"><strong>Nothing in the notebook for “${esc(q)}” yet.</strong>Try a city, a neighbourhood or a kind of place, like “pizza” or “museum”.</div>`;
    if (status) status.textContent = `No results for ${q}`;
    input?.setAttribute('aria-expanded', 'false');
    return;
  }
  container.innerHTML = hits
    .map(({ doc }, i) => {
      const mark =
        doc.t === 'pick'
          ? `<span class="result-mark is-pick" aria-hidden="true">${doc.r ?? ''}</span>`
          : `<span class="result-mark" style="--result-accent:${esc(doc.a ?? '')}" aria-hidden="true">${doc.t === 'city' ? esc(doc.n.slice(0, 1)) : '≡'}</span>`;
      const typeLabel = doc.t === 'pick' ? `Number ${doc.r}, ` : doc.t === 'city' ? 'City, ' : 'List, ';
      return `<a class="result" role="option" id="res-${i}" aria-selected="false" href="${BASE}${esc(doc.u)}">${mark}<span class="result-text"><span class="result-title"><span class="visually-hidden">${typeLabel}</span>${esc(doc.n)}</span><span class="result-sub">${esc(doc.s)}</span></span></a>`;
    })
    .join('');
  if (status) status.textContent = `${hits.length} result${hits.length === 1 ? '' : 's'}`;
  input?.setAttribute('aria-expanded', 'true');
}

function wireSearch(input: HTMLInputElement, results: HTMLElement, status: HTMLElement | null, onQuery?: (q: string) => void): void {
  let active = -1;
  const options = () => [...results.querySelectorAll<HTMLAnchorElement>('.result')];
  const setActive = (i: number) => {
    const opts = options();
    opts.forEach((o) => o.setAttribute('aria-selected', 'false'));
    active = opts.length ? (i + opts.length) % opts.length : -1;
    const el = opts[active];
    if (el) {
      el.setAttribute('aria-selected', 'true');
      el.scrollIntoView({ block: 'nearest' });
      input.setAttribute('aria-activedescendant', el.id);
    } else input.removeAttribute('aria-activedescendant');
  };
  const run = async () => {
    active = -1;
    input.removeAttribute('aria-activedescendant');
    onQuery?.(input.value);
    try {
      renderResults(results, status, input.value, await loadIndex(), input);
    } catch {
      results.innerHTML = `<div class="search-empty"><strong>Search couldn’t load.</strong>Check your connection and try again, or browse from the shelf.</div>`;
    }
  };
  input.addEventListener('input', run);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(active + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(active - 1);
    } else if (e.key === 'Enter') {
      const target = options()[active] ?? options()[0];
      if (target) {
        e.preventDefault();
        location.href = target.href;
      }
    }
  });
  results.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-suggest]');
    if (b) {
      input.value = b.dataset.suggest ?? '';
      input.focus();
      void run();
    }
  });
  void run();
}

function initSearchDialog(): void {
  const dialog = document.querySelector<HTMLDialogElement>('[data-search-dialog]');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const input = dialog.querySelector<HTMLInputElement>('[data-search-input]')!;
  const results = dialog.querySelector<HTMLElement>('[data-search-results]')!;
  const status = dialog.querySelector<HTMLElement>('[data-search-status]');
  let wired = false;
  const open = (initial = '') => {
    if (!wired) {
      wireSearch(input, results, status);
      wired = true;
    }
    input.value = initial;
    input.dispatchEvent(new Event('input'));
    dialog.showModal();
    input.focus();
    void loadIndex().catch(() => undefined);
  };
  // Any search box on the page opens the instant dialog instead of a full page load.
  document.querySelectorAll<HTMLFormElement>('form[data-search-open]').forEach((form) => {
    const field = form.querySelector<HTMLInputElement>('input[type="search"]');
    // Open on tap/click or on the first keystroke, never on focus alone, so
    // keyboard users can tab past the box without a dialog popping up.
    field?.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      open(field.value);
    });
    field?.addEventListener('keydown', (e) => {
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        open(field.value + e.key);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        open(field.value);
      }
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      open(field?.value ?? '');
    });
  });
  dialog.querySelector('[data-search-close]')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  document.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement;
    const typing = t.closest('input, textarea, [contenteditable="true"]');
    if (e.key === '/' && !typing && !dialog.open) {
      e.preventDefault();
      open();
    }
  });
  dialog.addEventListener('mouseenter', () => void loadIndex().catch(() => undefined), { once: true });
}

function initSearchPage(): void {
  const form = document.querySelector<HTMLFormElement>('form[data-search-page]');
  if (!form) return;
  const input = form.querySelector<HTMLInputElement>('[data-search-input]')!;
  const results = document.querySelector<HTMLElement>('.search-results-page')!;
  const status = document.querySelector<HTMLElement>('.search-page [data-search-status]');
  input.value = new URLSearchParams(location.search).get('q') ?? '';
  form.addEventListener('submit', (e) => e.preventDefault());
  wireSearch(input, results, status, (q) => {
    const url = new URL(location.href);
    if (q) url.searchParams.set('q', q);
    else url.searchParams.delete('q');
    history.replaceState(null, '', url);
  });
  input.focus();
}

// ---------- Sharing ----------

function toast(message: string): void {
  const el = document.querySelector<HTMLElement>('[data-toast]');
  if (!el) return;
  el.textContent = message;
  el.classList.add('is-on');
  window.setTimeout(() => el.classList.remove('is-on'), 2200);
}

function initShare(): void {
  document.addEventListener('click', async (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-share]');
    if (!btn) return;
    const url = btn.dataset.shareUrl ?? location.href;
    const title = btn.dataset.shareTitle ?? document.title;
    const text = btn.dataset.shareText ?? '';
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        if ((err as DOMException).name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast('Link copied');
    } catch {
      window.prompt('Copy this link', url);
    }
  });
}

// ---------- Theme ----------

function initTheme(): void {
  const btn = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
  if (!btn) return;
  const root = document.documentElement;
  const systemDark = () => matchMedia('(prefers-color-scheme: dark)').matches;
  const current = () => (root.dataset.theme as 'light' | 'dark' | undefined) ?? (systemDark() ? 'dark' : 'light');
  const label = () => btn.setAttribute('aria-label', current() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  label();
  btn.addEventListener('click', () => {
    const next = current() === 'dark' ? 'light' : 'dark';
    // Choosing the system's own theme clears the override, so it follows the system again.
    const followSystem = (next === 'dark') === systemDark();
    if (followSystem) delete root.dataset.theme;
    else root.dataset.theme = next;
    try {
      if (followSystem) localStorage.removeItem('reclo-theme');
      else localStorage.setItem('reclo-theme', next);
    } catch {
      /* storage unavailable: the choice lasts for this page only */
    }
    label();
    toast(next === 'dark' ? 'Dark theme' : 'Light theme');
  });
}

// ---------- Events: hide anything that has finished since the last build ----------

function initEvents(): void {
  const lists = document.querySelectorAll<HTMLElement>('[data-events]');
  lists.forEach((list) => {
    const now = Date.now();
    let visible = 0;
    list.querySelectorAll<HTMLElement>('[data-ends]').forEach((row) => {
      const ends = Date.parse(row.dataset.ends ?? '');
      if (!Number.isNaN(ends) && ends < now) row.hidden = true;
      else visible++;
    });
    if (visible === 0) {
      list.hidden = true;
      document.querySelector<HTMLElement>('[data-events-none]')?.removeAttribute('hidden');
    }
  });
}

initSearchDialog();
initSearchPage();
initShare();
initTheme();
initEvents();
