"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

function getFromLocalStorage() {
  if (typeof window === "undefined") {
    return undefined;
  }
  return localStorage.getItem("jwt") || undefined;
}

function saveToLocalStorage(jwt: string) {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem("jwt", jwt);
}

export function useJwt() {
  const searchParams = useSearchParams();
  const urlJwt = searchParams.get("jwt") as string | undefined;
  const [jwt, setJwt] = useState<string | undefined>(urlJwt);

  useEffect(() => {
    if (urlJwt) {
      saveToLocalStorage(urlJwt);
      setJwt(urlJwt);
    } else {
      const stored = getFromLocalStorage();
      if (stored) {
        setJwt(stored);
      }
    }
  }, [urlJwt]);

  function clear() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("jwt");
    }
    setJwt(undefined);
  }

  return {
    jwt,
    clear,
  };
}
