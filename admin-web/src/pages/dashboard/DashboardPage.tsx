import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../services/apiClient';
import { queryKeys } from '../../services/queryKeys';
import { PageHeader } from '../../components/ui/PageHeader';
import { LoadingBlock } from '../../components/ui/LoadingBlock';
import type { PaginatedData, Drama, Highlight, BranchTask } from '../../shared/types';

interface StatCardProps {
  label: string;
  value: number | string;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-semibold text-gray-800">{value}</p>
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

  const isLoading =
    dramasQuery.isLoading ||
    highlightsQuery.isLoading ||
    candidateHighlightsQuery.isLoading ||
    branchTasksQuery.isLoading;

  if (isLoading) {
    return (
      <>
        <PageHeader title="仪表盘" />
        <LoadingBlock />
      </>
    );
  }

  const totalDramas = dramasQuery.data?.length ?? 0;
  const totalHighlights = highlightsQuery.data?.total ?? 0;
  const candidateHighlights = candidateHighlightsQuery.data?.total ?? 0;
  const totalBranchTasks = branchTasksQuery.data?.total ?? 0;

  return (
    <>
      <PageHeader title="仪表盘" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="短剧总数" value={totalDramas} />
        <StatCard label="高光片段" value={totalHighlights} />
        <StatCard label="候选高光" value={candidateHighlights} />
        <StatCard label="分支任务" value={totalBranchTasks} />
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
