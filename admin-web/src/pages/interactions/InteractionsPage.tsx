import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../services/apiClient';
import { queryKeys } from '../../services/queryKeys';
import { PageHeader } from '../../components/ui/PageHeader';
import { LoadingBlock } from '../../components/ui/LoadingBlock';
import { EmptyState } from '../../components/ui/EmptyState';
import type { InteractionEvent, PaginatedData } from '../../shared/types';

const PAGE_SIZE = 20;

type FilterDraft = {
  highlightId: string;
  episodeId: string;
  deviceId: string;
};

type AppliedFilters = FilterDraft & {
  page: number;
};

const inputClass =
  'px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

export function InteractionsPage() {
  const initialDraft = { highlightId: '', episodeId: '', deviceId: '' };
  const [draft, setDraft] = useState<FilterDraft>(initialDraft);
  const [applied, setApplied] = useState<AppliedFilters>({ ...initialDraft, page: 1 });

  const filters = useMemo(() => {
    const next: Record<string, string> = {
      page: String(applied.page),
      pageSize: String(PAGE_SIZE),
    };
    if (applied.highlightId.trim()) next.highlightId = applied.highlightId.trim();
    if (applied.episodeId.trim()) next.episodeId = applied.episodeId.trim();
    if (applied.deviceId.trim()) next.deviceId = applied.deviceId.trim();
    return next;
  }, [applied]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: queryKeys.interactions(filters),
    queryFn: () => {
      const params = new URLSearchParams(filters);
      return apiRequest<PaginatedData<InteractionEvent>>(`/admin/interactions?${params.toString()}`);
    },
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSearch = () => {
    setApplied({ ...draft, page: 1 });
  };

  const handleReset = () => {
    setDraft(initialDraft);
    setApplied({ ...initialDraft, page: 1 });
  };

  return (
    <>
      <PageHeader title="互动事件" />

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input
          type="text"
          value={draft.highlightId}
          onChange={(e) => setDraft((current) => ({ ...current, highlightId: e.target.value }))}
          placeholder="高光ID"
          className={inputClass}
        />
        <input
          type="text"
          value={draft.episodeId}
          onChange={(e) => setDraft((current) => ({ ...current, episodeId: e.target.value }))}
          placeholder="剧集ID"
          className={inputClass}
        />
        <input
          type="text"
          value={draft.deviceId}
          onChange={(e) => setDraft((current) => ({ ...current, deviceId: e.target.value }))}
          placeholder="设备ID"
          className={inputClass}
        />
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 cursor-pointer"
        >
          搜索
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-white border border-gray-300 text-sm text-gray-600 rounded-md hover:bg-gray-50 cursor-pointer"
        >
          重置
        </button>
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : items.length === 0 ? (
        <EmptyState message="暂无互动事件数据" />
      ) : (
        <>
          {isFetching && <p className="mb-3 text-xs text-gray-400">正在刷新数据…</p>}
          <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
            <table className="w-full min-w-[1080px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">用户ID</th>
                  <th className="px-4 py-3 font-medium">设备ID</th>
                  <th className="px-4 py-3 font-medium">高光ID</th>
                  <th className="px-4 py-3 font-medium">互动类型</th>
                  <th className="px-4 py-3 font-medium">选项文本</th>
                  <th className="px-4 py-3 font-medium">服务端时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{item.id}</td>
                    <td className="px-4 py-3 font-mono text-xs">{item.userId}</td>
                    <td className="px-4 py-3 font-mono text-xs">{item.deviceId}</td>
                    <td className="px-4 py-3 font-mono text-xs">{item.highlightId}</td>
                    <td className="px-4 py-3">{item.interactionType}</td>
                    <td className="px-4 py-3">{item.optionText}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(item.serverTimestamp).toLocaleString('zh-CN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
            <span>共 {total} 条</span>
            <div className="flex items-center gap-2">
              <button
                disabled={applied.page <= 1}
                onClick={() => setApplied((current) => ({ ...current, page: current.page - 1 }))}
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50 cursor-pointer disabled:cursor-default"
              >
                上一页
              </button>
              <span>
                {applied.page} / {totalPages}
              </span>
              <button
                disabled={applied.page >= totalPages}
                onClick={() => setApplied((current) => ({ ...current, page: current.page + 1 }))}
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50 cursor-pointer disabled:cursor-default"
              >
                下一页
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
