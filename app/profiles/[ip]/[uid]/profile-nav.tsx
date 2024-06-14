"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Container } from "@/app/ui/layout/container";

interface ProfileNavProps {
  isCurrentUser: boolean;
}

function NavLink({
  href,
  children,
  active,
}: React.PropsWithChildren<{ href: string; active: boolean }>) {
  return (
    <Link
      href={href}
      className={`text-center rounded-full md:min-w-28 font-semibold px-4 py-2.5 text-sm md:px-5 md:py-3 md:text-base hover:bg-primary-800 hover:text-white transition duration-150 ease-in-out ${
        active ? "bg-primary-800 text-white" : "text-primary-800/90"
      }`}
    >
      {children}
    </Link>
  );
}

export function ProfileNav({ isCurrentUser }: ProfileNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tab = searchParams.get("tab");

  function createHref(tab?: string) {
    const params = new URLSearchParams(searchParams);
    if (tab) {
      params.set("tab", tab);
    } else {
      params.delete("tab");
    }
    return `${pathname}?${params.toString()}`;
  }

  return (
    <Container className="flex-1 flex gap-x-2 gap-y-1 px-2 flex-wrap">
      <NavLink active={!tab} href={createHref()}>
        Games
      </NavLink>
      <NavLink active={tab === "stats"} href={createHref("stats")}>
        Stats
      </NavLink>
      {isCurrentUser && (
        <NavLink active={tab === "words"} href={createHref("words")}>
          My words
        </NavLink>
      )}
    </Container>
  );
}
