// TypeScript types that mirror the V2 Notion schema.
// Property names match Notion exactly — do not rename without updating Notion.

export type RsvpStatus = 'Yes' | 'Maybe' | 'No' | 'No Response';
// Categories are host-defined per event now, so this is a free string keyed on
// the category name. The Notion "Category" select auto-creates option names on
// write. See CategoryConfig for the per-event list a host configures.
export type PotluckCategory = string;

// One configurable category on an event's Spread.
// - target: explicit host-set serving target. null = no fixed target.
// - perGuest: servings-per-guest ratio used to auto-scale the target to live
//   headcount when no explicit target is set. Only the built-in defaults carry
//   one; host-added categories leave it null. If both target and perGuest are
//   null the category is a plain claim-a-slot list (no coverage tracking),
//   which is how non-food categories like "Activities" behave.
export interface CategoryConfig {
  id: string;                  // stable id so renames can carry their items along
  name: string;
  target: number | null;
  perGuest?: number | null;
}
export type DietaryRestriction =
  | 'Vegetarian'
  | 'Vegan'
  | 'Gluten-Free'
  | 'Nut Allergy'
  | 'Dairy-Free'
  | 'Halal'
  | 'Kosher'
  | 'Other';
export type PotluckDietaryTag = 'Vegetarian' | 'Vegan' | 'Gluten-Free' | 'Nut-Free' | 'Dairy-Free';
export type PotluckSource = 'host_added' | 'guest_added' | 'ai_suggested';
export type RsvpSource = 'form' | 'host_added' | 'imported';
export type SuggestionMode = 'manual_stub' | 'claude_api';

export interface Event {
  id: string;
  name: string;
  slug: string;
  date: string | null;          // ISO 8601
  venueName: string;
  venueAddress: string;
  venueMapUrl: string | null;
  hostPhone: string | null;     // E.164
  dressCode: string;
  description: string;
  coverPhotoUrl: string | null;
  isSurprise: boolean;
  isPublished: boolean;
  hostSecret: string;
  targetHeadcount: number | null;
  plusOnesMax: number | null;     // per-event cap on plus-ones (null → default)
  hideClaimerNames: boolean;      // when true, guests don't see who claimed what
  cancelled: boolean;
  // Host-defined category list for this event's Spread. Parsed from the
  // "Spread Categories" rich_text JSON on the Events DB; falls back to a
  // sensible default set when unset.
  spreadCategories: CategoryConfig[];
}

export interface Guest {
  id: string;
  name: string;
  phone: string;                 // E.164, primary key
  email: string | null;
  dietaryRestrictions: DietaryRestriction[];
  dietaryNotes: string;
  plusOnesAllowed: number;
}

export interface Rsvp {
  id: string;
  title: string;                 // = guest name
  eventId: string;
  guestId: string;
  status: RsvpStatus;
  plusOnes: number;
  respondedAt: string | null;
  notes: string;
  source: RsvpSource;
}

export interface PotluckItem {
  id: string;
  item: string;
  eventId: string;
  category: PotluckCategory;
  serves: number | null;        // guest-declared servings; what counts toward coverage
  hostEstimate: number | null;  // host's planning estimate; informational, never counts
  dietaryTags: PotluckDietaryTag[];
  claimedByGuestId: string | null;
  claimedAt: string | null;
  source: PotluckSource;
  notes: string;
}

export interface SuggestionRun {
  id: string;
  runLabel: string;
  eventId: string;
  runAt: string | null;
  mode: SuggestionMode;
  inputs: string;                // JSON
  suggestions: string;           // JSON
  hostAccepted: string;          // JSON
  hostRejected: string;          // JSON
  postPartyActual: string;       // JSON
  precisionDietary: number | null;
  recallDietary: number | null;
  notes: string;
}

// Smart Potluck suggestion structure (V2.0 stub + V2.1 LLM share this shape)
export interface PotluckSuggestion {
  category: PotluckCategory;
  itemName: string;
  dietaryTags: PotluckDietaryTag[];
  serves: number;
  rationale: string;
}

export interface SuggestionInputs {
  confirmedCount: number;
  maybeCount: number;
  plusOnesConfirmed: number;
  targetHeadcount: number;
  dietaryAggregate: Partial<Record<DietaryRestriction, number>>;
  currentClaimsByCategory: Record<PotluckCategory, number>;
}
