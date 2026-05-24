import { useRef, useEffect, useCallback, useState } from 'react';

interface Props {
  videoUrl: string;
  startTimeMs: number;
  endTimeMs: number;
  onCurrentTimeChange?: (ms: number) => void;
}

export function HighlightVideoPanel({ videoUrl, startTimeMs, endTimeMs, onCurrentTimeChange }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pendingSeekMsRef = useRef<number | null>(null);
  const pendingPlayRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  const seekVideo = useCallback((targetMs: number, shouldPlay: boolean) => {
    const video = videoRef.current;
    if (!video) return;

    const safeTargetMs = Math.max(0, targetMs);
    pendingSeekMsRef.current = safeTargetMs;
    pendingPlayRef.current = shouldPlay;

    if (video.readyState < 1 || Number.isNaN(video.duration)) {
      video.load();
      return;
    }

    const maxDurationMs = Number.isFinite(video.duration) ? Math.floor(video.duration * 1000) : safeTargetMs;
    const resolvedTargetMs = Math.min(safeTargetMs, maxDurationMs);
    video.currentTime = resolvedTargetMs / 1000;
  }, []);

  const flushPendingSeek = useCallback(() => {
    const video = videoRef.current;
    if (!video || pendingSeekMsRef.current === null || video.readyState < 1 || Number.isNaN(video.duration)) {
      return;
    }

    const maxDurationMs = Number.isFinite(video.duration) ? Math.floor(video.duration * 1000) : pendingSeekMsRef.current;
    const resolvedTargetMs = Math.min(pendingSeekMsRef.current, maxDurationMs);
    const shouldPlay = pendingPlayRef.current;

    pendingSeekMsRef.current = null;
    pendingPlayRef.current = false;

    video.currentTime = resolvedTargetMs / 1000;
    setCurrentTimeMs(resolvedTargetMs);
    onCurrentTimeChange?.(resolvedTargetMs);

    if (shouldPlay) {
      void video.play().catch(() => {
        // ignore autoplay/seek play rejections
      });
    }
  }, [onCurrentTimeChange]);

  // Seek to start-3s on mount or when times change
  useEffect(() => {
    seekVideo(startTimeMs - 3000, false);
  }, [seekVideo, startTimeMs, videoUrl]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const ms = Math.floor(video.currentTime * 1000);
    setCurrentTimeMs(ms);
    onCurrentTimeChange?.(ms);

    // Auto-pause after endTimeMs + 1500ms
    if (isPlaying && ms > endTimeMs + 1500) {
      video.pause();
    }
  }, [endTimeMs, isPlaying, onCurrentTimeChange]);

  const handlePlaySegment = useCallback(() => {
    seekVideo(startTimeMs - 1000, true);
  }, [seekVideo, startTimeMs]);

  const formatTimeDisplay = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    const msRemainder = ms % 1000;
    return `${m}:${String(s).padStart(2, '0')}.${String(msRemainder).padStart(3, '0')}`;
  };

  if (!videoUrl) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 text-gray-400 text-sm">
        视频资源不可用
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 bg-black flex items-center justify-center min-h-0">
        <video
          ref={videoRef}
          src={videoUrl}
          className="max-w-full max-h-full"
          controls
          preload="metadata"
          onTimeUpdate={handleTimeUpdate}
          onSeeked={flushPendingSeek}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onLoadedMetadata={(e) => {
            setDurationMs(Math.floor(e.currentTarget.duration * 1000));
            flushPendingSeek();
          }}
          onCanPlay={flushPendingSeek}
        />
      </div>

      {/* Controls bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-t border-gray-200 text-xs">
        <button
          onClick={handlePlaySegment}
          className="px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
        >
          播放候选片段
        </button>

        <div className="flex-1" />

        <span className="text-gray-500 tabular-nums">
          {formatTimeDisplay(currentTimeMs)} / {formatTimeDisplay(durationMs)}
        </span>

        <div className="flex items-center gap-1 ml-2">
          <span className="text-gray-400">候选区间:</span>
          <span className="tabular-nums text-gray-600">
            {formatTimeDisplay(startTimeMs)} ~ {formatTimeDisplay(endTimeMs)}
          </span>
        </div>
      </div>
    </div>
  );
}
