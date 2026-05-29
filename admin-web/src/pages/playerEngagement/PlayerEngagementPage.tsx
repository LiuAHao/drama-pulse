import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../services/apiClient';
import { queryKeys } from '../../services/queryKeys';
import { PageHeader } from '../../components/ui/PageHeader';
import { LoadingBlock } from '../../components/ui/LoadingBlock';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import type {
  PaginatedData,
  FavoriteRecord,
  PlayerCommentRecord,
  DanmakuRecord,
  WatchProgressRecord,
} from '../../shared/types';

const PAGE_SIZE = 20;

type EngagementTab = 'favorites' | 'comments' | 'danmaku' | 'progress';

type FilterDraft = {
  dramaId: string;
  episodeId: string;
  userId: string;
};

type AppliedFilters = FilterDraft & {
  page: number;
};

const TAB_OPTIONS: Array<{ key: EngagementTab; label: string }> = [
  { key: 'favorites', label: '收藏' },
  { key: 'comments', label: '评论' },
  { key: 'danmaku', label: '弹幕' },
  { key: 'progress', label: '观看记录' },
];

const tabButtonClass = (active: boolean) =>
  `px-3 py-1.5 text-sm rounded-md cursor-pointer transition-colors ${
    active
      ? 'bg-blue-600 text-white'
      : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
  }`;

const inputClass =
  'px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN');
}

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function buildFilters(applied: AppliedFilters, includeEpisode: boolean) {
  const filters: Record<string, string> = {
    page: String(applied.page),
    pageSize: String(PAGE_SIZE),
  };
  if (applied.dramaId.trim()) filters.dramaId = applied.dramaId.trim();
  if (includeEpisode && applied.episodeId.trim()) filters.episodeId = applied.episodeId.trim();
  if (applied.userId.trim()) filters.userId = applied.userId.trim();
  return filters;
}

function SearchActions({
  onSearch,
  onReset,
}: {
  onSearch: () => void;
  onReset: () => void;
}) {
  return (
    <>
      <button
        onClick={onSearch}
        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 cursor-pointer"
      >
        搜索
      </button>
      <button
        onClick={onReset}
        className="px-4 py-2 bg-white border border-gray-300 text-sm text-gray-600 rounded-md hover:bg-gray-50 cursor-pointer"
      >
        重置
      </button>
    </>
  );
}

function PanelPagination({
  page,
  total,
  onPrev,
  onNext,
}: {
  page: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
      <span>共 {total} 条</span>
      <div className="flex items-center gap-2">
        <button
          disabled={page <= 1}
          onClick={onPrev}
          className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50 cursor-pointer disabled:cursor-default"
        >
          上一页
        </button>
        <span>
          {page} / {totalPages}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={onNext}
          className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50 cursor-pointer disabled:cursor-default"
        >
          下一页
        </button>
      </div>
    </div>
  );
}

function FavoritesPanel({
  draft,
  applied,
  setDraft,
  setApplied,
}: {
  draft: FilterDraft;
  applied: AppliedFilters;
  setDraft: React.Dispatch<React.SetStateAction<FilterDraft>>;
  setApplied: React.Dispatch<React.SetStateAction<AppliedFilters>>;
}) {
  const filters = useMemo(() => buildFilters(applied, false), [applied]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: queryKeys.favorites(filters),
    queryFn: () => {
      const params = new URLSearchParams(filters);
      return apiRequest<PaginatedData<FavoriteRecord>>(`/admin/favorites?${params.toString()}`);
    },
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const handleSearch = () => {
    setApplied({ ...draft, page: 1 });
  };

  const handleReset = () => {
    const initial = { dramaId: '', episodeId: '', userId: '' };
    setDraft(initial);
    setApplied({ ...initial, page: 1 });
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          value={draft.dramaId}
          onChange={(event) => setDraft((current) => ({ ...current, dramaId: event.target.value }))}
          placeholder="按短剧 ID 筛选"
          className={inputClass}
        />
        <input
          type="text"
          value={draft.userId}
          onChange={(event) => setDraft((current) => ({ ...current, userId: event.target.value }))}
          placeholder="按用户 ID 筛选"
          className={inputClass}
        />
        <SearchActions onSearch={handleSearch} onReset={handleReset} />
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : items.length === 0 ? (
        <EmptyState message="暂无收藏记录" />
      ) : (
        <>
          {isFetching && <p className="text-xs text-gray-400 mb-3">正在刷新数据…</p>}
          <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">收藏时间</th>
                  <th className="px-4 py-3 font-medium">短剧</th>
                  <th className="px-4 py-3 font-medium">标签</th>
                  <th className="px-4 py-3 font-medium">用户ID</th>
                  <th className="px-4 py-3 font-medium">设备ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 align-top">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(item.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{item.drama.title}</div>
                      <div className="text-xs text-gray-500 mt-1">{item.drama.id}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <div>{item.drama.mainGenre}</div>
                      <div className="text-xs text-gray-500 mt-1 line-clamp-2 max-w-[220px]">{item.drama.tagsJson}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{item.userId}</td>
                    <td className="px-4 py-3 font-mono text-xs">{item.deviceId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PanelPagination
            page={applied.page}
            total={total}
            onPrev={() => setApplied((current) => ({ ...current, page: current.page - 1 }))}
            onNext={() => setApplied((current) => ({ ...current, page: current.page + 1 }))}
          />
        </>
      )}
    </>
  );
}

function PlayerCommentsPanel({
  draft,
  applied,
  setDraft,
  setApplied,
}: {
  draft: FilterDraft;
  applied: AppliedFilters;
  setDraft: React.Dispatch<React.SetStateAction<FilterDraft>>;
  setApplied: React.Dispatch<React.SetStateAction<AppliedFilters>>;
}) {
  const filters = useMemo(() => buildFilters(applied, true), [applied]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: queryKeys.playerComments(filters),
    queryFn: () => {
      const params = new URLSearchParams(filters);
      return apiRequest<PaginatedData<PlayerCommentRecord>>(`/admin/player-comments?${params.toString()}`);
    },
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const handleSearch = () => {
    setApplied({ ...draft, page: 1 });
  };

  const handleReset = () => {
    const initial = { dramaId: '', episodeId: '', userId: '' };
    setDraft(initial);
    setApplied({ ...initial, page: 1 });
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          value={draft.dramaId}
          onChange={(event) => setDraft((current) => ({ ...current, dramaId: event.target.value }))}
          placeholder="按短剧 ID 筛选"
          className={inputClass}
        />
        <input
          type="text"
          value={draft.episodeId}
          onChange={(event) => setDraft((current) => ({ ...current, episodeId: event.target.value }))}
          placeholder="按剧集 ID 筛选"
          className={inputClass}
        />
        <input
          type="text"
          value={draft.userId}
          onChange={(event) => setDraft((current) => ({ ...current, userId: event.target.value }))}
          placeholder="按用户 ID 筛选"
          className={inputClass}
        />
        <SearchActions onSearch={handleSearch} onReset={handleReset} />
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : items.length === 0 ? (
        <EmptyState message="暂无播放评论" />
      ) : (
        <>
          {isFetching && <p className="text-xs text-gray-400 mb-3">正在刷新数据…</p>}
          <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
            <table className="w-full min-w-[1120px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">发送时间</th>
                  <th className="px-4 py-3 font-medium">短剧 / 剧集</th>
                  <th className="px-4 py-3 font-medium">评论内容</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">用户ID</th>
                  <th className="px-4 py-3 font-medium">设备ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 align-top">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(item.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{item.episode.drama.title}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        E{item.episode.episodeNo} {item.episode.title}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-[420px] break-words">{item.content}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{item.userId}</td>
                    <td className="px-4 py-3 font-mono text-xs">{item.deviceId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PanelPagination
            page={applied.page}
            total={total}
            onPrev={() => setApplied((current) => ({ ...current, page: current.page - 1 }))}
            onNext={() => setApplied((current) => ({ ...current, page: current.page + 1 }))}
          />
        </>
      )}
    </>
  );
}

function DanmakuPanel({
  draft,
  applied,
  setDraft,
  setApplied,
}: {
  draft: FilterDraft;
  applied: AppliedFilters;
  setDraft: React.Dispatch<React.SetStateAction<FilterDraft>>;
  setApplied: React.Dispatch<React.SetStateAction<AppliedFilters>>;
}) {
  const filters = useMemo(() => buildFilters(applied, true), [applied]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: queryKeys.danmaku(filters),
    queryFn: () => {
      const params = new URLSearchParams(filters);
      return apiRequest<PaginatedData<DanmakuRecord>>(`/admin/danmaku?${params.toString()}`);
    },
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const handleSearch = () => {
    setApplied({ ...draft, page: 1 });
  };

  const handleReset = () => {
    const initial = { dramaId: '', episodeId: '', userId: '' };
    setDraft(initial);
    setApplied({ ...initial, page: 1 });
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          value={draft.dramaId}
          onChange={(event) => setDraft((current) => ({ ...current, dramaId: event.target.value }))}
          placeholder="按短剧 ID 筛选"
          className={inputClass}
        />
        <input
          type="text"
          value={draft.episodeId}
          onChange={(event) => setDraft((current) => ({ ...current, episodeId: event.target.value }))}
          placeholder="按剧集 ID 筛选"
          className={inputClass}
        />
        <input
          type="text"
          value={draft.userId}
          onChange={(event) => setDraft((current) => ({ ...current, userId: event.target.value }))}
          placeholder="按用户 ID 筛选"
          className={inputClass}
        />
        <SearchActions onSearch={handleSearch} onReset={handleReset} />
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : items.length === 0 ? (
        <EmptyState message="暂无弹幕记录" />
      ) : (
        <>
          {isFetching && <p className="text-xs text-gray-400 mb-3">正在刷新数据…</p>}
          <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
            <table className="w-full min-w-[1040px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">发送时间</th>
                  <th className="px-4 py-3 font-medium">短剧 / 剧集</th>
                  <th className="px-4 py-3 font-medium">弹幕内容</th>
                  <th className="px-4 py-3 font-medium">触发时点</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">用户ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 align-top">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(item.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{item.episode.drama.title}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        E{item.episode.episodeNo} {item.episode.title}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-[320px] break-words">{item.content}</td>
                    <td className="px-4 py-3 tabular-nums text-gray-600">{formatDuration(item.triggerPositionMs)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{item.userId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PanelPagination
            page={applied.page}
            total={total}
            onPrev={() => setApplied((current) => ({ ...current, page: current.page - 1 }))}
            onNext={() => setApplied((current) => ({ ...current, page: current.page + 1 }))}
          />
        </>
      )}
    </>
  );
}

function WatchProgressPanel({
  draft,
  applied,
  setDraft,
  setApplied,
}: {
  draft: FilterDraft;
  applied: AppliedFilters;
  setDraft: React.Dispatch<React.SetStateAction<FilterDraft>>;
  setApplied: React.Dispatch<React.SetStateAction<AppliedFilters>>;
}) {
  const filters = useMemo(() => buildFilters(applied, true), [applied]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: queryKeys.watchProgress(filters),
    queryFn: () => {
      const params = new URLSearchParams(filters);
      return apiRequest<PaginatedData<WatchProgressRecord>>(`/admin/watch-progress?${params.toString()}`);
    },
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const handleSearch = () => {
    setApplied({ ...draft, page: 1 });
  };

  const handleReset = () => {
    const initial = { dramaId: '', episodeId: '', userId: '' };
    setDraft(initial);
    setApplied({ ...initial, page: 1 });
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          value={draft.dramaId}
          onChange={(event) => setDraft((current) => ({ ...current, dramaId: event.target.value }))}
          placeholder="按短剧 ID 筛选"
          className={inputClass}
        />
        <input
          type="text"
          value={draft.episodeId}
          onChange={(event) => setDraft((current) => ({ ...current, episodeId: event.target.value }))}
          placeholder="按剧集 ID 筛选"
          className={inputClass}
        />
        <input
          type="text"
          value={draft.userId}
          onChange={(event) => setDraft((current) => ({ ...current, userId: event.target.value }))}
          placeholder="按用户 ID 筛选"
          className={inputClass}
        />
        <SearchActions onSearch={handleSearch} onReset={handleReset} />
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : items.length === 0 ? (
        <EmptyState message="暂无观看进度" />
      ) : (
        <>
          {isFetching && <p className="text-xs text-gray-400 mb-3">正在刷新数据…</p>}
          <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
            <table className="w-full min-w-[1040px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">最近更新时间</th>
                  <th className="px-4 py-3 font-medium">短剧</th>
                  <th className="px-4 py-3 font-medium">当前剧集</th>
                  <th className="px-4 py-3 font-medium">进度</th>
                  <th className="px-4 py-3 font-medium">用户ID</th>
                  <th className="px-4 py-3 font-medium">设备ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 align-top">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(item.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{item.drama?.title ?? item.dramaId}</div>
                      <div className="text-xs text-gray-500 mt-1">{item.drama?.id ?? item.dramaId}</div>
                    </td>
                    <td className="px-4 py-3">
                      {item.episode ? (
                        <>
                          <div className="font-medium text-gray-800">
                            E{item.episode.episodeNo} {item.episode.title}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">{item.episode.id}</div>
                        </>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-gray-700">{formatDuration(item.progressMs)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{item.userId}</td>
                    <td className="px-4 py-3 font-mono text-xs">{item.deviceId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PanelPagination
            page={applied.page}
            total={total}
            onPrev={() => setApplied((current) => ({ ...current, page: current.page - 1 }))}
            onNext={() => setApplied((current) => ({ ...current, page: current.page + 1 }))}
          />
        </>
      )}
    </>
  );
}

export function PlayerEngagementPage() {
  const [activeTab, setActiveTab] = useState<EngagementTab>('favorites');

  const [favoriteDraft, setFavoriteDraft] = useState<FilterDraft>({ dramaId: '', episodeId: '', userId: '' });
  const [favoriteApplied, setFavoriteApplied] = useState<AppliedFilters>({ dramaId: '', episodeId: '', userId: '', page: 1 });

  const [commentDraft, setCommentDraft] = useState<FilterDraft>({ dramaId: '', episodeId: '', userId: '' });
  const [commentApplied, setCommentApplied] = useState<AppliedFilters>({ dramaId: '', episodeId: '', userId: '', page: 1 });

  const [danmakuDraft, setDanmakuDraft] = useState<FilterDraft>({ dramaId: '', episodeId: '', userId: '' });
  const [danmakuApplied, setDanmakuApplied] = useState<AppliedFilters>({ dramaId: '', episodeId: '', userId: '', page: 1 });

  const [progressDraft, setProgressDraft] = useState<FilterDraft>({ dramaId: '', episodeId: '', userId: '' });
  const [progressApplied, setProgressApplied] = useState<AppliedFilters>({ dramaId: '', episodeId: '', userId: '', page: 1 });

  return (
    <>
      <PageHeader title="播放互动管理" />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {TAB_OPTIONS.map((item) => (
          <button
            key={item.key}
            onClick={() => setActiveTab(item.key)}
            className={tabButtonClass(activeTab === item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className={activeTab === 'favorites' ? 'block' : 'hidden'}>
        <FavoritesPanel
          draft={favoriteDraft}
          applied={favoriteApplied}
          setDraft={setFavoriteDraft}
          setApplied={setFavoriteApplied}
        />
      </div>
      <div className={activeTab === 'comments' ? 'block' : 'hidden'}>
        <PlayerCommentsPanel
          draft={commentDraft}
          applied={commentApplied}
          setDraft={setCommentDraft}
          setApplied={setCommentApplied}
        />
      </div>
      <div className={activeTab === 'danmaku' ? 'block' : 'hidden'}>
        <DanmakuPanel
          draft={danmakuDraft}
          applied={danmakuApplied}
          setDraft={setDanmakuDraft}
          setApplied={setDanmakuApplied}
        />
      </div>
      <div className={activeTab === 'progress' ? 'block' : 'hidden'}>
        <WatchProgressPanel
          draft={progressDraft}
          applied={progressApplied}
          setDraft={setProgressDraft}
          setApplied={setProgressApplied}
        />
      </div>
    </>
  );
}
