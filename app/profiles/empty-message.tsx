export function EmptyMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-8 text-2xl text-primary-900/30 text-center">
      {children}
    </div>
  );
}
