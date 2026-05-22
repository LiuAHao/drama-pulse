import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../services/apiClient';
import { queryKeys } from '../../services/queryKeys';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { LoadingBlock } from '../../components/ui/LoadingBlock';
import { EmptyState } from '../../components/ui/EmptyState';
import type { Drama, Episode } from '../../shared/types';

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function EpisodesPage() {
  const [dramaId, setDramaId] = useState('');

  const { data: dramas } = useQuery({
    queryKey: queryKeys.dramas,
    queryFn: () => apiRequest<Drama[]>('/admin/dramas'),
  });

  const filters = dramaId ? { dramaId } : undefined;
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.episodes(filters),
    queryFn: () => apiRequest<Episode[]>(`/admin/episodes${dramaId ? `?dramaId=${dramaId}` : ''}`),
  });

  const episodes = data ?? [];

  return (
    <div>
      <PageHeader title="剧集管理" />

      <div className="mb-4">
        <select
          value={dramaId}
          onChange={(e) => setDramaId(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">全部短剧</option>
          {dramas?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : episodes.length === 0 ? (
        <EmptyState message="暂无剧集数据" />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">剧集ID</th>
                <th className="px-4 py-3 font-medium">所属短剧</th>
                <th className="px-4 py-3 font-medium">集数</th>
                <th className="px-4 py-3 font-medium">标题</th>
                <th className="px-4 py-3 font-medium">时长</th>
                <th className="px-4 py-3 font-medium">视频路径</th>
                <th className="px-4 py-3 font-medium">尾集</th>
                <th className="px-4 py-3 font-medium">有分支</th>
                <th className="px-4 py-3 font-medium">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {episodes.map((ep) => (
                <tr key={ep.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{ep.id}</td>
                  <td className="px-4 py-3">{ep.drama?.title ?? ep.dramaId}</td>
                  <td className="px-4 py-3">{ep.episodeNo}</td>
                  <td className="px-4 py-3">{ep.title}</td>
                  <td className="px-4 py-3 tabular-nums">{formatDuration(ep.durationMs)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[280px] truncate" title={ep.videoPath}>
                    {ep.videoPath}
                  </td>
                  <td className="px-4 py-3 text-center">{ep.isFinalEpisode ? '✓' : '-'}</td>
                  <td className="px-4 py-3 text-center">{ep.hasBranch ? '✓' : '-'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={ep.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
