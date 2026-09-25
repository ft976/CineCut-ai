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
  PlayCircle,
} from 'lucide-react';
import { Logo } from '@/components/Logo';

interface InfoModalProps {
  onClose: () => void;
}

export function InfoModal({ onClose }: InfoModalProps) {
  const [activeTab, setActiveTab] = useState<'guide' | 'features' | 'faq'>('guide');

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <div className="border-l border-slate-800 pl-3">
              <h2 className="text-sm font-bold text-slate-100">Application Guide & Documentation</h2>
              <p className="text-[11px] text-slate-400">Everything you need to know about CineCut AI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'guide'
                ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            How It Works
          </button>
          <button
            onClick={() => setActiveTab('features')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'features'
                ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Key Capabilities
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'faq'
                ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            FAQ & Security
          </button>
        </div>

        {/* Tab 1: How It Works */}
        {activeTab === 'guide' && (
          <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-xs">
                  1
                </div>
                <h4 className="font-bold text-slate-100 flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-sky-400" /> Choose Video
                </h4>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Drop your video file (MP4, WebM, MOV, MKV) or click <strong>Try Demo Video</strong> to test right away without uploading a file.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-xs">
                  2
                </div>
                <h4 className="font-bold text-slate-100 flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 text-indigo-400" /> Configure Slicing
                </h4>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Select 1-minute intervals, equal parts (e.g. 5 clips), or trim boundaries manually on the interactive timeline editor.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
                  3
                </div>
                <h4 className="font-bold text-slate-100 flex items-center gap-1.5">
                  <FolderSync className="w-3.5 h-3.5 text-emerald-400" /> Export & Sync
                </h4>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Renders into vertical 9:16 Shorts with blur, adds custom Part badges, and auto-uploads directly to Google Drive or downloads as a ZIP.
                </p>
              </div>
            </div>

            {/* Quick Tips Box */}
            <div className="p-3.5 rounded-xl bg-sky-950/30 border border-sky-500/20 text-sky-200 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-sky-400 text-xs">
                <Sparkles className="w-4 h-4" /> Recommended Workflow for Social Media
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                For TikTok, YouTube Shorts, and Instagram Reels, set the aspect ratio to <strong>9:16 Vertical</strong> with <strong>Blurred Background</strong> enabled. This keeps your main widescreen action centered while eliminating awkward black bars on mobile screens.
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Key Capabilities */}
        {activeTab === 'features' && (
          <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
            <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-start gap-3">
              <Scissors className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-100 block mb-0.5">Flexible Slicing Modes</strong>
                <span className="text-slate-400 text-[11px] block">
                  Choose <strong>Fixed Interval</strong> (30s, 60s, 90s) for uniform clips, <strong>Equal Count</strong> to divide any video into N equal clips, or fine-tune cut points directly on the interactive timeline.
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-start gap-3">
              <Layers className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-100 block mb-0.5">Social Reframing & Branding</strong>
                <span className="text-slate-400 text-[11px] block">
                  Convert widescreen footage to 9:16 Vertical, 16:9 Landscape, or 1:1 Square. Add sequential &quot;Part 1, Part 2&quot; tags, custom hook banners, and customizable colors to maximize engagement.
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-start gap-3">
              <HardDrive className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-100 block mb-0.5">Direct Google Drive Cloud Auto-Sync</strong>
                <span className="text-slate-400 text-[11px] block">
                  Connect your Google account via OAuth to automatically create a dedicated folder and upload rendered clips with real-time progress indicators and direct shareable links.
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-start gap-3">
              <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-100 block mb-0.5">Instant In-Browser Processing</strong>
                <span className="text-slate-400 text-[11px] block">
                  All rendering and slicing runs directly inside your web browser. No software installation is required, and there are zero file upload wait times.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: FAQ & Security */}
        {activeTab === 'faq' && (
          <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
            <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1">
              <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Are my videos uploaded to any external server?
              </div>
              <p className="text-slate-400 text-[11px]">
                <strong>No.</strong> CineCut AI processes your video completely on your own device using HTML5 Canvas and MediaRecorder APIs. Your media never leaves your browser unless you choose to auto-upload clips to your own Google Drive.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1">
              <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-sky-400" /> What formats and video lengths are supported?
              </div>
              <p className="text-slate-400 text-[11px]">
                CineCut supports MP4, WebM, MOV, and MKV formats. You can upload short recordings or multi-hour feature films with full audio and video fidelity.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1">
              <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-purple-400" /> How does Google Drive access work?
              </div>
              <p className="text-slate-400 text-[11px]">
                We use official Google Workspace OAuth client-side authorization. CineCut only requests permission to create folders and save files generated by the application. Your personal files and credentials remain strictly secure and private.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 flex items-center justify-between border-t border-slate-800/80">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span>Developed by</span>
            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-300 to-indigo-400">
              rehan97
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 font-bold text-white text-xs transition-all cursor-pointer shadow-md shadow-sky-500/20 hover:scale-[1.02] active:scale-[0.98]"
          >
            Got it, Let&apos;s Cut!
          </button>
        </div>
      </div>
    </div>
  );
}
