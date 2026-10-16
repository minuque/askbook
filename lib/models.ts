/**
 * The model allow-list and wire types. Safe to import on the client: no keys,
 * no fetches. lib/together.ts does the network side, against the local magpie
 * gateway (OpenAI-compatible).
 */

export type ModelEntry = {
  id: string;
  label: string;
  short: string;
  blurb: string;
  inPerM: number;
  cachedPerM: number;
  outPerM: number;
};

/**
 * The allow-list. Route and UI both read it. Ids are magpie routing groups:
 * the gateway picks an upstream model and fails over when one is out.
 * Prices are zero: the gateway is local and its upstreams are the user's own.
 */
export const MODELS = {
  flash: {
    id: "group/flash-models",
    label: "Flash",
    short: "Quick",
    blurb: "Fast answers for most questions.",
    inPerM: 0,
    cachedPerM: 0,
    outPerM: 0,
  },
  deep: {
    id: "group/pro-models",
    label: "Pro",
    short: "Deep",
    blurb: "Slower, more careful answers.",
    inPerM: 0,
    cachedPerM: 0,
    outPerM: 0,
  },
} as const satisfies Record<string, ModelEntry>;

export type ModelKey = keyof typeof MODELS;
export const DEFAULT_MODEL: ModelKey = "flash";

export function isModelKey(v: unknown): v is ModelKey {
  return typeof v === "string" && v in MODELS;
}

/** A model key that is still on the list: an old saved key falls back to Flash. */
export const modelOf = (v: unknown): ModelKey => (isModelKey(v) ? v : DEFAULT_MODEL);

export type Usage = {
  promptTokens: number;
  cachedTokens: number;
  completionTokens: number;
  costUsd: number;
};

/** Dollars for a run: zero on a local gateway, kept for the receipt shape. */
export function costFor(_key: ModelKey, _prompt: number, _cached: number, _completion: number): number {
  return 0;
}

/** A web result an answer can cite as [n]. */
export type Source = { n: number; title: string; url: string; site: string; date?: string };

export type StreamEvent =
  | { type: "meta"; model: string }
  | { type: "searching" }
  /** The model asked for a tool (web search); the route runs it and asks again. Never sent to the browser. */
  | { type: "tool"; id: string; name: string; args: string }
  /** Drop what was written so far: a line before a tool call ("I'll look that up") that the real answer replaces. */
  | { type: "reset" }
  | { type: "sources"; sources: Source[] }
  | { type: "content"; text: string }
  | { type: "usage"; usage: Usage }
  | { type: "done" }
  | { type: "error"; text: string };
