export const PanelTitle = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <h3
      className={`font-space font-semibold text-sm text-primary-900/50 uppercase tracking-wide ${className}`}
    >
      {children}
    </h3>
  );
};
