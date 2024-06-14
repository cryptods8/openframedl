import CredentialsProvider from "next-auth/providers/credentials";
import { createAppClient, viemConnector } from "@farcaster/auth-client";
import { NextAuthOptions } from "next-auth";

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
      },
      async authorize(credentials, req) {
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

        return {
          id: fid.toString(),
          name: fid.toString(),
          image: credentials?.pfp,
        };
      },
    }),
  ],
  callbacks: {
    session: async ({ session, token }) => {
      const fid = token?.sub;
      const user = session.user ? { ...session.user, fid } : undefined;
      if (!user || !fid) {
        return session;
      }
      return { ...session, user };
    },
  },
};
