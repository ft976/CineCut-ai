'use client';

import React, { useRef, useEffect, useState } from 'react';
import { ClipSegment, formatTime } from '@/lib/video-processor';
import { Play, X, HardDrive, Download, ExternalLink } from 'lucide-react';
import { CanvaCaptionConfig, CaptionItem, openInCanvaVideoEditor } from '@/lib/canva-captions';

interface ClipPreviewModalProps {
  segment: ClipSegment | null;
  onClose: () => void;
  videoSourceUrl: string;
  canvaConfig?: CanvaCaptionConfig;
  captions?: CaptionItem[];
  aspectRatio?: '9:16' | '16:9' | '1:1';
}

export function ClipPreviewModal({
  segment,
  onClose,
  videoSourceUrl,
  canvaConfig,
  captions,
  aspectRatio = '9:16',
}: ClipPreviewModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);

  useEffect(() => {
    if (!segment || segment.blobUrl || !videoRef.current) return;

    const vid = videoRef.current;

    const handleLoadedMetadata = () => {
      vid.currentTime = Math.max(0, segment.startTime);
      setCurrentTime(vid.currentTime);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(vid.currentTime);
      if (vid.currentTime >= segment.endTime) {
        vid.pause();
        vid.currentTime = segment.startTime;
      }
    };

    vid.addEventListener('loadedmetadata', handleLoadedMetadata);
    vid.addEventListener('timeupdate', handleTimeUpdate);

    if (vid.readyState >= 1) {
      vid.currentTime = Math.max(0, segment.startTime);
      setCurrentTime(vid.currentTime);
    }

    return () => {
      vid.removeEventListener('loadedmetadata', handleLoadedMetadata);
      vid.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [segment]);

  if (!segment) return null;

  // Active caption
  const activeCaption =
    !segment.blobUrl && canvaConfig?.enabled && captions && captions.length > 0
      ? captions.find((c) => currentTime >= c.startTime && currentTime <= c.endTime)
      : null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Play className="w-4 h-4 text-sky-400 fill-current" />
            {segment.label} Preview
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player */}
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 aspect-[9/16] max-h-[420px] mx-auto flex items-center justify-center group">
            {segment.blobUrl ? (
              <video src={segment.blobUrl} controls className="w-full h-full object-contain" />
            ) : (
              <video
                ref={videoRef}
                src={videoSourceUrl}
                controls
                className="w-full h-full object-contain"
              />
            )}

            {/* Live Canva Caption Overlay on Preview */}
            {activeCaption && canvaConfig && (
              <div
                className={`absolute left-0 right-0 pointer-events-none px-4 flex justify-center z-10 transition-all ${
                  canvaConfig.position === 'top'
                    ? 'top-6'
                    : canvaConfig.position === 'middle'
                    ? 'top-1/2 -translate-y-1/2'
                    : 'bottom-12'
                }`}
              >
                {canvaConfig.styleId === 'canva-hormozi' && (
                  <div className="text-center">
                    <span
                      className="font-black uppercase tracking-wider text-lg drop-shadow-[0_2px_4px_rgba(0,0,0,1)]"
                      style={{
                        color: canvaConfig.highlightColor || '#FFDE59',
                        textShadow:
                          '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000',
                      }}
                    >
                      {activeCaption.text}
                    </span>
                  </div>
                )}

                {canvaConfig.styleId === 'canva-neon' && (
                  <div className="text-center">
                    <span
                      className="font-bold text-base drop-shadow-[0_0_12px_#FF007A]"
                      style={{
                        color: canvaConfig.highlightColor || '#00F0FF',
                        textShadow: '0 0 10px #FF007A, 0 0 16px #00F0FF',
                      }}
                    >
                      {activeCaption.text}
                    </span>
                  </div>
                )}

                {canvaConfig.styleId === 'canva-minimal-pill' && (
                  <div className="bg-slate-950/85 backdrop-blur-md border border-white/20 px-3 py-1 rounded-full shadow-lg">
                    <span className="font-semibold text-white text-xs">
                      {activeCaption.text}
                    </span>
                  </div>
                )}

                {canvaConfig.styleId === 'canva-karaoke' && (
                  <div className="bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 shadow-xl flex flex-wrap items-center justify-center gap-1 text-xs font-bold">
                    {(activeCaption.words || activeCaption.text.split(' ').map((w, idx, arr) => {
                      const dur = activeCaption.endTime - activeCaption.startTime;
                      const step = dur / arr.length;
                      return {
                        word: w,
                        start: activeCaption.startTime + idx * step,
                        end: activeCaption.startTime + (idx + 1) * step,
                      };
                    })).map((w, i) => {
                      const isActive = currentTime >= w.start && currentTime <= w.end;
                      return (
                        <span
                          key={i}
                          className={`transition-colors duration-100 ${
                            isActive
                              ? 'text-[#00F59B] drop-shadow-[0_0_10px_#00F59B] scale-105'
                              : 'text-white/80'
                          }`}
                        >
                          {w.word}
                        </span>
                      );
                    })}
                  </div>
                )}

                {canvaConfig.styleId === 'canva-retro-comic' && (
                  <div className="text-center">
                    <span
                      className="font-black text-base"
                      style={{
                        color: canvaConfig.highlightColor || '#FDBA74',
                        textShadow:
                          '-1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000, 2px 2px 0 #000',
                      }}
                    >
                      {activeCaption.text}
                    </span>
                  </div>
                )}

                {canvaConfig.styleId === 'canva-cinematic' && (
                  <div className="text-center">
                    <span className="font-serif tracking-widest text-white text-xs drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                      {activeCaption.text}
                    </span>
                  </div>
                )}

                {canvaConfig.styleId === 'canva-headline-box' && (
                  <div className="bg-black border-2 border-red-500 px-3 py-1 rounded-md shadow-2xl">
                    <span className="font-extrabold uppercase text-white tracking-wide text-xs">
                      {activeCaption.text}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="text-xs text-slate-400 text-center font-mono">
            Timestamp: {formatTime(segment.startTime)} - {formatTime(segment.endTime)} ({Math.round(segment.duration)}s)
          </div>

          <div className="flex flex-col gap-2 pt-2">
            {segment.blobUrl && (
              <a
                href={segment.blobUrl}
                download={`${segment.label.replace(/[^a-z0-9]/gi, '_')}.webm`}
                className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" /> Download Video File
              </a>
            )}

            <button
              onClick={() => openInCanvaVideoEditor(aspectRatio)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#00C4CC] to-[#7D2AE8] hover:opacity-90 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" /> Edit & Enhance in Canva Video Editor
            </button>

            {segment.driveViewLink && (
              <a
                href={segment.driveViewLink}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <HardDrive className="w-4 h-4" /> Open File in Google Drive
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
