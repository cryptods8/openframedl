import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const answerWordsPath = path.join(rootDir, "app/words/answer-words.ts");
const outputPath = path.join(rootDir, "app/words/definitions.json");

const content = fs.readFileSync(answerWordsPath, "utf-8");
const words = [...content.matchAll(/'([a-z]{5})'/g)].map((m) => m[1]);

console.log(`Loaded ${words.length} answer words.`);

const POS_MAP = {
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

const MANUAL_OVERRIDES = {
  degen: {
    phonetic: "/dˈɛgʌn/",
    definitions: [
      {
        partOfSpeech: "noun",
        definition: "(slang) Degenerate; a crypto enthusiast or trader who takes high-risk bets.",
      },
    ],
  },
  until: {
    phonetic: "/ənˈtɪl/",
    definitions: [
      {
        partOfSpeech: "preposition",
        definition: "Up to the point in time or event mentioned.",
      },
      {
        partOfSpeech: "conjunction",
        definition: "Up to the time that; before.",
      },
    ],
  },
  among: {
    phonetic: "/əˈmʌŋ/",
    definitions: [
      {
        partOfSpeech: "preposition",
        definition: "Surrounded by; in the company or midst of.",
      },
    ],
  },
  whose: {
    phonetic: "/huːz/",
    definitions: [
      {
        partOfSpeech: "pronoun",
        definition: "Belonging to or associated with which person or thing.",
      },
    ],
  },
  leant: {
    phonetic: "/lɛnt/",
    definitions: [
      {
        partOfSpeech: "verb",
        definition: "Past and past participle of lean: inclined or deviated from vertical.",
      },
    ],
  },
  shalt: {
    phonetic: "/ʃælt/",
    definitions: [
      {
        partOfSpeech: "verb",
        definition: "(archaic) Second-person singular simple present form of shall.",
      },
    ],
  },
  begun: {
    phonetic: "/bɪˈɡʌn/",
    definitions: [
      {
        partOfSpeech: "verb",
        definition: "Past participle of begin.",
      },
    ],
  },
  every: {
    phonetic: "/ˈɛvri/",
    definitions: [
      {
        partOfSpeech: "determiner",
        definition: "All of a countable group (considered individually), without exception.",
      },
    ],
  },
  wiser: {
    phonetic: "/ˈwaɪzər/",
    definitions: [
      {
        partOfSpeech: "adjective",
        definition: "Comparative form of wise: more wise; having greater knowledge or judgment.",
      },
    ],
  },
  saner: {
    phonetic: "/ˈseɪnər/",
    definitions: [
      {
        partOfSpeech: "adjective",
        definition: "Comparative form of sane: more sane; possessing greater mental health.",
      },
    ],
  },
  shown: {
    phonetic: "/ʃoʊn/",
    definitions: [
      {
        partOfSpeech: "verb",
        definition: "Past participle of show.",
      },
    ],
  },
  shone: {
    phonetic: "/ʃoʊn/",
    definitions: [
      {
        partOfSpeech: "verb",
        definition: "Simple past and past participle of shine.",
      },
    ],
  },
  circa: {
    phonetic: "/ˈsɜːrkə/",
    definitions: [
      {
        partOfSpeech: "preposition",
        definition: "Approximately, about (used especially with approximate dates).",
      },
    ],
  },
  masse: {
    phonetic: "/mæˈseɪ/",
    definitions: [
      {
        partOfSpeech: "noun",
        definition: "(billiards) A stroke played with the cue held almost vertically to cause the ball to curve.",
      },
    ],
  },
  condo: {
    phonetic: "/ˈkɑːndoʊ/",
    definitions: [
      {
        partOfSpeech: "noun",
        definition: "A condominium; an individually owned apartment or residential unit.",
      },
    ],
  },
  drier: {
    phonetic: "/ˈdraɪər/",
    definitions: [
      {
        partOfSpeech: "adjective",
        definition: "Comparative form of dry: more dry; containing less moisture.",
      },
      {
        partOfSpeech: "noun",
        definition: "A substance, device, or appliance used to remove moisture.",
      },
    ],
  },
};

async function fetchDatamuse(word) {
  if (MANUAL_OVERRIDES[word]) {
    return MANUAL_OVERRIDES[word];
  }

  const res = await fetch(
    `https://api.datamuse.com/words?sp=${word}&md=drp&ipa=1&max=3`,
    { signal: AbortSignal.timeout(5000) }
  );
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const data = await res.json();
  if (!data || data.length === 0) {
    return null;
  }

  const exactMatch = data.find((d) => d.word.toLowerCase() === word) || data[0];
  const rawIpa = exactMatch.tags
    ?.find((t) => t.startsWith("ipa_pron:"))
    ?.replace("ipa_pron:", "");
  const phonetic = rawIpa ? `/${rawIpa}/` : undefined;

  const rawDefs = exactMatch.defs || [];
  const validDefs = rawDefs.filter((d) => {
    const [, ...rest] = d.split("\t");
    const text = rest.join("\t").trim().toLowerCase();
    // Ignore pure surname definitions if multiple definitions exist
    return !text.startsWith("a surname");
  });

  const defsToUse = validDefs.length > 0 ? validDefs : rawDefs;
  const seenPos = new Set();
  const definitions = [];

  for (const rawDef of defsToUse) {
    const [posCode, ...rest] = rawDef.split("\t");
    const defText = rest.join("\t").trim();
    const pos = POS_MAP[posCode] || posCode;

    if (!seenPos.has(pos) && definitions.length < 3) {
      seenPos.add(pos);
      definitions.push({
        partOfSpeech: pos,
        definition: defText,
      });
    }
  }

  if (definitions.length === 0 && rawDefs.length > 0) {
    const [posCode, ...rest] = rawDefs[0].split("\t");
    definitions.push({
      partOfSpeech: POS_MAP[posCode] || posCode,
      definition: rest.join("\t").trim(),
    });
  }

  return {
    phonetic,
    definitions,
  };
}

async function run() {
  const BATCH_SIZE = 20;
  const result = {};
  const missing = [];
  const startTime = Date.now();

  for (let i = 0; i < words.length; i += BATCH_SIZE) {
    const batch = words.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (word) => {
      try {
        const data = await fetchDatamuse(word);
        if (!data || !data.definitions || data.definitions.length === 0) {
          missing.push(word);
        } else {
          result[word] = data;
        }
      } catch (err) {
        console.error(`Error on ${word}:`, err.message);
        missing.push(word);
      }
    });

    await Promise.all(promises);

    if ((i + BATCH_SIZE) % 200 === 0 || i + BATCH_SIZE >= words.length) {
      console.log(
        `Processed ${Math.min(i + BATCH_SIZE, words.length)}/${words.length} (${Math.round((Date.now() - startTime) / 1000)}s)`
      );
    }

    await new Promise((r) => setTimeout(r, 60));
  }

  console.log(`Fetch completed in ${(Date.now() - startTime) / 1000}s`);
  console.log(`Total words saved: ${Object.keys(result).length}/${words.length}`);
  if (missing.length > 0) {
    console.warn(`Missing words (${missing.length}):`, missing);
  }

  // Minify JSON to reduce disk / memory usage
  fs.writeFileSync(outputPath, JSON.stringify(result));
  console.log(`Saved definitions to ${outputPath} (${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB)`);
}

run();
