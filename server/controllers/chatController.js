import Compound from "../models/Compound.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { generateGeminiChatReply } from "../services/geminiChatService.js";
import {
  searchLocationsInCompound,
  mergeMatchesWithDestinationKey,
} from "../utils/searchHelper.js";

function sanitizeChatHistoryPayload(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(-30)
    .map((h) => ({
      role: h?.role === "user" ? "user" : "model",
      text: String(h?.text ?? "").trim(),
    }))
    .filter((h) => h.text.length > 0);
}

/**
 * AI chat: Gemini only (conversational + compound-grounded). Configure GEMINI_API_KEY.
 */
export const postChatQuery = asyncHandler(async (req, res) => {
  const {
    message,
    compoundId,
    destinationKey,
    indoorMode,
    phase,
    history: historyRaw,
  } = req.body;

  const history = sanitizeChatHistoryPayload(historyRaw);

  if (!message?.trim()) {
    throw new AppError("message is required", 400);
  }

  if (!compoundId || !String(compoundId).trim()) {
    throw new AppError("compoundId is required", 400);
  }

  const compound = await Compound.findById(compoundId).lean();

  if (!compound) {
    throw new AppError("Compound not found", 404);
  }

  const useIndoor =
    indoorMode === true ||
    phase === "indoor" ||
    phase === "indoor_navigation";

  const trimmed = message.trim();

  let matches = searchLocationsInCompound(compound, trimmed);
  matches = mergeMatchesWithDestinationKey(
    compound,
    matches,
    destinationKey,
    trimmed
  );

  const matchesPayload = matches.slice(0, 8).map((m) => ({
    score: m.score,
    locationName: m.location.name,
    locationType: m.location.type,
    buildingName: m.building.name,
    floorNumber: m.floor.floorNumber,
    latitude: m.building.latitude,
    longitude: m.building.longitude,
    directions: m.location.directions,
    description: m.location.description || null,
    mapCoordinates: m.location.mapCoordinates || null,
  }));

  let reply;
  let replySource = "gemini";

  try {
    reply = await generateGeminiChatReply({
      compound,
      userMessage: trimmed,
      useIndoor,
      history,
    });
  } catch (err) {
    console.error("Gemini chat error:", err.message || err);

    if (err.code === "NO_GEMINI_KEY") {
      throw new AppError(
        "AI chat is not configured. Add GEMINI_API_KEY (and optionally GEMINI_MODEL) to the server .env file.",
        503
      );
    }

    const raw = String(err.message || err || "");
    const quotaOr429 =
      /429|Too Many Requests|quota exceeded|free_tier|rate.?limit/i.test(raw);

    if (quotaOr429) {
      throw new AppError(
        "Gemini rate limit or quota exceeded. Wait and retry, set GEMINI_MODEL (e.g. gemini-2.5-flash) or GEMINI_MODEL_FALLBACK, or enable billing. https://ai.google.dev/gemini-api/docs/rate-limits",
        503
      );
    }

    const model404 =
      /404\s+Not\s+Found|not found for API version/i.test(raw) &&
      /models\/|generateContent/i.test(raw);

    if (model404) {
      throw new AppError(
        "That Gemini model id is not available for your API key (404). Set GEMINI_MODEL to a current id from https://ai.google.dev/gemini-api/docs/models/gemini (e.g. gemini-2.5-flash). The server tries several fallbacks automatically.",
        503
      );
    }

    throw new AppError(
      `AI is temporarily unavailable. Check GEMINI_MODEL in .env. ${raw.length > 180 ? `${raw.slice(0, 180)}…` : raw}`,
      503
    );
  }

  res.json({
    reply,
    replySource,
    compoundId: compound._id,
    compoundName: compound.name,
    phase: useIndoor ? "indoor" : "outdoor",
    indoorMode: useIndoor,
    destinationKey: destinationKey || null,
    matches: matchesPayload,
  });
});
