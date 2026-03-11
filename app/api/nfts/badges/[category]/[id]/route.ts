import { externalBaseUrl } from "@/app/constants";
import { NextResponse } from "next/server";

const WINS_VALUES = [1, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
const STREAKS_VALUES = [7, 14, 30, 50, 100, 250, 365, 500, 730, 1095, 1460, 1825, 3650];
const FOURDLE_VALUES = [4, 14, 24, 44, 104, 144, 244, 444, 844, 1444, 4444];
const WORDONE_VALUES = [1, 5, 10, 25, 50, 100];

function getBadgeMetadata(category: string, value: number) {
  let name = "";
  let description = "";
  let traitValue = "";
  let imagePath = "";

  switch (category) {
    case "wins":
      if (!WINS_VALUES.includes(value)) return null;
      name = `Framedl ${value} Victory ${value === 1 ? "Badge" : "Club"}`;
      description = `Awarded for achieving ${value} total victories in Framedl.`;
      traitValue = `${value} Victories`;
      imagePath = `/badges/wins/wins_${value}.png`;
      break;
    case "streaks":
      if (!STREAKS_VALUES.includes(value)) return null;
      const label = value === 7 ? "Week" : 
                    value === 14 ? "Bi-Week" : 
                    value === 30 ? "Month" : 
                    value === 365 ? "Year" : 
                    value === 730 ? "2 Years" :
                    value === 1095 ? "3 Years" :
                    value === 1460 ? "4 Years" :
                    value === 1825 ? "5 Years" :
                    value === 3650 ? "10 Years" : `${value} Day`;
      name = `Framedl ${label} Streak Badge`;
      description = `Awarded for maintaining a consecutive daily streak for ${value} days.`;
      traitValue = `${value} Day Streak`;
      imagePath = `/badges/streaks/streak_${value}.png`;
      break;
    case "fourdle":
      if (!FOURDLE_VALUES.includes(value)) return null;
      name = `Fourdle Club ${value}`;
      description = `Awarded for achieving ${value} victories using exactly 4 guesses.`;
      traitValue = `${value} Fourdle Wins`;
      imagePath = `/badges/fourdle/fourdle_${value}.png`;
      break;
    case "wordone":
      if (!WORDONE_VALUES.includes(value)) return null;
      name = `Word-in-One: ${value}`;
      description = `Awarded for achieving ${value} victories on the very first guess.`;
      traitValue = `${value} First Guess Wins`;
      imagePath = `/badges/wordone/wordone_${value}.png`;
      break;
    default:
      return null;
  }

  return {
    name,
    description,
    image: `${externalBaseUrl}${imagePath}`,
    external_url: `${externalBaseUrl}`,
    attributes: [
      {
        trait_type: "Category",
        value: category.charAt(0).toUpperCase() + category.slice(1),
      },
      {
        trait_type: "Achievement",
        value: traitValue,
      },
      {
        trait_type: "Rank",
        value: getRank(category, value),
      }
    ],
  };
}

function getRank(category: string, value: number) {
  const values = category === "wins" ? WINS_VALUES : 
                 category === "streaks" ? STREAKS_VALUES : 
                 category === "fourdle" ? FOURDLE_VALUES : WORDONE_VALUES;
  const index = values.indexOf(value);
  const totalSteps = values.length;
  const tierNames = ["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND", "MYTHIC"];
  const tierIdx = Math.min(Math.floor(index / (totalSteps / 5 + 1)), 5);
  return tierNames[tierIdx];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ category: string; id: string }> },
) {
  const { category, id } = await params;
  
  let val: number;
  if (id.startsWith("0x")) {
    val = parseInt(id, 16);
  } else {
    val = parseInt(id, 10);
  }

  const metadata = getBadgeMetadata(category, val);

  if (!metadata) {
    return NextResponse.json({ error: "Badge not found" }, { status: 404 });
  }

  return NextResponse.json(metadata, {
    headers: {
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
