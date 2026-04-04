import { GoogleGenerativeAI } from "@google/generative-ai";

function compactCompoundForPrompt(compound) {
  return {
    name: compound.name,
    description: compound.description || undefined,
    buildings: (compound.buildings || []).map((b) => ({
      name: b.name,
      latitude: b.latitude,
      longitude: b.longitude,
      floors: (b.floors || []).map((f) => ({
        floorNumber: f.floorNumber,
        floorMapUrl: f.floorMapUrl || undefined,
        locations: (f.locations || []).map((l) => ({
          name: l.name,
          type: l.type,
          description: l.description || undefined,
          directions: l.directions,
          keywords: l.keywords?.length ? l.keywords : undefined,
        })),
      })),
    })),
  };
}

function buildSystemInstruction(compound, useIndoor) {
  const siteName = compound.name || "this site";
  const dataJson = JSON.stringify(compactCompoundForPrompt(compound), null, 0);

  return `You are NavAI — a friendly, natural AI guide for people visiting "${siteName}" (a campus, resort, office park, or similar compound).

## How you should talk
- Have a **real conversation**: respond to what the user actually said. You can greet them, joke lightly when appropriate, empathize if they're stressed or lost, explain what you can and can't help with, and discuss general topics that are fine in a public venue.
- **Do not** sound like a broken record: vary your wording; don't paste the same block of directions unless they're asking again.
- Keep answers readable (often under ~220 words unless they want more detail).

## Grounding (very important)
- You are given **COMPOUND_DATA** — the official directory admins entered for this site (buildings, GPS, floors, named places, indoor "directions", optional descriptions).
- For **anything about where things are physically** — rooms, toilets, labs, offices, floors, stairs, elevators, which building, how to walk there — you must base your answer **only** on COMPOUND_DATA. Paraphrase naturally; the facts must match the data.
- If COMPOUND_DATA does **not** mention something, say clearly you don't have it in your directory and suggest staff or signage. **Never invent** buildings, rooms, or routes.

${useIndoor ? "## Context\nThe user indicated they are **inside** or focusing on **indoor** navigation — when relevant, give concise step-style indoor guidance from COMPOUND_DATA.\n\n" : ""}## COMPOUND_DATA (JSON — your only source of truth for site layout)
${dataJson}
`;
}

/**
 * Convert client history to Gemini { role, parts }[].
 * Expects alternating user/model; drops empty entries.
 */
export function normalizeChatHistory(items) {
  if (!Array.isArray(items)) return [];
  const out = [];
  for (const h of items) {
    const t = String(h.text ?? "").trim();
    if (!t) continue;
    const role = h.role === "user" ? "user" : "model";
    out.push({ role, parts: [{ text: t }] });
  }
  return out.slice(-24);
}

/** Gemini requires the first history entry to be role "user". */
function coerceHistoryForGemini(items) {
  const normalized = normalizeChatHistory(items);
  let start = 0;
  while (start < normalized.length && normalized[start].role !== "user") {
    start += 1;
  }
  return normalized.slice(start);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRateLimitOrQuotaError(err) {
  const m = String(err?.message || err || "");
  return /429|Too Many Requests|quota exceeded|rate.?limit/i.test(m);
}

/** Free tier sometimes reports limit 0 for a model — retrying the same model won't help. */
function isZeroFreeTierQuota(err) {
  const m = String(err?.message || err || "");
  return (
    /free_tier|free tier/i.test(m) &&
    /limit:\s*0/i.test(m)
  );
}

/** Parses "Please retry in 14.5s" from Google error bodies. */
function parseRetryDelayMs(err) {
  const m = String(err?.message || "");
  const match = m.match(/retry in ([\d.]+)\s*s/i);
  if (match) {
    return Math.min(90_000, Math.ceil(parseFloat(match[1]) * 1000) + 500);
  }
  return null;
}

/**
 * Unversioned names like `gemini-1.5-flash` often return 404; use current stable IDs.
 * @see https://ai.google.dev/gemini-api/docs/models/gemini
 */
const DEFAULT_MODEL_FALLBACK_CHAIN = [
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-2.0-flash",
];

function isModelNotFoundError(err) {
  const m = String(err?.message || err || "");
  return (
    /404\s+Not\s+Found/i.test(m) ||
    /not found for API version/i.test(m) ||
    /is not supported for generateContent/i.test(m)
  );
}

function buildModelCandidates() {
  const primary =
    process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL_FALLBACK_CHAIN[0];
  const explicitFb = process.env.GEMINI_MODEL_FALLBACK?.trim();
  const ordered = [
    primary,
    ...(explicitFb && explicitFb !== primary ? [explicitFb] : []),
    ...DEFAULT_MODEL_FALLBACK_CHAIN.filter(
      (m) => m !== primary && m !== explicitFb
    ),
  ];
  return [...new Set(ordered)];
}

async function callGeminiModel(model, geminiHistory, msg) {
  if (geminiHistory.length > 0) {
    const chat = model.startChat({ history: geminiHistory });
    return chat.sendMessage(msg);
  }
  return model.generateContent(msg);
}

function extractReplyText(result) {
  const text = result.response?.text()?.trim();
  if (text) return text;
  const feedback = result.response?.promptFeedback;
  const block = feedback?.blockReason || "NO_TEXT";
  const err = new Error(`Model returned no text (${block})`);
  err.code = "EMPTY_RESPONSE";
  throw err;
}

/**
 * Multi-turn conversational Gemini chat grounded on compound JSON.
 * Retries 429s; cycles through GEMINI_MODEL + fallbacks (404 / quota).
 * @throws {Error} on missing key, API failure, or empty model output
 */
export async function generateGeminiChatReply({
  compound,
  userMessage,
  useIndoor,
  history = [],
}) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    const e = new Error("GEMINI_API_KEY is not set on the server");
    e.code = "NO_GEMINI_KEY";
    throw e;
  }

  const temperature = Math.min(
    1,
    Math.max(0, parseFloat(process.env.GEMINI_TEMPERATURE || "0.9"))
  );

  const systemInstruction = buildSystemInstruction(compound, useIndoor);
  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiHistory = coerceHistoryForGemini(history);
  const msg = userMessage.trim();

  const maxAttemptsPerModel = 3;
  let lastErr;

  for (const modelName of buildModelCandidates()) {
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction,
      generationConfig: {
        temperature,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    });

    for (let attempt = 0; attempt < maxAttemptsPerModel; attempt++) {
      try {
        const result = await callGeminiModel(model, geminiHistory, msg);
        return extractReplyText(result);
      } catch (err) {
        lastErr = err;
        if (err.code === "EMPTY_RESPONSE") throw err;

        if (isModelNotFoundError(err)) {
          console.warn(
            `Gemini model not available (${modelName}); trying next model id`
          );
          break;
        }

        const is429 = isRateLimitOrQuotaError(err);
        if (is429 && isZeroFreeTierQuota(err)) {
          console.warn(
            `Gemini free-tier quota unavailable for ${modelName}; trying next model if configured`
          );
          break;
        }
        if (is429 && attempt < maxAttemptsPerModel - 1) {
          const wait =
            parseRetryDelayMs(err) ?? 1500 * (attempt + 1);
          console.warn(
            `Gemini rate limit (${modelName}), retry in ${wait}ms (attempt ${attempt + 1})`
          );
          await sleep(wait);
          continue;
        }
        if (is429) break;
        throw err;
      }
    }
  }

  if (lastErr) {
    lastErr.code = lastErr.code || "GEMINI_FAILED";
    throw lastErr;
  }

  const e = new Error("Gemini request failed with no error detail");
  e.code = "GEMINI_FAILED";
  throw e;
}
