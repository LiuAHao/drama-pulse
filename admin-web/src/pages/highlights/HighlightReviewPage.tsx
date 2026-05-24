import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../services/apiClient';
import { queryKeys } from '../../services/queryKeys';
import { LoadingBlock } from '../../components/ui/LoadingBlock';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { toast } from '../../components/ui/Toast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { CandidateSidebar } from './components/CandidateSidebar';
import { HighlightVideoPanel } from './components/HighlightVideoPanel';
import { HighlightTranscriptPanel } from './components/HighlightTranscriptPanel';
import { HighlightReviewForm, buildFormFromHighlight } from './components/HighlightReviewForm';
import { ReviewActionBar } from './components/ReviewActionBar';
import type { HighlightReviewContext } from '../../shared/types';
import type { ReviewFormState } from './components/HighlightReviewForm';

const LIST_NAVIGATION = '__list__';

export function HighlightReviewPage() {
  const { highlightId } = useParams<{ highlightId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<ReviewFormState | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [currentVideoTimeMs, setCurrentVideoTimeMs] = useState(0);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const pendingNavigation = useRef<string | null>(null);

  // Fetch review context
  const { data: context, isLoading, error } = useQuery({
    queryKey: queryKeys.highlightReviewContext(highlightId!),
    queryFn: () => apiRequest<HighlightReviewContext>(`/admin/highlights/${highlightId}/review-context`),
    enabled: !!highlightId,
  });

  // Initialize form when data loads
  useEffect(() => {
    if (context?.highlight) {
      setForm(buildFormFromHighlight(context.highlight));
      setIsDirty(false);
    }
  }, [context?.highlight?.id]);

  const handleFormChange = useCallback((patch: Partial<ReviewFormState>) => {
    setForm((prev) => prev ? { ...prev, ...patch } : null);
    setIsDirty(true);
  }, []);

  const buildRequestBody = useCallback(() => {
    if (!form || !highlightId) throw new Error('no form');
    return {
      startTimeMs: form.startTimeMs,
      endTimeMs: form.endTimeMs,
      interactionStartMs: form.interactionStartMs,
      interactionAppearMs: form.interactionAppearMs,
      interactionEndMs: form.interactionEndMs,
      type: form.type,
      title: form.title,
      description: form.description,
      templateId: form.templateId,
      interactionOptionsJson: JSON.stringify(form.interactionOptions),
      intensity: form.intensity,
      confidence: form.confidence,
      reason: form.reason,
      supportingSegmentIdsJson: JSON.stringify(form.supportingSegmentIds),
      speakerGuess: form.speakerGuess,
      targetCharacterGuess: form.targetCharacterGuess,
      mentionedCharactersJson: JSON.stringify(form.mentionedCharacters),
      characterGuessConfidence: form.characterGuessConfidence,
    };
  }, [form, highlightId]);

  const persistFormIfDirty = useCallback(async () => {
    if (!isDirty || !highlightId) return;
    await apiRequest(`/admin/highlights/${highlightId}`, {
      method: 'PATCH',
      body: JSON.stringify(buildRequestBody()),
    });
  }, [buildRequestBody, highlightId, isDirty]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: () => {
      if (!highlightId) throw new Error('no highlightId');
      return apiRequest(`/admin/highlights/${highlightId}`, {
        method: 'PATCH',
        body: JSON.stringify(buildRequestBody()),
      });
    },
    onSuccess: () => {
      toast('保存成功');
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'highlights'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.highlightDetail(highlightId!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.highlightReviewContext(highlightId!) });
    },
    onError: () => toast('保存失败', 'error'),
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      await persistFormIfDirty();
      return apiRequest(`/admin/highlights/${highlightId}/confirm`, { method: 'POST' });
    },
    onSuccess: () => {
      toast('已确认');
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'highlights'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.highlightDetail(highlightId!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.highlightReviewContext(highlightId!) });
    },
    onError: () => toast('确认失败', 'error'),
  });

  const disableMutation = useMutation({
    mutationFn: async () => {
      await persistFormIfDirty();
      return apiRequest(`/admin/highlights/${highlightId}/disable`, { method: 'POST' });
    },
    onSuccess: () => {
      toast('已禁用');
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'highlights'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.highlightDetail(highlightId!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.highlightReviewContext(highlightId!) });
    },
    onError: () => toast('禁用失败', 'error'),
  });

  // Leave protection
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const handleNavigate = useCallback((targetId: string) => {
    if (isDirty) {
      pendingNavigation.current = targetId;
      setShowLeaveConfirm(true);
    } else {
      navigate(`/highlights/${targetId}/review`);
    }
  }, [isDirty, navigate]);

  const handleLeaveConfirm = useCallback(() => {
    setShowLeaveConfirm(false);
    if (pendingNavigation.current) {
      if (pendingNavigation.current === LIST_NAVIGATION) {
        navigate('/highlights');
      } else {
        navigate(`/highlights/${pendingNavigation.current}/review`);
      }
      pendingNavigation.current = null;
    }
  }, [navigate]);

  const handleBack = useCallback(() => {
    if (isDirty) {
      pendingNavigation.current = LIST_NAVIGATION;
      setShowLeaveConfirm(true);
    } else {
      navigate('/highlights');
    }
  }, [isDirty, navigate]);

  if (isLoading) return <LoadingBlock />;
  if (error || !context) return <EmptyState message="加载失败" />;

  const hl = context.highlight;
  const episode = hl.episode;
  const drama = hl.drama;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 bg-white shrink-0">
        <button
          onClick={handleBack}
          className="px-2 py-1 text-sm rounded border border-gray-300 hover:bg-gray-50 cursor-pointer"
        >
          返回列表
        </button>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-800 truncate">
            {drama?.title || hl.episodeId}
            {episode && ` - E${episode.episodeNo} ${episode.title}`}
          </span>
        </div>
        <StatusBadge status={hl.status} />
        <span className="text-xs text-gray-400 font-mono">{hl.id}</span>
      </div>

      {/* Three-column layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Candidate sidebar */}
        <div className="w-56 border-r border-gray-200 bg-white shrink-0">
          <CandidateSidebar
            neighbors={[
              { id: hl.id, title: hl.title, startTimeMs: hl.startTimeMs, endTimeMs: hl.endTimeMs, type: hl.type, status: hl.status },
              ...context.candidateNeighbors,
            ]}
            currentId={hl.id}
            onSelect={handleNavigate}
          />
        </div>

        {/* Center: Video + Transcript */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 min-h-0">
            <HighlightVideoPanel
              videoUrl={episode?.videoUrl || ''}
              startTimeMs={form?.startTimeMs ?? hl.startTimeMs}
              endTimeMs={form?.endTimeMs ?? hl.endTimeMs}
              onCurrentTimeChange={setCurrentVideoTimeMs}
            />
          </div>
          <div className="h-48 border-t border-gray-200 shrink-0">
            <HighlightTranscriptPanel
              segments={context.transcriptContext}
              supportingSegmentIds={form?.supportingSegmentIds ?? []}
              startTimeMs={form?.startTimeMs ?? hl.startTimeMs}
              endTimeMs={form?.endTimeMs ?? hl.endTimeMs}
              currentTimeMs={currentVideoTimeMs}
              transcriptAvailable={context.transcriptAvailable}
            />
          </div>
        </div>

        {/* Right: Review form */}
        <div className="w-80 border-l border-gray-200 bg-white flex flex-col shrink-0">
          <div className="flex-1 min-h-0 overflow-hidden">
            {form && (
              <HighlightReviewForm form={form} onChange={handleFormChange} />
            )}
          </div>
          <div className="px-3 py-2 shrink-0">
            <ReviewActionBar
              status={hl.status}
              isDirty={isDirty}
              isSaving={saveMutation.isPending}
              isConfirming={confirmMutation.isPending}
              isDisabling={disableMutation.isPending}
              onSave={() => saveMutation.mutate()}
              onConfirm={() => confirmMutation.mutate()}
              onDisable={() => disableMutation.mutate()}
            />
          </div>
        </div>
      </div>

      {/* Leave confirmation */}
      <ConfirmDialog
        open={showLeaveConfirm}
        title="未保存的修改"
        message="当前有未保存的修改，确定要离开吗？"
        confirmLabel="离开"
        danger
        onConfirm={handleLeaveConfirm}
        onCancel={() => {
          setShowLeaveConfirm(false);
          pendingNavigation.current = null;
        }}
      />
    </div>
  );
}
