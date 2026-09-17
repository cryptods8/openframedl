import rawDefinitions from "./definitions.json";

export interface WordDefinitionItem {
  partOfSpeech: string;
  definition: string;
  phonetic?: string;
}

export interface WordDefinition {
  word: string;
  phonetic?: string;
  definitions: WordDefinitionItem[];
}

interface StoredDefinitionEntry {
  phonetic?: string;
  definitions: {
    partOfSpeech: string;
    definition: string;
  }[];
}

const localDefinitions: Record<string, StoredDefinitionEntry> =
  rawDefinitions as unknown as Record<string, StoredDefinitionEntry>;

// In-memory cache for dynamically fetched custom words
const dynamicWordCache = new Map<string, WordDefinition | null>();

const POS_MAP: Record<string, string> = {
  n: "noun",
  v: "verb",
  adj: "adjective",
  adv: "adverb",
  prep: "preposition",
  conj: "conjunction",
  pron: "pronoun",
  interj: "interjection",
  prop: "proper noun",
  u: "unknown",
};

/**
 * Fetch a definition from Datamuse as on-demand fallback for custom words
 * not included in the pre-bundled answer-words dictionary.
 */
async function fetchDynamicDefinition(
  word: string
): Promise<WordDefinition | null> {
  try {
    const res = await fetch(
      `https://api.datamuse.com/words?sp=${encodeURIComponent(
        word
      )}&md=drp&ipa=1&max=3`,
      {
        signal: AbortSignal.timeout(3000),
      }
    );

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    const match =
      data.find((d) => d.word.toLowerCase() === word.toLowerCase()) || data[0];
    const rawIpa = match.tags
      ?.find((t: string) => t.startsWith("ipa_pron:"))
      ?.replace("ipa_pron:", "");
    const phonetic = rawIpa ? `/${rawIpa}/` : undefined;

    const rawDefs: string[] = match.defs || [];
    const validDefs = rawDefs.filter((d) => {
      const [, ...rest] = d.split("\t");
      const text = rest.join("\t").trim().toLowerCase();
      return !text.startsWith("a surname");
    });

    const defsToUse = validDefs.length > 0 ? validDefs : rawDefs;
    const seenPos = new Set<string>();
    const definitions: WordDefinitionItem[] = [];

    for (const rawDef of defsToUse) {
      const parts = rawDef.split("\t");
      const posCode = parts[0] ?? "";
      const defText = parts.slice(1).join("\t").trim();
      const pos = POS_MAP[posCode] ?? posCode;

      if (!seenPos.has(pos) && definitions.length < 3) {
        seenPos.add(pos);
        definitions.push({
          partOfSpeech: pos,
          definition: defText,
          phonetic,
        });
      }
    }

    if (definitions.length === 0 && rawDefs.length > 0 && rawDefs[0]) {
      const parts = rawDefs[0].split("\t");
      const posCode = parts[0] ?? "";
      definitions.push({
        partOfSpeech: POS_MAP[posCode] ?? posCode,
        definition: parts.slice(1).join("\t").trim(),
        phonetic,
      });
    }

    if (definitions.length === 0) {
      return null;
    }

    return {
      word,
      phonetic,
      definitions,
    };
  } catch (err) {
    console.warn(`Dynamic definition lookup failed for "${word}":`, err);
    return null;
  }
}

/**
 * Lookup word definition.
 * 1. Checks bundled static definitions (~0ms in-memory).
 * 2. If missing, checks dynamic memory cache.
 * 3. If missing, calls Datamuse with fallback caching for custom words.
 */
export async function getWordDefinition(
  word: string
): Promise<WordDefinition | null> {
  if (!word || typeof word !== "string") {
    return null;
  }

  const normalized = word.trim().toLowerCase();

  // 1. Bundled local dictionary lookup
  const local = localDefinitions[normalized];
  if (local) {
    return {
      word: normalized,
      phonetic: local.phonetic,
      definitions: local.definitions.map((d) => ({
        partOfSpeech: d.partOfSpeech,
        definition: d.definition,
        phonetic: local.phonetic,
      })),
    };
  }

  // 2. In-memory cache for dynamic custom words
  if (dynamicWordCache.has(normalized)) {
    return dynamicWordCache.get(normalized) || null;
  }

  // 3. Dynamic on-demand fallback
  const dynamic = await fetchDynamicDefinition(normalized);
  dynamicWordCache.set(normalized, dynamic);
  return dynamic;
}
