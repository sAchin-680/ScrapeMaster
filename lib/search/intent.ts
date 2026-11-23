/**
 * Understands plain-language shopping queries such as "5g phone under 20k" or
 * "cheapest air fryer between 3000 and 6000". The price and sort phrases are
 * turned into filters, and only the product words are sent to the stores.
 *
 * Numbers count as prices only when something marks them as one: a cue word
 * ("under", "between", "around"), a currency sign, or a lakh/crore suffix. That
 * keeps specs like "4k tv", "5g", "iphone 15" and "128gb" as search words.
 */

export type SortIntent = 'relevance' | 'price' | 'discount';

export type IntentFilter =
  | { kind: 'max'; value: number }
  | { kind: 'min'; value: number }
  | { kind: 'range'; min: number; max: number }
  | { kind: 'sort'; value: Exclude<SortIntent, 'relevance'> };

export type SearchIntent = {
  /** Product words to send to the stores. */
  keywords: string;
  min?: number;
  max?: number;
  sort: SortIntent;
  /** Each understood phrase, with the query that remains if it is removed. */
  filters: (IntentFilter & { without: string })[];
};

const CURRENCY = String.raw`(?:₹|rs\.?|inr|\$|usd|€|£)`;
const NUMBER = String.raw`\d+(?:,\d{2,3})*(?:\.\d+)?`;
const SUFFIX = String.raw`(?:k|thousand|lakhs?|lacs?|lakh|l|cr|crores?)`;
// An amount with an optional currency sign before it and multiplier after it.
const AMOUNT = String.raw`${CURRENCY}?\s*${NUMBER}\s*${SUFFIX}?(?![a-z0-9])`;

const MAX_CUES = String.raw`under|below|less than|lower than|cheaper than|upto|up to|within|max(?:imum)?|at most|not more than|no more than|budget(?: of)?|<=?`;
const MIN_CUES = String.raw`above|over|more than|greater than|at least|min(?:imum)?|starting(?: at| from)?|from|>=?`;
const AROUND_CUES = String.raw`around|about|approx(?:imately)?|roughly|near|~`;

const PATTERNS: { re: RegExp; read: (m: RegExpMatchArray) => IntentFilter | null }[] = [
  {
    re: new RegExp(
      String.raw`\b(?:between|from)\s+(${AMOUNT})\s*(?:and|to|-|–)\s*(${AMOUNT})`,
      'i',
    ),
    read: (m) => range(amount(m[1]), amount(m[2])),
  },
  {
    // "10k-20k", "₹10,000 to ₹20,000": needs a currency sign or suffix to be a price.
    re: new RegExp(String.raw`(?<![a-z0-9])(${AMOUNT})\s*(?:to|-|–)\s*(${AMOUNT})`, 'i'),
    read: (m) =>
      marked(m[1]) || marked(m[2]) ? range(amount(m[1]), amount(m[2])) : null,
  },
  {
    re: new RegExp(String.raw`(?:^|\s)(?:${AROUND_CUES})\s*(${AMOUNT})`, 'i'),
    read: (m) => {
      const value = amount(m[1]);
      return value ? range(Math.round(value * 0.85), Math.round(value * 1.15)) : null;
    },
  },
  {
    re: new RegExp(String.raw`(?:^|\s)(?:${MAX_CUES})\s*(${AMOUNT})`, 'i'),
    read: (m) => (amount(m[1]) ? { kind: 'max', value: amount(m[1])! } : null),
  },
  {
    re: new RegExp(String.raw`(?:^|\s)(?:${MIN_CUES})\s*(${AMOUNT})`, 'i'),
    read: (m) =>
      // "from" only counts with a marked amount: "from 2023" is not a price.
      amount(m[1]) && (!/^\s*from/i.test(m[0]) || marked(m[1]))
        ? { kind: 'min', value: amount(m[1])! }
        : null,
  },
  {
    // A bare amount with a currency sign, as in "phone ₹20000", reads as a budget.
    re: new RegExp(
      String.raw`(?<![a-z0-9])(${CURRENCY}\s*${NUMBER}\s*${SUFFIX}?)(?![a-z0-9])`,
      'i',
    ),
    read: (m) => (amount(m[1]) ? { kind: 'max', value: amount(m[1])! } : null),
  },
];

const SORTS: { re: RegExp; value: 'price' | 'discount' }[] = [
  {
    re: /\b(?:cheapest|lowest price[sd]?|low to high|least expensive)\b/i,
    value: 'price',
  },
  {
    re: /\b(?:biggest|best|highest|most|max(?:imum)?|top)\s+(?:discounts?|deals?|offers?|savings?)\b/i,
    value: 'discount',
  },
];

// Conversational words that do not describe the product.
const FILLER =
  /\b(?:show me|find me|get me|search for|looking for|look for|i want|i need|want|need|find|buy|please|best|good|top|some|options?|for me|in india|online|price[sd]?|on|for|a|an|the|with a price)\b/gi;

function marked(text: string) {
  return new RegExp(String.raw`^\s*${CURRENCY}|${SUFFIX}\s*$`, 'i').test(text.trim());
}

/** Parse "₹20,000", "20k", "1.5 lakh" or "2cr" into a number. */
export function amount(text: string): number | null {
  const m = text
    .toLowerCase()
    .trim()
    .match(new RegExp(String.raw`^${CURRENCY}?\s*(${NUMBER})\s*(${SUFFIX})?$`));
  if (!m) return null;
  const base = Number(m[1].replace(/,/g, ''));
  const suffix = m[2] ?? '';
  const multiplier =
    suffix.startsWith('k') || suffix === 'thousand'
      ? 1_000
      : /^(l|lakh|lac)/.test(suffix)
        ? 100_000
        : suffix.startsWith('cr')
          ? 10_000_000
          : 1;
  const value = Math.round(base * multiplier);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function range(a: number | null, b: number | null): IntentFilter | null {
  if (!a || !b) return null;
  return { kind: 'range', min: Math.min(a, b), max: Math.max(a, b) };
}

function tidy(text: string) {
  return (
    text
      // Commas between digits are thousands separators ("₹30,000"); keep them.
      .replace(/[?!;:]+|,(?!\d)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

export function parseSearchIntent(raw: string): SearchIntent {
  const query = tidy(raw);
  let rest = query;
  const filters: SearchIntent['filters'] = [];

  for (const { re, read } of PATTERNS) {
    const m = rest.match(re);
    const filter = m && read(m);
    if (!m || !filter) continue;
    // One price filter is enough; a second cue would contradict the first.
    if (filters.some((f) => f.kind !== 'sort')) break;
    filters.push({ ...filter, without: tidy(query.replace(m[0], ' ')) });
    rest = rest.replace(m[0], ' ');
  }

  for (const { re, value } of SORTS) {
    const m = rest.match(re);
    if (!m) continue;
    filters.push({ kind: 'sort', value, without: tidy(query.replace(m[0], ' ')) });
    rest = rest.replace(m[0], ' ');
    break;
  }

  const price = filters.find((f) => f.kind !== 'sort');
  const sort = filters.find((f) => f.kind === 'sort');
  return {
    keywords: tidy(rest.replace(FILLER, ' ')),
    min:
      price?.kind === 'min'
        ? price.value
        : price?.kind === 'range'
          ? price.min
          : undefined,
    max:
      price?.kind === 'max'
        ? price.value
        : price?.kind === 'range'
          ? price.max
          : undefined,
    sort: sort?.kind === 'sort' ? sort.value : 'relevance',
    filters,
  };
}
