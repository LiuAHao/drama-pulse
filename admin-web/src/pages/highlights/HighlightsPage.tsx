import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../services/apiClient';
import { queryKeys } from '../../services/queryKeys';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { getStatusLabel } from '../../components/ui/StatusBadge';
import { LoadingBlock } from '../../components/ui/LoadingBlock';
import { EmptyState } from '../../components/ui/EmptyState';
import { toast } from '../../components/ui/Toast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import type { Highlight, PaginatedData } from '../../shared/types';

const TYPE_OPTIONS = [
  { value: 'feel_good', label: 'feel_good' },
  { value: 'funny', label: 'funny' },
  { value: 'reversal', label: 'reversal' },
  { value: 'conflict', label: 'conflict' },
  { value: 'sweet', label: 'sweet' },
];

const TEMPLATE_OPTIONS = [
  { value: 'emotion_button', label: 'emotion_button' },
  { value: 'vote_side', label: 'vote_side' },
  { value: 'boost_action', label: 'boost_action' },
];

const STATUS_OPTIONS = [
  { value: 'candidate', label: getStatusLabel('candidate') },
  { value: 'confirmed', label: getStatusLabel('confirmed') },
  { value: 'disabled', label: getStatusLabel('disabled') },
];

const FILTER_STATUSES = ['all', 'candidate', 'confirmed', 'disabled'] as const;

interface EditForm {
  startTimeMs: number;
  endTimeMs: number;
  type: string;
  intensity: number;
  templateId: string;
  interactionOptionsJson: string;
  status: string;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function HighlightsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState<string>('candidate');
  const [episodeIdFilter, setEpisodeIdFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [disableTarget, setDisableTarget] = useState<Highlight | null>(null);

  // Build query filters
  const filters: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
  if (statusFilter !== 'all') filters.status = statusFilter;
  if (episodeIdFilter.trim()) filters.episodeId = episodeIdFilter.trim();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.highlights(filters),
    queryFn: () => {
      const params = new URLSearchParams(filters);
      return apiRequest<PaginatedData<Highlight>>(`/admin/highlights?${params}`);
    },
  });

  const highlights = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  // Mutations
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<EditForm> }) =>
      apiRequest(`/admin/highlights/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast('更新成功');
      queryClient.invalidateQueries({ queryKey: ['admin', 'highlights'] });
      closeEdit();
    },
    onError: () => toast('更新失败', 'error'),
  });

  const enableMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/admin/highlights/${id}/enable`, { method: 'POST' }),
    onSuccess: () => {
      toast('已启用');
      queryClient.invalidateQueries({ queryKey: ['admin', 'highlights'] });
    },
    onError: () => toast('启用失败', 'error'),
  });

  const disableMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/admin/highlights/${id}/disable`, { method: 'POST' }),
    onSuccess: () => {
      toast('已禁用');
      queryClient.invalidateQueries({ queryKey: ['admin', 'highlights'] });
    },
    onError: () => toast('禁用失败', 'error'),
  });

  const aiReviewMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<{
        id: string;
        status: string;
        source: string;
        aiReview: {
          approved: boolean;
          reviewDecision: string;
          reviewReason: string;
        };
      }>(`/admin/highlights/${id}/ai-review`, { method: 'POST' }),
    onSuccess: (result) => {
      if (result.aiReview.approved) {
        toast('AI审核完成，已放入已确认列表');
      } else {
        toast(
          `AI审核未通过：${result.aiReview.reviewDecision || '未确认'}${result.aiReview.reviewReason ? ` - ${result.aiReview.reviewReason}` : ''}`,
          'error',
        );
      }
      queryClient.invalidateQueries({ queryKey: ['admin', 'highlights'] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'AI审核失败';
      toast(message, 'error');
    },
  });

  const batchAiReviewMutation = useMutation({
    mutationFn: () => {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('pageSize', '1000');
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (episodeIdFilter.trim()) params.set('episodeId', episodeIdFilter.trim());
      return apiRequest<{
        total: number;
        approvedCount: number;
        failedCount: number;
        results: Array<{
          id: string;
          title: string;
          approved: boolean;
          reviewDecision: string;
          reviewReason: string;
          error?: string;
        }>;
      }>(`/admin/highlights/ai-review-batch?${params.toString()}`, { method: 'POST' });
    },
    onSuccess: (result) => {
      toast(`一键AI审核完成：通过 ${result.approvedCount} 条，未通过/失败 ${result.failedCount} 条`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'highlights'] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : '一键AI审核失败';
      toast(message, 'error');
    },
  });

  // Edit dialog helpers
  function openEdit(h: Highlight) {
    setEditingId(h.id);
    setEditForm({
      startTimeMs: h.startTimeMs,
      endTimeMs: h.endTimeMs,
      type: h.type,
      intensity: h.intensity,
      templateId: h.templateId,
      interactionOptionsJson: h.interactionOptionsJson,
      status: h.status,
    });
  }

  function closeEdit() {
    setEditingId(null);
    setEditForm(null);
  }

  function handleSave() {
    if (!editingId || !editForm) return;
    updateMutation.mutate({ id: editingId, body: editForm });
  }

  function handleDisableConfirm() {
    if (!disableTarget) return;
    disableMutation.mutate(disableTarget.id);
    setDisableTarget(null);
  }

  return (
    <div>
      <PageHeader title="高光片段管理" />

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1">
          {FILTER_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 text-sm rounded-md cursor-pointer transition-colors ${
                statusFilter === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s === 'all' ? '全部' : getStatusLabel(s)}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="按剧集ID筛选"
          value={episodeIdFilter}
          onChange={(e) => { setEpisodeIdFilter(e.target.value); setPage(1); }}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
        />
        <button
          onClick={() => batchAiReviewMutation.mutate()}
          disabled={batchAiReviewMutation.isPending || statusFilter === 'confirmed' || statusFilter === 'disabled'}
          className="px-3 py-1.5 text-sm rounded-md bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 cursor-pointer"
        >
          {batchAiReviewMutation.isPending ? '一键AI审核中...' : '一键AI审核'}
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingBlock />
      ) : highlights.length === 0 ? (
        <EmptyState message="暂无高光数据" />
      ) : (
        <>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">剧集</th>
                  <th className="px-4 py-3 font-medium">标题</th>
                  <th className="px-4 py-3 font-medium">来源</th>
                  <th className="px-4 py-3 font-medium">类型</th>
                  <th className="px-4 py-3 font-medium">时间</th>
                  <th className="px-4 py-3 font-medium">强度</th>
                  <th className="px-4 py-3 font-medium">置信度</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {highlights.map((h) => (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{h.id}</td>
                    <td className="px-4 py-3">
                      {h.episode ? `E${h.episode.episodeNo} ${h.episode.title}` : h.episodeId}
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate">{h.title || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        h.source === 'ai' || h.source === 'ai_manual'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {h.source}
                      </span>
                    </td>
                    <td className="px-4 py-3">{h.type}</td>
                    <td className="px-4 py-3 tabular-nums text-xs">{formatTime(h.startTimeMs)} ~ {formatTime(h.endTimeMs)}</td>
                    <td className="px-4 py-3">{h.intensity}</td>
                    <td className="px-4 py-3">{h.confidence.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={h.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/highlights/${h.id}/review`)}
                          className="px-2 py-1 text-xs rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 cursor-pointer"
                        >
                          复核
                        </button>
                        {h.status === 'candidate' && (
                          <button
                            onClick={() => aiReviewMutation.mutate(h.id)}
                            disabled={aiReviewMutation.isPending}
                            className="px-2 py-1 text-xs rounded bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 disabled:opacity-50 cursor-pointer"
                          >
                            {aiReviewMutation.isPending ? 'AI审核中...' : 'AI审核'}
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(h)}
                          className="px-2 py-1 text-xs rounded border border-gray-300 hover:bg-gray-50 cursor-pointer"
                        >
                          编辑
                        </button>
                        {h.status === 'disabled' ? (
                          <button
                            onClick={() => enableMutation.mutate(h.id)}
                            className="px-2 py-1 text-xs rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                          >
                            启用
                          </button>
                        ) : (
                          <button
                            onClick={() => setDisableTarget(h)}
                            className="px-2 py-1 text-xs rounded bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 cursor-pointer"
                          >
                            禁用
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
              <span>共 {total} 条</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-50 cursor-pointer disabled:cursor-default"
                >
                  上一页
                </button>
                <span>
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-50 cursor-pointer disabled:cursor-default"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit dialog */}
      {editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">编辑高光片段</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">起始时间 (ms)</label>
                  <input
                    type="number"
                    value={editForm.startTimeMs}
                    onChange={(e) => setEditForm({ ...editForm, startTimeMs: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">结束时间 (ms)</label>
                  <input
                    type="number"
                    value={editForm.endTimeMs}
                    onChange={(e) => setEditForm({ ...editForm, endTimeMs: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">类型</label>
                  <select
                    value={editForm.type}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">强度</label>
                  <select
                    value={editForm.intensity}
                    onChange={(e) => setEditForm({ ...editForm, intensity: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">模板</label>
                <select
                  value={editForm.templateId}
                  onChange={(e) => setEditForm({ ...editForm, templateId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {TEMPLATE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">交互选项 (JSON)</label>
                <textarea
                  value={editForm.interactionOptionsJson}
                  onChange={(e) => setEditForm({ ...editForm, interactionOptionsJson: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">状态</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={closeEdit}
                className="px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50 cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
              >
                {updateMutation.isPending ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disable confirmation */}
      <ConfirmDialog
        open={disableTarget !== null}
        title="禁用高光片段"
        message={`确定要禁用该高光片段吗？${disableTarget?.title ? ` (${disableTarget.title})` : ''}`}
        confirmLabel="禁用"
        danger
        onConfirm={handleDisableConfirm}
        onCancel={() => setDisableTarget(null)}
      />
    </div>
  );
}
