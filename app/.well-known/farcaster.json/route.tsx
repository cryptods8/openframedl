import { NextResponse } from "next/server";

// @ts-ignore
import { externalBaseUrl, isProduction } from "@/app/constants";

const accountAssociation = isProduction
  ? {
      accountAssociation: {
        header:
          "eyJmaWQiOjExMTI0LCJ0eXBlIjoiY3VzdG9keSIsImtleSI6IjB4ZENjODlEZjVGYzhENDJDNTQ0MzM4ODUzMWFGMTU1MUUwRmJkNUNBZCJ9",
        payload: "eyJkb21haW4iOiJmcmFtZWRsLnh5eiJ9",
        signature:
          "MHhhMzljN2EzZTJiZmU1NmZjZDM4YTgxNDkxMjk4YjcxZGZkNTk0ZmJmODBjN2I0YmUwNGU5ZjUwMTYyZjYyZTgzNDliNDllZGNjNjgzM2M0MmZiODZlNDMyMDNkYmU3YzlkZGJkNjJiYWU1M2Q5ZDllODY1YTk3MDk1YmMwODMzZTFj",
      },
    }
  : {
      header:
        "eyJmaWQiOjExMTI0LCJ0eXBlIjoiY3VzdG9keSIsImtleSI6IjB4ZENjODlEZjVGYzhENDJDNTQ0MzM4ODUzMWFGMTU1MUUwRmJkNUNBZCJ9",
      payload: "eyJkb21haW4iOiJmcm1kbC50dW5uLmRldiJ9",
      signature:
        "MHhhZThjODMxNTc1ZjAzMzkzZTA0MGNhNjE5ODhjMmUwZDQ0OTBmYTNmZmQ0NDMyYjIwYjU2MzhhOTM0MmMzOTdlMzZjNDJkYTIzODU4MjY1MmZkNjI5MTI4ZmU1YTkyNzQ4MTNiZTkwOGE3ZDRjYzQ1NWVmZjFiNjA4YjMwZTk5MjFj",
    };

export async function GET() {
  const manifest = {
    accountAssociation,
    frame: {
      version: "next",
      name: "Framedl",
      iconUrl: `${externalBaseUrl}/icon-v2.png`,
      splashImageUrl: `${externalBaseUrl}/splash-v2.png`,
      splashBackgroundColor: "#f3f0f9",
      homeUrl: `${externalBaseUrl}/app/v2`,
    },
  };
  return NextResponse.json(manifest);
}
