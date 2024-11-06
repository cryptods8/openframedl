export function createCast(data: { text: string; embeds: string[] }) {
  window.parent?.postMessage(
    {
      type: "createCast",
      data: { cast: data },
    },
    "*"
  );
}
