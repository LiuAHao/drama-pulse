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
import type { BranchTask, BranchTaskDetail, PaginatedData } from '../../shared/types';

const PAGE_SIZE = 20;

type FilterDraft = {
  status: string;
  dramaId: string;
  episodeId: string;
};

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
  const initialDraft = { status: '', dramaId: '', episodeId: '' };
  const [draft, setDraft] = useState<FilterDraft>(initialDraft);
  const [applied, setApplied] = useState<FilterDraft & { page: number }>({ ...initialDraft, page: 1 });
  const [retryTarget, setRetryTarget] = useState<BranchTask | null>(null);
  const [detailTarget, setDetailTarget] = useState<BranchTask | null>(null);

  const filters: Record<string, string> = { page: String(applied.page), pageSize: String(PAGE_SIZE) };
  if (applied.status) filters.status = applied.status;
  if (applied.dramaId.trim()) filters.dramaId = applied.dramaId.trim();
  if (applied.episodeId.trim()) filters.episodeId = applied.episodeId.trim();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: queryKeys.branchTasks(filters),
    queryFn: () => {
      const params = new URLSearchParams(filters);
      return apiRequest<PaginatedData<BranchTask>>(`/admin/branch-tasks?${params.toString()}`);
    },
  });

  const detailQuery = useQuery({
    queryKey: detailTarget ? queryKeys.branchTaskDetail(detailTarget.id) : ['admin', 'branchTask', 'empty'],
    queryFn: () => apiRequest<BranchTaskDetail>(`/admin/branch-tasks/${detailTarget?.id ?? ''}`),
    enabled: detailTarget !== null,
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
    setDraft((current) => ({ ...current, status: value }));
    setApplied((current) => ({ ...current, status: value, page: 1 }));
  };

  const formatDate = (value: string | null) => {
    if (!value) return '-';
    return new Date(value).toLocaleString('zh-CN');
  };

  const formatDuration = (startedAt: string | null, finishedAt: string | null) => {
    if (!startedAt || !finishedAt) return '-';
    const durationMs = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
    if (durationMs < 1000) return `${durationMs}ms`;
    return `${(durationMs / 1000).toFixed(1)}s`;
  };

  const prettyJson = (raw: string) => {
    if (!raw) return '-';
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  };

  const handleRetryConfirm = () => {
    if (retryTarget) {
      retryMutation.mutate(retryTarget.id);
      setRetryTarget(null);
    }
  };

  const handleSearch = () => {
    setApplied({ ...draft, page: 1 });
  };

  const handleReset = () => {
    setDraft(initialDraft);
    setApplied({ ...initialDraft, page: 1 });
  };

  return (
    <>
      <PageHeader title="分支任务" />

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleStatusChange(opt.value)}
            className={`px-3 py-1.5 text-sm rounded-md cursor-pointer ${
              applied.status === opt.value
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
        <input
          type="text"
          value={draft.dramaId}
          onChange={(event) => setDraft((current) => ({ ...current, dramaId: event.target.value }))}
          placeholder="按短剧 ID 筛选"
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          value={draft.episodeId}
          onChange={(event) => setDraft((current) => ({ ...current, episodeId: event.target.value }))}
          placeholder="按剧集 ID 筛选"
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSearch}
          className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 cursor-pointer"
        >
          搜索
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-1.5 bg-white border border-gray-300 text-sm text-gray-600 rounded-md hover:bg-gray-50 cursor-pointer"
        >
          重置
        </button>
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : items.length === 0 ? (
        <EmptyState message="暂无分支任务数据" />
      ) : (
        <>
          {isFetching && <p className="mb-3 text-xs text-gray-400">正在刷新数据…</p>}
          <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
            <table className="w-full min-w-[1360px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">用户ID</th>
                  <th className="px-4 py-3 font-medium">剧集</th>
                  <th className="px-4 py-3 font-medium">Prompt</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">结果标题</th>
                  <th className="px-4 py-3 font-medium">互动</th>
                  <th className="px-4 py-3 font-medium">失败原因</th>
                  <th className="px-4 py-3 font-medium">执行耗时</th>
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
                      <div className="font-medium text-gray-800">{task.drama?.title ?? '-'}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {task.episode ? `E${task.episode.episodeNo} ${task.episode.title}` : task.episodeId}
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate" title={task.userPrompt}>
                      {task.userPrompt}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="px-4 py-3">{task.resultTitle || '-'}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      <div>赞 {task.count?.likes ?? 0}</div>
                      <div className="mt-1">评 {task.count?.comments ?? 0}</div>
                    </td>
                    <td className="px-4 py-3">
                      {task.failReason ? (
                        <span className="text-red-600">{task.failReason}</span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatDuration(task.startedAt, task.finishedAt)}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">{task.retryCount}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(task.createdAt).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-2">
                        <button
                          onClick={() => setDetailTarget(task)}
                          className="text-sm text-blue-600 hover:underline cursor-pointer"
                        >
                          详情
                        </button>
                        {(task.status === 'failed' || task.status === 'timeout') && (
                          <button
                            onClick={() => setRetryTarget(task)}
                            className="text-sm text-blue-600 hover:underline cursor-pointer"
                          >
                            重试
                          </button>
                        )}
                      </div>
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

      <ConfirmDialog
        open={retryTarget !== null}
        title="确认重试"
        message={`确定要重试任务 ${retryTarget?.id ?? ''} 吗？`}
        onConfirm={handleRetryConfirm}
        onCancel={() => setRetryTarget(null)}
      />

      {detailTarget && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <div className="h-full w-full max-w-3xl overflow-y-auto bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">分支任务详情</h3>
                <p className="mt-1 text-xs text-gray-500">{detailTarget.id}</p>
              </div>
              <button
                onClick={() => setDetailTarget(null)}
                className="text-sm text-gray-500 hover:text-gray-800 cursor-pointer"
              >
                关闭
              </button>
            </div>

            <div className="p-6">
              {detailQuery.isLoading || !detailQuery.data ? (
                <LoadingBlock />
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="text-xs text-gray-500 mb-2">内容判断</div>
                      <div className="space-y-2 text-sm">
                        <div><span className="text-gray-500">短剧：</span>{detailQuery.data.task.drama?.title ?? '-'}</div>
                        <div><span className="text-gray-500">剧集：</span>{detailQuery.data.task.episode?.title ?? detailQuery.data.task.episodeId}</div>
                        <div><span className="text-gray-500">结果标题：</span>{detailQuery.data.task.resultTitle || '-'}</div>
                        <div><span className="text-gray-500">结果 Hook：</span>{detailQuery.data.task.resultHook || '-'}</div>
                        <div><span className="text-gray-500">互动：</span>赞 {detailQuery.data.task.count?.likes ?? 0} / 评 {detailQuery.data.task.count?.comments ?? 0}</div>
                      </div>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="text-xs text-gray-500 mb-2">执行状态</div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">状态：</span>
                          <StatusBadge status={detailQuery.data.task.status} />
                        </div>
                        <div><span className="text-gray-500">创建时间：</span>{formatDate(detailQuery.data.task.createdAt)}</div>
                        <div><span className="text-gray-500">开始时间：</span>{formatDate(detailQuery.data.task.startedAt)}</div>
                        <div><span className="text-gray-500">结束时间：</span>{formatDate(detailQuery.data.task.finishedAt)}</div>
                        <div><span className="text-gray-500">执行耗时：</span>{detailQuery.data.durationMs === null ? '-' : formatDuration(detailQuery.data.task.startedAt, detailQuery.data.task.finishedAt)}</div>
                        <div><span className="text-gray-500">失败原因：</span>{detailQuery.data.task.failReason || '-'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 p-4">
                    <div className="text-xs text-gray-500 mb-2">用户 Prompt</div>
                    <div className="text-sm text-gray-800 whitespace-pre-wrap">{detailQuery.data.task.userPrompt}</div>
                  </div>

                  <div className="rounded-lg border border-gray-200 p-4">
                    <div className="text-xs text-gray-500 mb-2">结果正文</div>
                    <div className="text-sm text-gray-800 whitespace-pre-wrap leading-6">
                      {detailQuery.data.task.resultStory || '-'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs text-gray-500">分支评论</div>
                        <div className="text-xs text-gray-400">{detailQuery.data.comments.length} 条</div>
                      </div>
                      {detailQuery.data.comments.length === 0 ? (
                        <div className="text-sm text-gray-400">暂无评论</div>
                      ) : (
                        <div className="space-y-3">
                          {detailQuery.data.comments.map((comment) => (
                            <div key={comment.id} className="rounded-md border border-gray-100 bg-gray-50 p-3">
                              <div className="flex items-center justify-between gap-3 text-xs text-gray-500">
                                <span className="font-mono">{comment.userId}</span>
                                <span>{formatDate(comment.createdAt)}</span>
                              </div>
                              <div className="mt-2 text-sm text-gray-800 whitespace-pre-wrap">{comment.content}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs text-gray-500">点赞记录</div>
                        <div className="text-xs text-gray-400">{detailQuery.data.likes.length} 条</div>
                      </div>
                      {detailQuery.data.likes.length === 0 ? (
                        <div className="text-sm text-gray-400">暂无点赞</div>
                      ) : (
                        <div className="space-y-3">
                          {detailQuery.data.likes.map((like) => (
                            <div key={like.id} className="rounded-md border border-gray-100 bg-gray-50 p-3 text-sm">
                              <div className="font-mono text-xs text-gray-600">{like.userId}</div>
                              <div className="mt-1 text-xs text-gray-500">{formatDate(like.createdAt)}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="text-xs text-gray-500 mb-2">Storyboard JSON</div>
                      <pre className="overflow-x-auto rounded-md bg-gray-50 p-3 text-xs text-gray-700">{prettyJson(detailQuery.data.task.storyboardJson)}</pre>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="text-xs text-gray-500 mb-2">结果标签</div>
                      <pre className="overflow-x-auto rounded-md bg-gray-50 p-3 text-xs text-gray-700">{prettyJson(detailQuery.data.task.resultTagsJson)}</pre>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="text-xs text-gray-500 mb-2">结果互动选项</div>
                      <pre className="overflow-x-auto rounded-md bg-gray-50 p-3 text-xs text-gray-700">{prettyJson(detailQuery.data.task.resultInteractionOptionsJson)}</pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
