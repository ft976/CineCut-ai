import { CanvaCaptionConfig, CaptionItem, drawCanvaCaptionToCanvas } from './canva-captions';

export interface ClipSegment {
  id: string;
  index: number;
  label: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
  duration: number; // in seconds
  status: 'idle' | 'slicing' | 'sliced' | 'uploading' | 'uploaded' | 'error';
  sliceProgress: number; // 0-100
  uploadProgress: number; // 0-100
  blob?: Blob;
  blobUrl?: string;
  driveFileId?: string;
  driveViewLink?: string;
  errorMessage?: string;
  aiTitle?: string;
  aiHook?: string;
  aiCaption?: string;
  aiHashtags?: string[];
  watermarkText?: string;
}

export type AspectRatioMode = '16:9' | '9:16' | '1:1';

export interface OverlayOptions {
  showPartBadge: boolean;
  topBannerText: string;
  bottomBannerText: string;
  aspectRatio: AspectRatioMode;
  blurBackground: boolean; // for 9:16 vertical mode
  textColor: string;
  bannerBgColor: string;
  canvaCaptions?: CanvaCaptionConfig;
  captions?: CaptionItem[];
}

/**
 * Format seconds into mm:ss or hh:mm:ss
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Parse time string (e.g. "01:23", "01:23:45", or "83.5") to seconds
 */
export function parseTimeToSeconds(input: string): number {
  if (!input || typeof input !== 'string') return 0;
  const trimmed = input.trim();
  if (!trimmed) return 0;

  // Handle plain numbers (e.g. "83.5")
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return parseFloat(trimmed);
  }

  // Handle mm:ss or hh:mm:ss
  const parts = trimmed.split(':').map((p) => parseFloat(p) || 0);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  return 0;
}

/**
 * Calculate segments for fixed interval
 */
export function calculateIntervalSegments(totalDuration: number, intervalSeconds: number): ClipSegment[] {
  if (!totalDuration || totalDuration <= 0 || !intervalSeconds || intervalSeconds <= 0) return [];

  const segments: ClipSegment[] = [];
  let currentStart = 0;
  let index = 0;

  while (currentStart < totalDuration) {
    const end = Math.min(currentStart + intervalSeconds, totalDuration);
    if (end - currentStart < 0.5 && segments.length > 0) {
      break;
    }

    const duration = Math.max(0.1, end - currentStart);
    const segId = `clip_${Date.now()}_${index}_${Math.floor(currentStart)}s`;
    segments.push({
      id: segId,
      index,
      label: `Clip ${index + 1} (${formatTime(currentStart)} - ${formatTime(end)})`,
      startTime: currentStart,
      endTime: end,
      duration,
      status: 'idle',
      sliceProgress: 0,
      uploadProgress: 0,
      watermarkText: `PART ${index + 1}`,
    });

    currentStart = end;
    index++;
  }

  return segments;
}

/**
 * Calculate segments for equal count
 */
export function calculateCountSegments(totalDuration: number, count: number): ClipSegment[] {
  if (!totalDuration || totalDuration <= 0 || !count || count <= 0) return [];

  const interval = totalDuration / count;
  return calculateIntervalSegments(totalDuration, interval);
}

/**
 * Render a single frame with aspect ratio, blurred background, and banner overlays on Canvas
 */
export function drawVideoFrameToCanvas(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  canvasWidth: number,
  canvasHeight: number,
  overlay: OverlayOptions,
  partLabel: string,
  currentTime?: number
) {
  // Clear canvas
  ctx.fillStyle = '#0f172a'; // dark backdrop
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const vWidth = video.videoWidth || 1920;
  const vHeight = video.videoHeight || 1080;

  if (overlay.aspectRatio === '9:16') {
    // Vertical Shorts/Reels mode
    if (overlay.blurBackground) {
      ctx.save();
      ctx.filter = 'blur(20px) brightness(0.6)';
      ctx.drawImage(video, -20, -20, canvasWidth + 40, canvasHeight + 40);
      ctx.restore();
    }

    const scale = canvasWidth / vWidth;
    const drawHeight = vHeight * scale;
    const drawY = (canvasHeight - drawHeight) / 2;

    ctx.drawImage(video, 0, drawY, canvasWidth, drawHeight);
  } else if (overlay.aspectRatio === '1:1') {
    // Square mode
    if (overlay.blurBackground) {
      ctx.save();
      ctx.filter = 'blur(16px) brightness(0.6)';
      ctx.drawImage(video, -10, -10, canvasWidth + 20, canvasHeight + 20);
      ctx.restore();
    }
    const scale = Math.min(canvasWidth / vWidth, canvasHeight / vHeight);
    const drawW = vWidth * scale;
    const drawH = vHeight * scale;
    const drawX = (canvasWidth - drawW) / 2;
    const drawY = (canvasHeight - drawH) / 2;
    ctx.drawImage(video, drawX, drawY, drawW, drawH);
  } else {
    // 16:9 Landscape mode
    const scale = Math.min(canvasWidth / vWidth, canvasHeight / vHeight);
    const drawW = vWidth * scale;
    const drawH = vHeight * scale;
    const drawX = (canvasWidth - drawW) / 2;
    const drawY = (canvasHeight - drawH) / 2;
    ctx.drawImage(video, drawX, drawY, drawW, drawH);
  }

  // Draw Top Banner text
  if (overlay.topBannerText.trim()) {
    const bannerH = Math.round(canvasHeight * 0.08);
    ctx.fillStyle = overlay.bannerBgColor || 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, canvasWidth, bannerH);

    ctx.fillStyle = overlay.textColor || '#ffffff';
    ctx.font = `bold ${Math.round(canvasHeight * 0.035)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(overlay.topBannerText.toUpperCase(), canvasWidth / 2, bannerH / 2);
  }

  // Draw Part Badge / Bottom Banner text
  if (overlay.showPartBadge || overlay.bottomBannerText.trim()) {
    const bottomText = overlay.bottomBannerText.trim() || partLabel;
    const bannerH = Math.round(canvasHeight * 0.08);
    const bannerY = canvasHeight - bannerH;

    ctx.fillStyle = overlay.bannerBgColor || 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, bannerY, canvasWidth, bannerH);

    ctx.fillStyle = '#facc15'; // Vibrant yellow highlight text
    ctx.font = `900 ${Math.round(canvasHeight * 0.038)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(bottomText, canvasWidth / 2, bannerY + bannerH / 2);
  }

  // Draw Canva-styled Captions directly onto the frame
  if (
    overlay.canvaCaptions &&
    overlay.canvaCaptions.enabled &&
    overlay.canvaCaptions.burnIntoVideo &&
    overlay.captions &&
    overlay.captions.length > 0
  ) {
    const timeToUse = currentTime !== undefined ? currentTime : video.currentTime || 0;
    drawCanvaCaptionToCanvas(
      ctx,
      canvasWidth,
      canvasHeight,
      timeToUse,
      overlay.canvaCaptions,
      overlay.captions
    );
  }
}

/**
 * Robust, Frame-Accurate Video Slicing Engine with Web Audio & Precise Timeframes
 */
export async function sliceVideoSegment(
  videoSourceUrl: string,
  segment: ClipSegment,
  overlay: OverlayOptions,
  onProgress: (progress: number) => void,
  abortSignal?: AbortSignal
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (abortSignal?.aborted) {
      reject(new Error('Slicing process stopped by user'));
      return;
    }

    const hiddenVideo = document.createElement('video');
    hiddenVideo.crossOrigin = 'anonymous';
    hiddenVideo.src = videoSourceUrl;
    hiddenVideo.preload = 'auto';
    hiddenVideo.playsInline = true;
    hiddenVideo.muted = false; // Unmuted so audio can be captured via Web Audio API

    let targetWidth = 1280;
    let targetHeight = 720;
    if (overlay.aspectRatio === '9:16') {
      targetWidth = 720;
      targetHeight = 1280;
    } else if (overlay.aspectRatio === '1:1') {
      targetWidth = 1080;
      targetHeight = 1080;
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas 2d context not available'));
      return;
    }

    let mediaRecorder: MediaRecorder | null = null;
    let animationFrameId: number | null = null;
    let audioCtx: AudioContext | null = null;
    let mediaSource: MediaElementAudioSourceNode | null = null;
    let audioDest: MediaStreamAudioDestinationNode | null = null;
    const recordedChunks: Blob[] = [];

    const cleanup = () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      hiddenVideo.pause();
      hiddenVideo.removeAttribute('src');
      hiddenVideo.load();
      if (audioCtx && audioCtx.state !== 'closed') {
        try {
          audioCtx.close();
        } catch (_) {}
      }
    };

    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        cleanup();
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
          try {
            mediaRecorder.stop();
          } catch (_) {}
        }
        reject(new Error('Slicing stopped by user'));
      });
    }

    hiddenVideo.onloadedmetadata = () => {
      try {
        const start = Math.max(0, segment.startTime);
        hiddenVideo.currentTime = start;
      } catch (err) {
        reject(err);
      }
    };

    hiddenVideo.onseeked = async () => {
      if (mediaRecorder || abortSignal?.aborted) return;

      try {
        // Web Audio API setup to capture video audio stream into recorded output silently
        try {
          const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtxClass) {
            audioCtx = new AudioCtxClass();
            mediaSource = audioCtx.createMediaElementSource(hiddenVideo);
            audioDest = audioCtx.createMediaStreamDestination();
            mediaSource.connect(audioDest);

            // Silent gain so user speakers aren't blasted during background slicing
            const silentGain = audioCtx.createGain();
            silentGain.gain.value = 0;
            mediaSource.connect(silentGain);
            silentGain.connect(audioCtx.destination);
          }
        } catch (e) {
          console.warn('Web Audio setup notice:', e);
        }

        const canvasStream = canvas.captureStream(60);

        // Attach audio track
        if (audioDest && audioDest.stream.getAudioTracks().length > 0) {
          canvasStream.addTrack(audioDest.stream.getAudioTracks()[0]);
        } else {
          try {
            const rawStream = (hiddenVideo as any).captureStream?.() || (hiddenVideo as any).mozCaptureStream?.();
            if (rawStream && rawStream.getAudioTracks().length > 0) {
              canvasStream.addTrack(rawStream.getAudioTracks()[0]);
            }
          } catch (_) {}
        }

        let mimeType = 'video/webm;codecs=vp9,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm;codecs=vp8,opus';
        }
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
        }

        mediaRecorder = new MediaRecorder(canvasStream, {
          mimeType,
          videoBitsPerSecond: 8000000,
        });

        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recordedChunks.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          cleanup();
          if (abortSignal?.aborted) {
            reject(new Error('Slicing stopped by user'));
            return;
          }
          const blob = new Blob(recordedChunks, { type: mimeType });
          resolve(blob);
        };

        // Standard 1.0x playback rate guarantees exact timing, no dropped frames, and audio sync
        hiddenVideo.playbackRate = 1.0;

        if (audioCtx && audioCtx.state === 'suspended') {
          await audioCtx.resume();
        }

        await hiddenVideo.play();
        mediaRecorder.start(100);

        const totalSegmentSecs = Math.max(0.1, segment.endTime - segment.startTime);

        const renderLoop = () => {
          if (abortSignal?.aborted) {
            cleanup();
            return;
          }

          if (hiddenVideo.currentTime >= segment.endTime || hiddenVideo.ended) {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
              mediaRecorder.stop();
            }
            return;
          }

          const currentProgress = Math.min(
            100,
            Math.max(0, ((hiddenVideo.currentTime - segment.startTime) / totalSegmentSecs) * 100)
          );
          onProgress(Math.round(currentProgress));

          drawVideoFrameToCanvas(
            ctx,
            hiddenVideo,
            targetWidth,
            targetHeight,
            overlay,
            `PART ${segment.index + 1}`,
            hiddenVideo.currentTime
          );

          animationFrameId = requestAnimationFrame(renderLoop);
        };

        renderLoop();
      } catch (recordingErr) {
        cleanup();
        reject(recordingErr);
      }
    };

    hiddenVideo.onerror = () => {
      cleanup();
      reject(
        new Error(`Failed to load video source for slicing: ${hiddenVideo.error?.message || 'Video load error'}`)
      );
    };
  });
}

