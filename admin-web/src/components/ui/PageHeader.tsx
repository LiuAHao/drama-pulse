export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}
