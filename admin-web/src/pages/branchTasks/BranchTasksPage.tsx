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
import type { BranchOption, BranchTask, BranchTaskDetail, Episode, PaginatedData } from '../../shared/types';

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
  const [fixedDetailTarget, setFixedDetailTarget] = useState<Episode | null>(null);
  const [fixedOptionDetailTarget, setFixedOptionDetailTarget] = useState<BranchOption | null>(null);

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

  const finalEpisodesQuery = useQuery({
    queryKey: ['admin', 'episodes', 'branchable'],
    queryFn: () => apiRequest<Episode[]>('/admin/episodes'),
  });

  const finalEpisodes = (finalEpisodesQuery.data ?? []).filter((episode) => episode.isFinalEpisode && episode.hasBranch);
  const fixedEpisodeId = fixedDetailTarget?.id || '';

  const fixedBranchesQuery = useQuery({
    queryKey: ['admin', 'fixedBranchOptions', fixedEpisodeId],
    queryFn: () => apiRequest<BranchOption[]>(`/episodes/${fixedEpisodeId}/branch-options`),
    enabled: fixedEpisodeId.length > 0,
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

  const renderPrettyJson = (raw: string) => {
    if (!raw || raw === '[]' || raw === '{}') return '-';
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  };

  const summarizeText = (value: string, maxLength = 90) => {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (!normalized) return '-';
    return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
  };

  const hasStructuredPayload = (raw: string) => {
    return Boolean(raw && raw !== '[]' && raw !== '{}');
  };

  return (
    <>
      <PageHeader title="分支任务" />

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-base font-semibold text-gray-900">固定分支条目</h2>
            <p className="mt-1 text-sm text-gray-500">按短剧尾集查看固定分支。主页只保留条目摘要，点击后查看完整分支详情。</p>
          </div>
          <div className="text-xs text-gray-400">共 {finalEpisodes.length} 个可分支尾集</div>
        </div>

        <div className="mt-5">
          {finalEpisodesQuery.isLoading ? (
            <LoadingBlock />
          ) : finalEpisodes.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full min-w-[920px] text-sm bg-white">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
                    <th className="px-4 py-3 font-medium">短剧</th>
                    <th className="px-4 py-3 font-medium">尾集</th>
                    <th className="px-4 py-3 font-medium">状态</th>
                    <th className="px-4 py-3 font-medium">分支数</th>
                    <th className="px-4 py-3 font-medium">说明</th>
                    <th className="px-4 py-3 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {finalEpisodes.map((episode) => (
                    <tr key={episode.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{episode.drama?.title ?? episode.dramaId}</div>
                        <div className="mt-1 text-xs text-gray-500 font-mono">{episode.dramaId}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-900">E{episode.episodeNo} {episode.title}</div>
                        <div className="mt-1 text-xs text-gray-500 font-mono">{episode.id}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
                          已启用固定分支
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">2 个</td>
                      <td className="px-4 py-3 text-gray-500">
                        点击后查看完整的 Hook、正文、分镜和 Shot Prompt
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setFixedDetailTarget(episode)}
                          className="text-sm text-blue-600 hover:underline cursor-pointer"
                        >
                          查看详情
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState message="当前还没有可展示的固定分支条目" />
          )}
        </div>
      </div>

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
            <table className="w-full min-w-[1560px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">用户ID</th>
                  <th className="px-4 py-3 font-medium">剧集</th>
                  <th className="px-4 py-3 font-medium">Prompt</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">流水线阶段</th>
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
                    <td className="px-4 py-3">
                      {task.pipelineStage ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">{task.pipelineStage}</span>
                      ) : '-'}
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
                        <div><span className="text-gray-500">配图状态：</span>{detailQuery.data.task.imageTaskStatus || '-'}</div>
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

                  <div className="rounded-lg border border-gray-200 p-4">
                    <div className="text-xs text-gray-500 mb-2">流水线信息</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-gray-500">分支类型：</span>{detailQuery.data.task.branchType || '-'}</div>
                      <div><span className="text-gray-500">流水线阶段：</span>{detailQuery.data.task.pipelineStage || '-'}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="text-xs text-gray-500 mb-2">Storyboard JSON</div>
                      <pre className="overflow-x-auto rounded-md bg-gray-50 p-3 text-xs text-gray-700">{prettyJson(detailQuery.data.task.storyboardJson)}</pre>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="text-xs text-gray-500 mb-2">Prompt Package</div>
                      <pre className="overflow-x-auto rounded-md bg-gray-50 p-3 text-xs text-gray-700">{prettyJson(detailQuery.data.task.promptPackageJson)}</pre>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="text-xs text-gray-500 mb-2">Story Expansion</div>
                      <pre className="overflow-x-auto rounded-md bg-gray-50 p-3 text-xs text-gray-700">{prettyJson(detailQuery.data.task.storyExpansionJson)}</pre>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="text-xs text-gray-500 mb-2">Shot Prompts</div>
                      <pre className="overflow-x-auto rounded-md bg-gray-50 p-3 text-xs text-gray-700">{prettyJson(detailQuery.data.task.shotPromptJson)}</pre>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="text-xs text-gray-500 mb-2">Storyboard Images</div>
                      <pre className="overflow-x-auto rounded-md bg-gray-50 p-3 text-xs text-gray-700">{prettyJson(detailQuery.data.task.storyboardImagesJson)}</pre>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="text-xs text-gray-500 mb-2">Storyboard Manifest</div>
                      <pre className="overflow-x-auto rounded-md bg-gray-50 p-3 text-xs text-gray-700">{prettyJson(detailQuery.data.task.storyboardManifestJson)}</pre>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="text-xs text-gray-500 mb-2">Reference Assets</div>
                      <pre className="overflow-x-auto rounded-md bg-gray-50 p-3 text-xs text-gray-700">{prettyJson(detailQuery.data.task.referenceAssetsJson)}</pre>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="text-xs text-gray-500 mb-2">Narration Payload</div>
                      <pre className="overflow-x-auto rounded-md bg-gray-50 p-3 text-xs text-gray-700">{prettyJson(detailQuery.data.task.narrationPayloadJson)}</pre>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="text-xs text-gray-500 mb-2">Image Task Payload</div>
                      <pre className="overflow-x-auto rounded-md bg-gray-50 p-3 text-xs text-gray-700">{prettyJson(detailQuery.data.task.imageTaskPayloadJson)}</pre>
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

      {fixedDetailTarget && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <div className="h-full w-full max-w-4xl overflow-y-auto bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">固定分支详情</h3>
                <p className="mt-1 text-xs text-gray-500">
                  {fixedDetailTarget.drama?.title ?? fixedDetailTarget.dramaId} / E{fixedDetailTarget.episodeNo} {fixedDetailTarget.title}
                </p>
              </div>
              <button
                onClick={() => {
                  setFixedDetailTarget(null);
                  setFixedOptionDetailTarget(null);
                }}
                className="text-sm text-gray-500 hover:text-gray-800 cursor-pointer"
              >
                关闭
              </button>
            </div>

            <div className="p-6">
              {fixedBranchesQuery.isLoading ? (
                <LoadingBlock />
              ) : fixedBranchesQuery.data && fixedBranchesQuery.data.length > 0 ? (
                <div className="space-y-4">
                  {fixedBranchesQuery.data.map((option) => (
                    <div key={option.id} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3">
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                              固定分支 {option.sortIndex}
                            </span>
                            <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600">
                              {option.status}
                            </span>
                          </div>
                          <h4 className="mt-3 text-2xl font-semibold tracking-tight text-gray-900">{option.title}</h4>
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                            <span>{option.generatedAt ? `生成于 ${new Date(option.generatedAt).toLocaleString('zh-CN')}` : '尚未生成时间'}</span>
                            <span>尾集固定走向</span>
                          </div>
                        </div>

                        <div className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 lg:max-w-xs">
                          <div className="text-xs font-medium tracking-wide text-gray-500">生成状态</div>
                          <div className="mt-3 space-y-2 text-sm text-gray-700">
                            <div className="flex items-center justify-between gap-3">
                              <span>分镜</span>
                              <span className={hasStructuredPayload(option.storyboardJson) ? 'text-emerald-600' : 'text-gray-400'}>
                                {hasStructuredPayload(option.storyboardJson) ? '已生成' : '未生成'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span>图文 Manifest</span>
                              <span className={hasStructuredPayload(option.storyboardManifestJson) ? 'text-emerald-600' : 'text-gray-400'}>
                                {hasStructuredPayload(option.storyboardManifestJson) ? '已生成' : '未生成'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span>分镜配图信息</span>
                              <span className={hasStructuredPayload(option.storyboardImagesJson) ? 'text-emerald-600' : 'text-gray-400'}>
                                {hasStructuredPayload(option.storyboardImagesJson) ? '已生成' : '未生成'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span>Shot Prompt</span>
                              <span className={hasStructuredPayload(option.shotPromptJson) ? 'text-emerald-600' : 'text-gray-400'}>
                                {hasStructuredPayload(option.shotPromptJson) ? '已生成' : '未生成'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span>结果标签</span>
                              <span className={hasStructuredPayload(option.resultTagsJson) ? 'text-emerald-600' : 'text-gray-400'}>
                                {hasStructuredPayload(option.resultTagsJson) ? '已生成' : '未生成'}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => setFixedOptionDetailTarget(option)}
                            className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 cursor-pointer"
                          >
                            查看完整详情
                          </button>
                        </div>
                      </div>

                      <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3">
                        <div className="text-xs font-medium tracking-wide text-slate-500">一句话概览</div>
                        <div className="mt-2 text-sm leading-6 text-slate-800">
                          {option.description || '-'}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
                        <div className="rounded-xl border border-gray-200 p-4">
                          <div className="text-xs font-medium tracking-wide text-gray-500">看点 Hook</div>
                          <div className="mt-2 text-base leading-7 text-gray-900">
                            {option.resultHook || '-'}
                          </div>
                        </div>

                        <div className="rounded-xl border border-gray-200 p-4">
                          <div className="text-xs font-medium tracking-wide text-gray-500">剧情摘要</div>
                          <div className="mt-2 text-sm leading-7 text-gray-700">
                            {summarizeText(option.resultStory, 140)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="当前尾集还没有可展示的固定分支内容" />
              )}
            </div>
          </div>
        </div>
      )}

      {fixedOptionDetailTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-6">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">固定分支完整详情</h3>
                <p className="mt-1 text-xs text-gray-500">
                  {fixedOptionDetailTarget.title} / {fixedOptionDetailTarget.id}
                </p>
              </div>
              <button
                onClick={() => setFixedOptionDetailTarget(null)}
                className="text-sm text-gray-500 hover:text-gray-800 cursor-pointer"
              >
                关闭
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div className="rounded-lg border border-gray-200 p-4">
                <div className="text-xs text-gray-500 mb-2">分支概述</div>
                <div className="text-sm text-gray-800 whitespace-pre-wrap leading-6">
                  {fixedOptionDetailTarget.description || '-'}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <div className="text-xs text-gray-500 mb-2">结果 Hook</div>
                <div className="text-sm text-gray-800 whitespace-pre-wrap leading-6">
                  {fixedOptionDetailTarget.resultHook || '-'}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <div className="text-xs text-gray-500 mb-2">结果正文</div>
                <div className="text-sm text-gray-800 whitespace-pre-wrap leading-7">
                  {fixedOptionDetailTarget.resultStory || '-'}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <div className="text-xs text-gray-500 mb-2">Storyboard JSON</div>
                <pre className="overflow-x-auto rounded-md bg-gray-50 p-3 text-xs text-gray-700">
                  {renderPrettyJson(fixedOptionDetailTarget.storyboardJson)}
                </pre>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <div className="text-xs text-gray-500 mb-2">Shot Prompts</div>
                <pre className="overflow-x-auto rounded-md bg-gray-50 p-3 text-xs text-gray-700">
                  {renderPrettyJson(fixedOptionDetailTarget.shotPromptJson)}
                </pre>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <div className="text-xs text-gray-500 mb-2">Storyboard Images</div>
                <pre className="overflow-x-auto rounded-md bg-gray-50 p-3 text-xs text-gray-700">
                  {renderPrettyJson(fixedOptionDetailTarget.storyboardImagesJson)}
                </pre>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <div className="text-xs text-gray-500 mb-2">Storyboard Manifest</div>
                <pre className="overflow-x-auto rounded-md bg-gray-50 p-3 text-xs text-gray-700">
                  {renderPrettyJson(fixedOptionDetailTarget.storyboardManifestJson)}
                </pre>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <div className="text-xs text-gray-500 mb-2">Reference Assets</div>
                <pre className="overflow-x-auto rounded-md bg-gray-50 p-3 text-xs text-gray-700">
                  {renderPrettyJson(fixedOptionDetailTarget.referenceAssetsJson)}
                </pre>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <div className="text-xs text-gray-500 mb-2">Narration Payload</div>
                <pre className="overflow-x-auto rounded-md bg-gray-50 p-3 text-xs text-gray-700">
                  {renderPrettyJson(fixedOptionDetailTarget.narrationPayloadJson)}
                </pre>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <div className="text-xs text-gray-500 mb-2">结果标签</div>
                <pre className="overflow-x-auto rounded-md bg-gray-50 p-3 text-xs text-gray-700">
                  {renderPrettyJson(fixedOptionDetailTarget.resultTagsJson)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
