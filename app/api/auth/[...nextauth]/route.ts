import NextAuth from "next-auth";

import { authOptions } from "@/app/lib/auth";

const handler = NextAuth(authOptions);

export const GET = handler;
export const POST = handler;
