import { toUrlSearchParams } from "../utils";

export const allowedQueryParams = ["uid", "ip", "date", "days", "type", "n"];

export function toLeaderboardSearchParams(
  obj: Record<string, string | string[] | undefined>
) {
  return toUrlSearchParams(obj, { allowedParams: allowedQueryParams });
}
