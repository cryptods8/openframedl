import { useEffect, useState } from "react";

export function useSessionId() {
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    function generateId() {
      return Math.random().toString(36).substring(2);
    }
    if (typeof localStorage !== "undefined") {
      let savedId = localStorage.getItem("game_sessionId");
      if (!savedId) {
        savedId = generateId();
        localStorage.setItem("game_sessionId", savedId);
      }
      setSessionId(savedId);
    }
  }, []);

  return {
    sessionId,
  };
}

