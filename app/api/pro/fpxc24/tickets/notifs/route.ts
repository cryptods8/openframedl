import { NextResponse } from "next/server";
import { Alchemy, Network } from "alchemy-sdk";

import fpxcTickets from "./fpxcTickets.json";

import { pgDb } from "@/app/db/pg/pg-db";

const config = {
  apiKey: process.env.ALCHEMY_API_KEY,
  network: Network.BASE_MAINNET,
};
const alchemy = new Alchemy(config);

async function getAllSignups() {
  return await pgDb
    .selectFrom("championshipSignup")
    .where("roundNumber", "=", 2)
    .selectAll()
    .execute();
}

async function getTicketOwners() {
  const data = await alchemy.nft.getOwnersForNft(
    "0x402ae0eb018c623b14ad61268b786edd4ad87c56",
    6
  );
  return data?.owners.map((o) => o.toLowerCase());
}

async function getVerifiedAddresses(fid: number) {
  // /v1/verificationsByFid?fid=2
  const resp = await fetch(
    `https://hubs.airstack.xyz/v1/verificationsByFid?fid=${fid}`,
    { headers: { "x-airstack-hubs": process.env.AIRSTACK_API_KEY! } }
  ).then((r) => r.json());
  return resp?.messages?.reduce((acc: string[], m: any) => {
    const data = m.data?.verificationAddEthAddressBody;
    if (data?.protocol === "PROTOCOL_ETHEREUM") {
      acc.push(data.address.toLowerCase());
    }
    return acc;
  }, []);
}

async function sendNotification(fid: number) {
  const message = `
Hey! 👋

I noticed you signed up for Framedl PRO Xmas Cup 2024 but haven't minted your ticket yet.

Minting is now LIVE but closes Sunday at midnight UTC (less than 3 days remaining). Once closed, there will be no other way to get a ticket.

Mint your ticket here: https://zora.co/collect/base:0x402ae0eb018c623b14ad61268b786edd4ad87c56/6

See you at the tournament!
🟩🟨⬜
`;
  const apiKey = process.env.MY_DC_API_KEY;

  console.log(`[${new Date().toISOString()}] sending`, fid);
  const resp = await fetch("https://api.farcaster.xyz/v2/ext-send-direct-cast", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipientFid: fid,
      message,
      idempotencyKey: `fpxc24-ticket-notif-1-${fid}`,
    }),
  });
  console.log(`[${new Date().toISOString()}] sent`, fid, resp.status);
}
export const dynamic = "force-dynamic";

export async function GET() {
  const [allSignups, ticketOwners] = await Promise.all([
    getAllSignups(),
    getTicketOwners(),
  ]);

  const peopleRaw = [];
  for (const signup of allSignups) {
    const addresses = await getVerifiedAddresses(parseInt(signup.userId, 10));
    peopleRaw.push({
      userId: signup.userId,
      identityProvider: signup.identityProvider,
      userData: signup.userData,
      addresses,
    });
  }
  const foundOwners: string[] = [];
  const people = peopleRaw.map((person) => {
    let found = false;
    for (const address of person.addresses) {
      if (ticketOwners.includes(address)) {
        foundOwners.push(address);
        found = true;
      }
    }
    return { ...person, hasTicket: found };
  });
  const unknownOwners = ticketOwners.filter(
    (owner) => !foundOwners.includes(owner)
  );

  return NextResponse.json({
    people,
    unknownOwners,
  });
}

export async function POST(req: Request) {
  let count = 0;
  for (const p of fpxcTickets.people) {
    if (p.hasTicket) {
      console.log("has ticket", p.userId, p.userData.username);
    } else if ("donate" in p && p.donate) {
      console.log("donate", p.userId, p.userData.username);
    } else {
      // await sendNotification(parseInt(p.userId, 10));
      await new Promise((resolve) => setTimeout(resolve, 500));
      count++;
    }
  }
  // await sendNotification(642883);
  return NextResponse.json({ success: true, count });
}
