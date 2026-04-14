"use client";

import { useSafeAreaInsets } from "../contexts/safe-area-context";

type PaddedContainerSides = "trbl" | "trb" | "trl" | "tr" | "tbl" | "tb" | "tl" | "t" | "rbl" | "rb" | "rl" | "r" | "bl" | "b" | "l";

export function PaddedContainer({
  children,
  sides = "trbl",
  className,
  extraBottom = 0,
}: {
  children: React.ReactNode;
  sides?: PaddedContainerSides;
  className?: string;
  extraBottom?: number;
}) {
  const { insets } = useSafeAreaInsets();
  const style = {
    paddingTop: sides.includes("t") ? insets.top : 0,
    paddingBottom: sides.includes("b")
      ? insets.bottom + extraBottom
      : extraBottom || 0,
    paddingLeft: sides.includes("l") ? insets.left : 0,
    paddingRight: sides.includes("r") ? insets.right : 0,
  };
  return <div style={style} className={className}>{children}</div>;
}
