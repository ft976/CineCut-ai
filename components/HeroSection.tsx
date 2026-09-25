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
  onVideoSelected: (file: File | null, url: string, title: string, duration: number) => void;
  onShowInfoModal: () => void;
}

export function HeroSection({ onVideoSelected, onShowInfoModal }: HeroSectionProps) {
  const [isGeneratingDemo, setIsGeneratingDemo] = useState<boolean>(false);

  const handleLoadDemo = async () => {
    try {
      setIsGeneratingDemo(true);
      const demo = await loadDemoVideo();
      onVideoSelected(demo.file, demo.url, 'demo', demo.duration);
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
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-gradient-to-b from-sky-500/15 via-indigo-600/10 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute -top-24 left-1/4 w-72 h-72 bg-sky-400/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />
      <div className="absolute -top-12 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Main Hero Header */}
      <div className="text-center max-w-3xl mx-auto space-y-6">
        {/* Brand Logo */}
        <div className="flex justify-center transform hover:scale-105 transition-transform duration-300">
          <Logo size="xl" showSubtitle />
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-100 leading-[1.15]">
          Turn Long Videos Into{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-300 to-indigo-400">
            Viral Clips
          </span>{' '}
          in Seconds
        </h1>

        {/* Subtitle */}
        <p className="text-slate-300/90 text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed font-normal">
          Effortlessly split movies, podcasts, and recordings into 60-second or custom parts. Reframes to vertical 9:16 format with ambient background blur, overlays sequential Part badges, and auto-syncs straight to your Google Drive.
        </p>

        {/* Action Button Row */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
          <button
            onClick={handleTriggerUpload}
            className="group px-6 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 via-sky-400 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-sky-500/25 flex items-center gap-2.5 transition-all cursor-pointer hover:scale-[1.03] active:scale-[0.98]"
          >
            <Upload className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
            <span>Upload Video to Slice</span>
          </button>

          <button
            onClick={handleLoadDemo}
            disabled={isGeneratingDemo}
            className="px-5 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/80 hover:border-sky-500/40 text-slate-200 font-semibold text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
          >
            {isGeneratingDemo ? (
              <>
                <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
                <span>Loading Demo...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 text-sky-400 fill-sky-400" />
                <span>Try Demo Video</span>
              </>
            )}
          </button>

          <button
            onClick={onShowInfoModal}
            className="px-4 py-3.5 rounded-xl bg-slate-900/50 hover:bg-slate-800/80 border border-slate-800 text-slate-300 hover:text-white text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Info className="w-4 h-4 text-slate-400" />
            <span>How It Works</span>
          </button>
        </div>

        {/* Feature Badges */}
        <div className="flex flex-wrap items-center justify-center gap-y-2 gap-x-6 pt-2 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>100% In-Browser Privacy</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Zero Quality Loss</span>
          </span>
          <span className="flex items-center gap-1.5">
            <HardDrive className="w-4 h-4 text-sky-400" />
            <span>Google Drive Direct Sync</span>
          </span>
        </div>
      </div>

      {/* Interactive Visual Slicing Diagram */}
      <div className="relative max-w-4xl mx-auto rounded-2xl bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/90 border border-slate-800/90 p-5 md:p-7 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-slate-800/70 pb-3 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
            <span className="text-xs font-mono text-slate-400 ml-2 font-medium">
              Transformation Pipeline: Widescreen Movie ➔ Vertical Mobile Clips
            </span>
          </div>
          <span className="text-[11px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
            Automated Slicing
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          {/* Source Video (16:9 Landscape) */}
          <div className="md:col-span-5 bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3 shadow-inner">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-sky-400" />
                Raw Source Video (16:9)
              </span>
              <span className="text-slate-400 font-mono text-[10px]">01:33 Duration</span>
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/30">
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <div className="text-center">
              <span className="text-[11px] font-bold text-sky-300 block">Split & Reframe</span>
              <span className="text-[10px] text-slate-400 block font-mono">1-Min Slices</span>
            </div>
            <ArrowRight className="w-4 h-4 text-sky-400 hidden md:block" />
          </div>

          {/* Sliced Output (9:16 Shorts/Reels) */}
          <div className="md:col-span-5 bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3 shadow-inner">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                9:16 Shorts Ready
              </span>
              <span className="text-emerald-400 font-mono text-[10px] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Auto Drive Sync
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* Card Part 1 */}
              <div className="aspect-[9/16] rounded-lg bg-gradient-to-b from-slate-900 to-slate-950 border border-sky-500/40 p-2 flex flex-col justify-between text-center shadow-md relative overflow-hidden group hover:border-sky-400 transition-colors">
                <span className="text-[9px] font-mono bg-sky-500 text-slate-950 font-bold px-1 rounded-sm">
                  Part 1
                </span>
                <div className="w-full h-8 bg-sky-500/10 rounded flex items-center justify-center">
                  <Play className="w-3.5 h-3.5 text-sky-400" />
                </div>
                <span className="text-[8px] text-slate-400 font-mono">00:00 - 01:00</span>
              </div>

              {/* Card Part 2 */}
              <div className="aspect-[9/16] rounded-lg bg-gradient-to-b from-slate-900 to-slate-950 border border-indigo-500/40 p-2 flex flex-col justify-between text-center shadow-md relative overflow-hidden group hover:border-indigo-400 transition-colors">
                <span className="text-[9px] font-mono bg-indigo-500 text-white font-bold px-1 rounded-sm">
                  Part 2
                </span>
                <div className="w-full h-8 bg-indigo-500/10 rounded flex items-center justify-center">
                  <Play className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <span className="text-[8px] text-slate-400 font-mono">01:00 - 02:00</span>
              </div>

              {/* Card Part 3 */}
              <div className="aspect-[9/16] rounded-lg bg-gradient-to-b from-slate-900 to-slate-950 border border-purple-500/40 p-2 flex flex-col justify-between text-center shadow-md relative overflow-hidden group hover:border-purple-400 transition-colors">
                <span className="text-[9px] font-mono bg-purple-500 text-white font-bold px-1 rounded-sm">
                  Part 3
                </span>
                <div className="w-full h-8 bg-purple-500/10 rounded flex items-center justify-center">
                  <Play className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <span className="text-[8px] text-slate-400 font-mono">02:00 - 03:00</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Step Interactive Feature Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
        <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-4 space-y-2 hover:border-slate-700 transition-colors">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 font-bold text-xs">
            1
          </div>
          <h3 className="text-sm font-bold text-slate-200">Flexible Splitting Modes</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Split by exact intervals (e.g. 60 seconds), divide into equal segment counts, or fine-tune boundaries on the timeline.
          </p>
        </div>

        <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-4 space-y-2 hover:border-slate-700 transition-colors">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs">
            2
          </div>
          <h3 className="text-sm font-bold text-slate-200">Vertical Canvas & Badges</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Convert standard horizontal videos to 9:16 Shorts with blurred background padding and customizable title/part badges.
          </p>
        </div>

        <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-4 space-y-2 hover:border-slate-700 transition-colors">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs">
            3
          </div>
          <h3 className="text-sm font-bold text-slate-200">Google Drive Cloud Sync</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Connect your Google account to auto-generate a cloud folder and upload every sliced clip with live progress monitoring.
          </p>
        </div>
      </div>
    </section>
  );
}
