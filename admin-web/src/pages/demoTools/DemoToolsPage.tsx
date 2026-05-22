import { useState } from 'react';
import { apiRequest } from '../../services/apiClient';
import { PageHeader } from '../../components/ui/PageHeader';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { toast } from '../../components/ui/Toast';

export function DemoToolsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    setDialogOpen(false);
    setLoading(true);
    try {
      await apiRequest('/admin/demo/reset', { method: 'POST' });
      toast('演示数据已重置', 'success');
    } catch {
      toast('重置失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <PageHeader title="演示工具" />

      <div className="max-w-2xl space-y-6">
        {/* Warning section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">重置操作说明</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-red-600 mb-2">以下数据将被清除：</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li>所有互动事件（播放、点击、分享等）</li>
                <li>高光片段统计数据</li>
                <li>所有分支任务、评论、点赞</li>
                <li>所有观看进度记录</li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-600 mb-2">以下数据将保留：</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li>剧集与剧目数据</li>
                <li>高光片段配置</li>
                <li>分支选项配置</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Danger zone */}
        <div className="bg-white rounded-lg border border-red-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-red-700 mb-1">危险操作</h2>
              <p className="text-xs text-gray-500">此操作不可撤销，请确认后再执行。</p>
            </div>
            <button
              onClick={() => setDialogOpen(true)}
              disabled={loading}
              className="px-5 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50 cursor-pointer transition-colors"
            >
              {loading ? '重置中...' : '重置演示数据'}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={dialogOpen}
        title="确认重置演示数据"
        message="重置后所有互动事件、统计数据、分支任务及观看进度将被清除，此操作不可撤销。是否继续？"
        confirmLabel="确认重置"
        danger
        onConfirm={handleReset}
        onCancel={() => setDialogOpen(false)}
      />
    </div>
  );
}
