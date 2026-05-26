// TypeScript types that mirror the V2 Notion schema.
// Property names match Notion exactly — do not rename without updating Notion.

export type RsvpStatus = 'Yes' | 'Maybe' | 'No' | 'No Response';
export type PotluckCategory = 'Appetizer' | 'Main' | 'Side' | 'Dessert' | 'Drinks' | 'Supplies';
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
  cancelled: boolean;
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
  serves: number | null;
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
