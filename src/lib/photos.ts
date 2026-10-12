/**
 * Photos found by scripts/fetch-images.ts, keyed by "cities/<city>" or
 * "<city>/<category>/<id>". Pages fall back to designed art when a key is missing.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface Photo {
  file: string;
  small: string;
  width: number;
  height: number;
  kind: 'commons' | 'website';
  credit: string;
  license: string | null;
  sourceUrl: string;
  color: string;
}

export type Photos = Map<string, Photo>;

export function loadPhotos(contentDir: string): Photos {
  const path = join(contentDir, 'images/manifest.json');
  if (!existsSync(path)) return new Map();
  const data = JSON.parse(readFileSync(path, 'utf8')) as Record<string, Photo>;
  return new Map(Object.entries(data).filter(([, p]) => existsSync(join(contentDir, 'images', p.file)) && existsSync(join(contentDir, 'images', p.small))));
}

export const photoKey = {
  city: (city: string) => `cities/${city}`,
  pick: (city: string, cat: string, id: string) => `${city}/${cat}/${id}`,
};
