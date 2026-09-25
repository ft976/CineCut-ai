'use client';

import React, { useState } from 'react';
import { ClipSegment, formatTime, parseTimeToSeconds } from '@/lib/video-processor';
import { Scissors, Play, CheckCircle2, HardDrive, Plus, Trash2, Split, Clock } from 'lucide-react';
import { ConfirmModal } from '@/components/ConfirmModal';

interface TimelineVisualizerProps {
  segments: ClipSegment[];
  totalDuration: number;
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
    <div className="space-y-4 pt-4 border-t border-slate-800/60">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Scissors className="w-4 h-4 text-sky-400" />
          Interactive Clip Timeframes ({segments.length} Clips)
        </h3>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-mono">
            Source Duration: {formatTime(totalDuration)}
          </span>

          {onAddSegment && !isProcessing && (
            <button
              onClick={onAddSegment}
              className="px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Custom Clip
            </button>
          )}
        </div>
      </div>

      {/* Visual Track */}
      <div className="space-y-1">
        <div className="h-5 w-full bg-slate-900 rounded-lg flex gap-0.5 overflow-hidden border border-slate-800/80 p-0.5">
          {segments.map((seg, idx) => {
            const widthPct = totalDuration > 0 ? Math.min(100, (seg.duration / totalDuration) * 100) : 100 / segments.length;
            const colorClass = COLORS[idx % COLORS.length];

            return (
              <div
                key={seg.id}
                style={{ width: `${Math.max(2, widthPct)}%` }}
                onClick={() => onPreviewSegment(seg)}
                title={`Clip ${idx + 1}: ${formatTime(seg.startTime)} to ${formatTime(seg.endTime)} (${Math.round(seg.duration)}s)`}
                className={`h-full ${colorClass} opacity-85 hover:opacity-100 cursor-pointer transition-all flex items-center justify-between text-[10px] font-bold text-white truncate px-1 rounded-sm shadow-sm`}
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
      <div className="divide-y divide-slate-800/60 bg-slate-900/30 rounded-xl border border-slate-800/60 p-2 space-y-2">
        {segments.map((seg, idx) => {
          const isInvalid = seg.startTime >= seg.endTime || seg.startTime < 0;

          return (
            <div
              key={seg.id}
              className={`pt-2.5 pb-2 px-2 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs transition-colors rounded-lg ${
                isInvalid ? 'bg-rose-950/20 border border-rose-800/50' : 'hover:bg-slate-900/50'
              }`}
            >
              {/* Left Column: Label and Index */}
              <div className="flex items-center gap-2.5 min-w-[200px]">
                <span className="font-bold text-sky-400 font-mono text-xs shrink-0 w-6">#{idx + 1}</span>
                <input
                  type="text"
                  disabled={isProcessing}
                  value={seg.label}
                  onChange={(e) => onUpdateSegment(seg.id, { label: e.target.value })}
                  className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 font-semibold focus:outline-none focus:border-sky-500 w-full max-w-[220px] text-xs"
                />
              </div>

              {/* Middle Column: Exact Start & End Time Inputs + Precision Nudge Controls */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Start Time Controls */}
                <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Start:</span>
                  <input
                    type="text"
                    disabled={isProcessing}
                    value={formatTime(seg.startTime)}
                    onChange={(e) => handleStartTimeChange(seg, e.target.value)}
                    className="w-16 bg-slate-900 border border-slate-700/80 rounded px-1.5 py-0.5 text-center font-mono font-bold text-sky-300 focus:outline-none focus:border-sky-400 text-xs"
                    title="Enter start time (e.g. 01:15 or 75)"
                  />
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      disabled={isProcessing || seg.startTime <= 0}
                      onClick={() => handleNudge(seg, 'start', -1)}
                      className="px-1 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono cursor-pointer disabled:opacity-30"
                      title="Subtract 1 second from Start Time"
                    >
                      -1s
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleNudge(seg, 'start', 1)}
                      className="px-1 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono cursor-pointer disabled:opacity-30"
                      title="Add 1 second to Start Time"
                    >
                      +1s
                    </button>
                  </div>
                </div>

                <span className="text-slate-600 font-bold">→</span>

                {/* End Time Controls */}
                <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">End:</span>
                  <input
                    type="text"
                    disabled={isProcessing}
                    value={formatTime(seg.endTime)}
                    onChange={(e) => handleEndTimeChange(seg, e.target.value)}
                    className="w-16 bg-slate-900 border border-slate-700/80 rounded px-1.5 py-0.5 text-center font-mono font-bold text-emerald-300 focus:outline-none focus:border-emerald-400 text-xs"
                    title="Enter end time (e.g. 02:30 or 150)"
                  />
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleNudge(seg, 'end', -1)}
                      className="px-1 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono cursor-pointer disabled:opacity-30"
                      title="Subtract 1 second from End Time"
                    >
                      -1s
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleNudge(seg, 'end', 1)}
                      className="px-1 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono cursor-pointer disabled:opacity-30"
                      title="Add 1 second to End Time"
                    >
                      +1s
                    </button>
                  </div>
                </div>

                {/* Duration Badge */}
                <div className="flex items-center gap-1 font-mono text-[11px] text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-md shrink-0">
                  <Clock className="w-3 h-3" />
                  {Math.round(seg.duration)}s
                </div>
              </div>

              {/* Right Column: Actions (Preview, Split, Delete) */}
              <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                {seg.status === 'uploaded' && (
                  <span className="text-emerald-400 font-medium flex items-center gap-1 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Drive
                  </span>
                )}
                {seg.status === 'slicing' && (
                  <span className="text-amber-400 font-mono text-[11px] animate-pulse">
                    {seg.sliceProgress}%
                  </span>
                )}

                <button
                  onClick={() => onPreviewSegment(seg)}
                  className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium flex items-center gap-1 transition-colors cursor-pointer text-[11px]"
                >
                  <Play className="w-3 h-3 text-sky-400 fill-current" /> Preview
                </button>

                {onOpenCanva && (
                  <button
                    onClick={() => onOpenCanva(seg)}
                    className="px-2 py-1 rounded-md bg-gradient-to-r from-teal-500/10 to-purple-500/10 hover:from-teal-500/20 hover:to-purple-500/20 border border-teal-500/30 text-teal-300 font-semibold flex items-center gap-1 transition-all cursor-pointer text-[11px]"
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
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-sky-300 transition-colors cursor-pointer"
                    title="Split clip in half at midpoint"
                  >
                    <Split className="w-3.5 h-3.5" />
                  </button>
                )}

                {onDeleteSegment && !isProcessing && segments.length > 1 && (
                  <button
                    onClick={() => setSegmentToDelete(seg)}
                    className="p-1 rounded bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
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
                    className="text-sky-400 hover:underline flex items-center gap-1 font-medium text-[11px]"
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
