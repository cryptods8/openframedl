import { useEffect } from "react";
import confetti from "canvas-confetti";

export function GameConfetti({ shapes }: { shapes?: string[] }) {
  useEffect(() => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const confettiShapes = (shapes ?? ["🟨", "🟩", "⬜"]).map((s) =>
      confetti.shapeFromText({ text: s })
    );

    const defaults = {
      startVelocity: 30,
      spread: 360,
      ticks: 60,
      zIndex: 1000,
      shapes: confettiShapes,
    };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 100 * (timeLeft / duration);

      // since particles fall down, start a bit higher than random
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);

    return () => clearInterval(interval);
  }, [shapes]);
  return <></>;
}
