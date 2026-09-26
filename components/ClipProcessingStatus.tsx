'use client';

import React, { useState } from 'react';
import { ClipSegment, ProcessingEngineType, formatFileSize, formatTime } from '@/lib/video-processor';
import {
  Download,
  HardDrive,
  AlertCircle,
  FileArchive,
  Scissors,
  Square,
  Zap,
  Cpu,
  CheckCircle2,
  Loader2,
  Clock,
  Play,
  Film,
  Maximize2,
} from 'lucide-react';

interface ClipProcessingStatusProps {
  segments: ClipSegment[];
  isProcessingAll: boolean;
  onProcessAll: () => void;
  onStopProcessing: () => void;
  onDownloadZip: () => void;
  driveFolderId: string | null;
  driveConnected: boolean;
  engineMode?: ProcessingEngineType;
  onEngineModeChange?: (mode: ProcessingEngineType) => void;
  activeBackgroundJobId?: string | null;
  sourceStagingProgress?: number | null;
  onOpenCanva?: (seg: ClipSegment) => void;
  onPreviewSegment?: (seg: ClipSegment) => void;
}

export function ClipProcessingStatus({
  segments,
  isProcessingAll,
  onProcessAll,
  onStopProcessing,
  onDownloadZip,
  driveFolderId,
  driveConnected,
  engineMode = 'server-ffmpeg',
  onEngineModeChange,
  activeBackgroundJobId,
  sourceStagingProgress = null,
  onOpenCanva,
  onPreviewSegment,
}: ClipProcessingStatusProps) {
  const [downloadingClipId, setDownloadingClipId] = useState<string | null>(null);

  const totalClips = segments.length;
  const completedCount = segments.filter(
    (s) => s.status === 'uploaded' || s.status === 'sliced'
  ).length;
  const activeSlicingCount = segments.filter(
    (s) => s.status === 'slicing' || s.status === 'uploading'
  ).length;
  const slicedSegments = segments.filter(
    (s) =>
      (s.status === 'sliced' || s.status === 'uploaded') &&
      (s.blob !== undefined || Boolean(s.downloadUrl) || Boolean(s.blobUrl))
  );
  const hasAnySliced = slicedSegments.length > 0;

  const handleDownloadClip = async (seg: ClipSegment, ext: string) => {
    const fileName = `${seg.label.replace(/[^a-z0-9]/gi, '_')}.${ext}`;
    try {
      setDownloadingClipId(seg.id);

      // 1. If we already have a local Blob in memory, download directly from Blob
      if (seg.blob) {
        const localUrl = URL.createObjectURL(seg.blob);
        const a = document.createElement('a');
        a.href = localUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(localUrl), 10000);
        return;
      }

      // 2. If it's a blob: URL already in browser memory
      if (seg.blobUrl && seg.blobUrl.startsWith('blob:')) {
        const a = document.createElement('a');
        a.href = seg.blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      // 3. Fetch binary from server /api/video/clip endpoint into a Blob so it downloads reliably inside iframes
      const rawUrl = seg.downloadUrl || seg.blobUrl;
      if (rawUrl) {
        const downloadEndpoint = rawUrl.includes('?')
          ? `${rawUrl}&download=1`
          : `${rawUrl}?download=1`;
        const res = await fetch(downloadEndpoint);
        if (res.ok) {
          const fetchedBlob = await res.blob();
          const localUrl = URL.createObjectURL(fetchedBlob);
          const a = document.createElement('a');
          a.href = localUrl;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(localUrl), 10000);
          return;
        }
      }
    } catch (err) {
      console.error('Download clip error:', err);
    } finally {
      setDownloadingClipId(null);
    }
  };

  // Calculate real-time weighted progress across all clips so the user sees smooth 0% -> 100% progress
  const totalProgressSum = segments.reduce((acc, seg) => {
    if (seg.status === 'uploaded' || seg.status === 'sliced') {
      return acc + 100;
    }
    if (seg.status === 'uploading') {
      return acc + Math.min(99, 75 + Math.round((seg.uploadProgress || 0) * 0.25));
    }
    if (seg.status === 'slicing') {
      const slicePct = Math.max(8, seg.sliceProgress || 0);
      return acc + (driveConnected ? Math.round(slicePct * 0.75) : slicePct);
    }
    if (isProcessingAll && sourceStagingProgress !== null && sourceStagingProgress > 0) {
      return acc + Math.min(15, Math.round(sourceStagingProgress * 0.15));
    }
    return acc;
  }, 0);

  const overallPct =
    totalClips > 0
      ? completedCount === totalClips
        ? 100
        : Math.min(
            99,
            Math.max(
              isProcessingAll ? 4 : 0,
              Math.round(totalProgressSum / totalClips)
            )
          )
      : 0;

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      {/* Primary Execution Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Batch Slicing &amp; Cloud Sync Queue
            </h3>
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono text-[11px] font-bold">
              {completedCount}/{totalClips} Ready ({overallPct}%)
            </span>
            {engineMode === 'server-ffmpeg' && (
              <span className="px-2 py-0.5 rounded bg-sky-50 border border-sky-200 text-sky-700 text-[10px] font-bold flex items-center gap-1">
                <Zap className="w-3 h-3 text-sky-600" />
                Zero Frame Drop · Lossless MP4 · 3x Parallel
              </span>
            )}
            {activeBackgroundJobId && isProcessingAll && (
              <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold flex items-center gap-1 animate-pulse">
                Cloud Background Job Active (Works When App Closed)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {engineMode === 'server-ffmpeg'
              ? 'Autonomous Server FFmpeg cuts 100% quality, zero-frame-drop MP4 clips in the background — continues running & uploading to Google Drive even if you minimize or close the app.'
              : '1080p 60fps Master Canvas Engine with background tab anti-throttling & direct Drive sync.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Engine Mode Switcher */}
          {onEngineModeChange && (
            <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/80 text-[11px] font-semibold">
              <button
                type="button"
                disabled={isProcessingAll}
                onClick={() => onEngineModeChange('server-ffmpeg')}
                className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  engineMode === 'server-ffmpeg'
                    ? 'bg-white text-sky-700 shadow-2xs border border-slate-200/80 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Ultra-fast Server FFmpeg Engine (outputs universal MP4 + parallel server-to-Drive upload)"
              >
                <Zap className="w-3.5 h-3.5 text-sky-600" />
                Turbo Backend (MP4)
              </button>
              <button
                type="button"
                disabled={isProcessingAll}
                onClick={() => onEngineModeChange('browser-canvas')}
                className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  engineMode === 'browser-canvas'
                    ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200/80 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Browser HTML5 Canvas Engine (outputs WebM with custom animated canvas captions)"
              >
                <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                Canvas (WebM)
              </button>
            </div>
          )}

          {isProcessingAll ? (
            <button
              onClick={onStopProcessing}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center gap-2"
            >
              <Square className="w-4 h-4 fill-current text-white" />
              Stop / Cancel Slicing
            </button>
          ) : (
            <button
              onClick={onProcessAll}
              disabled={totalClips === 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              <Scissors className="w-4 h-4" />
              Cut Video &amp; Sync to Drive
            </button>
          )}

          {hasAnySliced && (
            <button
              onClick={onDownloadZip}
              className="px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <FileArchive className="w-4 h-4 text-amber-600" />
              Download All (.ZIP)
            </button>
          )}

          {driveFolderId && (
            <a
              href={`https://drive.google.com/drive/folders/${driveFolderId}`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <HardDrive className="w-4 h-4" />
              Open Drive Folder
            </a>
          )}
        </div>
      </div>

      {/* Live Overall Batch Progress Bar */}
      {(isProcessingAll || completedCount > 0) && (
        <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              {isProcessingAll ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 text-sky-600 animate-spin shrink-0" />
                  <span>
                    {sourceStagingProgress !== null && sourceStagingProgress < 100
                      ? `Staging Source Video to Turbo FFmpeg Engine (${sourceStagingProgress}%)...`
                      : engineMode === 'server-ffmpeg'
                        ? `Turbo FFmpeg Backend Slicing ${activeSlicingCount > 0 ? `${activeSlicingCount} Clips in Parallel` : 'Clips'}...`
                        : 'Slicing Video Clips in Master Canvas...'}
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-emerald-800 font-bold">
                    Batch Complete — {completedCount} of {totalClips} Clips Ready
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 font-mono text-xs font-bold">
              <span className="text-slate-500">
                {completedCount}/{totalClips} Clips Done
              </span>
              <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-200">
                {overallPct}%
              </span>
            </div>
          </div>
          <div className="w-full bg-slate-200/80 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                completedCount === totalClips && !isProcessingAll
                  ? 'bg-emerald-500'
                  : 'bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-500'
              }`}
              style={{ width: `${overallPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Clip Progress Rows */}
      <div className="space-y-2">
        {segments.map((seg, idx) => {
          const ext = seg.mimeType?.includes('mp4') ? 'mp4' : 'webm';
          const clipSizeStr = formatFileSize(seg.sizeBytes || seg.blob?.size);
          const isClipDone = seg.status === 'sliced' || seg.status === 'uploaded';
          const isClipActive = seg.status === 'slicing' || seg.status === 'uploading';
          const activePct =
            seg.status === 'uploading'
              ? Math.max(10, seg.uploadProgress || 0)
              : seg.status === 'slicing'
                ? Math.max(8, seg.sliceProgress || 0)
                : isClipDone
                  ? 100
                  : isProcessingAll && sourceStagingProgress !== null
                    ? Math.max(5, Math.round(sourceStagingProgress * 0.2))
                    : 0;

          return (
            <div
              key={seg.id}
              className={`py-2.5 px-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all ${
                isClipActive
                  ? 'bg-sky-50/40 border-sky-300 shadow-xs'
                  : isClipDone
                    ? 'bg-emerald-50/20 border-emerald-200/90'
                    : 'bg-white border-slate-200 shadow-2xs'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
                <span className="font-bold text-slate-400 font-mono text-[11px] shrink-0">
                  #{idx + 1}
                </span>
                <span className="font-bold text-slate-800 truncate max-w-[200px] sm:max-w-[260px]">
                  {seg.label}
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 font-mono text-[10px] shrink-0">
                  <Clock className="w-2.5 h-2.5 text-slate-500" />
                  {Math.round(seg.duration)}s
                </span>

                {clipSizeStr && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono text-[10px] font-bold shrink-0">
                    <HardDrive className="w-2.5 h-2.5 text-indigo-600" />
                    {clipSizeStr}
                  </span>
                )}

                {seg.processingTimeMs && isClipDone && (
                  <span className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 font-mono text-[10px]">
                    <Zap className="w-2.5 h-2.5 text-amber-500" />
                    {(seg.processingTimeMs / 1000).toFixed(1)}s · {ext.toUpperCase()}
                    {seg.resolution ? ` · ${seg.resolution}` : ''}
                    {seg.fps ? ` · ${seg.fps}fps` : ''}
                  </span>
                )}

                {/* Real-Time Progress Bar for Slicing / Uploading / Queued / Done */}
                {(isClipActive || isProcessingAll || isClipDone) && !seg.errorMessage && (
                  <div className="flex items-center gap-2.5 flex-1 min-w-[160px] max-w-sm ml-auto sm:ml-2">
                    <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-200 rounded-full ${
                          isClipDone
                            ? 'bg-emerald-500'
                            : seg.status === 'uploading'
                              ? 'bg-sky-600'
                              : isClipActive
                                ? 'bg-gradient-to-r from-amber-500 to-sky-500'
                                : 'bg-slate-400'
                        }`}
                        style={{ width: `${activePct}%` }}
                      />
                    </div>
                    <span
                      className={`text-[10px] font-bold font-mono shrink-0 min-w-[82px] text-right ${
                        isClipDone
                          ? 'text-emerald-700'
                          : seg.status === 'uploading'
                            ? 'text-sky-700'
                            : isClipActive
                              ? 'text-amber-700'
                              : 'text-slate-500'
                      }`}
                    >
                      {isClipDone
                        ? seg.status === 'uploaded'
                          ? 'Synced 100%'
                          : 'Ready 100%'
                        : seg.status === 'uploading'
                          ? `Drive ${activePct}%`
                          : isClipActive
                            ? `Cutting ${activePct}%`
                            : sourceStagingProgress !== null && sourceStagingProgress < 100
                              ? `Staging ${sourceStagingProgress}%`
                              : 'Queued'}
                    </span>
                  </div>
                )}

                {seg.errorMessage && (
                  <span className="text-rose-600 text-[11px] flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3" /> {seg.errorMessage}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {onPreviewSegment && (seg.blobUrl || seg.downloadUrl) && (
                  <button
                    type="button"
                    onClick={() => onPreviewSegment(seg)}
                    className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                    title="Play & Watch Cut Video Clip"
                  >
                    <Play className="w-3 h-3 text-sky-600 fill-current" />
                    <span>Play Clip</span>
                  </button>
                )}

                {onOpenCanva && (
                  <button
                    onClick={() => onOpenCanva(seg)}
                    className="px-2 py-0.5 rounded bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                    title="Design Thumbnail in Canva"
                  >
                    <span className="w-3 h-3 rounded-sm bg-gradient-to-tr from-[#00c4cc] to-[#7d2ae8] text-white flex items-center justify-center text-[8px] font-black leading-none">
                      C
                    </span>
                    Canva
                  </button>
                )}

                {(seg.blobUrl || seg.downloadUrl) && (
                  <button
                    type="button"
                    disabled={downloadingClipId === seg.id}
                    onClick={() => handleDownloadClip(seg, ext)}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                    title={`Download .${ext.toUpperCase()} Video File`}
                  >
                    {downloadingClipId === seg.id ? (
                      <Loader2 className="w-3 h-3 animate-spin text-sky-400" />
                    ) : (
                      <Download className="w-3 h-3 text-sky-400" />
                    )}
                    <span>Download .{ext.toUpperCase()}</span>
                  </button>
                )}

                {seg.driveViewLink && (
                  <a
                    href={seg.driveViewLink}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-semibold text-[11px] flex items-center gap-1 transition-colors"
                  >
                    <HardDrive className="w-3 h-3 text-emerald-600" /> Drive
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Cut Video Clips Player Showcase (Visible Immediately After Cutting) */}
      {slicedSegments.length > 0 && (
        <div className="pt-4 border-t border-slate-200/80 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <Film className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  Cut Video Clips — Ready to Play &amp; Download
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[11px] font-bold">
                    {slicedSegments.length} {slicedSegments.length === 1 ? 'Clip' : 'Clips'} Ready
                  </span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Watch your cut video clips directly below or click Download to save the MP4 file to your device
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {slicedSegments.map((seg) => {
              const ext = seg.mimeType?.includes('mp4') ? 'mp4' : 'webm';
              const playUrl = seg.blobUrl || seg.downloadUrl || '';
              const sizeLabel = formatFileSize(seg.sizeBytes || seg.blob?.size);

              return (
                <div
                  key={`player_card_${seg.id}`}
                  className="rounded-2xl bg-slate-50 border border-slate-200/90 overflow-hidden flex flex-col justify-between shadow-xs hover:border-sky-300 transition-all"
                >
                  {/* Card Header */}
                  <div className="px-3.5 py-2.5 bg-white border-b border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-2 py-0.5 rounded bg-sky-600 text-white font-mono text-[10px] font-extrabold shrink-0">
                        PART {seg.index + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-800 truncate" title={seg.label}>
                        {seg.label}
                      </span>
                    </div>
                    {onPreviewSegment && (
                      <button
                        type="button"
                        onClick={() => onPreviewSegment(seg)}
                        className="p-1 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer shrink-0"
                        title="Open Full Preview Modal"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Embedded Playable HTML5 Video Player */}
                  <div className="relative bg-slate-950 aspect-video w-full flex items-center justify-center overflow-hidden">
                    <video
                      key={playUrl}
                      src={playUrl}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Metadata & Action Footer */}
                  <div className="p-3 bg-white border-t border-slate-100 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px] font-mono text-slate-600">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                        <Clock className="w-3 h-3 text-sky-600" />
                        {formatTime(seg.startTime)} - {formatTime(seg.endTime)} ({Math.round(seg.duration)}s)
                      </span>
                      {sizeLabel && (
                        <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold">
                          {sizeLabel}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={downloadingClipId === seg.id}
                        onClick={() => handleDownloadClip(seg, ext)}
                        className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
                      >
                        {downloadingClipId === seg.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Downloading...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5" />
                            <span>Download .{ext.toUpperCase()}</span>
                          </>
                        )}
                      </button>

                      {onPreviewSegment && (
                        <button
                          type="button"
                          onClick={() => onPreviewSegment(seg)}
                          className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          title="Open Fullscreen Studio Player"
                        >
                          <Play className="w-3.5 h-3.5 text-sky-600 fill-current" />
                          <span>Expand</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
