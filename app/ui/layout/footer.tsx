import Link from "next/link";

export function Footer() {
  return (
    <div className="text-center mt-8 text-sm text-primary-900/50 pb-8">
      Framedl made by{" "}
      <Link
        href="https://warpcast.com/ds8"
        className="underline hover:text-primary-900/80"
      >
        ds8
      </Link>
    </div>
  );
}
