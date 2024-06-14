export function Container({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const cn = `max-w-xs md:max-w-screen-sm lg:max-w-screen-lg xl:max-w-screen-xl mx-auto ${
    className ? className : ""
  }`;
  return <div className={cn}>{children}</div>;
}
