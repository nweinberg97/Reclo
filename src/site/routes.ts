/** Every URL on the site comes from here, so links, previews and cards never drift apart. */
import type { CategoryId } from '../schema/types.ts';

export const routes = {
  home: () => '',
  search: () => 'search/',
  ranks: () => 'how-reclo-ranks/',
  privacy: () => 'privacy/',
  saved: () => 'saved/',
  curators: () => 'curators/',
  city: (city: string) => `${city}/`,
  list: (city: string, cat: CategoryId) => `${city}/${cat}/`,
  pick: (city: string, cat: CategoryId, id: string) => `${city}/${cat}/${id}/`,

  ogHome: () => 'og/home.png',
  ogPage: (path: string) => `og/${path.replace(/\/$/, '') || 'home'}.png`,
  card: (city: string, cat: CategoryId, id: string, format: 'story' | 'badge') => `cards/${city}/${cat}/${id}-${format}.png`,
};
