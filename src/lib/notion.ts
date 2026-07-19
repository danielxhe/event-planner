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
import { DEFAULT_SPREAD_CATEGORIES } from './categories';
import type {
  Event,
  Guest,
  Rsvp,
  PotluckItem,
  SuggestionRun,
  RsvpStatus,
  PotluckCategory,
  CategoryConfig,
  DietaryRestriction,
  PotluckDietaryTag,
  HostOverride,
  PotluckSource,
  RsvpSource,
  SuggestionMode,
} from './schema';

function parseSpreadCategories(raw: string): CategoryConfig[] {
  if (!raw || !raw.trim()) return DEFAULT_SPREAD_CATEGORIES;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_SPREAD_CATEGORIES;
    const cleaned = parsed
      .filter((c): c is { id?: unknown; name: string; target?: unknown; perGuest?: unknown } =>
        !!c && typeof (c as { name?: unknown }).name === 'string')
      .map(c => ({
        id: typeof c.id === 'string' && c.id ? c.id : `cat-${Math.random().toString(36).slice(2, 10)}`,
        name: String(c.name).slice(0, 40),
        target: typeof c.target === 'number' ? c.target : null,
        perGuest: typeof c.perGuest === 'number' ? c.perGuest : null,
      }));
    return cleaned.length > 0 ? cleaned : DEFAULT_SPREAD_CATEGORIES;
  } catch {
    return DEFAULT_SPREAD_CATEGORIES;
  }
}

const VALID_DIETARY_TAGS: PotluckDietaryTag[] = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Nut-Free', 'Dairy-Free'];

// Parse the "Host Override" rich_text JSON blob defensively. Returns null when
// empty/invalid or when no field carries a meaningful value.
function parseHostOverride(raw: string): HostOverride | null {
  if (!raw || !raw.trim()) return null;
  try {
    const p: unknown = JSON.parse(raw);
    if (!p || typeof p !== 'object') return null;
    const o = p as Record<string, unknown>;
    const out: HostOverride = {};
    if (typeof o.item === 'string' && o.item.trim()) out.item = o.item.trim().slice(0, 80);
    if (typeof o.category === 'string' && o.category.trim()) out.category = o.category.trim().slice(0, 40);
    if (typeof o.claimer === 'string' && o.claimer.trim()) out.claimer = o.claimer.trim().slice(0, 80);
    if (typeof o.serves === 'number' && Number.isFinite(o.serves)) out.serves = o.serves;
    if (Array.isArray(o.dietaryTags)) {
      out.dietaryTags = o.dietaryTags.filter(
        (t): t is PotluckDietaryTag => typeof t === 'string' && VALID_DIETARY_TAGS.includes(t as PotluckDietaryTag)
      );
    }
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return null;
  }
}

const textProp = (s: string) => (s ? [{ text: { content: s } }] : []);

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
    plusOnesMax: getNumber(p, 'Plus-Ones Max'),
    hideClaimerNames: getCheckbox(p, 'Hide Claimer Names'),
    cancelled: getCheckbox(p, 'Cancelled'),
    spreadCategories: parseSpreadCategories(getRichText(p, 'Spread Categories')),
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
    hostEstimate: getNumber(p, 'Host Estimate'),
    dietaryTags: getMultiSelect<PotluckDietaryTag>(p, 'Dietary Tags'),
    claimedByGuestId: getRelationIds(p, 'Claimed By')[0] ?? null,
    claimedAt: getDate(p, 'Claimed At'),
    source: getSelect<PotluckSource>(p, 'Source', 'host_added'),
    notes: getRichText(p, 'Notes'),
    hostOverride: parseHostOverride(getRichText(p, 'Host Override')),
    showHostValue: getCheckbox(p, 'Show Host Value'),
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
// Notion's public API caps an integration at ~3 req/s. Under a burst (many
// guests opening the invite at once) it returns 429, which without a retry
// surfaces as a 500 on the guest page. Retry a few times honoring Retry-After,
// with capped backoff.
async function fetchWithRetry(url: string, init: RequestInit, tries = 3): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, init);
    if (res.status !== 429 || attempt >= tries - 1) return res;
    const ra = Number(res.headers.get('Retry-After'));
    const waitMs =
      Number.isFinite(ra) && ra > 0 ? Math.min(ra * 1000, 5000) : Math.min(300 * 2 ** attempt, 2000);
    await new Promise(r => setTimeout(r, waitMs));
  }
}

async function queryDS(dsId: string, body: Record<string, unknown> = {}): Promise<QueryResponse> {
  const res = await fetchWithRetry(`https://api.notion.com/v1/data_sources/${dsId}/query`, {
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

export async function listGuestsByIds(ids: string[]): Promise<Guest[]> {
  if (ids.length === 0) return [];
  const results = await Promise.all(
    ids.map(async id => {
      const res = await fetchWithRetry(`https://api.notion.com/v1/pages/${id}`, {
        headers: {
          Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
          'Notion-Version': '2025-09-03',
        },
        cache: 'no-store',
      });
      if (!res.ok) return null;
      return pageToGuest((await res.json()) as PageObjectResponse);
    })
  );
  return results.filter((g): g is Guest => g !== null);
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
  const res = await fetchWithRetry(`https://api.notion.com/v1/pages/${itemId}`, {
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
  const res = await fetchWithRetry(`https://api.notion.com${path}`, {
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

export async function getRsvp(id: string): Promise<Rsvp | null> {
  const res = await fetchWithRetry(`https://api.notion.com/v1/pages/${id}`, {
    headers: { Authorization: `Bearer ${process.env.NOTION_TOKEN}`, 'Notion-Version': '2025-09-03' },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return pageToRsvp((await res.json()) as PageObjectResponse);
}

export interface HostUpdateRsvpInput {
  rsvpId: string;
  guestName?: string;
  status?: RsvpStatus;
  plusOnes?: number;
  notes?: string;
}

// Host edit of the event-specific RSVP row (status, plus-ones, notes, display name).
export async function hostUpdateRsvp(input: HostUpdateRsvpInput): Promise<Rsvp> {
  const props: Record<string, unknown> = {};
  if (input.guestName != null) props['Title'] = { title: [{ text: { content: input.guestName } }] };
  if (input.status != null) props['Status'] = { select: { name: input.status } };
  if (input.plusOnes != null) props['Plus-Ones'] = { number: input.plusOnes };
  if (input.notes !== undefined) {
    props['Notes'] = { rich_text: input.notes ? [{ text: { content: input.notes } }] : [] };
  }
  const updated = await notionRequest('PATCH', `/v1/pages/${input.rsvpId}`, { properties: props });
  return pageToRsvp(updated);
}

export interface HostUpdateGuestInput {
  guestId: string;
  name?: string;
  dietaryRestrictions?: DietaryRestriction[];
  dietaryNotes?: string;
}

// Host edit of the shared Guest record (name + dietary).
export async function hostUpdateGuest(input: HostUpdateGuestInput): Promise<Guest> {
  const props: Record<string, unknown> = {};
  if (input.name != null) props['Name'] = { title: [{ text: { content: input.name } }] };
  if (input.dietaryRestrictions !== undefined) {
    props['Dietary Restrictions'] = { multi_select: input.dietaryRestrictions.map(n => ({ name: n })) };
  }
  if (input.dietaryNotes !== undefined) {
    props['Dietary Notes'] = { rich_text: input.dietaryNotes ? [{ text: { content: input.dietaryNotes } }] : [] };
  }
  const updated = await notionRequest('PATCH', `/v1/pages/${input.guestId}`, { properties: props });
  return pageToGuest(updated);
}

export async function archiveRsvp(id: string): Promise<void> {
  await notionRequest('PATCH', `/v1/pages/${id}`, { archived: true });
}

// Release every potluck item this guest claimed for the event, so removing them
// frees their dishes back to open instead of stranding a claim by a ghost guest.
export async function releaseGuestClaims(
  eventId: string,
  guestId: string,
): Promise<{ count: number; itemNames: string[] }> {
  const res = await queryDS(DSID.potluck, {
    filter: {
      and: [
        { property: 'Event', relation: { contains: eventId } },
        { property: 'Claimed By', relation: { contains: guestId } },
      ],
    },
    page_size: 100,
  });
  await Promise.all(
    res.results.map(p =>
      notionRequest('PATCH', `/v1/pages/${p.id}`, {
        properties: { 'Claimed By': { relation: [] }, 'Claimed At': { date: null } },
      })
    )
  );
  return {
    count: res.results.length,
    itemNames: res.results.map(p => getTitle(p, 'Item')).filter(Boolean),
  };
}

export async function claimPotluckAtomic(
  itemId: string,
  guestId: string,
  servings?: number | null,
): Promise<PotluckItem> {
  const current = await getPotluckItem(itemId);
  if (!current) throw new Error('Item not found');
  if (current.claimedByGuestId && current.claimedByGuestId !== guestId) {
    throw new Error('Already claimed by someone else');
  }
  const properties: Record<string, unknown> = {
    'Claimed By': { relation: [{ id: guestId }] },
    'Claimed At': { date: { start: new Date().toISOString() } },
  };
  // The claiming guest declares how many servings they're bringing; that's what
  // counts toward coverage (the host's estimate never does).
  if (servings != null) properties['Serves'] = { number: servings };
  const updated = await notionRequest('PATCH', `/v1/pages/${itemId}`, { properties });
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

export interface UpdatePotluckInput {
  itemId: string;
  item?: string;
  category?: string;
  serves?: number | null;
  dietaryTags?: string[];
}

export async function updatePotluckItem(input: UpdatePotluckInput): Promise<PotluckItem> {
  const props: Record<string, unknown> = {};
  if (input.item != null) props['Item'] = { title: [{ text: { content: input.item } }] };
  if (input.category != null) props['Category'] = { select: { name: input.category } };
  if (input.serves !== undefined) props['Serves'] = { number: input.serves };
  if (input.dietaryTags != null) {
    props['Dietary Tags'] = { multi_select: input.dietaryTags.map(n => ({ name: n })) };
  }
  const updated = await notionRequest('PATCH', `/v1/pages/${input.itemId}`, { properties: props });
  return pageToPotluck(updated);
}

export interface SetHostOverrideInput {
  itemId: string;
  override: HostOverride | null;   // null clears the override entirely
  showHostValue: boolean;
}

// Writes (or clears) the host override JSON and the visibility toggle. The
// guest's own fields are never touched here.
export async function setPotluckHostOverride(input: SetHostOverrideInput): Promise<PotluckItem> {
  const hasOverride = input.override && Object.keys(input.override).length > 0;
  const json = hasOverride ? JSON.stringify(input.override) : '';
  const updated = await notionRequest('PATCH', `/v1/pages/${input.itemId}`, {
    properties: {
      'Host Override': { rich_text: json ? [{ text: { content: json.slice(0, 2000) } }] : [] },
      // Visibility can only be on if there's actually something to show.
      'Show Host Value': { checkbox: hasOverride ? input.showHostValue : false },
    },
  });
  return pageToPotluck(updated);
}

export interface UpdateEventInput {
  eventId: string;
  name?: string;
  date?: string | null;
  venueName?: string;
  venueAddress?: string;
  venueMapUrl?: string | null;
  hostPhone?: string | null;
  dressCode?: string;
  description?: string;
  targetHeadcount?: number | null;
  plusOnesMax?: number | null;
  isPublished?: boolean;
  isSurprise?: boolean;
  hideClaimerNames?: boolean;
}

export async function updateEvent(input: UpdateEventInput): Promise<Event> {
  const props: Record<string, unknown> = {};
  if (input.name != null) props['Name'] = { title: [{ text: { content: input.name } }] };
  if (input.date !== undefined) props['Date'] = input.date ? { date: { start: input.date } } : { date: null };
  if (input.venueName != null) props['Venue Name'] = { rich_text: textProp(input.venueName) };
  if (input.venueAddress != null) props['Venue Address'] = { rich_text: textProp(input.venueAddress) };
  if (input.venueMapUrl !== undefined) props['Venue Map URL'] = { url: input.venueMapUrl || null };
  if (input.hostPhone !== undefined) props['Host Phone'] = { phone_number: input.hostPhone || null };
  if (input.dressCode != null) props['Dress Code'] = { rich_text: textProp(input.dressCode) };
  if (input.description != null) props['Description'] = { rich_text: textProp(input.description) };
  if (input.targetHeadcount !== undefined) props['Target Headcount'] = { number: input.targetHeadcount };
  if (input.plusOnesMax !== undefined) props['Plus-Ones Max'] = { number: input.plusOnesMax };
  if (input.isPublished != null) props['Is Published'] = { checkbox: input.isPublished };
  if (input.isSurprise != null) props['Is Surprise'] = { checkbox: input.isSurprise };
  if (input.hideClaimerNames != null) props['Hide Claimer Names'] = { checkbox: input.hideClaimerNames };
  const updated = await notionRequest('PATCH', `/v1/pages/${input.eventId}`, { properties: props });
  return pageToEvent(updated);
}

export async function updateEventCategories(eventId: string, categories: CategoryConfig[]): Promise<Event> {
  const json = JSON.stringify(categories);
  const updated = await notionRequest('PATCH', `/v1/pages/${eventId}`, {
    properties: { 'Spread Categories': { rich_text: [{ text: { content: json.slice(0, 2000) } }] } },
  });
  return pageToEvent(updated);
}

export interface CreatePotluckInput {
  eventId: string;
  item: string;
  category: string;
  serves?: number;            // guest-declared (guest_added flow)
  hostEstimate?: number;      // host/AI planning estimate (host_added, ai_suggested)
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
      ...(input.hostEstimate != null ? { 'Host Estimate': { number: input.hostEstimate } } : {}),
      ...(input.dietaryTags && input.dietaryTags.length > 0
        ? { 'Dietary Tags': { multi_select: input.dietaryTags.map(n => ({ name: n })) } }
        : {}),
      ...(input.notes ? { Notes: { rich_text: [{ text: { content: input.notes } }] } } : {}),
    },
  });
  return pageToPotluck(created);
}

export async function archivePotluckItem(id: string): Promise<void> {
  await notionRequest('PATCH', `/v1/pages/${id}`, { archived: true });
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

// Notion caps each rich_text text object at 2000 chars, but allows multiple
// objects per property. Chunk instead of slicing so logged JSON stays parseable
// (the Suggestions Log is the eval dataset — truncation corrupts it).
function jsonRichText(value: unknown) {
  const s = JSON.stringify(value);
  const chunks: { text: { content: string } }[] = [];
  for (let i = 0; i < s.length && chunks.length < 100; i += 2000) {
    chunks.push({ text: { content: s.slice(i, i + 2000) } });
  }
  return { rich_text: chunks };
}

export async function createSuggestionRun(input: CreateSuggestionRunInput): Promise<SuggestionRun> {
  const props: Record<string, unknown> = {
    'Run Label': { title: [{ text: { content: input.runLabel } }] },
    Event: { relation: [{ id: input.eventId }] },
    'Run At': { date: { start: new Date().toISOString() } },
    Mode: { select: { name: input.mode } },
    Inputs: jsonRichText(input.inputs),
    Suggestions: jsonRichText(input.suggestions),
  };
  if (input.hostAccepted) {
    props['Host Accepted'] = jsonRichText(input.hostAccepted);
  }
  if (input.hostRejected) {
    props['Host Rejected'] = jsonRichText(input.hostRejected);
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

// Record the host's review verdict on a suggestion run (Phase 2 accept/reject).
export async function updateSuggestionRun(
  id: string,
  patch: { hostAccepted?: unknown; hostRejected?: unknown; notes?: string }
): Promise<void> {
  const props: Record<string, unknown> = {};
  if (patch.hostAccepted !== undefined) {
    props['Host Accepted'] = jsonRichText(patch.hostAccepted);
  }
  if (patch.hostRejected !== undefined) {
    props['Host Rejected'] = jsonRichText(patch.hostRejected);
  }
  if (patch.notes) {
    props['Notes'] = { rich_text: [{ text: { content: patch.notes } }] };
  }
  if (Object.keys(props).length === 0) return;
  await notionRequest('PATCH', `/v1/pages/${id}`, { properties: props });
}
