// /* eslint-disable react/jsx-key */
// import { Button } from "frames.js/next";

// import { frames } from "../../frames";

// const handleRequest = frames(async (ctx) => {
//   const { validationResult } = ctx;

//   if (validationResult && !validationResult.isValid) {
//     throw new Error("Invalid message");
//   }

//   const query = new URLSearchParams();
//   const imageUrl = ctx.createSignedUrl({
//     pathname: "/api/images/custom",
//     query,
//   });

//   return {
//     image: imageUrl,
//     textInput: "Enter a 5-letter word...",
//     buttons: [
//       <Button
//         action="post"
//         target={ctx.createUrlWithBasePath("/custom/create")}
//       >
//         Create
//       </Button>,
//     ],
//   };
// });

// export const POST = handleRequest;
// export const GET = handleRequest;
