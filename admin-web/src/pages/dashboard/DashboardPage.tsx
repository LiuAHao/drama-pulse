import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../services/apiClient';
import { queryKeys } from '../../services/queryKeys';
import { PageHeader } from '../../components/ui/PageHeader';
import type {
  PaginatedData,
  Drama,
  Highlight,
  BranchTask,
  FavoriteRecord,
  PlayerCommentRecord,
  DanmakuRecord,
  WatchProgressRecord,
} from '../../shared/types';

interface StatCardProps {
  label: string;
  value: number | string;
  loading?: boolean;
}

function StatCard({ label, value, loading = false }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      {loading ? (
        <div className="mt-2 h-8 w-20 rounded-md bg-gray-100 animate-pulse" />
      ) : (
        <p className="text-2xl font-semibold text-gray-800">{value}</p>
      )}
    </div>
  );
}

export function DashboardPage() {
  const dramasQuery = useQuery({
    queryKey: queryKeys.dramas,
    queryFn: () => apiRequest<Drama[]>('/admin/dramas'),
  });

  const highlightsQuery = useQuery({
    queryKey: queryKeys.highlights({ pageSize: '1' }),
    queryFn: () => apiRequest<PaginatedData<Highlight>>('/admin/highlights?pageSize=1'),
  });

  const candidateHighlightsQuery = useQuery({
    queryKey: queryKeys.highlights({ status: 'candidate', pageSize: '1' }),
    queryFn: () =>
      apiRequest<PaginatedData<Highlight>>('/admin/highlights?status=candidate&pageSize=1'),
  });

  const branchTasksQuery = useQuery({
    queryKey: queryKeys.branchTasks({ pageSize: '1' }),
    queryFn: () => apiRequest<PaginatedData<BranchTask>>('/admin/branch-tasks?pageSize=1'),
  });

  const favoritesQuery = useQuery({
    queryKey: queryKeys.favorites({ pageSize: '1' }),
    queryFn: () => apiRequest<PaginatedData<FavoriteRecord>>('/admin/favorites?pageSize=1'),
  });

  const playerCommentsQuery = useQuery({
    queryKey: queryKeys.playerComments({ pageSize: '1' }),
    queryFn: () => apiRequest<PaginatedData<PlayerCommentRecord>>('/admin/player-comments?pageSize=1'),
  });

  const danmakuQuery = useQuery({
    queryKey: queryKeys.danmaku({ pageSize: '1' }),
    queryFn: () => apiRequest<PaginatedData<DanmakuRecord>>('/admin/danmaku?pageSize=1'),
  });

  const watchProgressQuery = useQuery({
    queryKey: queryKeys.watchProgress({ pageSize: '1' }),
    queryFn: () => apiRequest<PaginatedData<WatchProgressRecord>>('/admin/watch-progress?pageSize=1'),
  });

  const totalDramas = dramasQuery.data?.length ?? 0;
  const totalHighlights = highlightsQuery.data?.total ?? 0;
  const candidateHighlights = candidateHighlightsQuery.data?.total ?? 0;
  const totalBranchTasks = branchTasksQuery.data?.total ?? 0;
  const totalFavorites = favoritesQuery.data?.total ?? 0;
  const totalPlayerComments = playerCommentsQuery.data?.total ?? 0;
  const totalDanmaku = danmakuQuery.data?.total ?? 0;
  const totalWatchProgress = watchProgressQuery.data?.total ?? 0;

  return (
    <>
      <PageHeader title="仪表盘" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4 mb-8">
        <StatCard label="短剧总数" value={totalDramas} loading={dramasQuery.isLoading} />
        <StatCard label="高光片段" value={totalHighlights} loading={highlightsQuery.isLoading} />
        <StatCard label="候选高光" value={candidateHighlights} loading={candidateHighlightsQuery.isLoading} />
        <StatCard label="分支任务" value={totalBranchTasks} loading={branchTasksQuery.isLoading} />
        <StatCard label="收藏记录" value={totalFavorites} loading={favoritesQuery.isLoading} />
        <StatCard label="播放评论" value={totalPlayerComments} loading={playerCommentsQuery.isLoading} />
        <StatCard label="弹幕记录" value={totalDanmaku} loading={danmakuQuery.isLoading} />
        <StatCard label="观看进度" value={totalWatchProgress} loading={watchProgressQuery.isLoading} />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-sm font-medium text-gray-600 mb-3">快捷操作</h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/dramas" className="text-sm text-blue-600 hover:underline">
            管理短剧
          </Link>
          <Link to="/highlights" className="text-sm text-blue-600 hover:underline">
            管理高光
          </Link>
          <Link to="/player-engagement" className="text-sm text-blue-600 hover:underline">
            播放互动
          </Link>
          <Link to="/branch-tasks" className="text-sm text-blue-600 hover:underline">
            分支任务
          </Link>
          <Link to="/episodes" className="text-sm text-blue-600 hover:underline">
            剧集管理
          </Link>
        </div>
      </div>
    </>
  );
}
