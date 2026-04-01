import { GameIdentityProvider } from "@/app/game/game-repository";
import { gameService } from "@/app/game/game-service";
import { getDailyGameKey } from "@/app/game/game-utils";

export interface PayoutRecipient {
  fid: string;
  username: string;
  amount: number; // whole DEGEN tokens
}

export function getTotalRungValue(i: number, peopleCount: number): number {
  if (peopleCount <= 0 || i >= 3) {
    return 0;
  }
  if (i === 0) {
    return 4 + getTotalRungValue(i + 1, peopleCount - 1);
  }
  if (i === 1) {
    return 2 + getTotalRungValue(i + 1, peopleCount - 1);
  }
  if (i === 2) {
    return 1 + getTotalRungValue(i + 1, peopleCount - 1);
  }
  return 0;
}

export function getPiBonusMultiplier(score: number): number {
  const diff = 3.14 - Math.floor(score * 100) / 100;
  if (diff < 0) {
    return 0;
  }
  return 1 + Math.floor(diff / 0.07);
}

export async function calculatePayouts(options: {
  date: string;
  days?: number;
  prize: number;
  piBonus: number;
  identityProvider: GameIdentityProvider;
}): Promise<PayoutRecipient[]> {
  const { date, days, prize, piBonus, identityProvider } = options;

  const leaderboard = await gameService.loadLeaderboard(identityProvider, {
    date,
    days,
    type: "DATE_RANGE",
  });

  const res: {
    score: number;
    people: { fid: string; username: string; isOg: boolean }[];
  }[] = [];
  let count = 0;
  const leaderboardDays =
    "days" in leaderboard.metadata ? leaderboard.metadata.days : 14;

  for (let i = 0; i < leaderboard.entries.length; i++) {
    const entry = leaderboard.entries[i]!;
    const prev = res[res.length - 1];
    const isOg =
      entry.userData?.passOwnership === "BASIC_AND_OG" ||
      entry.userData?.passOwnership === "OG";
    const username = entry.userData?.username
      ? `@${entry.userData.username}`
      : `@!${entry.userId}`;

    if (!prev || prev.score !== entry.totalGuessCount) {
      if (count >= 3) {
        break;
      }
      res.push({
        score: entry.totalGuessCount,
        people: [{ fid: entry.userId, username, isOg }],
      });
    } else {
      prev.people.push({ fid: entry.userId, username, isOg });
    }
    count++;
  }

  const recipients: PayoutRecipient[] = [];
  let pos = 1;
  const basePrize = prize / 7;

  for (let i = 0; i < res.length; i++) {
    const entry = res[i]!;
    const peopleCount = entry.people.length;
    const totalRungValue = getTotalRungValue(pos - 1, peopleCount);
    const allocatedPrize = totalRungValue * basePrize;

    for (let j = 0; j < peopleCount; j++) {
      const person = entry.people[j]!;
      const prizeCoef = person.isOg ? 1 : 0.5;
      const personPrize = Math.ceil(
        (allocatedPrize * prizeCoef) / peopleCount
      );
      const bonus = Math.ceil(
        (getPiBonusMultiplier(entry.score / leaderboardDays) *
          piBonus *
          prizeCoef) /
          peopleCount
      );
      const amount = personPrize + bonus;
      if (amount > 0) {
        recipients.push({ fid: person.fid, username: person.username, amount });
      }
    }
    pos += peopleCount;
  }

  return recipients;
}
