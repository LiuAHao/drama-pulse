import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../services/apiClient';
import { queryKeys } from '../../services/queryKeys';
import { PageHeader } from '../../components/ui/PageHeader';
import { LoadingBlock } from '../../components/ui/LoadingBlock';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import type { Drama } from '../../shared/types';

export function DramasPage() {
  const { data: dramas, isLoading } = useQuery({
    queryKey: queryKeys.dramas,
    queryFn: () => apiRequest<Drama[]>('/admin/dramas'),
  });

  return (
    <>
      <PageHeader title="短剧管理" />

      {isLoading ? (
        <LoadingBlock />
      ) : !dramas || dramas.length === 0 ? (
        <EmptyState message="暂无短剧数据" />
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">标题</th>
                <th className="px-4 py-3 font-medium">主类型</th>
                <th className="px-4 py-3 font-medium">是否主推</th>
                <th className="px-4 py-3 font-medium">集数</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">创建时间</th>
              </tr>
            </thead>
            <tbody>
              {dramas.map((drama, index) => (
                <tr
                  key={drama.id}
                  className={`border-b border-gray-100 ${index % 2 === 1 ? 'bg-gray-50/50' : ''}`}
                >
                  <td className="px-4 py-3 text-gray-800 font-medium">{drama.title}</td>
                  <td className="px-4 py-3 text-gray-600">{drama.mainGenre}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        drama.isFeatured
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {drama.isFeatured ? '主推' : '普通'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{drama.episodeCount ?? '-'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={drama.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(drama.createdAt).toLocaleDateString('zh-CN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
