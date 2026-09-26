'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import JSZip from 'jszip';
import { Header } from '@/components/Header';
import { HeroSection } from '@/components/HeroSection';
import { Footer } from '@/components/Footer';
import { GoogleDriveAuth } from '@/components/GoogleDriveAuth';
import { VideoUploader } from '@/components/VideoUploader';
import { SplitSettings, SplitMode } from '@/components/SplitSettings';
import { TimelineVisualizer } from '@/components/TimelineVisualizer';
import { ClipProcessingStatus } from '@/components/ClipProcessingStatus';
import { ClipPreviewModal } from '@/components/ClipPreviewModal';
import { InfoModal } from '@/components/InfoModal';
import { HistoryModal, HistoryItem } from '@/components/HistoryModal';
import { GoogleDriveUser, createDriveFolder, uploadFileToDrive } from '@/lib/google-drive';
import {
  ClipSegment,
  OverlayOptions,
  ProcessingEngineType,
  ServerBackgroundJobState,
  calculateIntervalSegments,
  calculateCountSegments,
  sliceVideoSegment,
  registerSourceWithBackend,
  sliceClipViaServerBackend,
  startServerBackgroundBatchJob,
  pollServerBackgroundBatchJob,
  cancelServerBackgroundBatchJob,
  acquireScreenWakeLock,
  formatTime,
} from '@/lib/video-processor';

export default function HomePage() {
  // Google Drive Auth state
  const [driveAccessToken, setDriveAccessToken] = useState<string | null>(null);
  const [driveUser, setDriveUser] = useState<GoogleDriveUser | null>(null);
  const [driveFolderName, setDriveFolderName] = useState<string>('CineCut_Clips');
  const [driveFolderId, setDriveFolderId] = useState<string | null>(null);
  const [autoUploadDrive, setAutoUploadDrive] = useState<boolean>(true);

  // Video State
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState<string>('');
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoSize, setVideoSize] = useState<number>(0);
  const [sourceDriveFileId, setSourceDriveFileId] = useState<string | null>(null);
  const [cachedServerSourceId, setCachedServerSourceId] = useState<string | null>(null);
  const [engineMode, setEngineMode] = useState<ProcessingEngineType>('server-ffmpeg');

  // Splitting Configuration
  const [splitMode, setSplitMode] = useState<SplitMode>('interval');
  const [intervalSeconds, setIntervalSeconds] = useState<number>(60);
  const [segmentCount, setSegmentCount] = useState<number>(4);
  const [overlayOptions, setOverlayOptions] = useState<OverlayOptions>({
    showPartBadge: true,
    topBannerText: '',
    bottomBannerText: '',
    aspectRatio: '9:16',
    blurBackground: true,
    textColor: '#ffffff',
    bannerBgColor: 'rgba(0, 0, 0, 0.85)',
    qualityPreset: 'master-lossless',
  });

  // Calculated Clip Segments & Processing Control
  const [segments, setSegments] = useState<ClipSegment[]>([]);
  const [isProcessingAll, setIsProcessingAll] = useState<boolean>(false);
  const [activeBackgroundJobId, setActiveBackgroundJobId] = useState<string | null>(null);
  const [sourceStagingProgress, setSourceStagingProgress] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const wakeLockReleaseRef = useRef<(() => void) | null>(null);
  const prestagePromiseRef = useRef<Promise<string | null> | null>(null);
  const hydratedClipIdsRef = useRef<Set<string>>(new Set());

  // History State
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('cinecut_history');
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // Modals
  const [selectedPreviewSegment, setSelectedPreviewSegment] = useState<ClipSegment | null>(null);
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  // Video Selection Handler (with Instant Background Server Pre-Staging so cutting starts in 0ms)
  const handleVideoSelected = (
    file: File | null,
    url: string,
    title: string,
    duration: number,
    driveFileId?: string | null,
    sizeBytes?: number
  ) => {
    setVideoFile(file);
    setVideoUrl(url);
    setVideoTitle(title);
    setVideoDuration(duration);
    setVideoSize(sizeBytes || file?.size || 0);
    setSourceDriveFileId(driveFileId || null);
    setCachedServerSourceId(null);

    // Immediately pre-stage source video to Turbo Backend in the background so it is 100% ready before user clicks Cut
    const prestageTask = registerSourceWithBackend({
      videoFile: file,
      videoUrl: url,
      driveFileId: driveFileId || null,
      driveAccessToken,
    }).then((srcId) => {
      if (srcId) {
        setCachedServerSourceId(srcId);
      }
      return srcId;
    });
    prestagePromiseRef.current = prestageTask;

    if (duration > 0) {
      if (splitMode === 'interval') {
        const segs = calculateIntervalSegments(duration, intervalSeconds);
        setSegments(segs);
      } else if (splitMode === 'count') {
        const segs = calculateCountSegments(duration, segmentCount);
        setSegments(segs);
      } else if (splitMode === 'custom' && segments.length === 0) {
        const segs = calculateIntervalSegments(duration, 60);
        setSegments(segs);
      }
    }
  };

  const handleSplitModeChange = (mode: SplitMode) => {
    if (isProcessingAll) return;
    setSplitMode(mode);
    if (videoDuration > 0) {
      if (mode === 'interval') {
        const segs = calculateIntervalSegments(videoDuration, intervalSeconds);
        setSegments(segs);
      } else if (mode === 'count') {
        const segs = calculateCountSegments(videoDuration, segmentCount);
        setSegments(segs);
      }
    }
  };

  const handleIntervalSecondsChange = (secs: number) => {
    if (isProcessingAll) return;
    setIntervalSeconds(secs);
    if (videoDuration > 0 && splitMode === 'interval') {
      const segs = calculateIntervalSegments(videoDuration, secs);
      setSegments(segs);
    }
  };

  const handleSegmentCountChange = (count: number) => {
    if (isProcessingAll) return;
    setSegmentCount(count);
    if (videoDuration > 0 && splitMode === 'count') {
      const segs = calculateCountSegments(videoDuration, count);
      setSegments(segs);
    }
  };

  const handleClearVideo = () => {
    if (isProcessingAll) return;
    setVideoFile(null);
    setVideoUrl(null);
    setVideoTitle('');
    setVideoDuration(0);
    setVideoSize(0);
    setSourceDriveFileId(null);
    setCachedServerSourceId(null);
    prestagePromiseRef.current = null;
    hydratedClipIdsRef.current.clear();
    setSegments([]);
  };

  const handleUpdateSegment = (segId: string, updates: Partial<ClipSegment>) => {
    setSegments((prev) =>
      prev.map((seg) => (seg.id === segId ? { ...seg, ...updates } : seg))
    );
  };

  const handleAddSegment = () => {
    if (isProcessingAll) return;
    const lastSeg = segments[segments.length - 1];
    const newStart = lastSeg ? Math.min(videoDuration, lastSeg.endTime) : 0;
    const newEnd = Math.min(videoDuration || 300, newStart + 30);
    const duration = Math.max(0.1, newEnd - newStart);
    const nextIdx = segments.length;

    const newSeg: ClipSegment = {
      id: `clip_${Date.now()}_${nextIdx}`,
      index: nextIdx,
      label: `Clip ${nextIdx + 1} (${formatTime(newStart)} - ${formatTime(newEnd)})`,
      startTime: newStart,
      endTime: newEnd,
      duration,
      status: 'idle',
      sliceProgress: 0,
      uploadProgress: 0,
      watermarkText: `PART ${nextIdx + 1}`,
    };

    setSegments((prev) => [...prev, newSeg]);
    if (splitMode !== 'custom') {
      setSplitMode('custom');
    }
  };

  const handleDeleteSegment = (segId: string) => {
    if (isProcessingAll || segments.length <= 1) return;
    setSegments((prev) =>
      prev
        .filter((s) => s.id !== segId)
        .map((s, idx) => ({
          ...s,
          index: idx,
          watermarkText: `PART ${idx + 1}`,
        }))
    );
  };

  const handleSplitSegment = (segId: string) => {
    if (isProcessingAll) return;
    const targetSeg = segments.find((s) => s.id === segId);
    if (!targetSeg || targetSeg.duration <= 2) return;

    const mid = targetSeg.startTime + targetSeg.duration / 2;

    const seg1: ClipSegment = {
      ...targetSeg,
      endTime: mid,
      duration: mid - targetSeg.startTime,
      label: `Clip ${targetSeg.index + 1}a (${formatTime(targetSeg.startTime)} - ${formatTime(mid)})`,
    };

    const seg2: ClipSegment = {
      id: `clip_${Date.now()}_split`,
      index: targetSeg.index + 1,
      label: `Clip ${targetSeg.index + 1}b (${formatTime(mid)} - ${formatTime(targetSeg.endTime)})`,
      startTime: mid,
      endTime: targetSeg.endTime,
      duration: targetSeg.endTime - mid,
      status: 'idle',
      sliceProgress: 0,
      uploadProgress: 0,
      watermarkText: `PART ${targetSeg.index + 2}`,
    };

    setSegments((prev) => {
      const idx = prev.findIndex((s) => s.id === segId);
      const next = [...prev];
      next.splice(idx, 1, seg1, seg2);
      return next.map((s, i) => ({ ...s, index: i, watermarkText: `PART ${i + 1}` }));
    });
    setSplitMode('custom');
  };

  // Sync segments state from a ServerBackgroundJobState snapshot
  const applyServerJobSnapshot = useCallback((job: ServerBackgroundJobState) => {
    if (job.targetFolderId) {
      setDriveFolderId(job.targetFolderId);
    }
    setSegments((prev) => {
      // If page was reloaded while job was running on server, reconstruct segments from job
      const baseList: ClipSegment[] =
        prev.length > 0
          ? prev
          : job.segments.map((js) => ({
              id: js.id,
              index: js.index,
              label: js.label,
              startTime: js.startTime,
              endTime: js.endTime,
              duration: js.duration,
              status: js.status,
              sliceProgress: js.sliceProgress,
              uploadProgress: js.uploadProgress,
              watermarkText: js.watermarkText,
            }));

      return baseList.map((seg) => {
        const serverSeg =
          job.segments.find((s) => s.id === seg.id) ||
          job.segments.find((s) => s.index === seg.index);
        if (!serverSeg) return seg;

          return {
            ...seg,
            status: serverSeg.status,
            sliceProgress: serverSeg.sliceProgress,
            uploadProgress: serverSeg.uploadProgress,
            downloadUrl: serverSeg.downloadUrl || seg.downloadUrl,
            blobUrl: seg.blob ? seg.blobUrl : seg.blobUrl || serverSeg.downloadUrl,
            mimeType: serverSeg.mimeType || seg.mimeType || 'video/mp4',
            engineUsed: 'server-ffmpeg',
            processingTimeMs: serverSeg.processingTimeMs || seg.processingTimeMs,
            driveFileId: serverSeg.driveFileId || seg.driveFileId,
            driveViewLink: serverSeg.driveViewLink || seg.driveViewLink,
            errorMessage: serverSeg.errorMessage,
            resolution: serverSeg.resolution || seg.resolution,
            fps: serverSeg.fps || seg.fps,
            sizeBytes: serverSeg.sizeBytes || seg.sizeBytes,
          };
        });
      });

      // Automatically pre-fetch finished server clips into local browser Blob memory so video playback & download are 100% instant
      for (const serverSeg of job.segments) {
        if (
          (serverSeg.status === 'sliced' || serverSeg.status === 'uploaded') &&
          serverSeg.downloadUrl &&
          !hydratedClipIdsRef.current.has(serverSeg.id)
        ) {
          hydratedClipIdsRef.current.add(serverSeg.id);
          void fetch(serverSeg.downloadUrl)
            .then((res) => (res.ok ? res.blob() : null))
            .then((fetchedBlob) => {
              if (!fetchedBlob || fetchedBlob.size === 0) return;
              const localBlobUrl = URL.createObjectURL(fetchedBlob);
              setSegments((curr) =>
                curr.map((item) =>
                  item.id === serverSeg.id || item.index === serverSeg.index
                    ? {
                        ...item,
                        blob: fetchedBlob,
                        blobUrl: localBlobUrl,
                        sizeBytes: item.sizeBytes || fetchedBlob.size,
                      }
                    : item
                )
              );
            })
            .catch(() => {
              hydratedClipIdsRef.current.delete(serverSeg.id);
            });
        }
      }
    }, []);

  // Automatically resume / sync any active background server job when app is reopened or tab becomes visible again
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkAndResumeBackgroundJob = async () => {
      const savedJobId = localStorage.getItem('cinecut_active_job_id');
      if (!savedJobId) return;

      const job = await pollServerBackgroundBatchJob(savedJobId);
      if (!job) {
        localStorage.removeItem('cinecut_active_job_id');
        return;
      }

      if (!videoTitle && job.videoTitle) {
        setVideoTitle(job.videoTitle);
      }
      if (!videoDuration && job.videoDuration) {
        setVideoDuration(job.videoDuration);
      }
      if (!videoUrl && job.videoUrl) {
        setVideoUrl(job.videoUrl);
      }

      applyServerJobSnapshot(job);

      if (job.status === 'running') {
        setActiveBackgroundJobId(job.jobId);
        setIsProcessingAll(true);
      } else {
        localStorage.removeItem('cinecut_active_job_id');
        setActiveBackgroundJobId(null);
        setIsProcessingAll(false);
      }
    };

    void checkAndResumeBackgroundJob();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void checkAndResumeBackgroundJob();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [applyServerJobSnapshot, videoDuration, videoTitle, videoUrl]);

  // Poll active background server job until completion (continues on server even if tab is closed)
  useEffect(() => {
    if (!activeBackgroundJobId) return;

    let cancelled = false;
    const interval = setInterval(async () => {
      if (cancelled) return;
      const job = await pollServerBackgroundBatchJob(activeBackgroundJobId);
      if (!job || cancelled) return;

      applyServerJobSnapshot(job);

      if (job.status === 'completed' || job.status === 'cancelled' || job.status === 'error') {
        clearInterval(interval);
        localStorage.removeItem('cinecut_active_job_id');
        setActiveBackgroundJobId(null);
        setIsProcessingAll(false);

        if (wakeLockReleaseRef.current) {
          wakeLockReleaseRef.current();
          wakeLockReleaseRef.current = null;
        }

        if (job.status === 'completed') {
          const historyItem: HistoryItem = {
            id: `hist_${Date.now()}`,
            videoTitle: job.videoTitle || videoTitle,
            videoDuration: job.videoDuration || videoDuration,
            clipCount: job.totalClips,
            aspectRatio: overlayOptions.aspectRatio,
            timestamp:
              new Date().toLocaleDateString() +
              ' ' +
              new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            driveFolderName: job.driveFolderName || driveFolderName,
            driveFolderId: job.targetFolderId || driveFolderId || undefined,
          };

          setHistory((prev) => {
            const next = [historyItem, ...prev.slice(0, 49)];
            try {
              localStorage.setItem('cinecut_history', JSON.stringify(next));
            } catch (_) {}
            return next;
          });

          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });
        }
      }
    }, 200);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [
    activeBackgroundJobId,
    applyServerJobSnapshot,
    driveFolderId,
    driveFolderName,
    overlayOptions.aspectRatio,
    videoDuration,
    videoTitle,
  ]);

  // Process & Cut All Video Segments (Detached Server FFmpeg Background Job + Zero-Drop Fallback)
  const handleProcessAllSegments = async () => {
    if (!videoUrl || segments.length === 0) return;

    setIsProcessingAll(true);
    abortControllerRef.current = new AbortController();
    const abortSignal = abortControllerRef.current.signal;

    const updatedSegments = [...segments];
    const hasCustomCanvaBurn = Boolean(
      overlayOptions.canvaCaptions?.enabled &&
        overlayOptions.canvaCaptions?.burnIntoVideo &&
        overlayOptions.captions &&
        overlayOptions.captions.length > 0
    );

    const shouldTryServerTurbo = engineMode === 'server-ffmpeg' && !hasCustomCanvaBurn;

    // Immediately show active slicing progress on the initial parallel batch of clips (up to 6 workers)
    setSegments((prev) =>
      prev.map((s, idx) => ({
        ...s,
        status: idx < (shouldTryServerTurbo ? 6 : 1) ? 'slicing' : 'idle',
        sliceProgress: idx < (shouldTryServerTurbo ? 6 : 1) ? 12 : 0,
        uploadProgress: 0,
        errorMessage: undefined,
      }))
    );

    // Request Screen Wake Lock non-blockingly
    void acquireScreenWakeLock().then((release) => {
      wakeLockReleaseRef.current = release;
    });

    let targetFolderId = driveFolderId;
    let activeSourceId = cachedServerSourceId;

    // If background pre-staging is already in progress from when the video was selected, await it first
    if (shouldTryServerTurbo && !activeSourceId && prestagePromiseRef.current && !abortSignal.aborted) {
      setSourceStagingProgress(40);
      activeSourceId = await prestagePromiseRef.current;
      setSourceStagingProgress(null);
    }

    if (shouldTryServerTurbo && !activeSourceId && !abortSignal.aborted) {
      setSourceStagingProgress(10);
      activeSourceId = await registerSourceWithBackend({
        videoFile,
        videoUrl,
        driveFileId: sourceDriveFileId,
        driveAccessToken,
        onUploadProgress: (pct) => {
          setSourceStagingProgress(pct);
          setSegments((prev) =>
            prev.map((s, idx) =>
              idx < 6 && s.status === 'slicing'
                ? { ...s, sliceProgress: Math.min(28, Math.max(12, Math.round(pct * 0.28))) }
                : s
            )
          );
        },
      });
      setSourceStagingProgress(null);
      if (activeSourceId) {
        setCachedServerSourceId(activeSourceId);
      }
    }

    // Path A: Detached Autonomous Server-Side Background Batch Job
    // Runs on the Node.js server with up to 6x parallel FFmpeg workers & non-blocking Google Drive upload
    // Continues working 100% even if the user minimizes or closes the app!
    if (
      shouldTryServerTurbo &&
      (activeSourceId ||
        sourceDriveFileId ||
        videoUrl.startsWith('http://') ||
        videoUrl.startsWith('https://'))
    ) {
      const startedJob = await startServerBackgroundBatchJob({
        videoTitle,
        videoDuration,
        sourceId: activeSourceId,
        driveFileId: sourceDriveFileId,
        driveAccessToken,
        videoUrl,
        targetFolderId,
        driveFolderName,
        autoUploadDrive: Boolean(driveAccessToken && autoUploadDrive),
        overlay: overlayOptions,
        segments: updatedSegments,
      });

      if (startedJob) {
        try {
          localStorage.setItem('cinecut_active_job_id', startedJob.jobId);
        } catch (_) {}
        applyServerJobSnapshot(startedJob);
        setActiveBackgroundJobId(startedJob.jobId);
        // Polling useEffect takes over from here while the server processes in the background
        return;
      }
    }

    // Resolve Drive folder on client if falling back to browser/client pipeline
    if (driveAccessToken && autoUploadDrive && !targetFolderId) {
      try {
        const cleanFolderName = (driveFolderName || 'CineCut_Clips').trim();
        targetFolderId = await createDriveFolder(driveAccessToken, cleanFolderName);
        setDriveFolderId(targetFolderId);
      } catch (err: any) {
        console.error('Failed resolving Drive To-Folder:', err);
      }
    }

    // Helper to process a single clip via Browser Canvas Fallback
    const processClipWithBrowserFallback = async (seg: ClipSegment) => {
      const startedMs = Date.now();
      handleUpdateSegment(seg.id, { status: 'slicing', sliceProgress: 5, errorMessage: undefined });

      const blob = await sliceVideoSegment(
        videoUrl,
        seg,
        overlayOptions,
        (progress) => {
          handleUpdateSegment(seg.id, { sliceProgress: progress });
        },
        abortSignal
      );

      const blobUrl = URL.createObjectURL(blob);
      const elapsedMs = Date.now() - startedMs;

      handleUpdateSegment(seg.id, {
        status: 'sliced',
        sliceProgress: 100,
        blob,
        blobUrl,
        mimeType: 'video/webm',
        engineUsed: 'browser-canvas',
        processingTimeMs: elapsedMs,
      });

      if (driveAccessToken && targetFolderId && autoUploadDrive && !abortSignal.aborted) {
        handleUpdateSegment(seg.id, { status: 'uploading', uploadProgress: 0 });

        const fileName = `${videoTitle.replace(/[^a-z0-9]/gi, '_')}_Part_${seg.index + 1}_of_${updatedSegments.length}.webm`;

        const driveRes = await uploadFileToDrive(
          driveAccessToken,
          targetFolderId,
          blob,
          fileName,
          (progress) => {
            handleUpdateSegment(seg.id, { uploadProgress: progress.percentage });
          }
        );

        handleUpdateSegment(seg.id, {
          status: 'uploaded',
          uploadProgress: 100,
          driveFileId: driveRes.id,
          driveViewLink: driveRes.webViewLink,
        });
      }
    };

    // Path A: High-Speed Parallel Server FFmpeg Turbo Pipeline (3 concurrent workers)
    if (
      shouldTryServerTurbo &&
      (activeSourceId ||
        sourceDriveFileId ||
        videoUrl.startsWith('http://') ||
        videoUrl.startsWith('https://'))
    ) {
      const CONCURRENCY = 3;
      let cursor = 0;

      const worker = async () => {
        while (cursor < updatedSegments.length) {
          if (abortSignal.aborted) break;
          const idx = cursor++;
          const seg = updatedSegments[idx];
          if (!seg) break;

          handleUpdateSegment(seg.id, {
            status: 'slicing',
            sliceProgress: 15,
            errorMessage: undefined,
          });

          try {
            const shouldUploadOnServer = Boolean(
              driveAccessToken && targetFolderId && autoUploadDrive
            );
            const mp4FileName = `${videoTitle.replace(/[^a-z0-9]/gi, '_')}_Part_${seg.index + 1}_of_${updatedSegments.length}.mp4`;

            const serverRes = await sliceClipViaServerBackend({
              sourceId: activeSourceId,
              driveFileId: sourceDriveFileId,
              driveAccessToken,
              videoUrl,
              segment: seg,
              totalParts: updatedSegments.length,
              videoTitle,
              overlay: overlayOptions,
              driveUpload: shouldUploadOnServer
                ? {
                    accessToken: driveAccessToken!,
                    folderId: targetFolderId!,
                    fileName: mp4FileName,
                  }
                : null,
              onProgress: (pct) => {
                handleUpdateSegment(seg.id, { sliceProgress: pct });
              },
              abortSignal,
            });

            if (serverRes.driveFile) {
              handleUpdateSegment(seg.id, {
                status: 'uploaded',
                sliceProgress: 100,
                uploadProgress: 100,
                blob: serverRes.blob,
                blobUrl: serverRes.blobUrl,
                downloadUrl: serverRes.downloadUrl,
                mimeType: serverRes.mimeType,
                sizeBytes: serverRes.sizeBytes || serverRes.blob.size,
                resolution: serverRes.resolution,
                fps: serverRes.fps,
                engineUsed: 'server-ffmpeg',
                processingTimeMs: serverRes.processingTimeMs,
                driveFileId: serverRes.driveFile.id,
                driveViewLink: serverRes.driveFile.webViewLink,
              });
            } else {
              handleUpdateSegment(seg.id, {
                status: 'sliced',
                sliceProgress: 100,
                blob: serverRes.blob,
                blobUrl: serverRes.blobUrl,
                downloadUrl: serverRes.downloadUrl,
                mimeType: serverRes.mimeType,
                sizeBytes: serverRes.sizeBytes || serverRes.blob.size,
                resolution: serverRes.resolution,
                fps: serverRes.fps,
                engineUsed: 'server-ffmpeg',
                processingTimeMs: serverRes.processingTimeMs,
              });
            }
          } catch (err: any) {
            if (abortSignal.aborted || err.name === 'AbortError' || err.message?.includes('stopped')) {
              handleUpdateSegment(seg.id, { status: 'idle', sliceProgress: 0 });
              break;
            }
            console.warn(
              `Server FFmpeg fallback triggered for segment ${seg.id}:`,
              err.message
            );
            try {
              await processClipWithBrowserFallback(seg);
            } catch (fallbackErr: any) {
              if (abortSignal.aborted || fallbackErr.message?.includes('stopped')) {
                handleUpdateSegment(seg.id, { status: 'idle', sliceProgress: 0 });
                break;
              }
              handleUpdateSegment(seg.id, {
                status: 'error',
                errorMessage: fallbackErr.message || 'Failed to slice clip',
              });
            }
          }
        }
      };

      const workers = Array.from(
        { length: Math.min(CONCURRENCY, updatedSegments.length) },
        () => worker()
      );
      await Promise.all(workers);
    } else {
      // Path B: Browser Canvas Sequential Pipeline with Background Drive Upload
      for (let i = 0; i < updatedSegments.length; i++) {
        if (abortSignal.aborted) break;
        const seg = updatedSegments[i];
        try {
          await processClipWithBrowserFallback(seg);
        } catch (err: any) {
          if (abortSignal.aborted || err.message?.includes('stopped')) {
            handleUpdateSegment(seg.id, { status: 'idle', sliceProgress: 0 });
            break;
          }
          handleUpdateSegment(seg.id, {
            status: 'error',
            errorMessage: err.message || 'Failed to slice clip',
          });
        }
      }
    }

    setIsProcessingAll(false);

    if (!abortSignal.aborted) {
      // Save to History
      const historyItem: HistoryItem = {
        id: `hist_${Date.now()}`,
        videoTitle,
        videoDuration,
        clipCount: segments.length,
        aspectRatio: overlayOptions.aspectRatio,
        timestamp:
          new Date().toLocaleDateString() +
          ' ' +
          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        driveFolderName,
        driveFolderId: targetFolderId || undefined,
      };

      const updatedHistory = [historyItem, ...history.slice(0, 49)];
      setHistory(updatedHistory);
      try {
        localStorage.setItem('cinecut_history', JSON.stringify(updatedHistory));
      } catch (e) {}

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  };

  // Stop Slicing Handler (Cancels both server background jobs and local processing)
  const handleStopProcessing = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (activeBackgroundJobId) {
      void cancelServerBackgroundBatchJob(activeBackgroundJobId);
      try {
        localStorage.removeItem('cinecut_active_job_id');
      } catch (_) {}
      setActiveBackgroundJobId(null);
    }
    if (wakeLockReleaseRef.current) {
      wakeLockReleaseRef.current();
      wakeLockReleaseRef.current = null;
    }
    setSourceStagingProgress(null);
    setIsProcessingAll(false);
  };

  // Download All Sliced Clips as ZIP (supports both in-memory Blobs and background Server downloadUrls)
  const handleDownloadZip = async () => {
    const readySegments = segments.filter(
      (s) => s.blob !== undefined || Boolean(s.downloadUrl) || Boolean(s.blobUrl)
    );
    if (readySegments.length === 0) return;

    const zip = new JSZip();
    const folder = zip.folder(`${videoTitle || 'CineCut'}_Clips`) || zip;

    for (let idx = 0; idx < readySegments.length; idx++) {
      const seg = readySegments[idx];
      const ext = seg.mimeType?.includes('mp4') ? 'mp4' : 'webm';
      const fileName = `${videoTitle || 'Clip'}_Part_${seg.index + 1}.${ext}`;

      if (seg.blob) {
        folder.file(fileName, seg.blob);
      } else if (seg.downloadUrl || seg.blobUrl) {
        try {
          const res = await fetch((seg.downloadUrl || seg.blobUrl)!);
          if (res.ok) {
            const fetchedBlob = await res.blob();
            folder.file(fileName, fetchedBlob);
          }
        } catch (_) {}
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipUrl = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = zipUrl;
    link.download = `${videoTitle || 'CineCut'}_Clips.zip`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Header
        onShowInfoModal={() => setShowInfoModal(true)}
        onShowHistoryModal={() => setShowHistoryModal(true)}
        driveAccessToken={driveAccessToken}
        driveUser={driveUser}
        onConnectDrive={() => {
          const btn = document.querySelector('[data-drive-connect-btn]') as HTMLButtonElement;
          if (btn) btn.click();
        }}
        onDisconnectDrive={() => {
          const btn = document.querySelector('[data-drive-disconnect-btn]') as HTMLButtonElement;
          if (btn) btn.click();
        }}
        folderName={driveFolderName}
        onFolderNameChange={(name) => {
          setDriveFolderName(name);
          setDriveFolderId(null);
        }}
        autoUpload={autoUploadDrive}
        onAutoUploadChange={setAutoUploadDrive}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-6">
        {/* Dynamic Interactive Hero Section */}
        {!videoUrl && (
          <HeroSection
            onVideoSelected={handleVideoSelected}
            onShowInfoModal={() => setShowInfoModal(true)}
          />
        )}

        {/* Google Drive Status Bar */}
        <GoogleDriveAuth
          accessToken={driveAccessToken}
          onTokenChange={(token, user) => {
            setDriveAccessToken(token);
            setDriveUser(user);
          }}
          folderName={driveFolderName}
          onFolderNameChange={setDriveFolderName}
          toFolderId={driveFolderId}
          onToFolderIdChange={setDriveFolderId}
          autoUpload={autoUploadDrive}
          onAutoUploadChange={setAutoUploadDrive}
          selectedVideoName={videoTitle}
          onSelectDriveVideo={(file, title, driveFileId) => {
            const url = URL.createObjectURL(file);
            const tempVid = document.createElement('video');
            tempVid.src = url;
            tempVid.onloadedmetadata = () => {
              handleVideoSelected(file, url, title, tempVid.duration || 0, driveFileId, file.size);
            };
          }}
        />

        {!videoUrl ? (
          /* Source Video Upload Dropzone (Landing State) */
          <VideoUploader
            videoFile={videoFile}
            videoUrl={videoUrl}
            videoDuration={videoDuration}
            videoTitle={videoTitle}
            videoSize={videoSize}
            onVideoSelected={handleVideoSelected}
            onClearVideo={handleClearVideo}
          />
        ) : (
          /* Active Studio Workspace (2-Column Top Studio Deck + Full-Width Timeline & Queue) */
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Left Column: Source Video Monitor (5 cols) */}
              <div className="lg:col-span-5">
                <VideoUploader
                  videoFile={videoFile}
                  videoUrl={videoUrl}
                  videoDuration={videoDuration}
                  videoTitle={videoTitle}
                  videoSize={videoSize}
                  onVideoSelected={handleVideoSelected}
                  onClearVideo={handleClearVideo}
                />
              </div>

              {/* Right Column: Slicing & Reframe Studio Settings (7 cols) */}
              <div className="lg:col-span-7">
                <SplitSettings
                  splitMode={splitMode}
                  onSplitModeChange={handleSplitModeChange}
                  intervalSeconds={intervalSeconds}
                  onIntervalSecondsChange={handleIntervalSecondsChange}
                  segmentCount={segmentCount}
                  onSegmentCountChange={handleSegmentCountChange}
                  overlayOptions={overlayOptions}
                  onOverlayOptionsChange={setOverlayOptions}
                  videoDuration={videoDuration}
                  isProcessing={isProcessingAll}
                />
              </div>
            </div>

            {/* Calculated Clips Visualizer */}
            <TimelineVisualizer
              segments={segments}
              totalDuration={videoDuration}
              totalSizeBytes={videoFile?.size || videoSize}
              onPreviewSegment={(seg) => setSelectedPreviewSegment(seg)}
              onUpdateSegment={handleUpdateSegment}
              onAddSegment={handleAddSegment}
              onDeleteSegment={handleDeleteSegment}
              onSplitSegment={handleSplitSegment}
              isProcessing={isProcessingAll}
            />

            {/* Execution Controls with Stop Button & Playable Clips Showcase */}
            <ClipProcessingStatus
              segments={segments}
              isProcessingAll={isProcessingAll}
              onProcessAll={handleProcessAllSegments}
              onStopProcessing={handleStopProcessing}
              onDownloadZip={handleDownloadZip}
              driveFolderId={driveFolderId}
              driveConnected={!!driveAccessToken}
              engineMode={engineMode}
              onEngineModeChange={setEngineMode}
              activeBackgroundJobId={activeBackgroundJobId}
              sourceStagingProgress={sourceStagingProgress}
              onPreviewSegment={(seg) => setSelectedPreviewSegment(seg)}
            />
          </div>
        )}
      </main>

      {/* App Footer */}
      <Footer
        onShowInfoModal={() => setShowInfoModal(true)}
        onShowHistoryModal={() => setShowHistoryModal(true)}
      />

      {/* Modals */}
      {selectedPreviewSegment && (
        <ClipPreviewModal
          segment={
            segments.find((s) => s.id === selectedPreviewSegment.id) || selectedPreviewSegment
          }
          onClose={() => setSelectedPreviewSegment(null)}
          videoSourceUrl={videoUrl || ''}
        />
      )}

      {showInfoModal && <InfoModal onClose={() => setShowInfoModal(false)} />}

      {showHistoryModal && (
        <HistoryModal
          history={history}
          onClose={() => setShowHistoryModal(false)}
          onClearHistory={() => {
            setHistory([]);
            localStorage.removeItem('cinecut_history');
          }}
          onDeleteItem={(id) => {
            const next = history.filter((item) => item.id !== id);
            setHistory(next);
            try {
              localStorage.setItem('cinecut_history', JSON.stringify(next));
            } catch (e) {}
          }}
        />
      )}
    </div>
  );
}
