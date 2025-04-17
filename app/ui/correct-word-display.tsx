"use client";

import { useState, useCallback } from "react";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { QuestionMarkCircleIcon } from "@heroicons/react/16/solid";

interface CorrectWordDisplayProps {
  word: string;
}

interface DictionaryApiResponse {
  word: string;
  phonetic?: string;
  phonetics?: {
    text?: string;
    audio?: string;
  }[];
  origin?: string;
  meanings: {
    partOfSpeech: string;
    definitions: {
      definition: string;
      example?: string;
      synonyms?: string[];
      antonyms?: string[];
    }[];
  }[];
}

interface Definition {
  phonetic?: string;
  definition: string;
  partOfSpeech: string;
}

interface Error {
  error: string;
}

const fetchDefinition = async (
  word: string
): Promise<Definition[] | Error | null> => {
  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`
    );
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: DictionaryApiResponse[] = await response.json();
    const item = data[0];
    // Extract the first definition
    const definitions: Definition[] | undefined = item?.meanings.map(
      ({ partOfSpeech, definitions }, idx) => ({
        phonetic: item?.phonetics?.[idx]?.text || item?.phonetic,
        partOfSpeech,
        definition: definitions[0]?.definition || "",
      })
    );
    return definitions || null;
  } catch (error) {
    console.error("Failed to fetch definition:", error);
    return { error: "Could not load definition" };
  }
};

export function CorrectWordDisplay({ word }: CorrectWordDisplayProps) {
  const [definition, setDefinition] = useState<Definition[] | Error | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false); // Prevent fetching multiple times on hover

  const handleMouseEnter = useCallback(async () => {
    if (hasFetched || isLoading) return;

    setIsLoading(true);
    const fetchedDefinition = await fetchDefinition(word);
    setDefinition(fetchedDefinition);
    setIsLoading(false);
    setHasFetched(true);
  }, [word, hasFetched, isLoading]);

  return (
    <Popover className="inline-block relative">
      <PopoverButton
        className="font-bold cursor-help underline decoration-dotted"
        onMouseEnter={handleMouseEnter}
      >
        <span>{word.toUpperCase()}</span>
        <sup className="inline-block">
          <QuestionMarkCircleIcon className="w-[1em] h-[1em]" />
        </sup>
      </PopoverButton>
      <PopoverPanel
        anchor="bottom"
        transition
        className="flex origin-top flex-col transition duration-200 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 border border-primary-200 bg-white p-6 rounded-md shadow-lg font-inter"
      >
        {isLoading ? (
          <p className="text-sm text-primary-900/50 italic">{"Loading..."}</p>
        ) : definition ? (
          "error" in definition ? (
            <p className="text-sm text-red-500">{definition.error}</p>
          ) : (
            <ol className="list-decimal list-inside max-w-prose">
              {definition.map((def, idx) => (
                <li
                  className="text-sm text-primary-900/50 mb-1 last:mb-0"
                  key={idx}
                >
                  {def.phonetic && (
                    <span className="font-bold">{def.phonetic}</span>
                  )}
                  {def.phonetic && <span className="mx-1">{"·"}</span>}
                  <span className="italic">{def.partOfSpeech}</span>
                  <span className="mx-2">{"·"}</span>
                  <span>{def.definition}</span>
                </li>
              ))}
            </ol>
          )
        ) : (
          <p className="text-sm text-primary-900/50">{"No definition found"}</p>
        )}
      </PopoverPanel>
    </Popover>
  );
}
