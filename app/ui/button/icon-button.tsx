export interface IconButtonProps extends React.ComponentProps<"button"> {
  size?: "xs" | "sm";
}

export function IconButton({
  size = "sm",
  children,
  ...props
}: IconButtonProps) {
  const sizeClass = size === "xs" ? "w-6 h-6" : "w-8 h-8";
  return (
    <button
      className={`flex items-center justify-center rounded-full border border-primary-200 bg-white hover:opacity-75 text-primary-950 transition duration-150 ease-in-out ${sizeClass}`}
      {...props}
    >
      {children}
    </button>
  );
}
