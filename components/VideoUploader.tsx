'use client';

import React, { useRef, useState, useEffect } from 'react';
import { formatTime, formatFileSize } from '@/lib/video-processor';
import { Upload, Clock, FileVideo, X, RefreshCw, Play, Loader2, HardDrive } from 'lucide-react';
import { ConfirmModal } from '@/components/ConfirmModal';
import { loadDemoVideo } from '@/lib/sample-video';

interface VideoUploaderProps {
  videoFile: File | null;
  videoUrl: string | null;
  videoDuration: number;
  videoTitle: string;
  videoSize?: number;
  onVideoSelected: (
    file: File | null,
    url: string,
    title: string,
    duration: number,
    driveFileId?: string | null,
    sizeBytes?: number
  ) => void;
  onClearVideo: () => void;
}

export function VideoUploader({
  videoFile,
  videoUrl,
  videoDuration,
  videoTitle,
  videoSize = 0,
  onVideoSelected,
  onClearVideo,
}: VideoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [showConfirmRemove, setShowConfirmRemove] = useState<boolean>(false);
  const [isLoadingDemo, setIsLoadingDemo] = useState<boolean>(false);
  const [resolvedUrlSize, setResolvedUrlSize] = useState<number>(0);

  const effectiveSizeBytes = videoFile?.size || videoSize || resolvedUrlSize;
  const formattedSize = formatFileSize(effectiveSizeBytes);

  // If videoUrl is present without a File object (e.g. restored session or blob/remote URL), resolve its byte size automatically
  useEffect(() => {
    if (!videoUrl || videoFile?.size || videoSize > 0) {
      setResolvedUrlSize(0);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(videoUrl);
        if (res.ok && !cancelled) {
          const blob = await res.blob();
          if (!cancelled && blob.size > 0) {
            setResolvedUrlSize(blob.size);
          }
        }
      } catch (_) {}
    })();

    return () => {
      cancelled = true;
    };
  }, [videoUrl, videoFile, videoSize]);

  const handleLoadDemo = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsLoadingDemo(true);
      const demo = await loadDemoVideo();
      onVideoSelected(demo.file, demo.url, 'demo', demo.duration, null, demo.file.size);
    } catch (err) {
      console.error('Failed to load demo video:', err);
    } finally {
      setIsLoadingDemo(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadLocalFile(file);
    }
  };

  const loadLocalFile = (file: File) => {
    const url = URL.createObjectURL(file);
    const tempVideo = document.createElement('video');
    tempVideo.src = url;
    tempVideo.onloadedmetadata = () => {
      onVideoSelected(
        file,
        url,
        file.name.replace(/\.[^/.]+$/, ''),
        tempVideo.duration || 0,
        null,
        file.size
      );
    };
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      loadLocalFile(file);
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between h-full space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-200/80 flex items-center justify-center text-sky-600">
            <FileVideo className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Source Video Monitor
            </h2>
            <p className="text-[11px] text-slate-500">
              {videoUrl ? 'Ready for frame-accurate slicing' : 'Upload local video or test with demo'}
            </p>
          </div>
        </div>

        {videoUrl && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-50 border border-sky-200/80 text-sky-700 font-mono text-xs font-bold"
              title="Video Length (Duration)"
            >
              <Clock className="w-3.5 h-3.5 text-sky-600" />
              Length: {formatTime(videoDuration)}
            </span>
            {formattedSize && (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-200/80 text-indigo-700 font-mono text-xs font-bold"
                title="Video File Size"
              >
                <HardDrive className="w-3.5 h-3.5 text-indigo-600" />
                Size: {formattedSize}
              </span>
            )}
          </div>
        )}
      </div>

      {!videoUrl ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center flex-1 ${
            isDragOver
              ? 'border-sky-500 bg-sky-50/70 scale-[0.99]'
              : 'border-slate-200 hover:border-sky-400 bg-slate-50/60 hover:bg-sky-50/30'
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 text-sky-600 mx-auto flex items-center justify-center mb-3.5 shadow-xs">
            <Upload className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Drop your movie, podcast, or video here
          </h3>
          <p className="text-xs text-slate-500 mb-5 max-w-md">
            Supports MP4, WebM, MOV, MKV &amp; AVI • Automatically detects video length &amp; file size for instant slicing
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white transition-colors shadow-xs">
              <FileVideo className="w-3.5 h-3.5" />
              Browse Video File
            </div>
            <button
              type="button"
              onClick={handleLoadDemo}
              disabled={isLoadingDemo}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {isLoadingDemo ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 text-sky-600 animate-spin" />
                  Loading Demo...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-sky-600 fill-sky-600" />
                  Try Interactive Demo
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5 flex-1 flex flex-col justify-between">
          <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-200 aspect-video w-full flex items-center justify-center shadow-inner">
            <video
              src={videoUrl}
              controls
              crossOrigin="anonymous"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span
                className="font-bold text-slate-900 truncate max-w-[150px] sm:max-w-[200px]"
                title={videoTitle}
              >
                {videoTitle}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-mono text-[11px] font-semibold">
                <Clock className="w-3 h-3 text-sky-600" />
                {formatTime(videoDuration)}
              </span>
              {formattedSize && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 text-indigo-700 font-mono text-[11px] font-semibold">
                  <HardDrive className="w-3 h-3 text-indigo-600" />
                  {formattedSize}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <RefreshCw className="w-3 h-3 text-sky-600" /> Replace
              </button>
              <button
                onClick={() => setShowConfirmRemove(true)}
                className="p-1.5 rounded-lg bg-white hover:bg-rose-50 border border-slate-200 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer shadow-2xs"
                title="Remove video"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showConfirmRemove}
        title="Remove Loaded Video"
        message={`Are you sure you want to remove "${videoTitle}"? Unsaved clip slice configurations for this video will be cleared.`}
        confirmText="Yes, Remove"
        cancelText="Cancel"
        variant="danger"
        onConfirm={() => {
          onClearVideo();
          setShowConfirmRemove(false);
        }}
        onCancel={() => setShowConfirmRemove(false)}
      />
    </div>
  );
}
