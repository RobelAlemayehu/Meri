import {
  parseDestinationKey,
  resolveDestinationByKey,
} from "../services/destinationService.js";

/**
 * Match user queries against compound building/floor/location data.
 * Uses keyword overlap, substring match, and light fuzzy scoring.
 */

function normalize(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(q) {
  return normalize(q)
    .split(" ")
    .filter((w) => w.length > 1);
}

function levenshtein(a, b) {
  if (a.length < b.length) [a, b] = [b, a];
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return row[b.length];
}

function fuzzyWordScore(word, target) {
  if (!word || !target) return 0;
  if (target.includes(word)) return 4;
  if (word.length >= 4 && target.length >= 4) {
    const dist = levenshtein(word, target.slice(0, Math.max(target.length, word.length)));
    const maxLen = Math.max(word.length, target.length);
    if (dist <= 1 && maxLen <= 8) return 3;
    if (dist <= 2 && maxLen <= 12) return 2;
  }
  return 0;
}

/**
 * @param {object} compound — plain object (e.g. from .lean())
 * @param {string} query — user message
 * @returns {Array<{ score: number, building: object, floor: object, location: object }>}
 */
export function searchLocationsInCompound(compound, query) {
  const qNorm = normalize(query);
  if (!qNorm) return [];

  const words = tokenize(query);
  const results = [];

  for (const building of compound.buildings || []) {
    const bName = normalize(building.name);

    for (const floor of building.floors || []) {
      for (const loc of floor.locations || []) {
        let score = 0;
        const nameLower = normalize(loc.name);
        const descLower = normalize(loc.description || "");
        const dirsLower = normalize(loc.directions || "");

        if (qNorm && nameLower === qNorm) score += 25;
        if (qNorm && nameLower.includes(qNorm)) score += 15;
        if (qNorm && bName.includes(qNorm)) score += 4;

        for (const kw of loc.keywords || []) {
          const k = normalize(kw);
          if (!k) continue;
          if (qNorm.includes(k) || k.includes(qNorm)) score += 10;
          for (const w of words) {
            if (k.includes(w) || w.includes(k)) score += 6;
          }
        }

        for (const w of words) {
          score += fuzzyWordScore(w, nameLower);
          if (descLower.includes(w)) score += 2;
          if (dirsLower.includes(w)) score += 1;
          if (bName.includes(w)) score += 3;
        }

        if (score > 0) {
          results.push({
            score,
            building,
            floor,
            location: loc,
          });
        }
      }
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

/**
 * Greetings / chit-chat — do not force the dropdown destination as the only "match".
 */
export function isLikelyNavigationQuestion(message) {
  const q = normalize(message);
  if (!q || q.length < 2) return false;

  if (
    /^(hi|hello|hey|hiya|yo|sup|thanks|thank you|thx|ty|ok|okay|k|yes|no|nah|yep|nope|bye|goodbye|cheers)\b[!?.\s]*$/i.test(
      q
    )
  ) {
    return false;
  }

  const navHint =
    /\b(where|how do i|how can i|how to|toilet|bathroom|restroom|washroom|wc|elevator|lift|stairs|stair|stairway|floor|corridor|hallway|entrance|exit|lost|find the|directions?|way to|go to|nearest|take me|which way|get to|looking for|is there)\b/i;
  if (navHint.test(message)) return true;

  if (q.length <= 18 && !navHint.test(message)) return false;

  return tokenize(message).length >= 4;
}

/**
 * Pin the dropdown-selected location only when search is empty but the user is
 * clearly asking for navigation — not for "hi" / thanks.
 */
export function mergeMatchesWithDestinationKey(
  compound,
  matches,
  destinationKey,
  userMessage = ""
) {
  if (!destinationKey || !parseDestinationKey(destinationKey)) {
    return matches;
  }

  if (matches.length === 0 && !isLikelyNavigationQuestion(userMessage)) {
    return matches;
  }

  const pinned = resolveDestinationByKey(compound, destinationKey);
  if (!pinned) return matches;

  const same = (m) =>
    m.building === pinned.building &&
    m.floor === pinned.floor &&
    m.location === pinned.location;

  const existingIdx = matches.findIndex(same);
  const maxScore = matches.length
    ? Math.max(...matches.map((m) => m.score))
    : 0;
  const pinnedMatch = {
    score: Math.max(1000, maxScore + 1),
    building: pinned.building,
    floor: pinned.floor,
    location: pinned.location,
  };

  if (existingIdx >= 0) {
    const next = [...matches];
    const [item] = next.splice(existingIdx, 1);
    next.unshift({ ...item, score: Math.max(item.score, pinnedMatch.score) });
    return next;
  }

  return [pinnedMatch, ...matches];
}

export function buildChatReply(compound, query, matches, options = {}) {
  const { indoorOnly } = options;
  const name = compound.name || "this compound";

  if (!matches.length) {
    if (indoorOnly) {
      return `Hi — I'm your guide for ${name}. Ask something specific (e.g. "Where is the toilet on floor 2?" or "How do I get to the lab?"). I only know places and directions your admin added.`;
    }
    return `I couldn't match "${query}" to a place in ${name} yet. Try a building name, room, or keyword — or ask "Where is…?"`;
  }

  const top = matches[0];
  const { building, floor, location } = top;

  if (indoorOnly) {
    let text = `${location.name} — ${building.name}, floor ${floor.floorNumber}.\n\n`;
    text += `${location.directions}`;
    if (location.description) {
      text += `\n\n${location.description}`;
    }
    text +=
      "\n\nIf you get lost, describe what you see nearby and I can help refine the route.";
    return text;
  }

  let text = `${location.name} — ${building.name}, floor ${floor.floorNumber}.\n\n`;
  text += `Outdoor: go to ${building.name} (map: ${building.latitude}, ${building.longitude}).\n\n`;
  text += `Indoor: ${location.directions}`;
  if (location.description) {
    text += `\n\nDetails: ${location.description}`;
  }

  if (matches.length > 1) {
    const other = matches
      .slice(1, 4)
      .map((m) => m.location.name)
      .join(", ");
    text += `\n\nOther possible matches: ${other}.`;
  }

  return text;
}
