import Link from "next/link";

export function NavLink({
  href,
  children,
  active,
}: React.PropsWithChildren<{ href: string; active: boolean }>) {
  return (
    <Link
      href={href}
      className={`text-center rounded-full font-semibold px-4 py-2.5 text-sm transition duration-150 ease-in-out ${
        active ? "bg-primary-800 text-white" : "text-primary-800/90 hover:bg-primary-200 hover:text-primary-800/90"
      }`}
    >
      {children}
    </Link>
  );
}

