import clsx from "clsx";

export interface IconButtonProps extends React.ComponentProps<"button"> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "xs" | "sm" | "md" | "lg";
}

export function IconButton({
  size = "sm",
  variant = "outline",
  children,
  ...props
}: IconButtonProps) {
  const sizeClass =
    size === "xs"
      ? "w-6 h-6"
      : size === "sm"
      ? "w-8 h-8"
      : size === "md"
      ? "w-10 h-10"
      : "w-12 h-12";
  return (
    <button
      className={clsx(
        "flex items-center justify-center rounded-full hover:opacity-75 text-primary-900/80 transition duration-150 ease-in-out",
        sizeClass,
        variant === "primary" &&
          "border border-primary-200 bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 border-transparent",
        variant === "secondary" &&
          "border border-primary-200 bg-white text-primary-900/80 hover:bg-white/50 active:bg-white/50 border-transparent",
        variant === "outline" &&
          "border border-primary-500/20 text-primary-900/80 bg-white hover:bg-primary-100 active:bg-primary-200",
        variant === "ghost" && "bg-transparent hover:bg-primary-500/10"
      )}
      {...props}
    >
      {children}
    </button>
  );
}
