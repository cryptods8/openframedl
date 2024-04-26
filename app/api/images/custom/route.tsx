import { ImageResponse } from "@vercel/og";
import { options, primaryColor } from "../../../generate-image";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div
      tw="flex w-full h-full items-center justify-center bg-white"
      style={{ fontFamily: "Inter", color: primaryColor() }}
    >
      {children}
    </div>
  );
}

function CreateCustomFramedlImage({
  message,
  word,
  success,
}: {
  message?: string;
  word?: string;
  success?: boolean;
}) {
  return (
    <Layout>
      <div
        tw="flex flex-col p-24 items-center justify-center text-center text-4xl w-full h-full relative"
        style={{ gap: "1rem", backgroundColor: primaryColor(0.04) }}
      >
        <div
          tw="flex flex-1 flex-col text-6xl items-center justify-center"
          style={{
            fontFamily: "SpaceGrotesk",
            gap: "1rem",
          }}
        >
          <div tw="flex" style={{ gap: "0.5rem" }}>
            {[...Array(5)].map((_, i) => {
              const random = Math.random();
              const style = success
                ? { backgroundColor: "green", color: "white" }
                : random > 0.67
                ? { backgroundColor: "green", color: "white" }
                : random > 0.33
                ? { backgroundColor: "orange", color: "white" }
                : {
                    backgroundColor: primaryColor(0.12),
                    color: primaryColor(),
                  };
              return (
                <div
                  key={i}
                  tw="flex w-16 h-16 items-center justify-center text-4xl"
                  style={{
                    ...style,
                    fontFamily: "Inter",
                    fontWeight: 600,
                    lineHeight: 1,
                  }}
                >
                  {word?.charAt(i)?.toUpperCase() ??
                    String.fromCharCode(65 + Math.floor(Math.random() * 26))}
                </div>
              );
            })}
          </div>
          {success ? (
            <div
              tw="flex pt-6"
              style={{ whiteSpace: "pre-wrap", lineHeight: "1.2" }}
            >
              Now just share it with your friends!
            </div>
          ) : (
            <div tw="flex pt-6" style={{ whiteSpace: "pre-wrap" }}>
              Create a custom <b>Framedl</b> game
            </div>
          )}
          {!success && (
            <div tw="flex text-5xl" style={{ whiteSpace: "pre-wrap" }}>
              for your friends (or enemies)
            </div>
          )}
        </div>
        {success ? (
          <div
            tw="flex flex-wrap"
            style={{
              color: primaryColor(0.54),
              whiteSpace: "pre-wrap",
              lineHeight: "1.2",
            }}
          >
            The more plays you get, the more points you earn!
          </div>
        ) : (
          <div tw="flex flex-wrap" style={{ color: primaryColor(0.54) }}>
            Enter any 5-letter word. It can be made-up.
          </div>
        )}
        {message && (
          <div
            tw="flex bottom-16 absolute rounded text-white px-12 py-6 text-5xl shadow-xl"
            style={{ backgroundColor: primaryColor() }}
          >
            {message}
          </div>
        )}
      </div>
    </Layout>
  );
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const params = url.searchParams;
  const msg = params.get("msg") as string | undefined;
  const success = params.get("success") === "1";
  const word = params.get("word") as string | undefined;

  return new ImageResponse(
    <CreateCustomFramedlImage success={success} word={word} message={msg} />,
    options
  );
}
