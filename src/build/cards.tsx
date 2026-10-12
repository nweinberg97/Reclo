/**
 * Link previews (1200×630) and share cards (9:16 stories, 1:1 posts, and the
 * "Made the list" card for businesses). Each is a small HTML page rendered to
 * PNG with a headless browser at build time, using the same fonts, colours and
 * illustrations as the site.
 */
import { raw, type Child, type Html } from '#jsx/jsx-runtime';
import type { City, StaticCategoryId } from '../schema/types.ts';
import type { RankedEntry } from '../ranking/rank.ts';
import { categoryGlyph, patternDefs, stampSvg } from '../site/art.ts';
import { CATEGORY_COPY, COPY } from '../site/copy.ts';
import { TOKENS as T } from '../site/tokens.ts';
import { SITE } from '../site/config.ts';
import { dateLabel } from '../site/format.ts';

export interface CardJob {
  /** Output path relative to dist/. */
  out: string;
  width: number;
  height: number;
  html: string;
}

const host = new URL(SITE.url).host + new URL(SITE.url).pathname.replace(/\/$/, '');

/** Fonts are loaded from the built site so cards match the app exactly. */
function page(width: number, height: number, body: Html, fontsBase: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:'Inter';src:url('${fontsBase}inter-400.woff');font-weight:400}
@font-face{font-family:'Inter';src:url('${fontsBase}inter-600.woff');font-weight:600}
@font-face{font-family:'Inter Display';src:url('${fontsBase}inter-display-700.woff');font-weight:700}
@font-face{font-family:'Inter Display';src:url('${fontsBase}inter-display-900.woff');font-weight:900}
@font-face{font-family:'Lora';src:url('${fontsBase}lora-italic.woff');font-style:italic;font-weight:400 700}
*{box-sizing:border-box;margin:0}
html,body{width:${width}px;height:${height}px;overflow:hidden}
body{font-family:'Inter','Noto Sans CJK JP','Noto Sans CJK KR',sans-serif;color:${T.ink};background:${T.paper};
background-image:radial-gradient(${T.dot} 1.6px,transparent 1.7px);background-size:30px 30px;-webkit-font-smoothing:antialiased}
.disp{font-family:'Inter Display','Noto Sans CJK JP','Noto Sans CJK KR',sans-serif}
.voice{font-family:'Lora',Georgia,serif;font-style:italic}
.rank{position:relative;display:inline-block;font-family:'Inter Display';font-weight:900;letter-spacing:-.06em;line-height:.9;isolation:isolate;font-variant-numeric:tabular-nums}
.rank::before{content:'';position:absolute;z-index:-1;left:-.08em;right:-.04em;bottom:.04em;height:.5em;background:${T.highlight};transform:rotate(-2deg) skewX(-8deg);border-radius:.1em}
.clamp2{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.clamp3{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.mark{display:flex;align-items:center;gap:12px;font-family:'Inter Display';font-weight:900;letter-spacing:-.03em}
</style></head><body>${body.value}</body></html>`;
}

function Mark(props: { size: number; color?: string }): Html {
  const c = props.color ?? T.ink;
  return (
    <div class="mark" style={`font-size:${props.size}px;color:${c}`}>
      {raw(
        `<svg width="${props.size * 1.1}" height="${props.size * 1.1}" viewBox="0 0 32 32"><rect x="4" y="3" width="22" height="26" rx="3" fill="${c}"/><rect x="8" y="3" width="2" height="26" fill="${T.paper}" opacity=".5"/><path d="M19 3v11l3-2.2 3 2.2V3z" fill="${T.highlight}"/></svg>`,
      )}
      reclo
    </div>
  );
}

function CoverBlock(props: { city: City; w: number; h: number; glyph?: StaticCategoryId | 'events'; glyphSize?: number; uid: string; children?: Child }): Html {
  const { city } = props;
  const gs = props.glyphSize ?? Math.min(props.w, props.h) * 0.5;
  return (
    <div style={`position:relative;width:${props.w}px;height:${props.h}px;background:${city.accent};color:${city.accentInk};overflow:hidden`}>
      {raw(
        `<svg width="${props.w}" height="${props.h}" style="position:absolute;inset:0"><defs>${patternDefs(city.pattern, city.accentInk, props.uid, 2)}</defs><rect width="100%" height="100%" fill="url(#${props.uid})" opacity=".17"/>${
          props.glyph
            ? `<g transform="translate(${props.w - gs * 1.05} ${props.h - gs * 1.05}) scale(${gs / 24})">${categoryGlyph(props.glyph, city.accentInk, 1.1)}</g>`
            : ''
        }</svg>`,
      )}
      <div style="position:absolute;inset:0 auto 0 0;width:22px;background:rgba(0,0,0,.2)"></div>
      {props.children ?? null}
    </div>
  );
}

function sourcesLine(p: RankedEntry, names: Map<string, string>): string {
  const n = [...new Set(p.entry.evidence.map((e) => names.get(e.source) ?? e.source))];
  return n.slice(0, 3).join(' · ') + (n.length > 3 ? ` +${n.length - 3}` : '');
}

// --- Pick cards ------------------------------------------------------------------

export function pickCards(opts: {
  city: City;
  category: StaticCategoryId;
  p: RankedEntry;
  total: number;
  sourceNames: Map<string, string>;
  fontsBase: string;
  paths: { og: string; story: string; post: string; badge: string };
}): CardJob[] {
  const { city, category, p, sourceNames, fontsBase } = opts;
  const e = p.entry;
  const cat = CATEGORY_COPY[category];
  const pride = `${cat.singular} in ${city.name}`;
  const uid = `u${e.id.replace(/[^a-z0-9]/g, '')}`;
  const sources = sourcesLine(p, sourceNames);
  const nameSize = (base: number, max: number) => Math.round(e.name.length > max ? base * (max / e.name.length) ** 0.6 : base);

  const og = page(
    1200,
    630,
    <div style="display:flex;height:630px">
      <CoverBlock city={city} w={420} h={630} glyph={category} uid={`${uid}og`} glyphSize={250}>
        <div style="position:absolute;left:52px;top:46px;right:30px" class="disp">
          <div style="font-weight:700;font-size:30px;opacity:.95">{city.name}</div>
          {city.localName ? <div style="font-size:24px;opacity:.9;margin-top:4px">{city.localName}</div> : null}
        </div>
      </CoverBlock>
      <div style="flex:1;padding:56px 64px 48px 64px;display:flex;flex-direction:column">
        <div style="display:flex;align-items:flex-end;gap:22px">
          <span class="rank" style="font-size:170px">#{p.rank}</span>
          <span style="font-size:30px;font-weight:600;color:#4A5672;padding-bottom:22px;line-height:1.2">{pride}</span>
        </div>
        <div class="disp clamp2" style={`font-weight:900;font-size:${nameSize(68, 18)}px;line-height:1.02;letter-spacing:-.035em;margin-top:22px`}>
          {e.name}
        </div>
        <div class="voice clamp2" style="font-size:30px;line-height:1.3;margin-top:18px;color:#1B2A4A">
          {e.why}
        </div>
        <div style="margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;gap:24px">
          <div style="font-size:21px;color:#4A5672;line-height:1.3">With the receipts: {sources}</div>
          <Mark size={36} />
        </div>
      </div>
    </div>,
    fontsBase,
  );

  const story = page(
    1080,
    1920,
    <div style="display:flex;flex-direction:column;height:1920px">
      <CoverBlock city={city} w={1080} h={760} glyph={category} uid={`${uid}st`} glyphSize={420}>
        <div style="position:absolute;left:96px;top:120px;right:80px" class="disp">
          <div style="font-weight:600;font-size:40px;opacity:.95;font-family:Inter">{city.country}</div>
          <div style="font-weight:900;font-size:150px;letter-spacing:-.05em;line-height:.95;margin-top:10px">{city.name}</div>
          {city.localName ? <div style="font-size:56px;font-weight:600;margin-top:16px">{city.localName}</div> : null}
        </div>
      </CoverBlock>
      <div style="flex:1;padding:80px 96px 110px;display:flex;flex-direction:column">
        <span class="rank" style="font-size:300px;align-self:flex-start">#{p.rank}</span>
        <div style="font-size:46px;font-weight:600;color:#4A5672;margin-top:20px">{pride}</div>
        <div class="disp clamp3" style={`font-weight:900;font-size:${nameSize(108, 16)}px;line-height:1;letter-spacing:-.04em;margin-top:34px`}>
          {e.name}
        </div>
        <div class="voice clamp3" style="font-size:52px;line-height:1.3;margin-top:36px">
          {e.why}
        </div>
        <div style="margin-top:auto;border-top:3px dashed #D5DBE6;padding-top:40px;display:flex;justify-content:space-between;align-items:center">
          <div style="font-size:32px;color:#4A5672;line-height:1.35;max-width:620px">Backed by {sources}</div>
          <Mark size={58} />
        </div>
      </div>
    </div>,
    fontsBase,
  );

  const post = page(
    1080,
    1080,
    <div style="display:flex;flex-direction:column;height:1080px">
      <CoverBlock city={city} w={1080} h={300} glyph={category} uid={`${uid}po`} glyphSize={230}>
        <div style="position:absolute;left:84px;bottom:56px" class="disp">
          <div style="font-weight:900;font-size:96px;letter-spacing:-.05em;line-height:1">
            {city.name}
            {city.localName ? <span style="font-size:44px;font-weight:600;letter-spacing:0;margin-left:22px">{city.localName}</span> : null}
          </div>
        </div>
      </CoverBlock>
      <div style="flex:1;padding:56px 84px 70px;display:flex;flex-direction:column">
        <div style="display:flex;align-items:flex-end;gap:28px">
          <span class="rank" style="font-size:210px">#{p.rank}</span>
          <span style="font-size:38px;font-weight:600;color:#4A5672;padding-bottom:30px;line-height:1.2">{pride}</span>
        </div>
        <div class="disp clamp2" style={`font-weight:900;font-size:${nameSize(86, 18)}px;line-height:1;letter-spacing:-.04em;margin-top:26px`}>
          {e.name}
        </div>
        <div class="voice clamp2" style="font-size:40px;line-height:1.3;margin-top:24px">
          {e.why}
        </div>
        <div style="margin-top:auto;display:flex;justify-content:space-between;align-items:center">
          <div style="font-size:26px;color:#4A5672">{host}</div>
          <Mark size={48} />
        </div>
      </div>
    </div>,
    fontsBase,
  );

  const badge = page(
    1080,
    1080,
    <div style={`height:1080px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:90px;background:${T.paperRaised};background-image:none;border:28px solid ${city.accent}`}>
      <div style={`width:330px;height:330px;color:${T.stamp};transform:rotate(-8deg)`}>{raw(stampSvg(dateLabel(e.lastVerified), T.stamp))}</div>
      <div style="font-size:44px;font-weight:600;margin-top:36px;color:#4A5672">Made the list</div>
      <div class="disp clamp2" style={`font-weight:900;font-size:${nameSize(92, 16)}px;line-height:1;letter-spacing:-.04em;margin-top:22px`}>
        {e.name}
      </div>
      <div style="margin-top:30px;display:flex;align-items:flex-end;gap:20px;justify-content:center">
        <span class="rank" style="font-size:120px">#{p.rank}</span>
        <span style="font-size:40px;font-weight:600;padding-bottom:14px">{pride}</span>
      </div>
      <div class="voice" style="font-size:32px;margin-top:40px;color:#4A5672">Ranked on independent evidence. Never for sale.</div>
      <div style="margin-top:44px">
        <Mark size={54} />
      </div>
    </div>,
    fontsBase,
  );

  return [
    { out: opts.paths.og, width: 1200, height: 630, html: og },
    { out: opts.paths.story, width: 1080, height: 1920, html: story },
    { out: opts.paths.post, width: 1080, height: 1080, html: post },
    { out: opts.paths.badge, width: 1080, height: 1080, html: badge },
  ];
}

// --- Page previews ----------------------------------------------------------------

export function cityOg(city: City, total: number, fontsBase: string, out: string): CardJob {
  const html = page(
    1200,
    630,
    <CoverBlock city={city} w={1200} h={630} uid={`c${city.id.replace(/-/g, '')}`}>
      <div style="position:absolute;right:56px;top:0;bottom:0;width:16px;background:rgba(0,0,0,.16)"></div>
      <div style="position:absolute;left:96px;top:70px;right:140px;bottom:64px;display:flex;flex-direction:column" class="disp">
        <div style="font-family:Inter;font-weight:600;font-size:30px;opacity:.95">{city.country}</div>
        <div style="font-weight:900;font-size:150px;letter-spacing:-.055em;line-height:.92;margin-top:8px">{city.name}</div>
        {city.localName ? <div style="font-weight:600;font-size:48px;margin-top:10px">{city.localName}</div> : null}
        <div class="voice" style="font-size:36px;line-height:1.3;margin-top:24px;max-width:860px">{city.tagline}</div>
        <div style="margin-top:auto;display:flex;align-items:center;justify-content:space-between">
          <span style={`font-family:Inter;font-weight:600;font-size:28px;background:${T.highlight};color:${T.ink};padding:10px 16px;border-radius:4px;transform:rotate(-2deg)`}>
            {total ? `${total} verified picks` : COPY.researching}
          </span>
          <div style={`background:${T.paperRaised};padding:12px 18px;border-radius:10px`}>
            <Mark size={38} />
          </div>
        </div>
      </div>
    </CoverBlock>,
    fontsBase,
  );
  return { out, width: 1200, height: 630, html };
}

export function listOg(city: City, category: StaticCategoryId | 'events', top: string[], n: number, fontsBase: string, out: string): CardJob {
  const cat = CATEGORY_COPY[category];
  const title = category === 'events' ? `This week in ${city.name}` : n ? `The ${n} best ${cat.phrase} in ${city.name}` : `${cat.label} in ${city.name}`;
  const html = page(
    1200,
    630,
    <div style="display:flex;height:630px">
      <CoverBlock city={city} w={300} h={630} glyph={category} uid={`l${city.id.replace(/-/g, '')}${category.replace(/-/g, '')}`} glyphSize={190} />
      <div style="flex:1;padding:60px 64px 50px;display:flex;flex-direction:column">
        <div class="disp" style="font-weight:900;font-size:66px;line-height:1;letter-spacing:-.04em">{title}</div>
        {top.length ? (
          <ol style="list-style:none;padding:0;margin-top:34px;display:grid;gap:14px">
            {top.slice(0, 3).map((name, i) => (
              <li style="display:flex;align-items:center;gap:20px;font-size:34px;font-weight:600">
                <span class="rank" style="font-size:52px;width:64px">{i + 1}</span>
                <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:680px">{name}</span>
              </li>
            ))}
          </ol>
        ) : (
          <div class="voice" style="font-size:34px;margin-top:30px;color:#4A5672">
            {category === 'events' ? 'Concerts and local events, from calendars we trust.' : 'Being researched. We’d rather leave it blank than guess.'}
          </div>
        )}
        <div style="margin-top:auto;display:flex;justify-content:space-between;align-items:center">
          <div style="font-size:24px;color:#4A5672">Ranked on evidence. Never for sale.</div>
          <Mark size={38} />
        </div>
      </div>
    </div>,
    fontsBase,
  );
  return { out, width: 1200, height: 630, html };
}

export function homeOg(cities: City[], fontsBase: string, out: string): CardJob {
  const html = page(
    1200,
    630,
    <div style="padding:64px 72px;height:630px;display:flex;flex-direction:column">
      <Mark size={44} />
      <div class="disp" style="font-weight:900;font-size:92px;line-height:.95;letter-spacing:-.05em;margin-top:34px;max-width:900px">
        {COPY.tagline}
      </div>
      <div style="margin-top:auto;display:flex;gap:14px;align-items:flex-end">
        {cities.map((c, i) => (
          <div
            style={`width:96px;height:${128 + ((i * 29) % 40)}px;background:${c.accent};border-radius:3px 10px 10px 3px;position:relative;box-shadow:0 10px 24px -14px rgba(27,42,74,.6)`}
          >
            <div style="position:absolute;inset:0 auto 0 0;width:7px;background:rgba(0,0,0,.2)"></div>
          </div>
        ))}
      </div>
    </div>,
    fontsBase,
  );
  return { out, width: 1200, height: 630, html };
}

export function textOg(title: string, line: string, fontsBase: string, out: string): CardJob {
  const html = page(
    1200,
    630,
    <div style="padding:64px 72px;height:630px;display:flex;flex-direction:column">
      <Mark size={44} />
      <div class="disp" style="font-weight:900;font-size:110px;line-height:.95;letter-spacing:-.05em;margin-top:60px">
        <span class="rank" style="letter-spacing:-.05em">{title}</span>
      </div>
      <div class="voice" style="font-size:38px;margin-top:36px;color:#4A5672;max-width:900px">{line}</div>
    </div>,
    fontsBase,
  );
  return { out, width: 1200, height: 630, html };
}

/** Square app icon for home screens, in the same mark. */
export function appIcon(fontsBase: string, out: string): CardJob {
  const html = page(
    180,
    180,
    <div style={`width:180px;height:180px;display:grid;place-items:center;background:${T.ink}`}>
      {raw(
        `<svg width="120" height="120" viewBox="0 0 32 32"><rect x="4" y="3" width="22" height="26" rx="3" fill="${T.paper}"/><rect x="8" y="3" width="2" height="26" fill="${T.ink}" opacity=".25"/><path d="M19 3v11l3-2.2 3 2.2V3z" fill="${T.highlight}"/></svg>`,
      )}
    </div>,
    fontsBase,
  );
  return { out, width: 180, height: 180, html };
}
