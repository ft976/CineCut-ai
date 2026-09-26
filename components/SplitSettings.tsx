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
    <div
      className={`bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between h-full space-y-5 transition-opacity ${
        isProcessing ? 'opacity-70 pointer-events-none' : ''
      }`}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              Slicing & Reframe Studio
              {isProcessing && (
                <span className="text-rose-600 flex items-center gap-1 text-[11px] normal-case font-semibold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  <Lock className="w-3 h-3" /> Locked
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-500">
              Configure clip intervals, aspect ratio reframing, and visual Part badges
            </p>
          </div>
        </div>
      </div>

      {/* Mode Selector Segmented Bar */}
      <div className="space-y-2.5">
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
          1. Cut Mode
        </label>

        <div className="grid grid-cols-3 gap-1.5 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
          <button
            disabled={isProcessing}
            onClick={() => onSplitModeChange('interval')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              splitMode === 'interval'
                ? 'bg-white text-sky-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="truncate">Fixed Duration</span>
          </button>

          <button
            disabled={isProcessing}
            onClick={() => onSplitModeChange('count')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              splitMode === 'count'
                ? 'bg-white text-sky-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            <span className="truncate">Equal Parts</span>
          </button>

          <button
            disabled={isProcessing}
            onClick={() => onSplitModeChange('custom')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              splitMode === 'custom'
                ? 'bg-white text-sky-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="truncate">Custom Ranges</span>
          </button>
        </div>
      </div>

      {/* Mode-specific Controls */}
      {splitMode === 'interval' && (
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-semibold">Clip Duration Preset:</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-[11px]">Exact sec:</span>
              <input
                type="number"
                min="5"
                max="1800"
                disabled={isProcessing}
                value={intervalSeconds}
                onChange={(e) => onIntervalSecondsChange(parseInt(e.target.value) || 60)}
                className="w-16 bg-white border border-slate-300 rounded-lg px-2 py-1 font-mono font-bold text-center text-sky-700 focus:outline-none focus:border-sky-500 disabled:opacity-50 shadow-2xs"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { label: '15s', val: 15 },
              { label: '30s', val: 30 },
              { label: '60s (Shorts)', val: 60 },
              { label: '90s', val: 90 },
              { label: '2 min', val: 120 },
              { label: '3 min', val: 180 },
              { label: '5 min', val: 300 },
            ].map((preset) => (
              <button
                key={preset.val}
                disabled={isProcessing}
                onClick={() => onIntervalSecondsChange(preset.val)}
                className={`px-2.5 py-1 rounded-lg font-semibold border transition-all cursor-pointer ${
                  intervalSeconds === preset.val
                    ? 'bg-sky-600 border-sky-600 text-white shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 shadow-2xs'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {splitMode === 'count' && (
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-semibold">Total Equal Clips:</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sky-700 font-mono bg-sky-50 border border-sky-200 px-2 py-0.5 rounded">
                {segmentCount} Clips
              </span>
              {videoDuration > 0 && (
                <span className="text-slate-500 font-mono text-[11px]">
                  (~{Math.round(videoDuration / segmentCount)}s each)
                </span>
              )}
            </div>
          </div>
          <input
            type="range"
            min="2"
            max="50"
            disabled={isProcessing}
            value={segmentCount}
            onChange={(e) => onSegmentCountChange(parseInt(e.target.value) || 2)}
            className="w-full accent-sky-600 cursor-pointer disabled:opacity-50"
          />
        </div>
      )}

      {splitMode === 'custom' && (
        <div className="text-xs text-sky-800 bg-sky-50/80 border border-sky-200 p-3 rounded-xl flex items-center justify-between">
          <span>
            <strong>Custom Timeframes Active:</strong> Adjust exact Start and End timestamps for each individual clip in the timeline below.
          </span>
        </div>
      )}

      {/* Aspect Ratio Controls */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
          2. Output Aspect Ratio
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { mode: '9:16' as AspectRatioMode, label: '9:16 Vertical', sub: 'Shorts / Reels', icon: Smartphone },
            { mode: '16:9' as AspectRatioMode, label: '16:9 Landscape', sub: 'YouTube / Original', icon: Monitor },
            { mode: '1:1' as AspectRatioMode, label: '1:1 Square', sub: 'Feed Post', icon: Square },
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
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                  isSelected
                    ? 'bg-sky-50/80 border-sky-400 text-slate-900 shadow-2xs ring-1 ring-sky-400/30'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-sky-600' : 'text-slate-400'}`} />
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{ratio.label}</div>
                  <div className="text-[10px] text-slate-500 truncate">{ratio.sub}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Frame Overlays & Styling Options */}
      <div className="space-y-2 pt-1 border-t border-slate-100">
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
          3. Frame Overlays &amp; Quality Preservation
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          <label className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer select-none hover:border-slate-300 transition-colors">
            <div>
              <span className="font-bold text-slate-800 block">Part Number Badge</span>
              <span className="text-[10px] text-slate-500">Stamp &quot;Part 1&quot;, &quot;Part 2&quot; on clips</span>
            </div>
            <input
              type="checkbox"
              disabled={isProcessing}
              checked={overlayOptions.showPartBadge}
              onChange={(e) =>
                onOverlayOptionsChange({ ...overlayOptions, showPartBadge: e.target.checked })
              }
              className="accent-sky-600 w-4 h-4 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer select-none hover:border-slate-300 transition-colors">
            <div>
              <span className="font-bold text-slate-800 block">Ambient Blur Fill</span>
              <span className="text-[10px] text-slate-500">Soft blurred backdrop for 9:16</span>
            </div>
            <input
              type="checkbox"
              disabled={isProcessing}
              checked={overlayOptions.blurBackground}
              onChange={(e) =>
                onOverlayOptionsChange({ ...overlayOptions, blurBackground: e.target.checked })
              }
              className="accent-sky-600 w-4 h-4 rounded cursor-pointer"
            />
          </label>
        </div>

        {/* Master Quality & Zero Frame-Drop Mode Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            disabled={isProcessing}
            onClick={() =>
              onOverlayOptionsChange({ ...overlayOptions, qualityPreset: 'master-lossless' })
            }
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
              (overlayOptions.qualityPreset || 'master-lossless') === 'master-lossless'
                ? 'bg-emerald-50/80 border-emerald-400 text-slate-900 shadow-2xs ring-1 ring-emerald-400/30'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            <div className="min-w-0">
              <div className="text-xs font-bold flex items-center gap-1.5">
                <span>Master Lossless 1080p</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-600 text-white text-[9px] font-extrabold uppercase">
                  CRF 16 · CFR
                </span>
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                Zero frame drop · Lanczos scaling · 256k Audio
              </div>
            </div>
          </button>

          <button
            type="button"
            disabled={isProcessing}
            onClick={() =>
              onOverlayOptionsChange({ ...overlayOptions, qualityPreset: 'stream-copy' })
            }
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
              overlayOptions.qualityPreset === 'stream-copy'
                ? 'bg-sky-50/80 border-sky-400 text-slate-900 shadow-2xs ring-1 ring-sky-400/30'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            <div className="min-w-0">
              <div className="text-xs font-bold flex items-center gap-1.5">
                <span>100% Bitstream Copy</span>
                <span className="px-1.5 py-0.2 rounded bg-sky-600 text-white text-[9px] font-extrabold uppercase">
                  Exact Original
                </span>
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                Zero re-encoding · 100% untouched original frames
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Canva Video Captions Studio Quick Card */}
      {onOpenCanvaStudio && (
        <div className="pt-1">
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#00C4CC] via-[#7D2AE8] to-[#FF007A] p-0.5 flex items-center justify-center shrink-0 shadow-xs">
                <div className="w-full h-full bg-white rounded-[9px] flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-[#00C4CC]" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-extrabold text-slate-900">Canva Video Captions</h4>
                  {canvaConfig?.enabled && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                      Active: {canvaConfig.styleId.replace('canva-', '').replace('-', ' ')}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
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
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#00C4CC] to-[#7D2AE8] hover:opacity-90 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Caption Studio</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
