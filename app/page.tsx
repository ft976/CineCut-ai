'use client';

import React, { useState, useRef } from 'react';
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
  calculateIntervalSegments,
  calculateCountSegments,
  sliceVideoSegment,
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
  });

  // Calculated Clip Segments & Processing Control
  const [segments, setSegments] = useState<ClipSegment[]>([]);
  const [isProcessingAll, setIsProcessingAll] = useState<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  // Video Selection Handler
  const handleVideoSelected = (
    file: File | null,
    url: string,
    title: string,
    duration: number
  ) => {
    setVideoFile(file);
    setVideoUrl(url);
    setVideoTitle(title);
    setVideoDuration(duration);

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

  // Process & Cut All Video Segments
  const handleProcessAllSegments = async () => {
    if (!videoUrl || segments.length === 0) return;

    setIsProcessingAll(true);
    abortControllerRef.current = new AbortController();
    const abortSignal = abortControllerRef.current.signal;

    let targetFolderId = driveFolderId;

    if (driveAccessToken && autoUploadDrive) {
      try {
        const folderNameWithTitle = `${driveFolderName}_${videoTitle.replace(/[^a-z0-9]/gi, '_')}`;
        targetFolderId = await createDriveFolder(driveAccessToken, folderNameWithTitle);
        setDriveFolderId(targetFolderId);
      } catch (err: any) {
        console.error('Failed creating Drive folder:', err);
      }
    }

    const updatedSegments = [...segments];

    for (let i = 0; i < updatedSegments.length; i++) {
      if (abortSignal.aborted) {
        break;
      }

      const seg = updatedSegments[i];
      handleUpdateSegment(seg.id, { status: 'slicing', sliceProgress: 0 });

      try {
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
        handleUpdateSegment(seg.id, {
          status: 'sliced',
          sliceProgress: 100,
          blob,
          blobUrl,
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
      } catch (err: any) {
        if (abortSignal.aborted || err.message?.includes('stopped')) {
          handleUpdateSegment(seg.id, { status: 'idle', sliceProgress: 0 });
          break;
        }
        console.error(`Error processing segment ${seg.id}:`, err);
        handleUpdateSegment(seg.id, {
          status: 'error',
          errorMessage: err.message || 'Failed to slice clip',
        });
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
        timestamp: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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

  // Stop Slicing Handler
  const handleStopProcessing = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsProcessingAll(false);
  };

  // Download All Sliced Clips as ZIP
  const handleDownloadZip = async () => {
    const slicedSegments = segments.filter((s) => s.blob !== undefined);
    if (slicedSegments.length === 0) return;

    const zip = new JSZip();
    const folder = zip.folder(`${videoTitle}_Clips`) || zip;

    slicedSegments.forEach((seg, idx) => {
      if (seg.blob) {
        const fileName = `${videoTitle}_Part_${idx + 1}.webm`;
        folder.file(fileName, seg.blob);
      }
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipUrl = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = zipUrl;
    link.download = `${videoTitle}_Clips.zip`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans">
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
        onFolderNameChange={setDriveFolderName}
        autoUpload={autoUploadDrive}
        onAutoUploadChange={setAutoUploadDrive}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-8">
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
          autoUpload={autoUploadDrive}
          onAutoUploadChange={setAutoUploadDrive}
          selectedVideoName={videoTitle}
          onSelectDriveVideo={(file, title) => {
            const url = URL.createObjectURL(file);
            const tempVid = document.createElement('video');
            tempVid.src = url;
            tempVid.onloadedmetadata = () => {
              handleVideoSelected(file, url, title, tempVid.duration || 0);
            };
          }}
        />

        {/* Source Video Upload */}
        <VideoUploader
          videoFile={videoFile}
          videoUrl={videoUrl}
          videoDuration={videoDuration}
          videoTitle={videoTitle}
          onVideoSelected={handleVideoSelected}
          onClearVideo={handleClearVideo}
        />

        {videoUrl && (
          <>
            {/* Split Settings (Locked during processing) */}
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

            {/* Calculated Clips Visualizer */}
            <TimelineVisualizer
              segments={segments}
              totalDuration={videoDuration}
              onPreviewSegment={(seg) => setSelectedPreviewSegment(seg)}
              onUpdateSegment={handleUpdateSegment}
              onAddSegment={handleAddSegment}
              onDeleteSegment={handleDeleteSegment}
              onSplitSegment={handleSplitSegment}
              isProcessing={isProcessingAll}
            />

            {/* Execution Controls with Stop Button */}
            <ClipProcessingStatus
              segments={segments}
              isProcessingAll={isProcessingAll}
              onProcessAll={handleProcessAllSegments}
              onStopProcessing={handleStopProcessing}
              onDownloadZip={handleDownloadZip}
              driveFolderId={driveFolderId}
              driveConnected={!!driveAccessToken}
            />
          </>
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
          segment={selectedPreviewSegment}
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
