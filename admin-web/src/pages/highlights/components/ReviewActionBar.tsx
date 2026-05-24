interface Props {
  status: string;
  isDirty: boolean;
  isSaving: boolean;
  isConfirming: boolean;
  isDisabling: boolean;
  onSave: () => void;
  onConfirm: () => void;
  onDisable: () => void;
}

export function ReviewActionBar({
  status,
  isDirty,
  isSaving,
  isConfirming,
  isDisabling,
  onSave,
  onConfirm,
  onDisable,
}: Props) {
  return (
    <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
      <button
        onClick={onSave}
        disabled={!isDirty || isSaving}
        className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40 cursor-pointer disabled:cursor-default"
      >
        {isSaving ? '保存中...' : '保存修改'}
      </button>

      <div className="flex-1" />

      {status !== 'confirmed' && (
        <button
          onClick={onConfirm}
          disabled={isConfirming}
          className="px-3 py-1.5 text-sm rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
        >
          {isConfirming ? '确认中...' : '确认高光'}
        </button>
      )}

      {status !== 'disabled' && (
        <button
          onClick={onDisable}
          disabled={isDisabling}
          className="px-3 py-1.5 text-sm rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
        >
          {isDisabling ? '禁用中...' : '禁用候选'}
        </button>
      )}

      {status === 'confirmed' && (
        <span className="text-xs text-emerald-600 font-medium">已确认</span>
      )}
      {status === 'disabled' && (
        <span className="text-xs text-red-500 font-medium">已禁用</span>
      )}
    </div>
  );
}
