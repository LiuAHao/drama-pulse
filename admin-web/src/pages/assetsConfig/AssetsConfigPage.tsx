import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../services/apiClient';
import { PageHeader } from '../../components/ui/PageHeader';
import { LoadingBlock } from '../../components/ui/LoadingBlock';
import { toast } from '../../components/ui/Toast';
import type { AssetsConfigData } from '../../shared/types';

export function AssetsConfigPage() {
  const [videosRoot, setVideosRoot] = useState('');
  const [assetsRoot, setAssetsRoot] = useState('');
  const [exportsRoot, setExportsRoot] = useState('');
  const [currentConfig, setCurrentConfig] = useState<AssetsConfigData | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'assetsConfig'],
    queryFn: () => apiRequest<AssetsConfigData>('/admin/assets/config'),
  });

  useEffect(() => {
    if (!data) return;
    setCurrentConfig(data);
    setVideosRoot(data.saved.videosRoot ?? '');
    setAssetsRoot(data.saved.assetsRoot ?? '');
    setExportsRoot(data.saved.exportsRoot ?? '');
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (body: Record<string, string>) =>
      apiRequest<AssetsConfigData>('/admin/assets/config', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (result) => {
      setCurrentConfig(result);
      setVideosRoot(result.saved.videosRoot ?? '');
      setAssetsRoot(result.saved.assetsRoot ?? '');
      setExportsRoot(result.saved.exportsRoot ?? '');
      toast('资源路径配置已保存', 'success');
    },
    onError: () => {
      toast('保存配置失败', 'error');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body: Record<string, string> = {};
    if (videosRoot.trim()) body.videosRoot = videosRoot.trim();
    if (assetsRoot.trim()) body.assetsRoot = assetsRoot.trim();
    if (exportsRoot.trim()) body.exportsRoot = exportsRoot.trim();

    if (Object.keys(body).length === 0) {
      toast('请至少填写一个路径', 'error');
      return;
    }

    saveMutation.mutate(body);
  };

  if (isLoading && !currentConfig) {
    return (
      <>
        <PageHeader title="资源路径配置" />
        <LoadingBlock />
      </>
    );
  }

  return (
    <div className="p-6">
      <PageHeader title="资源路径配置" />

      {currentConfig && (
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">当前保存配置</h2>
            <div className="space-y-2 text-sm text-gray-600">
              <p><span className="text-gray-400">videosRoot:</span> {currentConfig.saved.videosRoot || '-'}</p>
              <p><span className="text-gray-400">assetsRoot:</span> {currentConfig.saved.assetsRoot || '-'}</p>
              <p><span className="text-gray-400">exportsRoot:</span> {currentConfig.saved.exportsRoot || '-'}</p>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">当前生效路径</h2>
            <div className="space-y-2 text-sm text-gray-600">
              <p><span className="text-gray-400">videosRoot:</span> {currentConfig.appliedRoots.videosRoot}</p>
              <p><span className="text-gray-400">assetsRoot:</span> {currentConfig.appliedRoots.assetsRoot}</p>
              <p><span className="text-gray-400">exportsRoot:</span> {currentConfig.appliedRoots.exportsRoot}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              视频根目录 (videosRoot)
            </label>
            <p className="text-xs text-gray-400 mb-2">剧集视频文件的存储根路径</p>
            <input
              type="text"
              value={videosRoot}
              onChange={(e) => setVideosRoot(e.target.value)}
              placeholder="例如: /data/videos"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              素材根目录 (assetsRoot)
            </label>
            <p className="text-xs text-gray-400 mb-2">封面图、海报等静态素材的存储根路径</p>
            <input
              type="text"
              value={assetsRoot}
              onChange={(e) => setAssetsRoot(e.target.value)}
              placeholder="例如: /data/assets"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              导出根目录 (exportsRoot)
            </label>
            <p className="text-xs text-gray-400 mb-2">导出文件（如剪辑片段、打包产物）的存储根路径</p>
            <input
              type="text"
              value={exportsRoot}
              onChange={(e) => setExportsRoot(e.target.value)}
              placeholder="例如: /data/exports"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            配置保存至 config/resource-paths.local.json，保存后立即生效。
          </p>
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="px-5 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 cursor-pointer transition-colors"
          >
            {saveMutation.isPending ? '保存中...' : '保存配置'}
          </button>
        </div>
      </form>
    </div>
  );
}
