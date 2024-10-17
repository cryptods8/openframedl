import { NextRequest } from "next/server";
import { createImageResponse } from "@/app/utils/image-response";
import { primaryColor } from "@/app/image-ui/image-utils";
import { ArenaTitle } from "@/app/image-ui/arena/arena-title";
import { ArenaBuilderState, formatDuration } from "../route";
import { BasicLayout } from "@/app/image-ui/basic-layout";

export const dynamic = "force-dynamic";

function StepValue({ children }: { children: React.ReactNode }) {
  return (
    <div
      tw="text-3xl flex flex-1 flex-wrap"
      style={{
        color: "green",
        fontWeight: 600,
        wordBreak: "break-all",
        whiteSpace: "pre-wrap",
      }}
    >
      {children}
    </div>
  );
}

function determineAudienceText(state: ArenaBuilderState): string {
  const audience = state.audience ?? [];
  const audienceSize = state.audienceSize ?? 2;
  const specificAudienceSize = audience.length;
  let audienceText = "";
  if (audience.length > 0) {
    audienceText = audience
      .map((a) => (a.username ? `@${a.username}` : a.userId))
      .join(", ");
    if (specificAudienceSize < audienceSize) {
      audienceText += ` (and anyone up to ${
        audienceSize - specificAudienceSize
      } more people)`;
    }
  } else {
    audienceText = `Anyone (up to ${audienceSize} people)`;
  }
  return audienceText;
}

type StepRendererArgs = { step: number; state: ArenaBuilderState };
interface Step {
  label: string;
  reviewLabel?: string;
  description: string | ((args: StepRendererArgs) => string);
  render?: (args: StepRendererArgs) => React.ReactNode;
}

const steps: Step[] = [
  {
    label: "How many players?",
    description: "Enter number of players. Default is 2, maximum is 100.",
    render: ({ state }: StepRendererArgs) => {
      if (!state.audienceSize) {
        return null;
      }
      return <StepValue>{state.audienceSize.toString()}</StepValue>;
    },
  },
  {
    label: "Who exactly?",
    reviewLabel: "Who can play?",
    description: ({ state }: StepRendererArgs) =>
      `Enter FIDs or usernames (prefixed with '@'), separated by commas. Leave empty to allow anyone to join. Up to ${
        state.audienceSize ?? 2
      } people.`,
    render: ({ state }: StepRendererArgs) => {
      if (!state.audience) {
        return null;
      }
      const audienceText = determineAudienceText(state);
      return <StepValue>{audienceText}</StepValue>;
    },
  },
  {
    label: "How many words?",
    description:
      "Enter the number of words you want to play with. Default is 5, maximum is 9.",
    render: ({ state }: StepRendererArgs) => {
      if (!state.wordCount) {
        return null;
      }
      return <StepValue>{state.wordCount.toString()}</StepValue>;
    },
  },
  {
    label: "When to start?",
    description:
      "Leave empty for immediate start. Otherwise enter a date in YYYY-MM-DD format.",
    render: ({ state }: StepRendererArgs) => {
      if (!state.start) {
        return null;
      }
      return (
        <StepValue>
          {state.start.type === "immediate" ? "Immediately" : state.start.date}
        </StepValue>
      );
    },
  },
  {
    label: "Any time limit?",
    description:
      "Leave empty for unlimited time. Otherwise enter interval in minutes, hours, or days. Example: '1d 2h' or '30m'.",
    render: ({ state }: StepRendererArgs) => {
      if (!state.duration) {
        return null;
      }

      return (
        <StepValue>
          {state.duration.type === "unlimited"
            ? "No"
            : formatDuration(state.duration.minutes)}
        </StepValue>
      );
    },
  },
];

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <BasicLayout>
      <div
        tw="flex flex-col text-4xl w-full h-full items-start justify-start"
        style={{
          fontFamily: "Inter",
          backgroundColor: primaryColor(0.04),
          color: primaryColor(),
        }}
      >
        <div tw="flex px-20 justify-center w-full">
          <ArenaTitle size="md" />
        </div>
        <div tw="flex flex-1 w-full h-full">{children}</div>
      </div>
    </BasicLayout>
  );
}

function IntroImage() {
  return (
    <Layout>
      <div
        tw="flex flex-col w-full h-full px-20 text-4xl pt-12"
        style={{ gap: "2rem" }}
      >
        <div tw="text-5xl font-bold" style={{ fontFamily: "SpaceGrotesk" }}>
          {"Create an Arena"}
        </div>
        <div style={{ lineHeight: "1.5" }}>
          {
            "Framedl Arena lets you challenge friends to a word game with customizable audience, word count, start time, and duration. Words are randomly selected and hidden from you, so you can join the fun."
          }
        </div>
        <div style={{ lineHeight: "1.5" }}>
          {"Let's get started by setting up the details."}
        </div>
      </div>
    </Layout>
  );
}

function ReviewImage({ state }: { state: ArenaBuilderState }) {
  return (
    <Layout>
      <div
        tw="flex flex-col w-full h-full px-20 pt-12 text-4xl"
        style={{ gap: "2rem" }}
      >
        <div tw="text-5xl font-bold" style={{ fontFamily: "SpaceGrotesk" }}>
          {"Review and Share"}
        </div>
        <div tw="flex flex-col w-full" style={{ gap: "2rem" }}>
          {steps.slice(1).map((s, i) => (
            <div tw="flex w-full" style={{ gap: "2rem" }} key={i}>
              <div tw="flex" style={{ fontWeight: 400 }}>
                {s.reviewLabel ?? s.label}
              </div>
              <div tw="flex flex-1 pt-1">
                {s.render ? s.render({ step: i + 1, state }) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}

function Image({ step, state }: { step: number; state: ArenaBuilderState }) {
  return (
    <Layout>
      <div
        tw="flex flex-col items-center justify-center w-full h-full px-16"
        style={{ gap: "2rem" }}
      >
        {steps.map((s, i) => (
          <div tw="flex flex-row w-full" style={{ gap: "2rem" }} key={i}>
            <div
              tw="flex w-10 h-10 rounded-full text-white items-center justify-center text-2xl"
              style={{
                backgroundColor: primaryColor(step === i + 1 ? 0.84 : 0.32),
                fontWeight: 700,
              }}
            >
              {i + 1}
            </div>
            <div tw="flex flex-1 flex-col w-full items-start">
              <div tw="flex w-full" style={{ gap: "2rem" }}>
                <div
                  tw="flex"
                  style={{ fontWeight: step === i + 1 ? 700 : 400 }}
                >
                  {s.label}
                </div>
                {s.render ? (
                  <div tw="flex flex-1 pt-1">{s.render({ step, state })}</div>
                ) : null}
              </div>
              {step === i + 1 && s.description && (
                <div
                  tw="text-3xl mt-2"
                  style={{ color: primaryColor(0.54), lineHeight: "1.5" }}
                >
                  {typeof s.description === "string"
                    ? s.description
                    : s.description({ step, state })}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}

export async function GET(req: NextRequest) {
  const stepStr = req.nextUrl.searchParams.get("step");
  const stateStr = req.nextUrl.searchParams.get("state");
  const step = stepStr ? parseInt(stepStr, 10) : 0;
  const state = stateStr ? JSON.parse(stateStr) : {};

  return createImageResponse(
    step === 0 ? (
      <IntroImage />
    ) : step === 6 ? (
      <ReviewImage state={state} />
    ) : (
      <Image step={step} state={state} />
    )
  );
}
