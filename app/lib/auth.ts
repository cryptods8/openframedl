import CredentialsProvider from "next-auth/providers/credentials";
import { createAppClient, viemConnector } from "@farcaster/auth-client";
import { getServerSession, NextAuthOptions, Session } from "next-auth";
import { verifyJwt } from "./jwt";
import { UserKey } from "../game/game-repository";
import { UserData } from "../game/game-repository";
import { loadUserData } from "../games/user-data";
import { isProduction } from "../constants";

export const domain = process.env.NEXT_PUBLIC_DOMAIN!;
if (!domain) {
  throw new Error("Make sure you set NEXT_PUBLIC_DOMAIN in your .env file");
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Sign in with Farcaster",
      credentials: {
        message: {
          label: "Message",
          type: "text",
          placeholder: "0x0",
        },
        signature: {
          label: "Signature",
          type: "text",
          placeholder: "0x0",
        },
        // In a production app with a server, these should be fetched from
        // your Farcaster data indexer rather than have them accepted as part
        // of credentials.
        name: {
          label: "Name",
          type: "text",
          placeholder: "0x0",
        },
        pfp: {
          label: "Pfp",
          type: "text",
          placeholder: "0x0",
        },
        jwt: {
          label: "JWT",
          type: "text",
          placeholder: "0x0",
        },
      },
      async authorize(credentials, req) {
        const jwt = credentials?.jwt;
        if (jwt) {
          const verifiedToken = verifyJwt(jwt);
          if (verifiedToken) {
            const { userKey, userData } = verifiedToken as {
              userKey: UserKey;
              userData?: UserData;
            };
            return {
              id: userKey.userId,
              name: userData?.username,
              image: userData?.profileImage,
              userData,
            };
          }
        }
        const {
          body: { csrfToken },
        } = req as { body: { csrfToken: string } };

        const appClient = createAppClient({
          ethereum: viemConnector(),
        });

        const verifyResponse = await appClient.verifySignInMessage({
          message: credentials?.message as string,
          signature: credentials?.signature as `0x${string}`,
          domain: domain,
          nonce: csrfToken,
        });
        const { success, fid } = verifyResponse;

        if (!success) {
          return null;
        }

        const userData = await loadUserData({
          identityProvider: "fc",
          userId: fid.toString(),
        });

        return {
          id: fid.toString(),
          name: userData?.username,
          image: userData?.profileImage,
          userData,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user && "userData" in user) {
        token.userData = user.userData;
      }
      return token;
    },
    session: async ({ session, token }) => {
      const fid = token?.sub;
      const userData = token?.userData;
      const user = session.user
        ? { ...session.user, fid, userData }
        : undefined;
      if (!user || !fid || !userData) {
        return session;
      }
      return { ...session, user };
    },
  },
  cookies:
    isProduction
      ? {
          sessionToken: {
            name: "__Secure-next-auth.session-token",
            options: {
              httpOnly: true,
              sameSite: "none",
              path: "/",
              secure: true,
            },
          },
          csrfToken: {
            name: "__Secure-next-auth.csrf-token",
            options: {
              httpOnly: true,
              sameSite: "none",
              secure: true,
            },
          },
          callbackUrl: {
            name: "__Secure-next-auth.callback-url",
            options: {
              httpOnly: true,
              sameSite: "none",
              secure: true,
            },
          },
        }
      : {},
};

export async function getFarcasterSession() {
  return (await getServerSession(authOptions)) as FarcasterSession | null;
}

export async function getUserInfoFromJwtOrSession(
  jwt?: string
): Promise<UserInfo> {
  const { userData, userKey: userKeyFromJwt } = jwt
    ? verifyJwt<{ userData?: UserData; userKey: UserKey }>(jwt)
    : { userData: null, userKey: null };
  if (userKeyFromJwt) {
    return { userData, userKey: userKeyFromJwt };
  }
  const session = await getFarcasterSession();
  const user = session?.user;
  if (user) {
    return {
      userData: user.userData,
      userKey: { userId: user.fid, identityProvider: "fc" as const },
    };
  }
  return {
    userData: null,
    userKey: { userId: "0", identityProvider: "anon" as const },
    anonymous: true,
  };
}

export async function getFarcasterUserFromJwtOrSession(jwt?: string) {
  const { userData, userKey } = await getUserInfoFromJwtOrSession(jwt);
  return {
    image: userData?.profileImage,
    name: userData?.username,
    fid: userKey.userId,
    userData,
  };
}

export interface UserInfo {
  userData?: UserData | null;
  userKey: UserKey;
  anonymous?: boolean;
}

export interface FarcasterUser {
  image?: string;
  name?: string;
  fid: string;
  userData?: UserData;
}

export interface FarcasterSession extends Omit<Session, "user"> {
  user: FarcasterUser;
}
