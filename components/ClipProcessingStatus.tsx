'use client';

import React from 'react';
import { ClipSegment } from '@/lib/video-processor';
import { Download, HardDrive, Sparkles, RefreshCw, AlertCircle, FileArchive, Scissors, Square } from 'lucide-react';

interface ClipProcessingStatusProps {
  segments: ClipSegment[];
  isProcessingAll: boolean;
  onProcessAll: () => void;
  onStopProcessing: () => void;
  onDownloadZip: () => void;
  driveFolderId: string | null;
  driveConnected: boolean;
  onOpenCanva?: (seg: ClipSegment) => void;
}

export function ClipProcessingStatus({
  segments,
  isProcessingAll,
  onProcessAll,
  onStopProcessing,
  onDownloadZip,
  driveFolderId,
  driveConnected,
  onOpenCanva,
}: ClipProcessingStatusProps) {
  const totalClips = segments.length;
  const completedCount = segments.filter((s) => s.status === 'uploaded' || s.status === 'sliced').length;
  const hasAnySliced = segments.some((s) => s.blob !== undefined);

  return (
    <div className="space-y-4 pt-4 border-t border-slate-800/60">
      {/* Primary Execution Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Execution Control
          </h3>
          <p className="text-xs text-slate-500">
            {completedCount} of {totalClips} clips ready {driveConnected ? '• Auto Sync to Drive enabled' : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isProcessingAll ? (
            <button
              onClick={onStopProcessing}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <Square className="w-4 h-4 fill-current text-white" />
              Stop / Cancel Slicing
            </button>
          ) : (
            <button
              onClick={onProcessAll}
              disabled={totalClips === 0}
              className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              <Scissors className="w-4 h-4" />
              Cut Video & Sync to Drive
            </button>
          )}

          {hasAnySliced && (
            <button
              onClick={onDownloadZip}
              className="px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <FileArchive className="w-4 h-4 text-amber-400" />
              ZIP
            </button>
          )}

          {driveFolderId && (
            <a
              href={`https://drive.google.com/drive/folders/${driveFolderId}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-sky-400 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <HardDrive className="w-4 h-4" />
              Drive
            </a>
          )}
        </div>
      </div>

      {/* Clip Progress Rows */}
      <div className="space-y-2">
        {segments.map((seg, idx) => (
          <div
            key={seg.id}
            className="py-2 px-3 rounded-lg bg-slate-900/50 border border-slate-800/60 flex items-center justify-between gap-4 text-xs"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="font-bold text-slate-400 font-mono text-[11px] shrink-0">#{idx + 1}</span>
              <span className="font-semibold text-slate-200 truncate">{seg.label}</span>
              <span className="text-slate-500 font-mono text-[11px] shrink-0">
                ({Math.round(seg.duration)}s)
              </span>

              {/* Status Indicator */}
              {seg.status === 'slicing' && (
                <div className="flex items-center gap-2 flex-1 max-w-xs">
                  <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                    <div
                      className="bg-amber-400 h-full transition-all"
                      style={{ width: `${seg.sliceProgress}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] text-amber-400 font-mono">{seg.sliceProgress}%</span>
                </div>
              )}

              {seg.status === 'uploading' && (
                <div className="flex items-center gap-2 flex-1 max-w-xs">
                  <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                    <div
                      className="bg-sky-400 h-full transition-all"
                      style={{ width: `${seg.uploadProgress}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] text-sky-400 font-mono">{seg.uploadProgress}%</span>
                </div>
              )}

              {seg.errorMessage && (
                <span className="text-rose-400 text-[11px] flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {seg.errorMessage}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {onOpenCanva && (
                <button
                  onClick={() => onOpenCanva(seg)}
                  className="px-2 py-0.5 rounded bg-gradient-to-r from-teal-500/10 to-purple-500/10 hover:from-teal-500/20 hover:to-purple-500/20 border border-teal-500/30 text-teal-300 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                  title="Design Thumbnail in Canva"
                >
                  <span className="w-3 h-3 rounded-sm bg-gradient-to-tr from-[#00c4cc] to-[#7d2ae8] text-white flex items-center justify-center text-[8px] font-black leading-none">
                    C
                  </span>
                  Canva
                </button>
              )}

              {seg.blobUrl && (
                <a
                  href={seg.blobUrl}
                  download={`${seg.label.replace(/[^a-z0-9]/gi, '_')}.webm`}
                  className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
                  title="Download File"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
              )}

              {seg.driveViewLink && (
                <a
                  href={seg.driveViewLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:underline font-semibold text-[11px] flex items-center gap-1"
                >
                  <HardDrive className="w-3 h-3" /> Drive
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
