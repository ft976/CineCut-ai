'use client';

import React from 'react';
import { AspectRatioMode, OverlayOptions } from '@/lib/video-processor';
import { Clock, Hash, Smartphone, Monitor, Square, Lock, SlidersHorizontal, Sparkles, Palette } from 'lucide-react';
import { CanvaCaptionConfig } from '@/lib/canva-captions';

export type SplitMode = 'interval' | 'count' | 'custom';

interface SplitSettingsProps {
  splitMode: SplitMode;
  onSplitModeChange: (mode: SplitMode) => void;
  intervalSeconds: number;
  onIntervalSecondsChange: (secs: number) => void;
  segmentCount: number;
  onSegmentCountChange: (count: number) => void;
  overlayOptions: OverlayOptions;
  onOverlayOptionsChange: (opts: OverlayOptions) => void;
  videoDuration: number;
  isProcessing: boolean;
  canvaConfig?: CanvaCaptionConfig;
  onOpenCanvaStudio?: () => void;
  captionCount?: number;
}

export function SplitSettings({
  splitMode,
  onSplitModeChange,
  intervalSeconds,
  onIntervalSecondsChange,
  segmentCount,
  onSegmentCountChange,
  overlayOptions,
  onOverlayOptionsChange,
  videoDuration,
  isProcessing,
  canvaConfig,
  onOpenCanvaStudio,
  captionCount = 0,
}: SplitSettingsProps) {
  return (
    <div className={`space-y-6 pt-2 border-t border-slate-800/60 transition-opacity ${isProcessing ? 'opacity-70 pointer-events-none' : ''}`}>
      {/* Mode Selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            Cut Mode
            {isProcessing && (
              <span className="text-rose-400 flex items-center gap-1 text-[11px] normal-case font-semibold">
                <Lock className="w-3 h-3" /> Locked during processing
              </span>
            )}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            disabled={isProcessing}
            onClick={() => onSplitModeChange('interval')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              splitMode === 'interval'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Fixed Duration
          </button>

          <button
            disabled={isProcessing}
            onClick={() => onSplitModeChange('count')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              splitMode === 'count'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Hash className="w-3.5 h-3.5" /> Equal Parts
          </button>

          <button
            disabled={isProcessing}
            onClick={() => onSplitModeChange('custom')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              splitMode === 'custom'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" /> Custom Timeframes
          </button>
        </div>
      </div>

      {/* Mode-specific Controls */}
      {splitMode === 'interval' && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Clip Length:</span>
          {[
            { label: '15s', val: 15 },
            { label: '30s', val: 30 },
            { label: '1 min (Shorts)', val: 60 },
            { label: '2 min', val: 120 },
            { label: '3 min', val: 180 },
            { label: '5 min', val: 300 },
          ].map((preset) => (
            <button
              key={preset.val}
              disabled={isProcessing}
              onClick={() => onIntervalSecondsChange(preset.val)}
              className={`px-3 py-1 rounded-lg font-medium border transition-colors cursor-pointer ${
                intervalSeconds === preset.val
                  ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              {preset.label}
            </button>
          ))}

          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-slate-400">Custom:</span>
            <input
              type="number"
              min="5"
              max="1800"
              disabled={isProcessing}
              value={intervalSeconds}
              onChange={(e) => onIntervalSecondsChange(parseInt(e.target.value) || 60)}
              className="w-16 bg-slate-900 border border-slate-800 rounded px-2 py-1 font-mono text-center text-slate-200 disabled:opacity-50"
            />
            <span className="text-slate-400">sec</span>
          </div>
        </div>
      )}

      {splitMode === 'count' && (
        <div className="flex items-center gap-4 text-xs">
          <span className="text-slate-400 font-medium">Split Into:</span>
          <input
            type="range"
            min="2"
            max="50"
            disabled={isProcessing}
            value={segmentCount}
            onChange={(e) => onSegmentCountChange(parseInt(e.target.value) || 2)}
            className="flex-1 accent-sky-500 max-w-xs disabled:opacity-50"
          />
          <span className="font-bold text-sky-400 font-mono">{segmentCount} Clips</span>
          {videoDuration > 0 && (
            <span className="text-slate-500 ml-auto">
              (~{Math.round(videoDuration / segmentCount)}s per clip)
            </span>
          )}
        </div>
      )}

      {splitMode === 'custom' && (
        <div className="text-xs text-sky-300 bg-sky-500/10 border border-sky-500/20 p-3 rounded-xl flex items-center justify-between">
          <span>
            ✨ <strong>Custom Timeframes Mode active:</strong> Use the Start and End inputs in the Interactive Clip Timeline below to set precise timestamps for each clip.
          </span>
        </div>
      )}

      {/* Aspect Ratio Controls */}
      <div className="space-y-2 pt-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Aspect Ratio
        </h4>
        <div className="flex items-center gap-2 max-w-md">
          {[
            { mode: '9:16' as AspectRatioMode, label: '9:16 Vertical', icon: Smartphone },
            { mode: '16:9' as AspectRatioMode, label: '16:9 Movie', icon: Monitor },
            { mode: '1:1' as AspectRatioMode, label: '1:1 Square', icon: Square },
          ].map((ratio) => {
            const Icon = ratio.icon;
            const isSelected = overlayOptions.aspectRatio === ratio.mode;
            return (
              <button
                key={ratio.mode}
                disabled={isProcessing}
                onClick={() =>
                  onOverlayOptionsChange({ ...overlayOptions, aspectRatio: ratio.mode })
                }
                className={`flex-1 p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-sky-500/10 border-sky-400 text-slate-100'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 mb-1 ${isSelected ? 'text-sky-400' : 'text-slate-500'}`} />
                <div className="text-xs font-semibold">{ratio.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Canva Video Captions Studio Quick Card */}
      {onOpenCanvaStudio && (
        <div className="pt-2">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00C4CC] via-[#7D2AE8] to-[#FF007A] p-0.5 flex items-center justify-center shrink-0 shadow-md">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-[#00C4CC]" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-extrabold text-white">Canva Video Captions</h4>
                  {canvaConfig?.enabled && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                      Active: {canvaConfig.styleId.replace('canva-', '').replace('-', ' ')}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {captionCount > 0
                    ? `${captionCount} AI synced captions ready to burn into video slices`
                    : 'Auto-generate timed captions & customize with 7 authentic Canva styles'}
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isProcessing}
              onClick={onOpenCanvaStudio}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00C4CC] to-[#7D2AE8] hover:opacity-90 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Customize Canva Captions</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
