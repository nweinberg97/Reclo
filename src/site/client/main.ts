/**
 * Reclo's only JavaScript. Pages work without it; with it you get instant and
 * voice search, saving and comparing places, one-tap sharing, row arrows and
 * the theme switch. No tracking, no third parties. Saved places and the theme
 * live in this browser only.
 */
import { type SearchDoc, search } from '../../search/search.ts';

const script = document.currentScript as HTMLScriptElement | null;
const BASE = script ? new URL('../', script.src).pathname : '/';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const HEART = `<svg class="icon heart" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 7.9 3.6 4.5 7 4.5c2.1 0 3.6 1.1 5 2.9 1.4-1.8 2.9-2.9 5-2.9 3.4 0 5.6 3.4 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;

// ---------- Index (search, saved, compare all read it) ----------

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

// ---------- Saved places (this device only) ----------

const SAVED_KEY = 'reclo-saved';
function readSaved(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
let saved = readSaved();
function writeSaved(list: string[]): void {
  saved = list;
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable: saving lasts for this page only */
  }
  syncSaveButtons();
  renderSavedPage();
}
function toggleSaved(path: string): boolean {
  const on = !saved.includes(path);
  writeSaved(on ? [...saved, path] : saved.filter((p) => p !== path));
  return on;
}
function syncSaveButtons(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-save]').forEach((b) => {
    const on = saved.includes(b.dataset.save ?? '');
    b.setAttribute('aria-pressed', String(on));
    b.classList.toggle('is-saved', on);
    const label = b.querySelector('.save-btn-label');
    if (label) label.textContent = on ? 'Saved' : 'Save';
  });
  const count = document.querySelector<HTMLElement>('[data-saved-count]');
  if (count) {
    count.textContent = String(saved.length);
    count.hidden = saved.length === 0;
  }
  document.querySelector('[data-saved-link]')?.setAttribute('aria-label', saved.length ? `Saved places (${saved.length})` : 'Saved places');
}
function initSave(): void {
  syncSaveButtons();
  document.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-save]');
    if (!b) return;
    e.preventDefault();
    const on = toggleSaved(b.dataset.save ?? '');
    b.classList.remove('pop');
    void b.offsetWidth;
    b.classList.add('pop');
    toast(on ? 'Saved. Find it under the heart' : 'Removed from saved');
  });
  // Keep tabs in sync.
  window.addEventListener('storage', (e) => {
    if (e.key === SAVED_KEY) {
      saved = readSaved();
      syncSaveButtons();
      renderSavedPage();
    }
  });
}

// ---------- Cards rendered in the browser (search results, saved) ----------

function pickCard(doc: SearchDoc): string {
  const d = doc.d!;
  const img = doc.i
    ? `<img src="${BASE}${esc(doc.i)}" alt="${esc(doc.n)}" loading="lazy" decoding="async">`
    : `<span class="art-mini" style="--a:${esc(doc.a ?? '#14213D')}"></span>`;
  const on = saved.includes(doc.u);
  return `<li class="place-card"><a class="place-card-link" href="${BASE}${esc(doc.u)}"><figure class="pic place-card-pic" style="--ph:${esc(doc.a ?? '#ccc')}">${img}<span class="rank-tag"><span class="visually-hidden">Number </span><span aria-hidden="true">#</span>${doc.r}</span></figure><span class="place-card-body"><span class="place-card-name">${esc(doc.n)}</span><span class="place-card-meta">${esc([d.c, d.t].join(' · '))}</span><span class="place-card-why">${esc(d.w)}</span><span class="place-card-proof">${esc(d.p)}</span></span></a><button type="button" class="save-btn${on ? ' is-saved' : ''}" data-save="${esc(doc.u)}" aria-pressed="${on}" aria-label="Save ${esc(doc.n)}">${HEART}</button></li>`;
}

// ---------- Search ----------

const SUGGESTIONS = ['pizza', 'museum', 'bakery', 'boutique hotel', 'Brooklyn', 'Vancouver'];

function resultRow(doc: SearchDoc, i: number): string {
  const thumb = doc.i
    ? `<img class="result-img" src="${BASE}${esc(doc.i)}" alt="" loading="lazy">`
    : `<span class="result-mark${doc.t === 'pick' ? ' is-pick' : ''}" style="--result-accent:${esc(doc.a ?? '')}" aria-hidden="true">${doc.t === 'pick' ? doc.r : doc.t === 'city' ? esc(doc.n.slice(0, 1)) : '≡'}</span>`;
  const typeLabel = doc.t === 'pick' ? `Number ${doc.r}, ` : doc.t === 'city' ? 'City, ' : 'List, ';
  const sub = doc.d ? doc.d.p : doc.s;
  return `<a class="result" role="option" id="res-${i}" aria-selected="false" href="${BASE}${esc(doc.u)}">${thumb}<span class="result-text"><span class="result-title"><span class="visually-hidden">${typeLabel}</span>${esc(doc.n)}</span><span class="result-sub">${esc(sub)}</span></span></a>`;
}

function renderDialogResults(container: HTMLElement, status: HTMLElement | null, query: string, docs: SearchDoc[], input: HTMLInputElement): void {
  const q = query.trim();
  if (!q) {
    container.innerHTML = `<div class="search-hint"><p>Search every city, list and place. Or tap the mic and say it.</p><ul>${SUGGESTIONS.map((s) => `<li><button type="button" data-suggest="${esc(s)}">${esc(s)}</button></li>`).join('')}</ul></div>`;
    if (status) status.textContent = '';
    input.setAttribute('aria-expanded', 'false');
    return;
  }
  const all = search(docs, q, 500);
  if (all.length === 0) {
    container.innerHTML = `<div class="search-empty" role="status"><strong>Nothing for “${esc(q)}” yet.</strong>Try a city, a neighbourhood or a kind of place, like “pizza” or “museum”.</div>`;
    if (status) status.textContent = `No results for ${q}`;
    input.setAttribute('aria-expanded', 'false');
    return;
  }
  const picks = all.filter((h) => h.doc.t === 'pick').length;
  const top = all.slice(0, 8);
  container.innerHTML =
    top.map(({ doc }, i) => resultRow(doc, i)).join('') +
    (all.length > top.length || picks > 1
      ? `<a class="result-all" href="${BASE}search/?q=${encodeURIComponent(q)}">See all ${picks ? `${picks} place${picks === 1 ? '' : 's'}` : `${all.length} results`} for “${esc(q)}”</a>`
      : '');
  if (status) status.textContent = `${all.length} result${all.length === 1 ? '' : 's'}`;
  input.setAttribute('aria-expanded', 'true');
}

function wireListbox(input: HTMLInputElement, results: HTMLElement): void {
  let active = -1;
  const options = () => [...results.querySelectorAll<HTMLAnchorElement>('.result, .result-all')];
  const setActive = (i: number) => {
    const opts = options();
    opts.forEach((o) => o.setAttribute('aria-selected', 'false'));
    active = opts.length ? (i + opts.length) % opts.length : -1;
    const el = opts[active];
    if (el) {
      el.setAttribute('aria-selected', 'true');
      el.scrollIntoView({ block: 'nearest' });
      if (el.id) input.setAttribute('aria-activedescendant', el.id);
    } else input.removeAttribute('aria-activedescendant');
  };
  input.addEventListener('input', () => {
    active = -1;
    input.removeAttribute('aria-activedescendant');
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(active + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(active - 1);
    } else if (e.key === 'Enter') {
      const opts = options();
      // Enter with nothing highlighted shows every result on the full page.
      const target = opts[active] ?? opts.find((o) => o.classList.contains('result-all')) ?? opts[0];
      if (target) {
        e.preventDefault();
        location.href = target.href;
      }
    }
  });
}

function initSearchDialog(): void {
  const dialog = document.querySelector<HTMLDialogElement>('[data-search-dialog]');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const input = dialog.querySelector<HTMLInputElement>('[data-search-input]')!;
  const results = dialog.querySelector<HTMLElement>('[data-search-results]')!;
  const status = dialog.querySelector<HTMLElement>('[data-search-status]');
  const run = async () => {
    try {
      renderDialogResults(results, status, input.value, await loadIndex(), input);
    } catch {
      results.innerHTML = `<div class="search-empty"><strong>Search couldn’t load.</strong>Check your connection and try again.</div>`;
    }
  };
  input.addEventListener('input', run);
  wireListbox(input, results);
  results.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-suggest]');
    if (b) {
      input.value = b.dataset.suggest ?? '';
      input.focus();
      void run();
    }
  });
  wireVoice(dialog.querySelector('[data-voice]'), input);
  const open = (initial = '', listen = false) => {
    input.value = initial;
    void run();
    dialog.showModal();
    input.focus();
    if (listen) dialog.querySelector<HTMLButtonElement>('[data-voice]')?.click();
  };
  document.querySelectorAll<HTMLFormElement>('form[data-search-open]').forEach((form) => {
    const field = form.querySelector<HTMLInputElement>('input[type="search"]');
    // Open on tap or the first keystroke, never on focus alone, so keyboard users can tab past.
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
    if (e.key === '/' && !t.closest('input, textarea, [contenteditable="true"]') && !dialog.open) {
      e.preventDefault();
      open();
    }
  });
}

/** The full results page: every matching place as a photo card, plus matching cities and lists. */
function initSearchPage(): void {
  const form = document.querySelector<HTMLFormElement>('form[data-search-page]');
  if (!form) return;
  const input = form.querySelector<HTMLInputElement>('[data-search-input]')!;
  const results = document.querySelector<HTMLElement>('.search-results-page')!;
  const status = document.querySelector<HTMLElement>('.search-page [data-search-status]');
  const heading = document.querySelector<HTMLElement>('[data-search-heading]');
  input.value = new URLSearchParams(location.search).get('q') ?? '';
  const run = async () => {
    const q = input.value.trim();
    const url = new URL(location.href);
    if (q) url.searchParams.set('q', q);
    else url.searchParams.delete('q');
    history.replaceState(null, '', url);
    let docs: SearchDoc[];
    try {
      docs = await loadIndex();
    } catch {
      results.innerHTML = `<div class="search-empty"><strong>Search couldn’t load.</strong>Check your connection and try again.</div>`;
      return;
    }
    if (!q) {
      if (heading) heading.textContent = 'Search Reclo';
      results.innerHTML = `<div class="search-hint"><p>Search every city, list and place.</p><ul>${SUGGESTIONS.map((s) => `<li><button type="button" data-suggest="${esc(s)}">${esc(s)}</button></li>`).join('')}</ul></div>`;
      return;
    }
    const hits = search(docs, q, 500);
    const picks = hits.filter((h) => h.doc.t === 'pick').map((h) => h.doc);
    const places = hits.filter((h) => h.doc.t !== 'pick').map((h) => h.doc);
    if (heading) heading.textContent = hits.length ? `${picks.length ? `${picks.length} place${picks.length === 1 ? '' : 's'}` : `${hits.length} results`} for “${q}”` : `Nothing for “${q}” yet`;
    if (status) status.textContent = `${hits.length} results`;
    if (!hits.length) {
      results.innerHTML = `<div class="search-empty"><strong>Nothing for “${esc(q)}” yet.</strong>Try a city, a neighbourhood or a kind of place, like “pizza” or “museum”.</div>`;
      return;
    }
    results.innerHTML =
      (places.length
        ? `<ul class="hero-chips search-chips" role="list">${places
            .slice(0, 12)
            .map((d) => `<li><a class="chip" style="--accent:${esc(d.a ?? '#14213D')};--accent-ink:#fff" href="${BASE}${esc(d.u)}">${esc(d.n)}</a></li>`)
            .join('')}</ul>`
        : '') + (picks.length ? `<ol class="place-grid" role="list">${picks.map(pickCard).join('')}</ol>` : '');
  };
  let timer = 0;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = window.setTimeout(run, 120);
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    void run();
  });
  results.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-suggest]');
    if (b) {
      input.value = b.dataset.suggest ?? '';
      void run();
    }
  });
  wireVoice(form.querySelector('[data-voice]'), input);
  void run();
}

// ---------- Voice search ----------

interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}

function wireVoice(button: HTMLButtonElement | null, input: HTMLInputElement): void {
  const Ctor = (window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition;
  if (!button || !Ctor) return;
  button.hidden = false;
  let rec: Recognition | null = null;
  const stop = () => {
    button.classList.remove('is-listening');
    button.setAttribute('aria-label', 'Search by voice');
    input.placeholder = input.dataset.placeholder ?? input.placeholder;
    rec = null;
  };
  button.addEventListener('click', () => {
    if (rec) {
      rec.stop();
      return;
    }
    rec = new Ctor();
    rec.lang = document.documentElement.lang || 'en';
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      const text = Array.from(e.results)
        .map((r) => r[0]?.transcript ?? '')
        .join(' ')
        .trim();
      input.value = text;
      input.dispatchEvent(new Event('input'));
    };
    rec.onerror = (e) => {
      stop();
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') toast('Allow the microphone to search by voice');
      else if (e.error === 'no-speech') toast('Didn’t catch that. Try again');
    };
    rec.onend = stop;
    input.dataset.placeholder ??= input.placeholder;
    input.placeholder = 'Listening…';
    button.classList.add('is-listening');
    button.setAttribute('aria-label', 'Stop listening');
    try {
      rec.start();
    } catch {
      stop();
    }
  });
}

// ---------- Saved page: cards and side-by-side compare ----------

let savedView: 'cards' | 'compare' = 'cards';

async function renderSavedPage(): Promise<void> {
  const root = document.querySelector<HTMLElement>('[data-saved-root]');
  if (!root) return;
  const toolbar = document.querySelector<HTMLElement>('[data-saved-toolbar]');
  if (!saved.length) {
    if (toolbar) toolbar.hidden = true;
    root.innerHTML = `<section class="empty-page"><svg class="empty-glyph" viewBox="0 0 24 24" aria-hidden="true">${HEART.replace('class="icon heart"', '')}</svg><h2>Nothing saved yet</h2><p>Tap the heart on any place to add it here. Then compare your shortlist side by side and pick one.</p><p class="empty-next"><a class="btn btn-pop" href="${BASE}">Start exploring</a></p></section>`;
    return;
  }
  let docs: SearchDoc[];
  try {
    docs = await loadIndex();
  } catch {
    root.innerHTML = `<p class="note">Your saved places couldn’t load. Check your connection and try again.</p>`;
    return;
  }
  const byUrl = new Map(docs.map((d) => [d.u, d]));
  const items = saved.map((u) => byUrl.get(u)).filter((d): d is SearchDoc => !!d && d.t === 'pick');
  if (toolbar) toolbar.hidden = false;
  if (savedView === 'cards') {
    root.innerHTML = `<ol class="place-grid" role="list">${items.map(pickCard).join('')}</ol>`;
    return;
  }
  const rows: [string, (d: SearchDoc) => string][] = [
    ['', (d) => `<a class="cmp-photo" href="${BASE}${esc(d.u)}">${d.i ? `<img src="${BASE}${esc(d.i)}" alt="" loading="lazy">` : `<span class="art-mini" style="--a:${esc(d.a ?? '#14213D')}"></span>`}<span class="rank-tag"><span aria-hidden="true">#</span>${d.r}</span></a><a class="cmp-name" href="${BASE}${esc(d.u)}">${esc(d.n)}</a>`],
    ['Ranked', (d) => esc(d.d!.p)],
    ['City', (d) => esc(d.d!.c)],
    ['Type', (d) => esc(d.d!.t)],
    ['Neighbourhood', (d) => esc(d.d!.h ?? '—')],
    ['Price', (d) => esc(d.d!.$ ?? '—')],
    ['Why it’s here', (d) => `<span class="cmp-why">${esc(d.d!.w)}</span>`],
    ['Sources', (d) => `${d.d!.n} independent`],
    ['', (d) => `<div class="cmp-actions">${d.d!.web ? `<a class="btn btn-pop btn-small" href="${esc(d.d!.web)}" rel="noopener">Website</a>` : ''}<button type="button" class="btn btn-quiet btn-small" data-save="${esc(d.u)}" aria-pressed="true">Remove</button></div>`],
  ];
  root.innerHTML = `<div class="cmp-scroll" tabindex="0" role="region" aria-label="Compare saved places"><table class="cmp"><tbody>${rows
    .map(([label, cell], i) => `<tr${i === 0 ? ' class="cmp-head"' : ''}><th scope="row">${label ? esc(label) : '<span class="visually-hidden">Place</span>'}</th>${items.map((d) => `<td>${cell(d)}</td>`).join('')}</tr>`)
    .join('')}</tbody></table></div>`;
}

function initSavedPage(): void {
  if (!document.querySelector('[data-saved-root]')) return;
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((b) =>
    b.addEventListener('click', () => {
      savedView = b.dataset.view === 'compare' ? 'compare' : 'cards';
      document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((x) => {
        const on = x === b;
        x.classList.toggle('is-on', on);
        x.setAttribute('aria-pressed', String(on));
      });
      void renderSavedPage();
    }),
  );
  document.querySelector('[data-saved-clear]')?.addEventListener('click', () => {
    writeSaved([]);
    toast('Cleared');
  });
  void renderSavedPage();
}

// ---------- Rows: arrow buttons ----------

function initRails(): void {
  document.querySelectorAll<HTMLElement>('.rail').forEach((rail) => {
    const track = rail.querySelector<HTMLElement>('[data-rail]');
    const prev = rail.querySelector<HTMLButtonElement>('[data-rail-prev]');
    const next = rail.querySelector<HTMLButtonElement>('[data-rail-next]');
    if (!track || !prev || !next) return;
    const update = () => {
      prev.disabled = track.scrollLeft < 8;
      next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 8;
      const scrollable = track.scrollWidth > track.clientWidth + 8;
      prev.hidden = next.hidden = !scrollable;
    };
    const step = () => Math.max(track.clientWidth * 0.85, 260);
    prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
    next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  });
}

// ---------- Sharing ----------

function toast(message: string): void {
  const el = document.querySelector<HTMLElement>('[data-toast]');
  if (!el) return;
  el.textContent = message;
  el.classList.add('is-on');
  window.clearTimeout(Number(el.dataset.t));
  el.dataset.t = String(window.setTimeout(() => el.classList.remove('is-on'), 2400));
}

function initShare(): void {
  document.addEventListener('click', async (e) => {
    // The story image: on phones it goes straight into the share sheet (Instagram, Messages...).
    const story = (e.target as HTMLElement).closest<HTMLAnchorElement>('[data-share-story]');
    if (story && navigator.canShare) {
      e.preventDefault();
      try {
        const res = await fetch(story.dataset.shareStory!);
        const blob = await res.blob();
        const file = new File([blob], story.getAttribute('download') ?? 'reclo-story.png', { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: story.dataset.shareTitle, url: story.dataset.shareUrl });
          return;
        }
      } catch (err) {
        if ((err as DOMException).name === 'AbortError') return;
      }
      location.href = story.href;
      return;
    }
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
    const followSystem = (next === 'dark') === systemDark();
    if (followSystem) delete root.dataset.theme;
    else root.dataset.theme = next;
    try {
      if (followSystem) localStorage.removeItem('reclo-theme');
      else localStorage.setItem('reclo-theme', next);
    } catch {
      /* storage unavailable */
    }
    label();
    toast(next === 'dark' ? 'Dark theme' : 'Light theme');
  });
}

// ---------- Events: hide anything that has finished since the last build ----------

function initEvents(): void {
  document.querySelectorAll<HTMLElement>('[data-events]').forEach((list) => {
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

initSave();
initSearchDialog();
initSearchPage();
initSavedPage();
initRails();
initShare();
initTheme();
initEvents();
