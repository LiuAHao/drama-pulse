const colorMap: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  success: 'bg-emerald-100 text-emerald-700',
  visible: 'bg-emerald-100 text-emerald-700',
  running: 'bg-blue-100 text-blue-700',
  pending: 'bg-amber-100 text-amber-700',
  candidate: 'bg-amber-100 text-amber-700',
  warning: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
  timeout: 'bg-red-100 text-red-700',
  disabled: 'bg-red-100 text-red-700',
  hidden: 'bg-gray-100 text-gray-600',
  blocked: 'bg-gray-100 text-gray-600',
  deleted: 'bg-gray-100 text-gray-600',
};

export function StatusBadge({ status }: { status: string }) {
  const cls = colorMap[status] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}
