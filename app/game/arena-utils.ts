import { ArenaAudienceMember } from "../db/pg/types";

export function buildArenaShareText({ audience, audienceSize } : { audience: ArenaAudienceMember[], audienceSize: number }): string {
  const audienceString = audience.reduce((res, a, idx, all) => {
    const username = a.username ? `@${a.username}` : `!${a.userId}`;
    if (idx === 0) {
      return username;
    }
    const separator = idx === all.length - 1 ? " and " : ", ";
    return `${res}${separator}${username}`;
  }, "");

  const freeSlots = audienceSize - audience.length;
  let message: string;
  if (audienceString) {
    const freeSlotMessage =
      freeSlots > 0
        ? `\n\nPlus there ${
            freeSlots === 1
              ? "is 1 more free slot"
              : `are ${freeSlots} more free slots`
          } for anyone to join.`
        : "";
    message = `Hey, ${audienceString}! You are invited to cross words in Framedl Arena.${freeSlotMessage}\n\nLet the best one win!`;
  } else {
    message = `Hey, you are all invited to cross words in Framedl Arena! There ${
      freeSlots === 1 ? "is" : "are"
    } ${freeSlots} free slot${
      freeSlots === 1 ? "" : "s"
    } for anyone to join the fun.\n\nLet the best one win!`;
  }

  return message;
}
