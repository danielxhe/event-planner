// Notion client + typed query helpers for V2 schema.
// All Notion reads/writes funnel through here so property names stay consistent.

import { Client } from '@notionhq/client';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

interface QueryResponse {
  results: PageObjectResponse[];
  next_cursor: string | null;
  has_more: boolean;
}
import { normalizePhone } from './phone';
import type {
  Event,
  Guest,
  Rsvp,
  PotluckItem,
  SuggestionRun,
  RsvpStatus,
  PotluckCategory,
  DietaryRestriction,
  PotluckDietaryTag,
  PotluckSource,
  RsvpSource,
  SuggestionMode,
} from './schema';

if (!process.env.NOTION_TOKEN) {
  // Don't throw at module load — Next.js may eval this during build.
  // Throw lazily when a function is actually called without a token.
}

export const notion = new Client({ auth: process.env.NOTION_TOKEN });

export const DSID = {
  events:      process.env.NOTION_EVENTS_DSID!,
  guests:      process.env.NOTION_GUESTS_DSID!,
  rsvps:       process.env.NOTION_RSVPS_DSID!,
  potluck:     process.env.NOTION_POTLUCK_DSID!,
  suggestions: process.env.NOTION_SUGGESTIONS_DSID!,
} as const;

// ---------- Property accessors (defensive against schema drift) ----------

type Page = PageObjectResponse;

function getTitle(p: Page, name: string): string {
  const prop = p.properties[name];
  if (prop?.type === 'title') return prop.title.map(t => t.plain_text).join('');
  return '';
}
function getRichText(p: Page, name: string): string {
  const prop = p.properties[name];
  if (prop?.type === 'rich_text') return prop.rich_text.map(t => t.plain_text).join('');
  return '';
}
function getCheckbox(p: Page, name: string): boolean {
  const prop = p.properties[name];
  return prop?.type === 'checkbox' ? prop.checkbox : false;
}
function getNumber(p: Page, name: string): number | null {
  const prop = p.properties[name];
  return prop?.type === 'number' ? prop.number : null;
}
function getPhone(p: Page, name: string): string | null {
  const prop = p.properties[name];
  return prop?.type === 'phone_number' ? prop.phone_number : null;
}
function getEmail(p: Page, name: string): string | null {
  const prop = p.properties[name];
  return prop?.type === 'email' ? prop.email : null;
}
function getUrl(p: Page, name: string): string | null {
  const prop = p.properties[name];
  return prop?.type === 'url' ? prop.url : null;
}
function getDate(p: Page, name: string): string | null {
  const prop = p.properties[name];
  return prop?.type === 'date' ? (prop.date?.start ?? null) : null;
}
function getSelect<T extends string>(p: Page, name: string, fallback: T): T {
  const prop = p.properties[name];
  if (prop?.type === 'select' && prop.select?.name) return prop.select.name as T;
  return fallback;
}
function getMultiSelect<T extends string>(p: Page, name: string): T[] {
  const prop = p.properties[name];
  if (prop?.type === 'multi_select') return prop.multi_select.map(o => o.name as T);
  return [];
}
function getRelationIds(p: Page, name: string): string[] {
  const prop = p.properties[name];
  if (prop?.type === 'relation') return prop.relation.map(r => r.id);
  return [];
}
function getFileUrl(p: Page, name: string): string | null {
  const prop = p.properties[name];
  if (prop?.type !== 'files' || prop.files.length === 0) return null;
  const f = prop.files[0];
  if (f.type === 'external') return f.external.url;
  if (f.type === 'file') return f.file.url;
  return null;
}

// ---------- Page → typed entity converters ----------

export function pageToEvent(p: Page): Event {
  return {
    id: p.id,
    name: getTitle(p, 'Name'),
    slug: getRichText(p, 'Slug'),
    date: getDate(p, 'Date'),
    venueName: getRichText(p, 'Venue Name'),
    venueAddress: getRichText(p, 'Venue Address'),
    venueMapUrl: getUrl(p, 'Venue Map URL'),
    hostPhone: getPhone(p, 'Host Phone'),
    dressCode: getRichText(p, 'Dress Code'),
    description: getRichText(p, 'Description'),
    coverPhotoUrl: getFileUrl(p, 'Cover Photo'),
    isSurprise: getCheckbox(p, 'Is Surprise'),
    isPublished: getCheckbox(p, 'Is Published'),
    hostSecret: getRichText(p, 'Host Secret'),
    targetHeadcount: getNumber(p, 'Target Headcount'),
    cancelled: getCheckbox(p, 'Cancelled'),
  };
}

export function pageToGuest(p: Page): Guest {
  return {
    id: p.id,
    name: getTitle(p, 'Name'),
    phone: getPhone(p, 'Phone') ?? '',
    email: getEmail(p, 'Email'),
    dietaryRestrictions: getMultiSelect<DietaryRestriction>(p, 'Dietary Restrictions'),
    dietaryNotes: getRichText(p, 'Dietary Notes'),
    plusOnesAllowed: getNumber(p, 'Plus-Ones Allowed') ?? 2,
  };
}

export function pageToRsvp(p: Page): Rsvp {
  return {
    id: p.id,
    title: getTitle(p, 'Title'),
    eventId: getRelationIds(p, 'Event')[0] ?? '',
    guestId: getRelationIds(p, 'Guest')[0] ?? '',
    status: getSelect<RsvpStatus>(p, 'Status', 'No Response'),
    plusOnes: getNumber(p, 'Plus-Ones') ?? 0,
    respondedAt: getDate(p, 'Responded At'),
    notes: getRichText(p, 'Notes'),
    source: getSelect<RsvpSource>(p, 'Source', 'form'),
  };
}

export function pageToPotluck(p: Page): PotluckItem {
  return {
    id: p.id,
    item: getTitle(p, 'Item'),
    eventId: getRelationIds(p, 'Event')[0] ?? '',
    category: getSelect<PotluckCategory>(p, 'Category', 'Main'),
    serves: getNumber(p, 'Serves'),
    dietaryTags: getMultiSelect<PotluckDietaryTag>(p, 'Dietary Tags'),
    claimedByGuestId: getRelationIds(p, 'Claimed By')[0] ?? null,
    claimedAt: getDate(p, 'Claimed At'),
    source: getSelect<PotluckSource>(p, 'Source', 'host_added'),
    notes: getRichText(p, 'Notes'),
  };
}

export function pageToSuggestionRun(p: Page): SuggestionRun {
  return {
    id: p.id,
    runLabel: getTitle(p, 'Run Label'),
    eventId: getRelationIds(p, 'Event')[0] ?? '',
    runAt: getDate(p, 'Run At'),
    mode: getSelect<SuggestionMode>(p, 'Mode', 'manual_stub'),
    inputs: getRichText(p, 'Inputs'),
    suggestions: getRichText(p, 'Suggestions'),
    hostAccepted: getRichText(p, 'Host Accepted'),
    hostRejected: getRichText(p, 'Host Rejected'),
    postPartyActual: getRichText(p, 'Post-Party Actual'),
    precisionDietary: getNumber(p, 'Precision Dietary'),
    recallDietary: getNumber(p, 'Recall Dietary'),
    notes: getRichText(p, 'Notes'),
  };
}

// ---------- Queries ----------

// Notion's newer SDK exposes data sources via dataSources.query.
// If the SDK version doesn't expose it directly, fall back to fetch.
// cache: 'no-store' — dedup lookups (findGuestByPhone, findRsvp) need
// read-after-write; a stale "not found" answer produces duplicate rows.
async function queryDS(dsId: string, body: Record<string, unknown> = {}): Promise<QueryResponse> {
  const res = await fetch(`https://api.notion.com/v1/data_sources/${dsId}/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      'Notion-Version': '2025-09-03',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Notion query failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function findEventBySlug(slug: string): Promise<Event | null> {
  const res = await queryDS(DSID.events, {
    filter: { property: 'Slug', rich_text: { equals: slug } },
    page_size: 1,
  });
  const page = res.results[0];
  return page ? pageToEvent(page) : null;
}

export async function findGuestByPhone(phoneRaw: string): Promise<Guest | null> {
  const phone = normalizePhone(phoneRaw);
  if (!phone) return null;
  const res = await queryDS(DSID.guests, {
    filter: { property: 'Phone', phone_number: { equals: phone } },
    page_size: 1,
  });
  const page = res.results[0];
  return page ? pageToGuest(page) : null;
}

export async function listRsvpsByEvent(eventId: string): Promise<Rsvp[]> {
  const res = await queryDS(DSID.rsvps, {
    filter: { property: 'Event', relation: { contains: eventId } },
    page_size: 100,
  });
  return res.results.map(pageToRsvp);
}

export async function listPotluckByEvent(eventId: string): Promise<PotluckItem[]> {
  const res = await queryDS(DSID.potluck, {
    filter: { property: 'Event', relation: { contains: eventId } },
    page_size: 100,
  });
  return res.results.map(pageToPotluck);
}

export async function findRsvp(eventId: string, guestId: string): Promise<Rsvp | null> {
  const res = await queryDS(DSID.rsvps, {
    filter: {
      and: [
        { property: 'Event', relation: { contains: eventId } },
        { property: 'Guest', relation: { contains: guestId } },
      ],
    },
    page_size: 1,
  });
  const page = res.results[0];
  return page ? pageToRsvp(page) : null;
}

export async function getPotluckItem(itemId: string): Promise<PotluckItem | null> {
  const res = await fetch(`https://api.notion.com/v1/pages/${itemId}`, {
    headers: {
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      'Notion-Version': '2025-09-03',
    },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const page = (await res.json()) as PageObjectResponse;
  return pageToPotluck(page);
}

// ---------- Writes ----------

async function notionRequest(method: string, path: string, body?: unknown): Promise<PageObjectResponse> {
  const res = await fetch(`https://api.notion.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      'Notion-Version': '2025-09-03',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Notion ${method} ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export interface UpsertGuestInput {
  phoneRaw: string;
  name: string;
  email?: string;
  dietaryRestrictions?: DietaryRestriction[];
  dietaryNotes?: string;
}

export async function upsertGuestByPhone(input: UpsertGuestInput): Promise<Guest> {
  const phone = normalizePhone(input.phoneRaw);
  if (!phone) throw new Error('Invalid phone number');

  const existing = await findGuestByPhone(phone);
  if (existing) {
    const patch: Record<string, unknown> = {};
    // Name and dietary are guest-owned — they overwrite. Email stays
    // blank-fill-only because hosts often curate it in Notion.
    if (input.name && input.name !== existing.name) {
      patch['Name'] = { title: [{ text: { content: input.name } }] };
    }
    if (input.email && !existing.email) patch['Email'] = { email: input.email };
    if (input.dietaryRestrictions !== undefined) {
      patch['Dietary Restrictions'] = {
        multi_select: input.dietaryRestrictions.map(n => ({ name: n })),
      };
    }
    if (input.dietaryNotes !== undefined) {
      patch['Dietary Notes'] = {
        rich_text: input.dietaryNotes ? [{ text: { content: input.dietaryNotes } }] : [],
      };
    }
    if (Object.keys(patch).length > 0) {
      await notionRequest('PATCH', `/v1/pages/${existing.id}`, { properties: patch });
    }
    return {
      ...existing,
      name: input.name || existing.name,
      dietaryRestrictions: input.dietaryRestrictions ?? existing.dietaryRestrictions,
      dietaryNotes: input.dietaryNotes ?? existing.dietaryNotes,
    };
  }

  const created = await notionRequest('POST', '/v1/pages', {
    parent: { type: 'data_source_id', data_source_id: DSID.guests },
    properties: {
      Name: { title: [{ text: { content: input.name || phone } }] },
      Phone: { phone_number: phone },
      ...(input.email ? { Email: { email: input.email } } : {}),
      ...(input.dietaryRestrictions && input.dietaryRestrictions.length > 0
        ? { 'Dietary Restrictions': { multi_select: input.dietaryRestrictions.map(n => ({ name: n })) } }
        : {}),
      ...(input.dietaryNotes
        ? { 'Dietary Notes': { rich_text: [{ text: { content: input.dietaryNotes } }] } }
        : {}),
      'Plus-Ones Allowed': { number: 2 },
    },
  });
  return pageToGuest(created);
}

export interface UpsertRsvpInput {
  eventId: string;
  guestId: string;
  guestName: string;
  status: 'Yes' | 'Maybe' | 'No' | 'No Response';
  plusOnes: number;
  notes?: string;
  source?: 'form' | 'host_added' | 'imported';
}

export async function upsertRsvp(input: UpsertRsvpInput): Promise<Rsvp> {
  const existing = await findRsvp(input.eventId, input.guestId);
  const props: Record<string, unknown> = {
    Title: { title: [{ text: { content: input.guestName } }] },
    Status: { select: { name: input.status } },
    'Plus-Ones': { number: input.plusOnes },
    'Responded At': { date: { start: new Date().toISOString() } },
    Source: { select: { name: input.source ?? 'form' } },
    ...(input.notes ? { Notes: { rich_text: [{ text: { content: input.notes } }] } } : {}),
  };
  if (existing) {
    const updated = await notionRequest('PATCH', `/v1/pages/${existing.id}`, { properties: props });
    return pageToRsvp(updated);
  }
  const created = await notionRequest('POST', '/v1/pages', {
    parent: { type: 'data_source_id', data_source_id: DSID.rsvps },
    properties: {
      ...props,
      Event: { relation: [{ id: input.eventId }] },
      Guest: { relation: [{ id: input.guestId }] },
    },
  });
  return pageToRsvp(created);
}

export async function claimPotluckAtomic(itemId: string, guestId: string): Promise<PotluckItem> {
  const current = await getPotluckItem(itemId);
  if (!current) throw new Error('Item not found');
  if (current.claimedByGuestId && current.claimedByGuestId !== guestId) {
    throw new Error('Already claimed by someone else');
  }
  const updated = await notionRequest('PATCH', `/v1/pages/${itemId}`, {
    properties: {
      'Claimed By': { relation: [{ id: guestId }] },
      'Claimed At': { date: { start: new Date().toISOString() } },
    },
  });
  return pageToPotluck(updated);
}

export async function unclaimPotluck(itemId: string, guestId: string): Promise<PotluckItem> {
  const current = await getPotluckItem(itemId);
  if (!current) throw new Error('Item not found');
  if (current.claimedByGuestId !== guestId) {
    throw new Error('You did not claim this item');
  }
  const updated = await notionRequest('PATCH', `/v1/pages/${itemId}`, {
    properties: {
      'Claimed By': { relation: [] },
      'Claimed At': { date: null },
    },
  });
  return pageToPotluck(updated);
}

export interface CreatePotluckInput {
  eventId: string;
  item: string;
  category: 'Appetizer' | 'Main' | 'Side' | 'Dessert' | 'Drinks' | 'Supplies';
  serves?: number;
  dietaryTags?: string[];
  source: 'host_added' | 'guest_added' | 'ai_suggested';
  notes?: string;
}

export async function createPotluckItem(input: CreatePotluckInput): Promise<PotluckItem> {
  const created = await notionRequest('POST', '/v1/pages', {
    parent: { type: 'data_source_id', data_source_id: DSID.potluck },
    properties: {
      Item: { title: [{ text: { content: input.item } }] },
      Event: { relation: [{ id: input.eventId }] },
      Category: { select: { name: input.category } },
      Source: { select: { name: input.source } },
      ...(input.serves != null ? { Serves: { number: input.serves } } : {}),
      ...(input.dietaryTags && input.dietaryTags.length > 0
        ? { 'Dietary Tags': { multi_select: input.dietaryTags.map(n => ({ name: n })) } }
        : {}),
      ...(input.notes ? { Notes: { rich_text: [{ text: { content: input.notes } }] } } : {}),
    },
  });
  return pageToPotluck(created);
}

export interface CreateSuggestionRunInput {
  eventId: string;
  runLabel: string;
  mode: 'manual_stub' | 'claude_api';
  inputs: unknown;
  suggestions: unknown;
  hostAccepted?: unknown;
  hostRejected?: unknown;
  notes?: string;
}

export async function createSuggestionRun(input: CreateSuggestionRunInput): Promise<SuggestionRun> {
  const props: Record<string, unknown> = {
    'Run Label': { title: [{ text: { content: input.runLabel } }] },
    Event: { relation: [{ id: input.eventId }] },
    'Run At': { date: { start: new Date().toISOString() } },
    Mode: { select: { name: input.mode } },
    Inputs: { rich_text: [{ text: { content: JSON.stringify(input.inputs).slice(0, 2000) } }] },
    Suggestions: {
      rich_text: [{ text: { content: JSON.stringify(input.suggestions).slice(0, 2000) } }],
    },
  };
  if (input.hostAccepted) {
    props['Host Accepted'] = {
      rich_text: [{ text: { content: JSON.stringify(input.hostAccepted).slice(0, 2000) } }],
    };
  }
  if (input.hostRejected) {
    props['Host Rejected'] = {
      rich_text: [{ text: { content: JSON.stringify(input.hostRejected).slice(0, 2000) } }],
    };
  }
  if (input.notes) {
    props['Notes'] = { rich_text: [{ text: { content: input.notes } }] };
  }
  const created = await notionRequest('POST', '/v1/pages', {
    parent: { type: 'data_source_id', data_source_id: DSID.suggestions },
    properties: props,
  });
  return pageToSuggestionRun(created);
}
