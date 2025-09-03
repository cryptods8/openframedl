import { useSession } from "next-auth/react";
import { FarcasterSession } from "../lib/auth";

export const useFarcasterSession = () => {
  const { data: session, status } = useSession() as {
    data: FarcasterSession | null;
    status: "loading" | "unauthenticated" | "authenticated";
  };

  return {
    session,
    status,
  };
};