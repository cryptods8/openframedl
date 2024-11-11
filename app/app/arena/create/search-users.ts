/*
{
  "result": {
    "users": [
      {
        "fid": 1587,
        "username": "ds",
        "displayName": "Danny",
        "pfp": {
          "url": "https://i.imgur.com/lNFyapb.jpg",
          "verified": false
        },
        "profile": {
          "bio": {
            "text": "Human, Father, Building @fabric",
            "mentions": [
              "fabric"
            ]
          },
          "location": {
            "placeId": "ChIJSx6SrQ9T2YARed8V_f0hOg0",
            "description": "San Diego, CA, USA"
          }
        },
        "followerCount": 363,
        "followingCount": 142,
        "activeOnFcNetwork": true,
        "viewerContext": {
          "following": false,
          "followedBy": false,
          "enableNotifications": false
*/

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
  return await fetch(
    `https://client.warpcast.com/v2/search-users?q=${encodeURIComponent(
      query
    )}&limit=40`,
    { signal }
  ).then((res) => res.json());
}
