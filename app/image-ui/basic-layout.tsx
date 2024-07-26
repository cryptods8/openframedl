export function BasicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      tw="flex items-stretch w-full h-full bg-white text-4xl"
      style={{ fontFamily: "Inter" }}
    >
      <div tw="flex w-full h-full items-center justify-center relative">
        {children}
      </div>
    </div>
  );
}
