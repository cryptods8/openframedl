import { sign, verify } from "jsonwebtoken";

const jwtSecret = process.env.JWT_SECRET || "";

export const signJwt = <T extends object>(payload: T) => {
  const jwt = sign(payload, jwtSecret);
  return jwt;
};

export const verifyJwt = <T extends object>(jwt: string) => {
  const payload: T = verify(jwt, jwtSecret) as T;
  return payload;
};
