'use client';

import React, { useState } from 'react';
import { ClipSegment, formatTime, formatFileSize, parseTimeToSeconds } from '@/lib/video-processor';
import { Scissors, Play, CheckCircle2, HardDrive, Plus, Trash2, Split, Clock } from 'lucide-react';
import { ConfirmModal } from '@/components/ConfirmModal';

interface TimelineVisualizerProps {
  segments: ClipSegment[];
  totalDuration: number;
  totalSizeBytes?: number;
  onPreviewSegment: (seg: ClipSegment) => void;
  onUpdateSegment: (segId: string, updates: Partial<ClipSegment>) => void;
  onAddSegment?: () => void;
  onDeleteSegment?: (segId: string) => void;
  onSplitSegment?: (segId: string) => void;
  onOpenCanva?: (seg: ClipSegment) => void;
  isProcessing?: boolean;
}

export function TimelineVisualizer({
  segments,
  totalDuration,
  totalSizeBytes = 0,
  onPreviewSegment,
  onUpdateSegment,
  onAddSegment,
  onDeleteSegment,
  onSplitSegment,
  onOpenCanva,
  isProcessing = false,
}: TimelineVisualizerProps) {
  const [segmentToDelete, setSegmentToDelete] = useState<ClipSegment | null>(null);

  if (!segments || segments.length === 0) return null;

  const COLORS = [
    'bg-sky-500',
    'bg-indigo-500',
    'bg-purple-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
  ];

  const handleStartTimeChange = (seg: ClipSegment, newStartStr: string) => {
    let newStart = parseTimeToSeconds(newStartStr);
    if (isNaN(newStart) || newStart < 0) newStart = 0;
    if (totalDuration > 0 && newStart >= totalDuration) {
      newStart = Math.max(0, totalDuration - 1);
    }
    const end = Math.max(newStart + 0.5, seg.endTime);
    const duration = Math.max(0.1, end - newStart);

    onUpdateSegment(seg.id, {
      startTime: newStart,
      endTime: end,
      duration,
      label: `Clip ${seg.index + 1} (${formatTime(newStart)} - ${formatTime(end)})`,
    });
  };

  const handleEndTimeChange = (seg: ClipSegment, newEndStr: string) => {
    let newEnd = parseTimeToSeconds(newEndStr);
    if (isNaN(newEnd)) newEnd = seg.startTime + 1;
    if (totalDuration > 0 && newEnd > totalDuration) {
      newEnd = totalDuration;
    }
    const start = Math.min(newEnd - 0.5, seg.startTime);
    const duration = Math.max(0.1, newEnd - start);

    onUpdateSegment(seg.id, {
      startTime: Math.max(0, start),
      endTime: newEnd,
      duration,
      label: `Clip ${seg.index + 1} (${formatTime(start)} - ${formatTime(newEnd)})`,
    });
  };

  const handleNudge = (seg: ClipSegment, target: 'start' | 'end', deltaSeconds: number) => {
    if (target === 'start') {
      const updated = Math.max(0, Math.min(seg.endTime - 0.5, seg.startTime + deltaSeconds));
      handleStartTimeChange(seg, updated.toString());
    } else {
      const updated = Math.max(seg.startTime + 0.5, Math.min(totalDuration || 999999, seg.endTime + deltaSeconds));
      handleEndTimeChange(seg, updated.toString());
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-200/80 flex items-center justify-center text-sky-600">
            <Scissors className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              Interactive Clip Timeline
              <span className="px-2 py-0.5 rounded bg-sky-50 border border-sky-200 text-sky-700 font-mono text-[11px]">
                {segments.length} Clips
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Click any segment on the visual track to preview, or fine-tune start &amp; end timestamps below
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-600 font-mono bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 font-semibold">
            Total Length: {formatTime(totalDuration)}
          </span>
          {totalSizeBytes > 0 && (
            <span className="text-xs text-indigo-700 font-mono bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 font-semibold">
              Size: {formatFileSize(totalSizeBytes)}
            </span>
          )}

          {onAddSegment && !isProcessing && (
            <button
              onClick={onAddSegment}
              className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" /> Add Clip
            </button>
          )}
        </div>
      </div>

      {/* Visual Track */}
      <div className="space-y-1.5">
        <div className="h-7 w-full bg-slate-100 rounded-xl flex gap-1 overflow-hidden border border-slate-200/90 p-1 shadow-inner">
          {segments.map((seg, idx) => {
            const widthPct = totalDuration > 0 ? Math.min(100, (seg.duration / totalDuration) * 100) : 100 / segments.length;
            const colorClass = COLORS[idx % COLORS.length];

            return (
              <div
                key={seg.id}
                style={{ width: `${Math.max(2, widthPct)}%` }}
                onClick={() => onPreviewSegment(seg)}
                title={`Clip ${idx + 1}: ${formatTime(seg.startTime)} to ${formatTime(seg.endTime)} (${Math.round(seg.duration)}s)`}
                className={`h-full ${colorClass} opacity-90 hover:opacity-100 cursor-pointer transition-all flex items-center justify-between text-[10px] font-bold text-white truncate px-1.5 rounded-md shadow-2xs`}
              >
                <span className="truncate">C{idx + 1}</span>
                <span className="text-[9px] opacity-90 hidden sm:inline font-mono">
                  {formatTime(seg.startTime)}-{formatTime(seg.endTime)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Interactive Timeframe Rows */}
      <div className="divide-y divide-slate-100 bg-slate-50/50 rounded-xl border border-slate-200/80 p-2 space-y-1.5 max-h-[420px] overflow-y-auto">
        {segments.map((seg, idx) => {
          const isInvalid = seg.startTime >= seg.endTime || seg.startTime < 0;

          return (
            <div
              key={seg.id}
              className={`pt-2.5 pb-2 px-2 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs transition-colors rounded-lg ${
                isInvalid ? 'bg-rose-50 border border-rose-200' : 'hover:bg-slate-50/70'
              }`}
            >
              {/* Left Column: Label and Index */}
              <div className="flex items-center gap-2.5 min-w-[200px]">
                <span className="font-bold text-sky-700 font-mono text-xs shrink-0 w-6">#{idx + 1}</span>
                <input
                  type="text"
                  disabled={isProcessing}
                  value={seg.label}
                  onChange={(e) => onUpdateSegment(seg.id, { label: e.target.value })}
                  className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 font-semibold focus:outline-none focus:border-sky-500 w-full max-w-[220px] text-xs"
                />
              </div>

              {/* Middle Column: Exact Start & End Time Inputs + Precision Nudge Controls */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Start Time Controls */}
                <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Start:</span>
                  <input
                    type="text"
                    disabled={isProcessing}
                    value={formatTime(seg.startTime)}
                    onChange={(e) => handleStartTimeChange(seg, e.target.value)}
                    className="w-16 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-center font-mono font-bold text-sky-700 focus:outline-none focus:border-sky-500 text-xs shadow-2xs"
                    title="Enter start time (e.g. 01:15 or 75)"
                  />
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      disabled={isProcessing || seg.startTime <= 0}
                      onClick={() => handleNudge(seg, 'start', -1)}
                      className="px-1 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-mono cursor-pointer disabled:opacity-30"
                      title="Subtract 1 second from Start Time"
                    >
                      -1s
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleNudge(seg, 'start', 1)}
                      className="px-1 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-mono cursor-pointer disabled:opacity-30"
                      title="Add 1 second to Start Time"
                    >
                      +1s
                    </button>
                  </div>
                </div>

                <span className="text-slate-400 font-bold">→</span>

                {/* End Time Controls */}
                <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">End:</span>
                  <input
                    type="text"
                    disabled={isProcessing}
                    value={formatTime(seg.endTime)}
                    onChange={(e) => handleEndTimeChange(seg, e.target.value)}
                    className="w-16 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-center font-mono font-bold text-emerald-700 focus:outline-none focus:border-emerald-500 text-xs shadow-2xs"
                    title="Enter end time (e.g. 02:30 or 150)"
                  />
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleNudge(seg, 'end', -1)}
                      className="px-1 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-mono cursor-pointer disabled:opacity-30"
                      title="Subtract 1 second from End Time"
                    >
                      -1s
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleNudge(seg, 'end', 1)}
                      className="px-1 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-mono cursor-pointer disabled:opacity-30"
                      title="Add 1 second to End Time"
                    >
                      +1s
                    </button>
                  </div>
                </div>

                {/* Duration Badge */}
                <div className="flex items-center gap-1 font-mono text-[11px] text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2 py-1 rounded-md shrink-0">
                  <Clock className="w-3 h-3" />
                  {Math.round(seg.duration)}s
                </div>
              </div>

              {/* Right Column: Actions (Preview, Split, Delete) */}
              <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                {seg.status === 'uploaded' && (
                  <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Synced 100%
                  </span>
                )}
                {seg.status === 'sliced' && (
                  <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Ready 100%
                  </span>
                )}
                {seg.status === 'slicing' && (
                  <span className="text-amber-700 font-mono text-[11px] font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded animate-pulse">
                    Cutting {Math.max(8, seg.sliceProgress)}%
                  </span>
                )}
                {seg.status === 'uploading' && (
                  <span className="text-sky-700 font-mono text-[11px] font-bold bg-sky-50 border border-sky-200 px-2 py-0.5 rounded animate-pulse">
                    Drive {Math.max(10, seg.uploadProgress)}%
                  </span>
                )}

                <button
                  onClick={() => onPreviewSegment(seg)}
                  className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium flex items-center gap-1 transition-colors cursor-pointer text-[11px] shadow-xs"
                >
                  <Play className="w-3 h-3 text-sky-600 fill-current" /> Preview
                </button>

                {onOpenCanva && (
                  <button
                    onClick={() => onOpenCanva(seg)}
                    className="px-2 py-1 rounded-md bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 font-semibold flex items-center gap-1 transition-all cursor-pointer text-[11px]"
                    title="Design Thumbnail in Canva"
                  >
                    <span className="w-3.5 h-3.5 rounded-sm bg-gradient-to-tr from-[#00c4cc] to-[#7d2ae8] text-white flex items-center justify-center text-[9px] font-black leading-none">
                      C
                    </span>
                    Canva
                  </button>
                )}

                {onSplitSegment && !isProcessing && seg.duration > 2 && (
                  <button
                    onClick={() => onSplitSegment(seg.id)}
                    className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-sky-700 transition-colors cursor-pointer shadow-xs"
                    title="Split clip in half at midpoint"
                  >
                    <Split className="w-3.5 h-3.5" />
                  </button>
                )}

                {onDeleteSegment && !isProcessing && segments.length > 1 && (
                  <button
                    onClick={() => setSegmentToDelete(seg)}
                    className="p-1 rounded bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer shadow-xs"
                    title="Delete clip segment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {seg.driveViewLink && (
                  <a
                    href={seg.driveViewLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-700 hover:underline flex items-center gap-1 font-medium text-[11px]"
                  >
                    <HardDrive className="w-3 h-3" /> Link
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Segment Confirmation Modal */}
      <ConfirmModal
        isOpen={segmentToDelete !== null}
        title="Delete Clip Segment"
        message={`Are you sure you want to delete "${segmentToDelete?.label || 'this clip'}"? The remaining clips will be re-numbered.`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={() => {
          if (segmentToDelete && onDeleteSegment) {
            onDeleteSegment(segmentToDelete.id);
          }
          setSegmentToDelete(null);
        }}
        onCancel={() => setSegmentToDelete(null)}
      />
    </div>
  );
}
