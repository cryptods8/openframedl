import Link from "next/link";
import { ProgressBarIcon } from "../icons/progress-bar-icon";

interface CommonProps {
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
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
  loading = false,
  ...props
}: ButtonProps) {
  const className = `w-full flex items-center justify-center text-center font-semibold rounded-md border transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed ${
    variant === "primary"
      ? "bg-primary-500 text-white hover:bg-primary-600 disabled:hover:bg-primary-500 active:bg-primary-700 disabled:active:bg-primary-500 border-transparent"
      : variant === "outline"
      ? "border-primary-500/20 text-primary-900/80 bg-white hover:bg-primary-100 disabled:hover:bg-white active:bg-primary-200 disabled:active:bg-white"
      : "bg-white text-primary-900/80 hover:bg-white/50 disabled:hover:bg-white active:bg-white/50 disabled:active:bg-white border-transparent"
  } ${
    size === "md"
      ? "text-base px-6 py-4 gap-2"
      : size === "lg"
      ? "text-lg px-8 py-6 gap-3"
      : "text-sm px-4 py-2 gap-2"
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
      {loading && (
        <div
          className={`animate-spin ${
            size === "sm" ? "size-4" : size === "md" ? "size-5" : "size-6"
          }`}
        >
          <ProgressBarIcon />
        </div>
      )}
      {children}
    </button>
  );
}
