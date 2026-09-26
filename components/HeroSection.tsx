'use client';

import React, { useState } from 'react';
import {
  Upload,
  Play,
  Layers,
  HardDrive,
  Scissors,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Film,
  Loader2,
  Info,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { loadDemoVideo } from '@/lib/sample-video';

interface HeroSectionProps {
  onVideoSelected: (
    file: File | null,
    url: string,
    title: string,
    duration: number,
    driveFileId?: string | null,
    sizeBytes?: number
  ) => void;
  onShowInfoModal: () => void;
}

export function HeroSection({ onVideoSelected, onShowInfoModal }: HeroSectionProps) {
  const [isGeneratingDemo, setIsGeneratingDemo] = useState<boolean>(false);

  const handleLoadDemo = async () => {
    try {
      setIsGeneratingDemo(true);
      const demo = await loadDemoVideo();
      onVideoSelected(demo.file, demo.url, 'demo', demo.duration, null, demo.file.size);
    } catch (e) {
      console.error('Failed to load demo video:', e);
    } finally {
      setIsGeneratingDemo(false);
    }
  };

  const handleTriggerUpload = () => {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  };

  return (
    <section className="relative overflow-hidden pt-6 pb-10 space-y-10">
      {/* Dynamic Ambient Background Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-gradient-to-b from-sky-200/50 via-indigo-100/30 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute -top-24 left-1/4 w-72 h-72 bg-sky-300/30 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />
      <div className="absolute -top-12 right-1/4 w-80 h-80 bg-purple-200/40 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Main Hero Header */}
      <div className="text-center max-w-3xl mx-auto space-y-6">
        {/* Brand Logo */}
        <div className="flex justify-center transform hover:scale-105 transition-transform duration-300">
          <Logo size="xl" showSubtitle />
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.15]">
          Turn Long Videos Into{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 via-cyan-600 to-indigo-600">
            Viral Clips
          </span>{' '}
          in Seconds
        </h1>

        {/* Subtitle */}
        <p className="text-slate-600 text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed font-normal">
          Effortlessly split movies, podcasts, and recordings into 60-second or custom parts. Reframes to vertical 9:16 format with ambient background blur, overlays sequential Part badges, and auto-syncs straight to your Google Drive.
        </p>

        {/* Action Button Row */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
          <button
            onClick={handleTriggerUpload}
            className="group px-6 py-3.5 rounded-xl bg-gradient-to-r from-sky-600 via-sky-500 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-sky-500/20 flex items-center gap-2.5 transition-all cursor-pointer hover:scale-[1.03] active:scale-[0.98]"
          >
            <Upload className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
            <span>Upload Video to Slice</span>
          </button>

          <button
            onClick={handleLoadDemo}
            disabled={isGeneratingDemo}
            className="px-5 py-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-sky-500/50 text-slate-800 font-semibold text-sm transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
          >
            {isGeneratingDemo ? (
              <>
                <Loader2 className="w-4 h-4 text-sky-600 animate-spin" />
                <span>Loading Demo...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 text-sky-600 fill-sky-600" />
                <span>Try Demo Video</span>
              </>
            )}
          </button>

          <button
            onClick={onShowInfoModal}
            className="px-4 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 hover:text-slate-900 text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Info className="w-4 h-4 text-slate-500" />
            <span>How It Works</span>
          </button>
        </div>

        {/* Feature Badges */}
        <div className="flex flex-wrap items-center justify-center gap-y-2 gap-x-6 pt-2 text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-600" />
            <span>Turbo 6x Parallel FFmpeg Backend (.MP4)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Autonomous Background Processing</span>
          </span>
          <span className="flex items-center gap-1.5">
            <HardDrive className="w-4 h-4 text-sky-600" />
            <span>Google Drive From ➔ To Cloud Sync</span>
          </span>
        </div>
      </div>

      {/* Interactive Visual Slicing Diagram */}
      <div className="relative max-w-4xl mx-auto rounded-2xl bg-white border border-slate-200 p-5 md:p-7 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-xs font-mono text-slate-600 ml-2 font-medium">
              Transformation Pipeline: Widescreen Movie ➔ Vertical Mobile Clips
            </span>
          </div>
          <span className="text-[11px] font-mono text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
            Automated Slicing
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          {/* Source Video (16:9 Landscape) */}
          <div className="md:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-sky-600" />
                Raw Source Video (16:9)
              </span>
              <span className="text-slate-500 font-mono text-[10px]">01:33 • 4.0 MB</span>
            </div>

            <div className="relative aspect-video rounded-lg bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-950 border border-slate-700/60 overflow-hidden flex flex-col items-center justify-center text-center p-4">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:12px_12px]" />
              <Play className="w-8 h-8 text-sky-400 mb-1 opacity-80" />
              <span className="text-xs font-bold text-slate-200">demo.mp4</span>
              <span className="text-[10px] text-slate-400">HD Ready • Landscape</span>

              {/* Cutting Guides */}
              <div className="absolute bottom-2 left-3 right-3 flex gap-1 h-1.5">
                <div className="flex-1 bg-sky-400/80 rounded-full" />
                <div className="flex-1 bg-indigo-400/80 rounded-full" />
                <div className="flex-1 bg-purple-400/80 rounded-full" />
                <div className="flex-1 bg-slate-700 rounded-full" />
              </div>
            </div>
          </div>

          {/* Slicer Engine Middle Indicator */}
          <div className="md:col-span-2 flex flex-col items-center justify-center gap-2 py-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/25">
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <div className="text-center">
              <span className="text-[11px] font-bold text-sky-700 block">Split & Reframe</span>
              <span className="text-[10px] text-slate-500 block font-mono">1-Min Slices</span>
            </div>
            <ArrowRight className="w-4 h-4 text-sky-600 hidden md:block" />
          </div>

          {/* Sliced Output (9:16 Shorts/Reels) */}
          <div className="md:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                9:16 Shorts Ready
              </span>
              <span className="text-emerald-700 font-mono text-[10px] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Auto Drive Sync
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* Card Part 1 */}
              <div className="aspect-[9/16] rounded-lg bg-white border border-sky-300 p-2 flex flex-col justify-between text-center shadow-xs relative overflow-hidden group hover:border-sky-500 transition-colors">
                <span className="text-[9px] font-mono bg-sky-600 text-white font-bold px-1 rounded-sm">
                  Part 1
                </span>
                <div className="w-full h-8 bg-sky-50 rounded flex items-center justify-center">
                  <Play className="w-3.5 h-3.5 text-sky-600" />
                </div>
                <span className="text-[8px] text-slate-500 font-mono">00:00 - 01:00</span>
              </div>

              {/* Card Part 2 */}
              <div className="aspect-[9/16] rounded-lg bg-white border border-indigo-300 p-2 flex flex-col justify-between text-center shadow-xs relative overflow-hidden group hover:border-indigo-500 transition-colors">
                <span className="text-[9px] font-mono bg-indigo-600 text-white font-bold px-1 rounded-sm">
                  Part 2
                </span>
                <div className="w-full h-8 bg-indigo-50 rounded flex items-center justify-center">
                  <Play className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                <span className="text-[8px] text-slate-500 font-mono">01:00 - 02:00</span>
              </div>

              {/* Card Part 3 */}
              <div className="aspect-[9/16] rounded-lg bg-white border border-purple-300 p-2 flex flex-col justify-between text-center shadow-xs relative overflow-hidden group hover:border-purple-500 transition-colors">
                <span className="text-[9px] font-mono bg-purple-600 text-white font-bold px-1 rounded-sm">
                  Part 3
                </span>
                <div className="w-full h-8 bg-purple-50 rounded flex items-center justify-center">
                  <Play className="w-3.5 h-3.5 text-purple-600" />
                </div>
                <span className="text-[8px] text-slate-500 font-mono">02:00 - 03:00</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Step Interactive Feature Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
        <div className="rounded-xl bg-white border border-slate-200 p-4 space-y-2 hover:border-slate-300 shadow-xs transition-colors">
          <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700 font-bold text-xs">
            1
          </div>
          <h3 className="text-sm font-bold text-slate-900">Upload or Import + Size &amp; Length</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Drop a local video or import directly from Google Drive. Instantly inspect exact video duration and file size while pre-staging on the server.
          </p>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 p-4 space-y-2 hover:border-slate-300 shadow-xs transition-colors">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs">
            2
          </div>
          <h3 className="text-sm font-bold text-slate-900">Turbo 9:16 Reframe &amp; Live Progress</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Cut in seconds with 6x parallel FFmpeg workers, real-time per-clip progress bars, ambient 9:16 blur padding, and crisp Part badges.
          </p>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 p-4 space-y-2 hover:border-slate-300 shadow-xs transition-colors">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-xs">
            3
          </div>
          <h3 className="text-sm font-bold text-slate-900">Watch, Download &amp; Drive Sync</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Play every cut clip immediately in the inline video gallery, download individual .MP4s or a ZIP archive, and auto-sync to Google Drive in the background.
          </p>
        </div>
      </div>
    </section>
  );
}
