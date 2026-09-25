'use client';

import React, { useRef, useState } from 'react';
import { formatTime } from '@/lib/video-processor';
import { Upload, Clock, FileVideo, X, RefreshCw, Play, Loader2 } from 'lucide-react';
import { ConfirmModal } from '@/components/ConfirmModal';
import { loadDemoVideo } from '@/lib/sample-video';

interface VideoUploaderProps {
  videoFile: File | null;
  videoUrl: string | null;
  videoDuration: number;
  videoTitle: string;
  onVideoSelected: (file: File | null, url: string, title: string, duration: number) => void;
  onClearVideo: () => void;
}

export function VideoUploader({
  videoFile,
  videoUrl,
  videoDuration,
  videoTitle,
  onVideoSelected,
  onClearVideo,
}: VideoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [showConfirmRemove, setShowConfirmRemove] = useState<boolean>(false);
  const [isLoadingDemo, setIsLoadingDemo] = useState<boolean>(false);

  const handleLoadDemo = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsLoadingDemo(true);
      const demo = await loadDemoVideo();
      onVideoSelected(demo.file, demo.url, 'demo', demo.duration);
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
      onVideoSelected(file, url, file.name.replace(/\.[^/.]+$/, ''), tempVideo.duration || 0);
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
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Source Video
        </h2>
      </div>

      {!videoUrl ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
            isDragOver
              ? 'border-sky-400 bg-sky-500/5'
              : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/80'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-400 mx-auto flex items-center justify-center mb-3">
            <Upload className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200 mb-1">
            Drop movie or video file here
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Supports MP4, WebM, MOV, MKV, AVI (5-10 hr long videos fully supported)
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors">
              <FileVideo className="w-3.5 h-3.5 text-sky-400" />
              Select File
            </div>
            <button
              type="button"
              onClick={handleLoadDemo}
              disabled={isLoadingDemo}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-xs font-medium text-sky-300 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isLoadingDemo ? (
                <>
                  <Loader2 className="w-3 h-3 text-sky-400 animate-spin" />
                  Loading Demo...
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 text-sky-400 fill-sky-400" />
                  Try Demo Video
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video max-h-[380px] mx-auto">
            <video
              src={videoUrl}
              controls
              crossOrigin="anonymous"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <div className="flex items-center gap-4">
              <span className="font-bold text-slate-200">{videoTitle}</span>
              <span className="flex items-center gap-1 text-sky-400 font-mono font-medium">
                <Clock className="w-3.5 h-3.5" />
                Duration: {formatTime(videoDuration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs transition-colors cursor-pointer flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3 text-sky-400" /> Change Video
              </button>
              <button
                onClick={() => setShowConfirmRemove(true)}
                className="p-1 rounded text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                title="Remove video"
              >
                <X className="w-4 h-4" />
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
