// Category balance logic for the Spread.
// Categories are configured per event (see CategoryConfig in schema). A category
// with an (effective) target shows coverage dots; one without is a plain
// claim-a-slot list, which is how non-food categories like "Activities" behave.

import type { CategoryConfig, PotluckItem, PotluckDietaryTag, Rsvp } from './schema';

// Fallback category set for events that have not saved a config yet.
// perGuest ratios reproduce the original headcount-scaled targets; Supplies is
// a plain list. Names match the existing Notion "Category" select option values
// so legacy items still group correctly.
export const DEFAULT_SPREAD_CATEGORIES: CategoryConfig[] = [
  { id: 'def-appetizer', name: 'Appetizer', target: null, perGuest: 2.5 },
  { id: 'def-main', name: 'Main', target: null, perGuest: 1.0 },
  { id: 'def-side', name: 'Side', target: null, perGuest: 1.0 },
  { id: 'def-dessert', name: 'Dessert', target: null, perGuest: 0.75 },
  { id: 'def-drinks', name: 'Drinks', target: null, perGuest: 2.0 },
  { id: 'def-supplies', name: 'Supplies', target: null, perGuest: null },
];

// Quick-pick serving sizes offered in the add/edit forms (plus a custom field).
export const QUICK_SERVINGS = [2, 4, 6, 8];

// Fallback servings for an item whose Serves is unset (host-added items mostly).
export const DEFAULT_ITEM_SERVINGS = 6;

export interface CategoryStat {
  name: string;
  target: number | null;       // effective target; null = plain list (no coverage)
  claimed: number;             // sum of effective servings on items a guest has claimed
  gap: number;                 // max(target - claimed, 0); 0 when target is null
  dotsFilled: number;          // 0..5 for display
  tracksServings: boolean;     // target != null
  status: 'covered' | 'needed' | 'list';
}

export function effectiveServings(item: PotluckItem): number {
  if (item.serves != null) return item.serves;
  return DEFAULT_ITEM_SERVINGS;
}

// Resolved view of an item once the host override + visibility toggle are
// applied. This is what everyone EXCEPT the claiming guest's own private
// serving count is built from: grouping, coverage, public name, claimer label.
// When showHostValue is off (or no override), it's just the guest's input.
export interface EffectivePotluck {
  item: string;
  category: string;
  serves: number | null;
  dietaryTags: PotluckDietaryTag[];
  isClaimed: boolean;              // counts toward coverage / renders as claimed
  hostClaimerName: string | null; // free-text host claimer when shown, else null
  usingHostValue: boolean;         // the override is the version being shown
}

export function effectivePotluck(item: PotluckItem): EffectivePotluck {
  const o = item.hostOverride;
  if (item.showHostValue && o) {
    return {
      item: o.item ?? item.item,
      category: o.category ?? item.category,
      serves: o.serves !== undefined ? o.serves : item.serves,
      dietaryTags: o.dietaryTags ?? item.dietaryTags,
      // A host-supplied claimer marks the slot handled even if no guest claimed.
      isClaimed: o.claimer != null ? true : !!item.claimedByGuestId,
      hostClaimerName: o.claimer ?? null,
      usingHostValue: true,
    };
  }
  return {
    item: item.item,
    category: item.category,
    serves: item.serves,
    dietaryTags: item.dietaryTags,
    isClaimed: !!item.claimedByGuestId,
    hostClaimerName: null,
    usingHostValue: false,
  };
}

// Effective target for a category: explicit host target wins; else scale the
// per-guest ratio to live headcount; else null (plain list, no coverage).
export function effectiveTarget(c: CategoryConfig, headcount: number | null): number | null {
  if (c.target != null) return c.target;
  if (c.perGuest != null && headcount != null && headcount > 0) {
    return Math.round(headcount * c.perGuest);
  }
  return null;
}

export function computeCategoryStats(
  items: PotluckItem[],
  categories: CategoryConfig[],
  effectiveHeadcount: number | null,
): CategoryStat[] {
  return categories.map(c => {
    const target = effectiveTarget(c, effectiveHeadcount);
    // Coverage follows the EFFECTIVE item (host override applied) so the dot
    // board matches exactly what guests see. Only effectively-claimed dishes
    // count — an unclaimed slot is still waiting for someone.
    const claimed = items
      .map(effectivePotluck)
      .filter(e => e.category === c.name && e.isClaimed)
      .reduce((sum, e) => sum + (e.serves ?? DEFAULT_ITEM_SERVINGS), 0);
    const claimedRounded = Math.round(claimed);

    if (target == null) {
      return {
        name: c.name, target: null, claimed: claimedRounded,
        gap: 0, dotsFilled: 0, tracksServings: false, status: 'list',
      };
    }
    if (claimed >= target) {
      return {
        name: c.name, target, claimed: claimedRounded,
        gap: 0, dotsFilled: 5, tracksServings: true, status: 'covered',
      };
    }
    const ratio = target > 0 ? claimed / target : 0;
    return {
      name: c.name, target, claimed: claimedRounded,
      gap: Math.max(0, Math.round(target - claimed)),
      dotsFilled: Math.max(0, Math.min(4, Math.floor(ratio * 5))),
      tracksServings: true, status: 'needed',
    };
  });
}

// Live estimated headcount: confirmed Yes carry full weight, plus-ones too,
// Maybe weighted 0.5. If too few people have responded for this to be a useful
// signal (< 2), fall back to the host's planning Target Headcount, then null.
const MIN_RSVPS_TO_TRUST_ESTIMATE = 2;
export function estimatedHeadcountFromRsvps(
  rsvps: Pick<Rsvp, 'status' | 'plusOnes'>[],
  fallbackTargetHeadcount: number | null,
): number | null {
  let yesCount = 0;
  let maybeCount = 0;
  let plusYes = 0;
  let plusMaybe = 0;
  for (const r of rsvps) {
    if (r.status === 'Yes') {
      yesCount += 1;
      plusYes += r.plusOnes ?? 0;
    } else if (r.status === 'Maybe') {
      maybeCount += 1;
      plusMaybe += r.plusOnes ?? 0;
    }
  }
  const responded = yesCount + maybeCount;
  if (responded >= MIN_RSVPS_TO_TRUST_ESTIMATE) {
    return (yesCount + plusYes) + 0.5 * (maybeCount + plusMaybe);
  }
  if (fallbackTargetHeadcount != null && fallbackTargetHeadcount > 0) {
    return fallbackTargetHeadcount;
  }
  return null;
}

// Sort stats so the largest gap floats to the top, then plain lists, then
// covered. Used on the guest dot board; the host editor keeps config order.
export function sortStatsByNeed(stats: CategoryStat[]): CategoryStat[] {
  const rank = (s: CategoryStat) => (s.status === 'needed' ? 0 : s.status === 'list' ? 1 : 2);
  return [...stats].sort((a, b) => {
    const r = rank(a) - rank(b);
    if (r !== 0) return r;
    if (a.status === 'needed' && b.status === 'needed') return b.gap - a.gap;
    return 0;
  });
}
