export async function createCast(
  window: Window,
  data: { text: string; embeds: string[] }
) {
  window.parent?.postMessage(
    {
      type: "createCast",
      data: { cast: data },
    },
    "*"
  );
}
