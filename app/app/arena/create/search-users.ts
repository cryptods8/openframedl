export interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfp?: {
    url: string;
  };
}

interface SearchResult {
  result: {
    users: FarcasterUser[];
  };
}

export async function searchUsers(
  query: string,
  signal?: AbortSignal
): Promise<SearchResult> {
  return await fetch(`/api/users/search?q=${encodeURIComponent(query)}`, {
    signal,
  }).then((res) => res.json());
}
