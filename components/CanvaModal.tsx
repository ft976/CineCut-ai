'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Sparkles,
  ExternalLink,
  Copy,
  Download,
  Check,
  Camera,
  Layers,
  Palette,
  Film,
  Maximize2,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import { ClipSegment, formatTime } from '@/lib/video-processor';
import {
  CANVA_PRESETS,
  CanvaTemplatePreset,
  captureVideoFrame,
  copyImageBlobToClipboard,
} from '@/lib/canva';

interface CanvaModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string | null;
  videoTitle: string;
  selectedSegment?: ClipSegment | null;
  allSegments?: ClipSegment[];
}

export function CanvaModal({
  isOpen,
  onClose,
  videoUrl,
  videoTitle,
  selectedSegment,
  allSegments = [],
}: CanvaModalProps) {
  const initialSegment = selectedSegment || allSegments[0] || null;
  const initialTime = initialSegment ? initialSegment.startTime + initialSegment.duration * 0.2 : 0;
  const initialBadge = initialSegment ? `PART ${initialSegment.index + 1}` : 'PART 1';

  const [activeSegment, setActiveSegment] = useState<ClipSegment | null>(initialSegment);
  const [selectedPreset, setSelectedPreset] = useState<CanvaTemplatePreset>(CANVA_PRESETS[0]);
  const [currentTimestamp, setCurrentTimestamp] = useState<number>(initialTime);
  const [capturedFrameData, setCapturedFrameData] = useState<{
    blob: Blob | null;
    dataUrl: string | null;
  }>({ blob: null, dataUrl: null });
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [customBadgeText, setCustomBadgeText] = useState<string>(initialBadge);
  const [headlineText, setHeadlineText] = useState<string>(videoTitle || 'VIRAL MOMENT');
  const [showOverlay, setShowOverlay] = useState<boolean>(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Capture frame whenever timestamp or activeSegment changes
  const handleCaptureCurrentFrame = useCallback(async (timeToCapture?: number) => {
    if (!videoUrl) return;
    setIsCapturing(true);
    const targetTime = timeToCapture !== undefined ? timeToCapture : currentTimestamp;

    try {
      let frameResult: { blob: Blob; dataUrl: string };
      if (videoRef.current && videoRef.current.readyState >= 2) {
        frameResult = await captureVideoFrame(videoRef.current, targetTime);
      } else {
        frameResult = await captureVideoFrame(videoUrl, targetTime);
      }
      setCapturedFrameData(frameResult);
    } catch (err) {
      console.warn('Frame capture notice:', err);
    } finally {
      setIsCapturing(false);
    }
  }, [videoUrl, currentTimestamp]);

  useEffect(() => {
    if (isOpen && videoUrl) {
      const timer = setTimeout(() => {
        handleCaptureCurrentFrame(initialTime);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, videoUrl, handleCaptureCurrentFrame, initialTime]);

  if (!isOpen) return null;

  const handleCopyAndLaunchCanva = async () => {
    if (capturedFrameData.blob) {
      const copied = await copyImageBlobToClipboard(capturedFrameData.blob);
      if (copied) {
        setCopiedSuccess(true);
        setTimeout(() => setCopiedSuccess(false), 4000);
      }
    }
    // Launch Canva design URL in new tab
    window.open(selectedPreset.canvaUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadSnapshot = () => {
    if (!capturedFrameData.dataUrl) return;
    const a = document.createElement('a');
    a.href = capturedFrameData.dataUrl;
    a.download = `${videoTitle.replace(/[^a-z0-9]/gi, '_')}_Canva_Frame_${Math.round(currentTimestamp)}s.png`;
    a.click();
  };

  const handleSelectSegment = (seg: ClipSegment) => {
    setActiveSegment(seg);
    const midTime = seg.startTime + seg.duration * 0.25;
    setCurrentTimestamp(midTime);
    setCustomBadgeText(`PART ${seg.index + 1}`);
    handleCaptureCurrentFrame(midTime);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full p-5 md:p-6 shadow-2xl space-y-6 max-h-[92vh] flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#00c4cc] to-[#7d2ae8] flex items-center justify-center shadow-md shadow-purple-500/15 text-white font-black text-sm">
              C
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Canva Studio for CineCut</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 font-bold uppercase tracking-wider">
                  Thumbnails & Covers
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Turn any video clip frame into viral YouTube, TikTok, and Reels thumbnails in Canva.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 overflow-y-auto pr-1">
          {/* Left Column: Frame Picker & Live Canvas Preview (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Clip Selector pills (if multiple clips exist) */}
            {allSegments.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1">
                    <Film className="w-3.5 h-3.5 text-sky-600" /> Sliced Clip Target:
                  </span>
                  <span>{allSegments.length} clips available</span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
                  {allSegments.map((seg) => (
                    <button
                      key={seg.id}
                      onClick={() => handleSelectSegment(seg)}
                      className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap cursor-pointer transition-all border ${
                        activeSegment?.id === seg.id
                          ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      Clip {seg.index + 1} ({formatTime(seg.startTime)})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Video Frame Preview / Canvas */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 aspect-video max-h-[300px] flex items-center justify-center group shadow-inner">
              {videoUrl ? (
                <>
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    controls
                    crossOrigin="anonymous"
                    onSeeked={(e) => {
                      setCurrentTimestamp(e.currentTarget.currentTime);
                      handleCaptureCurrentFrame(e.currentTarget.currentTime);
                    }}
                    className="w-full h-full object-contain"
                  />
                  {/* Decorative Overlay Preview if enabled */}
                  {showOverlay && (
                    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-white/20 text-white font-extrabold text-[11px] tracking-wider uppercase shadow-lg">
                          {customBadgeText}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-black/70 text-[10px] text-teal-400 font-bold font-mono">
                          {selectedPreset.dimensions}
                        </span>
                      </div>
                      <div className="bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 rounded-xl text-center">
                        <span className="text-white font-black text-xs md:text-sm drop-shadow-md tracking-tight uppercase">
                          {headlineText}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-xs text-slate-400 flex flex-col items-center gap-2">
                  <Film className="w-8 h-8 text-slate-600" />
                  <span>No video loaded</span>
                </div>
              )}
            </div>

            {/* Scrubber Controls */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span className="font-semibold flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-teal-600" /> Timestamp Scrubber:
                </span>
                <span className="font-mono text-sky-700 font-bold">
                  {formatTime(currentTimestamp)}
                </span>
              </div>

              <input
                type="range"
                min={activeSegment ? activeSegment.startTime : 0}
                max={activeSegment ? activeSegment.endTime : 300}
                step={0.1}
                value={currentTimestamp}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setCurrentTimestamp(val);
                  if (videoRef.current) {
                    videoRef.current.currentTime = val;
                  }
                }}
                className="w-full accent-teal-600 cursor-pointer"
              />

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => handleCaptureCurrentFrame(currentTimestamp)}
                  disabled={isCapturing}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  {isCapturing ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-600" />
                  ) : (
                    <Camera className="w-3.5 h-3.5 text-teal-600" />
                  )}
                  Capture Snapshot
                </button>

                <button
                  onClick={handleDownloadSnapshot}
                  disabled={!capturedFrameData.dataUrl}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5 text-sky-600" /> Download PNG
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Canva Templates & Quick Launch (5 cols) */}
          <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-purple-600" /> Select Canva Template
                </span>
                <span className="text-[11px] text-teal-700 font-semibold">1-Click Open</span>
              </div>

              {/* Template list */}
              <div className="space-y-2">
                {CANVA_PRESETS.map((preset) => {
                  const isSelected = selectedPreset.id === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => setSelectedPreset(preset)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 text-xs ${
                        isSelected
                          ? 'bg-teal-50/70 border-teal-400 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{preset.title}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isSelected
                                ? 'bg-teal-100 text-teal-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {preset.badge}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">{preset.description}</div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {preset.dimensions} • {preset.aspectRatio}
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0 font-black">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Text Hook Customizer */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600 font-semibold">
                  <span>Viral Text Overlay Preview</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showOverlay}
                      onChange={(e) => setShowOverlay(e.target.checked)}
                      className="accent-teal-600 rounded"
                    />
                    <span className="text-[11px] text-slate-700">Show</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5 font-bold">
                      Badge Text
                    </label>
                    <input
                      type="text"
                      value={customBadgeText}
                      onChange={(e) => setCustomBadgeText(e.target.value)}
                      placeholder="PART 1"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-900 font-semibold focus:outline-none focus:border-teal-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5 font-bold">
                      Headline Hook
                    </label>
                    <input
                      type="text"
                      value={headlineText}
                      onChange={(e) => setHeadlineText(e.target.value)}
                      placeholder="CRAZY REVEAL"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-900 font-semibold focus:outline-none focus:border-teal-500 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Launch Canva Action Box */}
            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              <div className="bg-teal-50/70 border border-teal-200 p-2.5 rounded-xl text-[11px] text-slate-700 space-y-1">
                <div className="font-bold text-teal-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" /> Instant Canva Workflow:
                </div>
                <div className="text-slate-600 leading-snug">
                  1. Clicking below copies your frame to the clipboard and opens Canva.
                  <br />
                  2. Press <strong className="text-slate-900 font-mono">Ctrl + V</strong> (or Cmd+V)
                  in Canva to paste your frame immediately!
                </div>
              </div>

              <button
                onClick={handleCopyAndLaunchCanva}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#00c4cc] to-[#7d2ae8] hover:from-[#00b5bc] hover:to-[#7025d2] text-white font-extrabold text-sm shadow-lg shadow-purple-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 transform active:scale-[0.99]"
              >
                {copiedSuccess ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" /> Copied! Opening Canva...
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Copy Frame & Design in Canva
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
