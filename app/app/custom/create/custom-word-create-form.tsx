"use client";

import {
  Field,
  Input,
  Switch,
  Label as HeadlessLabel,
  Description as HeadlessDescription,
} from "@headlessui/react";
import { useState } from "react";
import clsx from "clsx";
import { Button } from "@/app/ui/button/button";
import { CustomGameCreateRequest } from "@/app/api/games/custom/route";
import { Dialog } from "@/app/ui/dialog";
import { createCast } from "@/app/lib/cast";
import { createComposeUrl } from "@/app/utils";
import { useJwt } from "@/app/hooks/use-jwt";

function Label({
  children,
  htmlFor,
  position = "top",
}: {
  children: React.ReactNode;
  htmlFor?: string;
  position?: "top" | "left";
}) {
  return (
    <HeadlessLabel
      htmlFor={htmlFor}
      className={clsx(
        "text-sm font-semibold text-primary-900/50",
        position === "top" && "block mb-1.5 px-1",
        position === "left" && "pl-1 mr-3"
      )}
    >
      {children}
    </HeadlessLabel>
  );
}

function InputField({
  label,
  helperText,
  id,
  ...props
}: {
  label: string;
  helperText?: string;
  id: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        className={clsx(
          "w-full rounded-md border border-primary-200 bg-white py-3 px-4",
          "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-primary-500"
        )}
        {...props}
      />
      {helperText && (
        <HeadlessDescription className="text-xs text-primary-900/50 mt-1 px-1">
          {helperText}
        </HeadlessDescription>
      )}
    </Field>
  );
}

export function CustomWordCreateForm() {
  const [word, setWord] = useState<string>("");
  const [isArt, setIsArt] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [createdCustomWord, setCreatedCustomWord] = useState<{
    id: string;
    gameUrl: string;
    config: Partial<CustomGameCreateRequest>;
  } | null>(null);

  const { jwt } = useJwt();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    const payload: Partial<CustomGameCreateRequest> = {
      word: word.toLowerCase(),
      isArt,
    };

    try {
      const response = await fetch("/api/games/custom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        const data = await response.json();
        setCreatedCustomWord({ ...data, config: payload });
        setIsDialogOpen(true);
      } else {
        console.error("Failed to create a custom word", response);
      }
    } catch (error) {
      console.error("Failed to create a custom word", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = async () => {
    if (!createdCustomWord) {
      console.error("No arena created");
      return;
    }
    const { config, gameUrl } = createdCustomWord;
    const text = "TODO\n\n" + gameUrl;
    if (jwt) {
      createCast(window, { text, embeds: [gameUrl] });
    } else {
      window.open(createComposeUrl(text, gameUrl), "_blank");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex-1 flex flex-col justify-between"
    >
      <div className="space-y-6 py-6">
        <div>
          <InputField
            label="What's the word?"
            id="word"
            placeholder="STARE"
            min={1}
            max={100}
            step={1}
            value={word}
            onChange={(e) =>
              setWord((e.target.value || "").toUpperCase().substring(0, 5))
            }
            helperText="Enter the 5-letter word. Can be made-up, if you want"
          />
        </div>
        <div>
          <Field>
            <div className="flex flex-row items-center">
              <Label position="left">Is for drawing?</Label>
              <Switch
                checked={isArt}
                onChange={setIsArt}
                className="group inline-flex h-6 w-11 items-center rounded-full bg-primary-200 transition data-[checked]:bg-primary-500 disabled:opacity-50"
              >
                <span className="size-4 translate-x-1 rounded-full bg-white transition group-data-[checked]:translate-x-6" />
              </Switch>
            </div>
            <HeadlessDescription className="text-xs text-primary-900/50 px-1 mt-1.5">
              The word will be visible to players. The primary goal would then
              be to use it to "draw" a pattern using this word.
            </HeadlessDescription>
          </Field>
        </div>
      </div>
      <div className="flex flex-row justify-end pt-4 pb-8">
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create"}
        </Button>
      </div>

      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)}>
        <div className="w-full flex flex-col gap-2">
          <p className="w-full text-left text-xl font-space font-bold">
            Custom word created! 🎉
          </p>
          {createdCustomWord && (
            <div className="flex flex-col gap-2 items-center w-full pt-4">
              <Button variant="primary" onClick={handleShare}>
                Share
              </Button>
            </div>
          )}
        </div>
      </Dialog>
    </form>
  );
}
