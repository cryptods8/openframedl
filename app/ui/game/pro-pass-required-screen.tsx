"use client";

import Image from "next/image";
import { Button as UIButton, ButtonProps } from "../button/button";
import NextLink from "next/link";
import { useCallback, useState } from "react";
import sdk from "@farcaster/frame-sdk";

const Link = ({
  href,
  onClick,
  className,
  children,
}: React.ComponentProps<typeof NextLink>) => {
  const handleClick = useCallback(
    (
      e:
        | React.MouseEvent<HTMLButtonElement>
        | React.MouseEvent<HTMLAnchorElement>
    ) => {
      if (href) {
        sdk.actions.openUrl(href.toString());
      }
      onClick?.(e as any);
    },
    [href, onClick]
  );

  return (
    <button onClick={handleClick} className={className}>
      {children}
    </button>
  );
};

const Button = ({ onClick, url, ...props }: ButtonProps & { url?: string }) => {
  const handleClick = useCallback(
    (
      e:
        | React.MouseEvent<HTMLButtonElement>
        | React.MouseEvent<HTMLAnchorElement>
    ) => {
      if (url) {
        sdk.actions.openUrl(url);
      }
      onClick?.(e as any);
    },
    [url, onClick]
  );

  return <UIButton onClick={handleClick} {...props} />;
};

export const ProPassRequiredScreen = () => {
  const [gettingPass, setGettingPass] = useState(false);

  return (
    <div className="flex flex-col h-full w-full p-8 items-center justify-center text-center gap-8">
      <div className="overflow-hidden rounded-md shadow-xl shadow-primary-500/5 max-w-xl hover:scale-105 transition-all duration-150 active:scale-100 active:shadow-primary-500/0">
        <Image
          src="/pro-full.png"
          alt="Framedl PRO"
          className="w-full aspect-square"
          width={2048}
          height={2048}
        />
      </div>
      <div className="flex flex-col gap-2 flex-1 justify-between">
        <p className="text-xl font-semibold text-primary-900/50">
          Framedl PRO Pass is required to play
        </p>
        <div className="flex flex-col gap-2">
          {gettingPass ? (
            <>
              <Button onClick={() => window.location.reload()}>
                I got it!
              </Button>
              <p className="text-primary-900/50 text-sm mt-2">
                <Link
                  href="https://hypersub.xyz/s/framedl-pro-1isvwy51xixog"
                  target="_blank"
                  className="text-primary-500 hover:text-primary-600"
                >
                  Get it again
                </Link>
              </p>
            </>
          ) : (
            <>
              <Button
                url="https://hypersub.xyz/s/framedl-pro-1isvwy51xixog"
                onClick={() => setGettingPass(true)}
              >
                Get Framedl PRO Pass
              </Button>
              <Button
                url="https://farcaster.xyz/miniapps/8IsRgNO4ssVz/framedl"
                variant="outline"
                size="sm"
              >
                Play regular Framedl
              </Button>
              <p className="text-primary-900/50 text-sm">
                Monthly membership costs 1000{" "}
                <Link
                  href="https://degen.tips"
                  target="_blank"
                  className="text-primary-500 hover:text-primary-600"
                >
                  $DEGEN
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
