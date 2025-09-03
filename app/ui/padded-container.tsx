"use client";

import { ClientContext } from "../app/v2/use-client-context";

type PaddedContainerSides = "trbl" | "trb" | "trl" | "tr" | "tbl" | "tb" | "tl" | "t" | "rbl" | "rb" | "rl" | "r" | "bl" | "b" | "l";

export function PaddedContainer({
  children,
  context,
  sides = "trbl",
  className,
}: {
  children: React.ReactNode;
  context: ClientContext;
  sides?: PaddedContainerSides;
  className?: string;
}) {
  const safeAreaInsets = context?.client?.safeAreaInsets;
  const style = {
    paddingTop: sides.includes("t") ? safeAreaInsets?.top : 0,
    paddingBottom: sides.includes("b") ? safeAreaInsets?.bottom : 0,
    paddingLeft: sides.includes("l") ? safeAreaInsets?.left : 0,
    paddingRight: sides.includes("r") ? safeAreaInsets?.right : 0,
  };
  return <div style={style} className={className}>{children}</div>;
}
