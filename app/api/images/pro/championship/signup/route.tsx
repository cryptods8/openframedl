import { externalBaseUrl } from "@/app/constants";
import { findChampionshipSignupById } from "@/app/game/championship-signup-pg-repository";
import { UserData } from "@/app/game/game-repository";
import { primaryColor } from "@/app/generate-image";
import { createImageResponse } from "@/app/utils/image-response";
import { NextRequest } from "next/server";

function FramedlText({ text, pfp }: { text: string; pfp?: string | null }) {
  return (
    <div
      tw="flex flex-row flex-wrap items-center justify-center"
      style={{ gap: "0.5rem", maxWidth: "30rem" }}
    >
      {pfp && (
        <div tw="w-20 h-20 flex">
          <img src={pfp} alt="PFP" tw="w-full h-full" />
        </div>
      )}
      {text.split("").map((l, idx) => {
        return (
          <div
            key={idx}
            tw="text-5xl w-20 h-20 text-white flex items-center justify-center"
            style={{
              border: "4px solid",
              borderColor: l === "_" ? primaryColor(0.24) : "transparent",
              backgroundColor:
                l === "_"
                  ? "transparent"
                  : /\w|\./g.test(l)
                  ? "green"
                  : /[\?\!@]/g.test(l)
                  ? "orange"
                  : primaryColor(0.12),
              color: /[\w\?\!\.@]/g.test(l) ? "white" : primaryColor(),
              textTransform: "uppercase",
              fontWeight: 600,
              lineHeight: 1,
            }}
          >
            {l === "_" ? " " : l}
          </div>
        );
      })}
    </div>
  );
}

function SignupImage({ user, shared }: { user?: User; shared: boolean }) {
  const text = user
    ? shared
      ? getSharedText(user)
      : getSuccessText(user)
    : " Will you join us?____________";

  return (
    <div tw="w-full h-full bg-white flex relative">
      <div
        tw="flex flex-row text-4xl h-full w-full relative items-center justify-center"
        style={{
          backgroundColor: primaryColor(0.04),
          color: primaryColor(),
          fontFamily: "Inter",
        }}
      >
        <div
          tw="flex flex-col items-center justify-center h-full bg-white"
          style={{ gap: "3rem" }}
        >
          <div tw="flex flex-col items-center justify-center h-full p-12">
            <FramedlText text={text} pfp={user?.userData?.profileImage} />
          </div>
        </div>
        <div
          tw="flex flex-1 flex-col items-center justify-center p-8 h-full relative"
          style={{
            gap: "2.5rem",
            borderLeft: `1px solid ${primaryColor(0.2)}`,
          }}
        >
          <div
            tw="flex flex-col items-center"
            style={{
              fontFamily: "SpaceGrotesk",
              color: primaryColor(),
              gap: "0.5rem",
            }}
          >
            <div tw="flex items-center" style={{ whiteSpace: "pre-wrap" }}>
              <b>Framedl</b> <b style={{ color: "green" }}>PRO</b>
            </div>
            <div
              tw="px-3 py-1 rounded text-white flex items-center justify-center"
              style={{ backgroundColor: "green" }}
            >
              <b>Word Cup 2024</b>
            </div>
          </div>
          <img
            src={`${externalBaseUrl}/cup.png`}
            alt="Framedl Cup"
            width="236"
            height="278"
          />
          <div
            tw="text-center text-3xl flex flex-wrap"
            style={{
              color: primaryColor(0.54),
              lineHeight: "1.33",
              maxWidth: "25rem",
            }}
          >
            {`14,000 $DEGEN in prizes. More soon. Stay tuned!`}
          </div>
          {user && !shared && (
            <div tw="absolute left-0 top-0 bottom-0 right-0 flex items-center justify-center p-12">
              <div
                tw="flex items-center justify-center flex-wrap text-white py-6 px-8 rounded-md text-4xl shadow-lg text-center"
                style={{
                  backgroundColor: primaryColor(0.84),
                  lineHeight: 1.33,
                }}
              >
                {"You're on the waitlist. Thank you for signing up!"}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getSuccessText(user: User) {
  const username = user.userData?.username ?? user.userId;

  // let baseStr = `Congrats @${username}`;
  // if (baseStr.length > 28) {
  //   baseStr = baseStr.substring(0, 25) + "...!";
  // }
  // return baseStr + "_".repeat(29 - baseStr.length);
  return getTrimmedText("Congrats @", username, "!");
}

function getSharedText(user: User) {
  // const username = user.userData?.username ?? user.userId;

  return getTrimmedText("I am in!", "     ", " Are   you?");
}

function getTrimmedText(prefix: string, trimmable: string, suffix: string) {
  const maxLen = 29;
  const len = prefix.length + trimmable.length + suffix.length;
  let trimmed = trimmable;
  if (len > maxLen) {
    trimmed =
      trimmable.substring(0, maxLen - prefix.length - suffix.length - 3) +
      "...";
  }
  const newLen = prefix.length + trimmed.length + suffix.length;
  return prefix + trimmed + suffix + "_".repeat(maxLen - newLen);
}

interface User {
  userId: string;
  userData: UserData | null | undefined;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const sid = url.searchParams.get("sid");
  const shr = url.searchParams.get("shr");
  let user: User | undefined;
  if (sid) {
    const signup = await findChampionshipSignupById(parseInt(sid, 10));
    if (signup) {
      user = { userId: signup.userId, userData: signup.userData };
    }
  }

  return createImageResponse(<SignupImage user={user} shared={shr === "1"} />);
}
