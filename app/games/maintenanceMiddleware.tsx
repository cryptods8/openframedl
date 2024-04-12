/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import { FramesMiddleware } from "frames.js/types";

export const maintenanceMiddleware: FramesMiddleware<any, any> = async (
  ctx,
  next
) => {
  if (process.env.MAINTENANCE === "true") {
    return {
      state: {},
      image: (
        <div tw="flex flex-col text-center items-center justify-center p-20">
          <div tw="text-4xl text-slate-900 mb-2">
            Framedl is undergoing maintenance
          </div>
          <div tw="text-3xl text-slate-600">
            Soon it'll be all over and you can finally relax
          </div>
        </div>
      ),
      buttons: [
        <Button action="post">Try again</Button>,
        <Button action="link" target={"https://warpcast.com/ds8"}>
          Support
        </Button>,
      ],
    };
  }
  return next();
};
