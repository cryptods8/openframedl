import { GuessCharacter } from "@/app/game/game-service";

export function primaryColor(opacity: number = 0.87) {
  return `rgba(31, 21, 55, ${opacity})`;
}

export function lightColor(opacity: number = 1) {
  return `rgba(255, 255, 255, ${opacity})`;
}

export function getGuessCharacterColorStyle(
  c: GuessCharacter | null | undefined,
  withLetter: boolean,
  dark?: boolean
) {
  if (!c) {
    return {
      color: primaryColor(),
      backgroundColor: "transparent",
      borderColor: dark ? lightColor(0.2) : primaryColor(0.24),
    };
  }
  if (c.status === "CORRECT") {
    return {
      color: "white",
      backgroundColor: "green",
      borderColor: "green",
    };
  }
  if (c.status === "WRONG_POSITION") {
    return {
      color: dark ? primaryColor() : "white",
      backgroundColor: "orange",
      borderColor: "orange",
    };
  }
  return {
    color: dark ? primaryColor() : "white",
    borderColor: "transparent",
    backgroundColor: withLetter
      ? dark
        ? lightColor(0.42)
        : primaryColor(0.42)
      : dark
      ? lightColor(0.24)
      : primaryColor(0.24),
  };
}
