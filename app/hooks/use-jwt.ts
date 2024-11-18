"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

function getFromLocalStorage() {
  if (typeof window === "undefined") {
    return undefined;
  }
  return localStorage.getItem("jwt");
}

function saveToLocalStorage(jwt: string) {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem("jwt", jwt);
}

export function useJwt() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const jwt = searchParams.get("jwt") as string | undefined;

  useEffect(() => {
    if (!jwt) {
      return;
    }

    saveToLocalStorage(jwt);

    // const newSearchParams = new URLSearchParams(searchParams.toString());
    // newSearchParams.delete("jwt");
    // const query = newSearchParams.toString();
    // const newPathname = pathname + (query ? `?${query}` : "");
    // router.replace(newPathname);
  }, [jwt, router, searchParams, pathname]);

  function clear() {
    localStorage.removeItem("jwt");
  }

  return {
    jwt: jwt || getFromLocalStorage() || undefined,
    clear,
  };
}
