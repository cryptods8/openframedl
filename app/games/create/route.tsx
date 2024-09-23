/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";

import { frames } from "../frames";
// import { primaryColor, lightColor } from "@/app/image-ui/image-utils";
// import { options } from "@/app/generate-image";

// function Title({ children }: { children: React.ReactNode }) {
//   return (
//     <div
//       tw="text-5xl font-bold text-center"
//       style={{ fontFamily: "SpaceGrotesk" }}
//     >
//       {children}
//     </div>
//   );
// }

// function Subtitle({ children }: { children: React.ReactNode }) {
//   return <div tw="text-3xl text-center opacity-70">{children}</div>;
// }

// function Container({
//   children,
//   backgroundColor,
//   color,
// }: {
//   children: React.ReactNode;
//   backgroundColor: string;
//   color?: string;
// }) {
//   return (
//     <div
//       tw="flex flex-1 h-full items-center flex-col px-12 py-30"
//       style={{ backgroundColor, gap: "1.5rem", color }}
//     >
//       {children}
//     </div>
//   );
// }

const handleRequest = frames(async (ctx) => {
  const { validationResult } = ctx;

  if (validationResult && !validationResult.isValid) {
    throw new Error("Invalid message");
  }

  return {
    // image: (
    //   <div
    //     tw="flex flex-row items-center justify-center h-full w-full bg-white"
    //     style={{ color: primaryColor(), fontFamily: "Inter" }}
    //   >
    //     <Container backgroundColor={primaryColor()} color="white">
    //       <Title>Create Custom Word</Title>
    //       <Subtitle>Create your own word for your friends to guess</Subtitle>
    //       <div tw="flex flex-col flex-1 justify-center items-center pt-6 w-full">
    //         <div tw="flex" style={{ gap: "0.5rem" }}>
    //           {[...Array(5)].map((_, i) => {
    //             const random = Math.random();
    //             const style =
    //               random > 0.67
    //                 ? { backgroundColor: "green", color: "white" }
    //                 : random > 0.33
    //                 ? { backgroundColor: "orange", color: "white" }
    //                 : {
    //                     backgroundColor: lightColor(),
    //                     color: primaryColor(),
    //                   };
    //             return (
    //               <div
    //                 key={i}
    //                 tw="flex w-16 h-16 items-center justify-center text-4xl"
    //                 style={{
    //                   ...style,
    //                   fontFamily: "Inter",
    //                   fontWeight: 600,
    //                   lineHeight: 1,
    //                 }}
    //               >
    //                 {"GREAT".charAt(i)?.toUpperCase()}
    //               </div>
    //             );
    //           })}
    //         </div>
    //       </div>
    //     </Container>
    //     <Container backgroundColor={primaryColor(0.04)}>
    //       <Title>Create Arena</Title>
    //       <Subtitle>
    //         Create an arena for your friends to compete guessing one or more
    //         words
    //       </Subtitle>
    //       <div tw="flex flex-col flex-1 justify-center items-center pt-6 w-full">
    //         <div tw="flex pt-6 flex-col w-full" style={{ gap: "0.75rem" }}>
    //           {["alice", "bob", "vitalik"].map((name, idx) => (
    //             <div
    //               key={name}
    //               tw="flex w-full items-center"
    //               style={{ gap: "2rem" }}
    //             >
    //               <div
    //                 tw="flex w-12 h-12 items-center justify-center text-3xl rounded-full text-white"
    //                 style={{ backgroundColor: primaryColor(0.84 - idx * 0.12) }}
    //               >
    //                 {idx + 1}
    //               </div>
    //               <div tw="flex">@{name}</div>
    //               <div
    //                 tw="flex flex-1 h-2"
    //                 style={{ backgroundColor: primaryColor(0.04) }}
    //               />
    //               <div>{(3.14 + idx * 0.14).toFixed(2)}</div>
    //             </div>
    //           ))}
    //         </div>
    //       </div>
    //     </Container>
    //   </div>
    // ),
    image: ctx.createUrl("/create-frame.png"),
    // imageOptions: options,
    buttons: [
      <Button
        action="post"
        target={ctx.createUrlWithBasePath("/custom?from=create&new=1")}
      >
        My word
      </Button>,
      <Button
        action="post"
        target={ctx.createUrlWithBasePath("/arena/create?from=create")}
      >
        Arena
      </Button>,
    ],
  };
});

export const POST = handleRequest;
export const GET = handleRequest;
