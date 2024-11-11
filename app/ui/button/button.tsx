import Link from "next/link";

interface CommonProps {
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
}

interface BaseButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    CommonProps {}

interface BaseLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
    CommonProps {
  href: string;
}

type ButtonProps = BaseButtonProps | BaseLinkProps;

export function Button({
  children,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  const className = `w-full text-center font-semibold rounded-md border transition-all duration-100 ${
    variant === "primary"
      ? "bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 border-transparent"
      : variant === "outline"
      ? "border-primary-500/20 text-primary-900/80 bg-white hover:bg-primary-100 active:bg-primary-200"
      : "bg-white text-primary-900/80 hover:bg-white/50 active:bg-white/50 border-transparent"
  } ${
    size === "md"
      ? "text-base px-6 py-4"
      : size === "lg"
      ? "text-lg px-8 py-6"
      : "text-sm px-4 py-2"
  }`;
  if ("href" in props) {
    return (
      <Link className={className} {...props}>
        {children}
      </Link>
    );
  }
  return (
    <button className={className} {...props}>
      {children}
    </button>
  );
}
