/**
 * Reclo's tiny JSX-to-HTML runtime.
 *
 * Reclo pages are rendered once, at build time, into static HTML. We only need
 * JSX as a typed templating language, not a client framework, so instead of
 * shipping React we compile JSX to escaped HTML strings. See DECISIONS.md.
 *
 * Safety: every string child and attribute value is HTML-escaped. The only way
 * to inject raw HTML is `raw()`, which is used for trusted, build-time output
 * (inline SVG and JSON-LD we generate ourselves).
 */

export class Html {
  constructor(readonly value: string) {}
  toString(): string {
    return this.value;
  }
}

export type Child = Html | string | number | boolean | null | undefined | Child[];

type AttrValue = string | number | boolean | null | undefined;

export interface Props {
  children?: Child;
  [attr: string]: unknown;
}

export type Component<P = Record<string, unknown>> = (props: P & { children?: Child }) => Html;

const VOID = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr',
]);

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESC[c] ?? c);
}

/** Mark a trusted, build-time string as HTML. Never pass user or content data here unescaped. */
export function raw(html: string): Html {
  return new Html(html);
}

export function renderChild(child: Child): string {
  if (child === null || child === undefined || child === false || child === true) return '';
  if (child instanceof Html) return child.value;
  if (Array.isArray(child)) return child.map(renderChild).join('');
  return escapeHtml(String(child));
}

function attrName(name: string): string {
  if (name === 'className') return 'class';
  if (name === 'htmlFor') return 'for';
  return name;
}

function renderAttrs(props: Props): string {
  let out = '';
  for (const [key, value] of Object.entries(props)) {
    if (key === 'children' || key === 'dangerouslySetInnerHTML') continue;
    const v = value as AttrValue;
    if (v === null || v === undefined || v === false) continue;
    const name = attrName(key);
    if (v === true) {
      out += ` ${name}`;
    } else {
      out += ` ${name}="${escapeHtml(String(v))}"`;
    }
  }
  return out;
}

export const Fragment = (props: { children?: Child }): Html => new Html(renderChild(props.children));

export function jsx(type: string | Component<any>, props: Props): Html {
  if (typeof type === 'function') return type(props);
  const inner = props.dangerouslySetInnerHTML as { __html: string } | undefined;
  const open = `<${type}${renderAttrs(props)}>`;
  if (VOID.has(type)) return new Html(open);
  const body = inner ? inner.__html : renderChild(props.children);
  return new Html(`${open}${body}</${type}>`);
}

export const jsxs = jsx;
export const jsxDEV = jsx;

export declare namespace JSX {
  type Element = Html;
  interface ElementChildrenAttribute {
    children: {};
  }
  interface IntrinsicElements {
    [tag: string]: Record<string, unknown> & { children?: Child };
  }
}
