// Category balance logic for the potluck.
// Ratios are servings-per-confirmed-guest. Source: standard catering rules of
// thumb, locked V1.1 2026-05-27. Host can override per-event by setting
// "Target Servings <Category>" on the Events Notion DB.

import type { PotluckCategory, PotluckItem, Event } from './schema';

// Categories shown with dot-row UI on the guest page.
// "Supplies" is intentionally excluded, it has no servings ratio.
export type DotCategory = 'Appetizer' | 'Main' | 'Side' | 'Dessert' | 'Drinks';
export const DOT_CATEGORIES: DotCategory[] = [
  'Appetizer',
  'Main',
  'Side',
  'Dessert',
  'Drinks',
];

// Full enum order (for the "Supplies" plain section under the dot list).
export const ALL_CATEGORIES: PotluckCategory[] = [
  'Appetizer',
  'Main',
  'Side',
  'Dessert',
  'Drinks',
  'Supplies',
];

// Servings per confirmed guest. Drinks counts a drink as 1 serving.
export const RATIOS: Record<DotCategory, number> = {
  Appetizer: 2.5,
  Main: 1.0,
  Side: 1.0,
  Dessert: 0.75,
  Drinks: 2.0,
};

// Defaults that pre-fill the servings field when a guest adds a new dish.
// Also used as the fallback when a host-created item has Serves unset.
export const DEFAULTS_PER_DISH: Record<PotluckCategory, number> = {
  Appetizer: 8,
  Main: 6,
  Side: 6,
  Dessert: 8,
  Drinks: 12,
  Supplies: 1,
};

// Quick-chip options shown next to the servings input.
export const SERVING_CHIPS: Record<PotluckCategory, number[]> = {
  Appetizer: [4, 8, 12, 16],
  Main: [4, 6, 8, 12],
  Side: [4, 6, 8, 12],
  Dessert: [4, 8, 12, 16],
  Drinks: [6, 12, 18, 24],
  Supplies: [1, 2, 5, 10],
};

// Display labels (plural).
export const CATEGORY_LABEL: Record<PotluckCategory, string> = {
  Appetizer: 'Appetizers',
  Main: 'Mains',
  Side: 'Sides',
  Dessert: 'Desserts',
  Drinks: 'Drinks',
  Supplies: 'Supplies',
};

export interface CategoryStat {
  category: PotluckCategory;
  label: string;
  target: number | null;        // null = both host override and headcount-derived target are unset
  claimed: number;              // sum of effective servings on all items in this category
  gap: number;                  // max(target - claimed, 0); 0 if target null
  dotsFilled: number;           // 0..5 integer for display
  status: 'covered' | 'needed' | 'unset';
}

export function effectiveServings(item: PotluckItem): number {
  if (item.serves != null) return item.serves;
  return DEFAULTS_PER_DISH[item.category] ?? 0;
}

function targetFor(category: PotluckCategory, event: Pick<Event, 'targetHeadcount' | 'targetServings'>): number | null {
  if (category === 'Supplies') return null;
  const override = event.targetServings?.[category];
  if (override != null) return override;
  const ratio = RATIOS[category as keyof typeof RATIOS];
  if (event.targetHeadcount != null && ratio != null) {
    return Math.round(event.targetHeadcount * ratio);
  }
  return null;
}

export function computeCategoryStats(
  items: PotluckItem[],
  event: Pick<Event, 'targetHeadcount' | 'targetServings'>,
): CategoryStat[] {
  return DOT_CATEGORIES.map(cat => {
    const target = targetFor(cat, event);
    const claimed = items
      .filter(i => i.category === cat)
      .reduce((sum, i) => sum + effectiveServings(i), 0);
    let status: CategoryStat['status'];
    let dotsFilled: number;
    let gap: number;
    if (target == null) {
      status = 'unset';
      dotsFilled = 0;
      gap = 0;
    } else if (claimed >= target) {
      status = 'covered';
      dotsFilled = 5;
      gap = 0;
    } else {
      status = 'needed';
      const ratio = target > 0 ? claimed / target : 0;
      dotsFilled = Math.max(0, Math.min(4, Math.floor(ratio * 5)));
      gap = Math.max(0, Math.round(target - claimed));
    }
    return {
      category: cat,
      label: CATEGORY_LABEL[cat],
      target,
      claimed: Math.round(claimed),
      gap,
      dotsFilled,
      status,
    };
  });
}

// Sort stats so the largest gap floats to the top, then unset, then covered.
export function sortStatsByNeed(stats: CategoryStat[]): CategoryStat[] {
  const rank = (s: CategoryStat) => (s.status === 'needed' ? 0 : s.status === 'unset' ? 1 : 2);
  return [...stats].sort((a, b) => {
    const r = rank(a) - rank(b);
    if (r !== 0) return r;
    if (a.status === 'needed' && b.status === 'needed') return b.gap - a.gap;
    return 0;
  });
}
