import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../services/apiClient';
import { queryKeys } from '../../services/queryKeys';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { getStatusLabel } from '../../components/ui/StatusBadge';
import { LoadingBlock } from '../../components/ui/LoadingBlock';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { toast } from '../../components/ui/Toast';
import type { BranchTask, PaginatedData } from '../../shared/types';

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { label: '全部', value: '' },
  { label: getStatusLabel('pending'), value: 'pending' },
  { label: getStatusLabel('running'), value: 'running' },
  { label: getStatusLabel('success'), value: 'success' },
  { label: getStatusLabel('failed'), value: 'failed' },
  { label: getStatusLabel('timeout'), value: 'timeout' },
  { label: getStatusLabel('blocked'), value: 'blocked' },
];

export function BranchTasksPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [retryTarget, setRetryTarget] = useState<BranchTask | null>(null);

  const filters: Record<string, string> = { page: String(page), pageSize: String(PAGE_SIZE) };
  if (status) filters.status = status;

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.branchTasks(filters),
    queryFn: () => {
      const params = new URLSearchParams(filters);
      return apiRequest<PaginatedData<BranchTask>>(
        `/admin/branch-tasks?${params.toString()}`,
      );
    },
  });

  const retryMutation = useMutation({
    mutationFn: (taskId: string) =>
      apiRequest<unknown>(`/admin/branch-tasks/${taskId}/retry`, { method: 'POST' }),
    onSuccess: () => {
      toast('重试已触发', 'success');
      queryClient.invalidateQueries({ queryKey: ['admin', 'branchTasks'] });
    },
    onError: () => {
      toast('重试失败', 'error');
    },
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleStatusChange = (value: string) => {
    setStatus(value);
    setPage(1);
  };

  const handleRetryConfirm = () => {
    if (retryTarget) {
      retryMutation.mutate(retryTarget.id);
      setRetryTarget(null);
    }
  };

  return (
    <>
      <PageHeader title="分支任务" />

      <div className="flex items-center gap-2 mb-4">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleStatusChange(opt.value)}
            className={`px-3 py-1.5 text-sm rounded-md cursor-pointer ${
              status === opt.value
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : items.length === 0 ? (
        <EmptyState message="暂无分支任务数据" />
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">用户ID</th>
                  <th className="px-4 py-3 font-medium">剧集</th>
                  <th className="px-4 py-3 font-medium">Prompt</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">结果标题</th>
                  <th className="px-4 py-3 font-medium">失败原因</th>
                  <th className="px-4 py-3 font-medium">重试次数</th>
                  <th className="px-4 py-3 font-medium">创建时间</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{task.id}</td>
                    <td className="px-4 py-3 font-mono text-xs">{task.userId}</td>
                    <td className="px-4 py-3">
                      {task.episode?.title ?? task.episodeId}
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate" title={task.userPrompt}>
                      {task.userPrompt}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="px-4 py-3">{task.resultTitle || '-'}</td>
                    <td className="px-4 py-3">
                      {task.failReason ? (
                        <span className="text-red-600">{task.failReason}</span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">{task.retryCount}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(task.createdAt).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-4 py-3">
                      {(task.status === 'failed' || task.status === 'timeout') && (
                        <button
                          onClick={() => setRetryTarget(task)}
                          className="text-sm text-blue-600 hover:underline cursor-pointer"
                        >
                          重试
                        </button>
                      )}
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

      <ConfirmDialog
        open={retryTarget !== null}
        title="确认重试"
        message={`确定要重试任务 ${retryTarget?.id ?? ''} 吗？`}
        onConfirm={handleRetryConfirm}
        onCancel={() => setRetryTarget(null)}
      />
    </>
  );
}
