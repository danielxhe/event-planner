// Smart Potluck Phase 2 — the live AI suggester.
// Provider is resolved from env at call time: GEMINI_API_KEY wins (free tier),
// else ANTHROPIC_API_KEY. Both providers share the same system prompt, JSON
// contract, and post-processing, so the Suggestions Log scores them identically.
// Same input/output contract as the Phase 1 manual stub, so every Phase 1 log
// row remains a valid eval case for scoring this implementation.

import Anthropic from '@anthropic-ai/sdk';
import type {
  DietaryRestriction,
  Event,
  Guest,
  PotluckDietaryTag,
  PotluckItem,
  PotluckSuggestion,
  Rsvp,
} from './schema';
import {
  computeCategoryStats,
  effectivePotluck,
  estimatedHeadcountFromRsvps,
} from './categories';

const DIETARY_TAGS: PotluckDietaryTag[] = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Nut-Free', 'Dairy-Free',
];

// Everything the model (or the Phase 1 host) sees at run time. Snapshotted to
// the Suggestions Log so runs are reproducible and scorable after the party.
export interface SuggestionContext {
  event: {
    name: string;
    date: string | null;
    description: string;
    targetHeadcount: number | null;
  };
  headcount: {
    yes: number;
    maybe: number;
    plusOnes: number;
    estimated: number | null;
  };
  dietary: {
    counts: Partial<Record<DietaryRestriction, number>>;
    notes: string[];
  };
  categories: {
    name: string;
    target: number | null;
    claimedServings: number;
    gap: number;
    items: { name: string; serves: number | null; claimed: boolean; dietaryTags: PotluckDietaryTag[] }[];
  }[];
}

export function buildSuggestionContext(
  event: Event,
  rsvps: Rsvp[],
  guests: Guest[],
  potluck: PotluckItem[],
): SuggestionContext {
  const attending = rsvps.filter(r => r.status === 'Yes' || r.status === 'Maybe');
  const attendingGuestIds = new Set(attending.map(r => r.guestId));
  const attendingGuests = guests.filter(g => attendingGuestIds.has(g.id));

  const counts: Partial<Record<DietaryRestriction, number>> = {};
  const notes: string[] = [];
  for (const g of attendingGuests) {
    for (const d of g.dietaryRestrictions) counts[d] = (counts[d] ?? 0) + 1;
    if (g.dietaryNotes.trim()) notes.push(g.dietaryNotes.trim());
  }

  const estimated = estimatedHeadcountFromRsvps(rsvps, event.targetHeadcount);
  const stats = computeCategoryStats(potluck, event.spreadCategories, estimated);

  const yes = rsvps.filter(r => r.status === 'Yes');
  const maybe = rsvps.filter(r => r.status === 'Maybe');

  return {
    event: {
      name: event.name,
      date: event.date,
      description: event.description,
      targetHeadcount: event.targetHeadcount,
    },
    headcount: {
      yes: yes.length,
      maybe: maybe.length,
      plusOnes: yes.reduce((s, r) => s + (r.plusOnes ?? 0), 0),
      estimated,
    },
    dietary: { counts, notes },
    categories: stats.map(s => ({
      name: s.name,
      target: s.target,
      claimedServings: s.claimed,
      gap: s.gap,
      items: potluck
        .map(effectivePotluck)
        .filter(e => e.category === s.name)
        .map(e => ({
          name: e.item,
          serves: e.serves,
          claimed: e.isClaimed,
          dietaryTags: e.dietaryTags,
        })),
    })),
  };
}

// System prompt is static so repeated runs share a cached prefix; all
// per-event context travels in the user message.
const SYSTEM_PROMPT = `You are Spread's potluck planner. Given a party's live RSVP, dietary, and dish-signup state, suggest specific dishes guests could bring.

Rules, in priority order:
1. Dietary safety first. Anyone with a restriction must have real food they can eat, not just sides. If a restriction appears in the counts or notes, at least one substantial suggestion must accommodate it, and never suggest a dish whose named ingredients violate a listed restriction while tagging it as safe for that restriction. Only apply a dietary tag when the dish as normally prepared genuinely qualifies.
2. Fill the gaps. Weight suggestions toward categories with the largest serving gaps. Do not suggest into a category that is already covered unless every category is covered.
3. Be potluck-realistic. Suggest dishes a normal guest can make or buy, transport at room temperature or in one cooler, and serve without a full kitchen. No dishes that must be plated to order or come out of the oven at serving time.
4. No duplicates. Do not suggest anything that substantially overlaps an existing item on the list.
5. Match the vibe. If the event description implies a theme or cuisine, lean into it; otherwise stay crowd-pleasing.
6. Right-size servings. "serves" is servings of that category, consistent with the category targets you are shown. Typical single-guest dishes serve 4 to 12.

Give each suggestion a one-sentence rationale a host would actually find useful: which gap or which guests it covers. Suggest 3 to 6 dishes unless the gaps clearly justify more.`;

function suggestionSchema(categoryNames: string[]) {
  return {
    type: 'object',
    properties: {
      suggestions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            category: { type: 'string', enum: categoryNames },
            itemName: { type: 'string' },
            serves: { type: 'integer' },
            dietaryTags: {
              type: 'array',
              items: { type: 'string', enum: DIETARY_TAGS },
            },
            rationale: { type: 'string' },
          },
          required: ['category', 'itemName', 'serves', 'dietaryTags', 'rationale'],
          additionalProperties: false,
        },
      },
    },
    required: ['suggestions'],
    additionalProperties: false,
  };
}

// Retryable provider outage (rate limit / overload) — the route maps this to a
// 503 "busy" response instead of a hard failure.
export class SuggestionServiceBusyError extends Error {}

export interface GenerationResult {
  suggestions: PotluckSuggestion[];
  model: string;
}

// Keys arrive via dashboards, pipes, and copy-paste — strip BOM and stray
// whitespace or the HTTP header rejects them (seen live: piping a key into
// `vercel env add` on Windows prepended U+FEFF and every call 502'd).
function cleanKey(raw: string | undefined): string {
  return (raw ?? '').replace(/^\uFEFF/, '').trim();
}

export async function generateSuggestions(
  context: SuggestionContext,
): Promise<GenerationResult> {
  const categoryNames = context.categories.map(c => c.name);
  const userMessage = `Current party state:\n${JSON.stringify(context, null, 2)}`;

  const geminiKey = cleanKey(process.env.GEMINI_API_KEY);
  const anthropicKey = cleanKey(process.env.ANTHROPIC_API_KEY);
  if (geminiKey) return generateWithGemini(userMessage, categoryNames, geminiKey);
  if (anthropicKey) return generateWithClaude(userMessage, categoryNames, anthropicKey);
  throw new Error(
    'No AI provider configured: set GEMINI_API_KEY (free at aistudio.google.com) or ANTHROPIC_API_KEY in .env.local',
  );
}

// Belt-and-suspenders: clamp servings and drop empty names even though the
// schemas should prevent both.
function postProcess(suggestions: PotluckSuggestion[]): PotluckSuggestion[] {
  return suggestions
    .filter(s => s.itemName.trim().length > 0)
    .map(s => ({ ...s, serves: Math.min(Math.max(Math.round(s.serves), 1), 100) }));
}

// ----- Gemini (REST, no SDK — mirrors the raw-fetch Notion client pattern) ---

// 'gemini-flash-latest' tracks Google's current stable Flash model — older
// pinned IDs (e.g. gemini-2.5-flash) get retired for new accounts.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';

// Gemini's responseSchema is an OpenAPI-style subset (uppercase type enums, no
// additionalProperties) — same contract as suggestionSchema below.
function geminiSuggestionSchema(categoryNames: string[]) {
  return {
    type: 'OBJECT',
    properties: {
      suggestions: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            category: { type: 'STRING', enum: categoryNames },
            itemName: { type: 'STRING' },
            serves: { type: 'INTEGER' },
            dietaryTags: {
              type: 'ARRAY',
              items: { type: 'STRING', enum: DIETARY_TAGS },
            },
            rationale: { type: 'STRING' },
          },
          required: ['category', 'itemName', 'serves', 'dietaryTags', 'rationale'],
          propertyOrdering: ['category', 'itemName', 'serves', 'dietaryTags', 'rationale'],
        },
      },
    },
    required: ['suggestions'],
  };
}

async function generateWithGemini(
  userMessage: string,
  categoryNames: string[],
  apiKey: string,
): Promise<GenerationResult> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: geminiSuggestionSchema(categoryNames),
        },
      }),
    },
  );

  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 500);
    if (res.status === 429 || res.status >= 500) {
      throw new SuggestionServiceBusyError(`Gemini ${res.status}: ${detail}`);
    }
    throw new Error(`Gemini ${res.status}: ${detail}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
    promptFeedback?: { blockReason?: string };
  };
  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('') ?? '';
  if (!text) {
    throw new Error(
      `Gemini returned no text (blockReason: ${data.promptFeedback?.blockReason ?? 'none'}, ` +
        `finishReason: ${data.candidates?.[0]?.finishReason ?? 'none'})`,
    );
  }
  const parsed = JSON.parse(text) as { suggestions: PotluckSuggestion[] };
  return { suggestions: postProcess(parsed.suggestions), model: GEMINI_MODEL };
}

// ----- Claude ----------------------------------------------------------------

async function generateWithClaude(
  userMessage: string,
  categoryNames: string[],
  apiKey: string,
): Promise<GenerationResult> {
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
    output_config: {
      effort: 'medium',
      format: { type: 'json_schema', schema: suggestionSchema(categoryNames) },
    },
  } as Anthropic.MessageCreateParamsNonStreaming);

  const text = response.content.find(b => b.type === 'text');
  if (!text || text.type !== 'text') throw new Error('No text block in model response');
  const parsed = JSON.parse(text.text) as { suggestions: PotluckSuggestion[] };
  return { suggestions: postProcess(parsed.suggestions), model: 'claude-opus-4-8' };
}

// ---------------------------------------------------------------------------
// Deterministic allergen guardrail.
//
// The published failure mode of LLM meal tools is exactly this: an allergen
// slipping through with a wrong safety label (e.g. almond milk in a "nut-free"
// plan — PubMed 37269717). So the model proposes, and a rule layer vetoes: if
// a dish NAME names an ingredient that contradicts one of its own dietary
// tags, the tag is stripped. Conservative by design — a stripped tag means
// "unverified", never "unsafe dish removed". The dish stays; only the safety
// claim is withdrawn, and the action is logged for the eval trail.
// ---------------------------------------------------------------------------

const TAG_VIOLATIONS: Record<PotluckDietaryTag, string[]> = {
  'Nut-Free': [
    'peanut', 'almond', 'cashew', 'walnut', 'pecan', 'pistachio', 'hazelnut',
    'macadamia', 'nutella', 'praline', 'marzipan', 'pine nut', 'pesto', 'baklava',
  ],
  'Vegan': [
    'chicken', 'beef', 'pork', 'bacon', 'ham', 'turkey', 'fish', 'salmon', 'tuna',
    'shrimp', 'crab', 'lamb', 'meatball', 'sausage', 'pepperoni', 'chorizo',
    'prosciutto', 'anchov', 'cheese', 'milk', 'cream', 'butter', 'yogurt', 'egg',
    'honey', 'gelatin', 'custard', 'aioli', 'alfredo', 'queso', 'brisket', 'sliders',
  ],
  'Vegetarian': [
    'chicken', 'beef', 'pork', 'bacon', 'ham', 'turkey', 'fish', 'salmon', 'tuna',
    'shrimp', 'crab', 'lamb', 'meatball', 'sausage', 'pepperoni', 'chorizo',
    'prosciutto', 'anchov', 'gelatin', 'brisket',
  ],
  'Dairy-Free': [
    'cheese', 'milk', 'cream', 'butter', 'yogurt', 'alfredo', 'queso', 'ricotta',
    'mozzarella', 'parmesan', 'brie', 'feta', 'buttermilk', 'custard', 'tzatziki',
  ],
  'Gluten-Free': [
    'bread', 'pasta', 'noodle', 'wheat', 'cracker', 'cookie', 'cake', 'pie',
    'brownie', 'pretzel', 'couscous', 'orzo', 'dumpling', 'breaded', 'baguette',
    'bun', 'sandwich', 'wrap', 'pizza', 'mac and cheese', 'lasagna',
  ],
};

// "Gluten-free pasta salad" is a legitimate GF claim — an explicit qualifier in
// the name overrides the keyword match for that tag.
const TAG_QUALIFIERS: Record<PotluckDietaryTag, string[]> = {
  'Nut-Free': ['nut-free', 'nut free'],
  'Vegan': ['vegan'],
  'Vegetarian': ['vegetarian', 'veggie', 'vegan'],
  'Dairy-Free': ['dairy-free', 'dairy free', 'vegan'],
  'Gluten-Free': ['gluten-free', 'gluten free', 'gf '],
};

export function applyAllergenGuardrail(
  suggestions: PotluckSuggestion[],
): { suggestions: PotluckSuggestion[]; actions: string[] } {
  const actions: string[] = [];
  const vetted = suggestions.map(s => {
    const name = ` ${s.itemName.toLowerCase()} `;
    const keptTags = s.dietaryTags.filter(tag => {
      const qualified = TAG_QUALIFIERS[tag]?.some(q => name.includes(q));
      if (qualified) return true;
      const hit = TAG_VIOLATIONS[tag]?.find(w => name.includes(w));
      if (hit) {
        actions.push(`guardrail: stripped "${tag}" from "${s.itemName}" (name mentions "${hit}")`);
        return false;
      }
      return true;
    });
    return keptTags.length === s.dietaryTags.length ? s : { ...s, dietaryTags: keptTags };
  });
  return { suggestions: vetted, actions };
}
