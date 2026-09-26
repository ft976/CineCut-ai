'use client';

import React, { useState } from 'react';
import {
  X,
  HardDrive,
  Scissors,
  ShieldCheck,
  Layers,
  Sparkles,
  HelpCircle,
  Film,
  Zap,
  FolderSync,
  Cpu,
  PlayCircle,
  Clock,
} from 'lucide-react';
import { Logo } from '@/components/Logo';

interface InfoModalProps {
  onClose: () => void;
}

export function InfoModal({ onClose }: InfoModalProps) {
  const [activeTab, setActiveTab] = useState<'guide' | 'features' | 'engine' | 'faq'>('guide');

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Top Header & Tabs */}
        <div className="px-5 pt-4 pb-3 border-b border-slate-100 shrink-0 space-y-3 bg-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Logo size="sm" showSubtitle={false} />
              <div className="border-l border-slate-200 pl-2.5 min-w-0">
                <h2 className="text-sm font-bold text-slate-900 truncate">
                  How It Works &amp; Studio Guide
                </h2>
                <p className="text-[11px] text-slate-500 truncate">
                  Turbo FFmpeg Backend • Background Execution • Google Drive From ➔ To Pipeline
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'guide'
                  ? 'bg-sky-50 text-sky-700 border border-sky-200 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              How It Works
            </button>
            <button
              onClick={() => setActiveTab('features')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'features'
                  ? 'bg-sky-50 text-sky-700 border border-sky-200 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              Key Capabilities
            </button>
            <button
              onClick={() => setActiveTab('engine')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'engine'
                  ? 'bg-sky-50 text-sky-700 border border-sky-200 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              Turbo Engine &amp; Background Mode
            </button>
            <button
              onClick={() => setActiveTab('faq')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'faq'
                  ? 'bg-sky-50 text-sky-700 border border-sky-200 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              FAQ &amp; Cloud Sync
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Tab 1: How It Works */}
          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 font-bold flex items-center justify-center text-xs">
                    1
                  </div>
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5 text-sky-600" /> Upload or Pick from Drive
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-normal">
                    Drop a local video, pick one from your Google Drive <strong>From Folder</strong>, or click <strong>Try Demo Video</strong>. The monitor immediately displays your video&apos;s exact <strong>Length</strong> and <strong>File Size</strong> while pre-staging it to the Turbo Backend in the background.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold flex items-center justify-center text-xs">
                    2
                  </div>
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-indigo-600" /> Configure Slicing &amp; Quality
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-normal">
                    Select <strong>Fixed Duration</strong> (e.g. 60s Shorts), <strong>Equal Parts</strong>, or fine-tune start/end timestamps on the <strong>Interactive Clip Timeline</strong>. Choose 9:16 Vertical with blur and either <strong>Master Lossless</strong> or <strong>100% Bitstream Copy</strong>.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 font-bold flex items-center justify-center text-xs">
                    3
                  </div>
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-600" /> Cut in Parallel &amp; Background
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-normal">
                    Click <strong>Cut Video &amp; Sync to Drive</strong>. Up to <strong>6x parallel FFmpeg workers</strong> slice your clips in seconds with live progress bars—and keep running even if you minimize or close the app.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold flex items-center justify-center text-xs">
                    4
                  </div>
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <PlayCircle className="w-3.5 h-3.5 text-emerald-600" /> Play, Download &amp; Sync
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-normal">
                    Watch finished clips directly in the embedded <strong>Cut Video Clips</strong> gallery, download individual <code>.MP4</code> files or a <code>.ZIP</code> bundle, and access them in your Google Drive <strong>To Folder</strong>.
                  </p>
                </div>
              </div>

              {/* Quick Tips Box */}
              <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-sky-700 text-xs">
                  <Sparkles className="w-4 h-4" /> Pro Tip for Fastest Cutting &amp; Social Media
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Keep <strong>Turbo Backend (MP4)</strong> selected for up to 6x parallel FFmpeg speed and universal H.264 MP4 output. If you want zero re-encoding with exact original frames, select <strong>100% Bitstream Copy</strong> in Slicing &amp; Reframe Studio.
                </p>
              </div>
            </div>
          )}

          {/* Tab 2: Key Capabilities */}
          {activeTab === 'features' && (
            <div className="space-y-2.5 text-xs text-slate-700 leading-relaxed">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <Clock className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block mb-0.5">
                    Live Video Length, File Size &amp; Interactive Timeline
                  </strong>
                  <span className="text-slate-600 text-[11px] block">
                    Automatically detects and displays your source video&apos;s duration and byte size (`MB` / `GB`), plus each sliced clip&apos;s output file size, resolution, FPS, and processing time.
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <Layers className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block mb-0.5">
                    9:16 Vertical Reframing, Ambient Blur &amp; Part Badges
                  </strong>
                  <span className="text-slate-600 text-[11px] block">
                    Reframe widescreen videos into 9:16 Vertical (Shorts/Reels), 16:9 Landscape, or 1:1 Square with our 36x faster downscale-blur-upscale backdrop and automatic sequential <code>PART 1, PART 2</code> badges.
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <HardDrive className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block mb-0.5">
                    Full Google Drive From Folder ➔ To Folder Pipeline
                  </strong>
                  <span className="text-slate-600 text-[11px] block">
                    Browse all folders in My Drive and Shared with Me, paste any Google Drive folder URL/ID directly, load source videos from your <strong>From Folder</strong>, and auto-upload cut clips to your <strong>To Folder</strong>.
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <PlayCircle className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block mb-0.5">
                    Embedded Cut Clips Player Gallery &amp; Instant Downloads
                  </strong>
                  <span className="text-slate-600 text-[11px] block">
                    Every finished clip is automatically pre-fetched into local browser memory and shown in an interactive video player grid so you can watch, expand to fullscreen, or download <code>.MP4</code> / <code>.ZIP</code> files immediately.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Turbo Engine & Background Mode */}
          {activeTab === 'engine' && (
            <div className="space-y-2.5 text-xs text-slate-700 leading-relaxed">
              <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-200 flex items-start gap-3">
                <Zap className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block mb-0.5">
                    Turbo FFmpeg Backend (MP4) — 6x Parallel Workers
                  </strong>
                  <span className="text-slate-600 text-[11px] block">
                    Pre-stages your video in the background as soon as you select it, caches <code>ffprobe</code> stream metadata in memory, and slices up to 6 clips simultaneously with multi-threaded FFmpeg filters and non-blocking Drive uploads.
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 flex items-start gap-3">
                <FolderSync className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block mb-0.5">
                    Autonomous Background Execution (Works When App is Closed)
                  </strong>
                  <span className="text-slate-600 text-[11px] block">
                    Batch jobs run in a detached server worker queue (<code>/api/video/jobs</code>) with on-disk state persistence. Even if you minimize your browser, switch apps, or turn off your screen, slicing and Google Drive syncing continue uninterrupted.
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-3">
                <Cpu className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block mb-0.5">
                    Zero Frame Drops &amp; 100% Quality Preservation
                  </strong>
                  <span className="text-slate-600 text-[11px] block">
                    Locks output to your source video&apos;s exact Constant Frame Rate (<code>-vsync cfr</code>) with High-Profile CABAC H.264 encoding—or use <strong>100% Bitstream Copy</strong> for zero re-encoding. Also includes a 1080p 60fps Master Canvas fallback engine.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: FAQ & Cloud Sync */}
          {activeTab === 'faq' && (
            <div className="space-y-2.5 text-xs text-slate-700 leading-relaxed">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Does slicing continue if I minimize or close the app?
                </div>
                <p className="text-slate-600 text-[11px]">
                  <strong>Yes.</strong> When using <strong>Turbo Backend (MP4)</strong>, your batch job executes autonomously on the server and uploads finished clips directly to your Google Drive <strong>To Folder</strong>. When you reopen the app, it automatically restores your job&apos;s live status and finished clips.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-sky-600" /> Where can I watch and download my cut clips?
                </div>
                <p className="text-slate-600 text-[11px]">
                  As soon as a clip finishes cutting, it appears in the <strong>Cut Video Clips — Ready to Play &amp; Download</strong> video player grid at the bottom of the queue. You can play it right on the page, click <strong>Play Clip / Expand</strong> for fullscreen view, or click <strong>Download .MP4</strong>.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-purple-600" /> What if I can&apos;t find a specific folder in my Google Drive?
                </div>
                <p className="text-slate-600 text-[11px]">
                  Click <strong>Search / Paste Link</strong> on either the <strong>From Folder</strong> or <strong>To Folder</strong> card. You can search across all folders in your Google Drive, browse nested subfolders and Shared folders, or paste any Google Drive Folder URL/ID directly.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Fixed Bottom Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>Developed by</span>
            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-600 via-cyan-600 to-indigo-600">
              rehan97
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 font-bold text-white text-xs transition-all cursor-pointer shadow-sm"
          >
            Got it, Let&apos;s Cut!
          </button>
        </div>
      </div>
    </div>
  );
}
