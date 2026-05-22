import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../services/apiClient';
import { queryKeys } from '../../services/queryKeys';
import { PageHeader } from '../../components/ui/PageHeader';
import { LoadingBlock } from '../../components/ui/LoadingBlock';
import { EmptyState } from '../../components/ui/EmptyState';
import type { InteractionEvent, PaginatedData } from '../../shared/types';

const PAGE_SIZE = 20;

export function InteractionsPage() {
  const [highlightId, setHighlightId] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [page, setPage] = useState(1);

  const filters: Record<string, string> = { page: String(page), pageSize: String(PAGE_SIZE) };
  if (highlightId) filters.highlightId = highlightId;
  if (deviceId) filters.deviceId = deviceId;

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.interactions(filters),
    queryFn: () => {
      const params = new URLSearchParams(filters);
      return apiRequest<PaginatedData<InteractionEvent>>(
        `/admin/interactions?${params.toString()}`,
      );
    },
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSearch = () => {
    setPage(1);
  };

  return (
    <>
      <PageHeader title="互动事件" />

      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          value={highlightId}
          onChange={(e) => setHighlightId(e.target.value)}
          placeholder="高光ID"
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          placeholder="设备ID"
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 cursor-pointer"
        >
          搜索
        </button>
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : items.length === 0 ? (
        <EmptyState message="暂无互动事件数据" />
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
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
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50 cursor-pointer disabled:cursor-default"
              >
                上一页
              </button>
              <span>
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
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
