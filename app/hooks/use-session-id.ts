export function useSessionId() {
  function generateId() {
    const id = Math.random().toString(36).substring(2);
    return id;
  }
  function getSessionId() {
    if (typeof localStorage !== "undefined") {
      const savedId = localStorage.getItem("game_sessionId");
      if (!savedId) {
        const id = generateId();
        localStorage.setItem("game_sessionId", id);
        return id;
      }
      return savedId;
    }
    return generateId();
  }
  return {
    sessionId: getSessionId(),
  };
}

