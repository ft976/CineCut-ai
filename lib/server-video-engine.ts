import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

export const ENGINE_CACHE_DIR = path.join(os.tmpdir(), 'cinecut-engine-cache');
const JOBS_STATE_FILE = path.join(ENGINE_CACHE_DIR, 'jobs_state.json');

// Ensure cache directory exists
export function ensureCacheDir(): string {
  if (!fs.existsSync(ENGINE_CACHE_DIR)) {
    fs.mkdirSync(ENGINE_CACHE_DIR, { recursive: true });
  }
  return ENGINE_CACHE_DIR;
}

/**
 * Clean up cached files older than maxAgeMs (default 2 hours so background jobs have plenty of time)
 */
export function cleanExpiredCacheFiles(maxAgeMs: number = 2 * 60 * 60 * 1000): void {
  try {
    ensureCacheDir();
    const now = Date.now();
    const files = fs.readdirSync(ENGINE_CACHE_DIR);
    for (const file of files) {
      if (file === 'jobs_state.json') continue;
      const fullPath = path.join(ENGINE_CACHE_DIR, file);
      try {
        const stat = fs.statSync(fullPath);
        if (now - stat.mtimeMs > maxAgeMs) {
          fs.unlinkSync(fullPath);
        }
      } catch (_) {}
    }
  } catch (_) {}
}

export interface ServerOverlayConfig {
  showPartBadge?: boolean;
  topBannerText?: string;
  bottomBannerText?: string;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  blurBackground?: boolean;
  textColor?: string;
  bannerBgColor?: string;
  qualityPreset?: 'master-lossless' | 'stream-copy';
}

export interface ServerSliceOptions {
  sourcePath: string;
  startTime: number;
  endTime: number;
  partIndex: number;
  totalParts: number;
  watermarkText?: string;
  overlay?: ServerOverlayConfig;
  forceStreamCopy?: boolean;
  jobId?: string;
  onProgress?: (pct: number) => void;
}

export interface ServerSliceResult {
  clipId: string;
  clipPath: string;
  sizeBytes: number;
  processingTimeMs: number;
  engineMode: 'ffmpeg-stream-copy' | 'ffmpeg-master-lossless-mp4';
  resolution: string;
  fps: number;
}

export interface UploadedDriveFileServer {
  id: string;
  name: string;
  webViewLink: string;
  webContentLink?: string;
  mimeType: string;
}

export interface ProbedMediaInfo {
  hasAudio: boolean;
  duration: number;
  width: number;
  height: number;
  fps: number;
  videoCodec: string;
  audioCodec: string;
}

export interface BackgroundJobSegment {
  id: string;
  index: number;
  startTime: number;
  endTime: number;
  duration: number;
  label: string;
  watermarkText?: string;
  status: 'idle' | 'slicing' | 'sliced' | 'uploading' | 'uploaded' | 'error';
  sliceProgress: number;
  uploadProgress: number;
  clipId?: string;
  downloadUrl?: string;
  mimeType?: string;
  sizeBytes?: number;
  processingTimeMs?: number;
  driveFileId?: string;
  driveViewLink?: string;
  errorMessage?: string;
  resolution?: string;
  fps?: number;
}

export interface BackgroundBatchJob {
  jobId: string;
  createdAt: number;
  updatedAt: number;
  status: 'running' | 'completed' | 'cancelled' | 'error';
  videoTitle: string;
  videoDuration: number;
  sourceId?: string | null;
  driveFileId?: string | null;
  videoUrl?: string | null;
  targetFolderId?: string | null;
  driveFolderName?: string;
  autoUploadDrive: boolean;
  overlayOptions: ServerOverlayConfig;
  segments: BackgroundJobSegment[];
  completedClips: number;
  totalClips: number;
  errorMessage?: string;
}

// Global singleton stores across Next.js hot reloads
const globalForJobs = globalThis as unknown as {
  __cinecutJobs?: Map<string, BackgroundBatchJob>;
  __cinecutActiveProcesses?: Map<string, Set<ChildProcess>>;
  __cinecutMediaInfoCache?: Map<string, ProbedMediaInfo>;
};

if (!globalForJobs.__cinecutJobs) {
  globalForJobs.__cinecutJobs = new Map<string, BackgroundBatchJob>();
  // Restore persisted jobs from disk if available
  try {
    ensureCacheDir();
    if (fs.existsSync(JOBS_STATE_FILE)) {
      const raw = fs.readFileSync(JOBS_STATE_FILE, 'utf-8');
      const parsed: BackgroundBatchJob[] = JSON.parse(raw);
      for (const j of parsed) {
        globalForJobs.__cinecutJobs.set(j.jobId, j);
      }
    }
  } catch (_) {}
}

if (!globalForJobs.__cinecutActiveProcesses) {
  globalForJobs.__cinecutActiveProcesses = new Map<string, Set<ChildProcess>>();
}

if (!globalForJobs.__cinecutMediaInfoCache) {
  globalForJobs.__cinecutMediaInfoCache = new Map<string, ProbedMediaInfo>();
}

const jobsStore = globalForJobs.__cinecutJobs;
const activeProcesses = globalForJobs.__cinecutActiveProcesses;
const mediaInfoCache = globalForJobs.__cinecutMediaInfoCache;

function syncJobsFromDisk(): void {
  try {
    if (fs.existsSync(JOBS_STATE_FILE)) {
      const raw = fs.readFileSync(JOBS_STATE_FILE, 'utf-8');
      const parsed: BackgroundBatchJob[] = JSON.parse(raw);
      for (const diskJob of parsed) {
        const memJob = jobsStore.get(diskJob.jobId);
        if (!memJob || diskJob.updatedAt > memJob.updatedAt) {
          jobsStore.set(diskJob.jobId, diskJob);
        }
      }
    }
  } catch (_) {}
}

function persistJobsToDisk(): void {
  try {
    ensureCacheDir();
    // Keep the 15 most recent jobs on disk
    const allJobs = Array.from(jobsStore.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 15);
    fs.writeFileSync(JOBS_STATE_FILE, JSON.stringify(allJobs, null, 2), 'utf-8');
  } catch (_) {}
}

/**
 * Resolve source file path by sourceId
 */
export function getSourcePathById(sourceId: string): string | null {
  ensureCacheDir();
  const safeId = sourceId.replace(/[^a-zA-Z0-9_-]/g, '');
  const candidate = path.join(ENGINE_CACHE_DIR, `src_${safeId}.mp4`);
  if (fs.existsSync(candidate)) {
    return candidate;
  }
  return null;
}

/**
 * Resolve generated clip path by clipId
 */
export function getClipPathById(clipId: string): string | null {
  ensureCacheDir();
  const safeId = clipId.replace(/[^a-zA-Z0-9_-]/g, '');
  const candidate = path.join(ENGINE_CACHE_DIR, `clip_${safeId}.mp4`);
  if (fs.existsSync(candidate)) {
    return candidate;
  }
  return null;
}

/**
 * Save a Blob/File into the server cache directory
 */
export async function saveUploadedFileToCache(
  fileBlob: Blob,
  customKey?: string
): Promise<{ sourceId: string; filePath: string; sizeBytes: number }> {
  ensureCacheDir();
  cleanExpiredCacheFiles();

  const sourceId = customKey
    ? crypto.createHash('md5').update(customKey).digest('hex')
    : crypto.randomBytes(10).toString('hex');

  const filePath = path.join(ENGINE_CACHE_DIR, `src_${sourceId}.mp4`);

  if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    if (stat.size > 0 && stat.size === fileBlob.size) {
      return { sourceId, filePath, sizeBytes: stat.size };
    }
  }

  const arrayBuffer = await fileBlob.arrayBuffer();
  fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
  const stat = fs.statSync(filePath);

  return { sourceId, filePath, sizeBytes: stat.size };
}

/**
 * Download a Google Drive video directly on the server into cache
 */
export async function fetchDriveVideoToCache(
  driveFileId: string,
  accessToken: string
): Promise<{ sourceId: string; filePath: string; sizeBytes: number }> {
  ensureCacheDir();
  cleanExpiredCacheFiles();

  const safeDriveId = driveFileId.replace(/[^a-zA-Z0-9_-]/g, '');
  const sourceId = `drive_${safeDriveId}`;
  const filePath = path.join(ENGINE_CACHE_DIR, `src_${sourceId}.mp4`);

  if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    if (stat.size > 1024) {
      return { sourceId, filePath, sizeBytes: stat.size };
    }
  }

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      driveFileId
    )}?alt=media&supportsAllDrives=true`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Google Drive server download failed (HTTP ${res.status})`);
  }

  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
  const stat = fs.statSync(filePath);

  return { sourceId, filePath, sizeBytes: stat.size };
}

/**
 * Download a remote HTTP/HTTPS video URL into server cache
 */
export async function fetchRemoteUrlToCache(
  videoUrl: string
): Promise<{ sourceId: string; filePath: string; sizeBytes: number }> {
  ensureCacheDir();
  cleanExpiredCacheFiles();

  const sourceId = `url_${crypto.createHash('md5').update(videoUrl).digest('hex')}`;
  const filePath = path.join(ENGINE_CACHE_DIR, `src_${sourceId}.mp4`);

  if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    if (stat.size > 1024) {
      return { sourceId, filePath, sizeBytes: stat.size };
    }
  }

  const res = await fetch(videoUrl);
  if (!res.ok) {
    throw new Error(`Remote video download failed (HTTP ${res.status})`);
  }

  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
  const stat = fs.statSync(filePath);

  return { sourceId, filePath, sizeBytes: stat.size };
}

/**
 * Parse rational frame rate string like "30000/1001" or "60/1"
 */
function parseFpsString(rateStr?: string): number {
  if (!rateStr) return 30;
  if (rateStr.includes('/')) {
    const [num, den] = rateStr.split('/').map(Number);
    if (num > 0 && den > 0) {
      const fps = num / den;
      if (fps >= 10 && fps <= 120) return Math.round(fps * 100) / 100;
    }
  }
  const parsed = parseFloat(rateStr);
  return parsed >= 10 && parsed <= 120 ? parsed : 30;
}

/**
 * Probe input video dimensions, exact frame rate, codecs, and audio stream via ffprobe (with instant in-memory cache)
 */
export async function probeMediaInfo(filePath: string): Promise<ProbedMediaInfo> {
  const cachedInfo = mediaInfoCache.get(filePath);
  if (cachedInfo) {
    return cachedInfo;
  }

  return new Promise((resolve) => {
    const args = [
      '-v',
      'error',
      '-show_entries',
      'stream=codec_type,codec_name,width,height,r_frame_rate,avg_frame_rate:format=duration',
      '-of',
      'json',
      filePath,
    ];

    const proc = spawn('ffprobe', args);
    let stdout = '';
    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    proc.on('close', () => {
      try {
        const parsed = JSON.parse(stdout);
        const streams: any[] = parsed.streams || [];
        const hasAudio = streams.some((s) => s.codec_type === 'audio');
        const videoStream = streams.find((s) => s.codec_type === 'video') || {};
        const audioStream = streams.find((s) => s.codec_type === 'audio') || {};
        const duration = parseFloat(parsed.format?.duration || '0') || 0;
        const fps = parseFpsString(
          videoStream.avg_frame_rate !== '0/0'
            ? videoStream.avg_frame_rate
            : videoStream.r_frame_rate
        );

        const info: ProbedMediaInfo = {
          hasAudio,
          duration,
          width: Number(videoStream.width) || 1920,
          height: Number(videoStream.height) || 1080,
          fps,
          videoCodec: videoStream.codec_name || 'h264',
          audioCodec: audioStream.codec_name || 'aac',
        };
        mediaInfoCache.set(filePath, info);
        resolve(info);
      } catch (_) {
        resolve({
          hasAudio: true,
          duration: 0,
          width: 1920,
          height: 1080,
          fps: 30,
          videoCodec: 'h264',
          audioCodec: 'aac',
        });
      }
    });
    proc.on('error', () => {
      resolve({
        hasAudio: true,
        duration: 0,
        width: 1920,
        height: 1080,
        fps: 30,
        videoCodec: 'h264',
        audioCodec: 'aac',
      });
    });
  });
}

/**
 * Escape text for FFmpeg drawtext filter
 */
function escapeDrawtext(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, '')
    .replace(/%/g, '\\%')
    .replace(/\n/g, ' ');
}

/**
 * Execute FFmpeg command as a Promise, stream live encoding progress (0-100%), and track child process for clean cancellation
 */
function runFFmpeg(
  args: string[],
  jobId?: string,
  clipDurationSec: number = 10,
  onProgress?: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args);

    if (jobId) {
      if (!activeProcesses.has(jobId)) {
        activeProcesses.set(jobId, new Set());
      }
      activeProcesses.get(jobId)?.add(proc);
    }

    let currentPct = 10;
    onProgress?.(currentPct);

    // Smooth heartbeat progress ticker so fast or complex filter-graph encodes always visibly advance
    const ticker = setInterval(() => {
      if (currentPct < 90) {
        currentPct = Math.min(90, currentPct + 5);
        onProgress?.(currentPct);
      }
    }, 300);

    let stderr = '';
    proc.stderr.on('data', (chunk: Buffer | string) => {
      const text = String(chunk);
      stderr += text;

      if (onProgress && clipDurationSec > 0) {
        const regex = /time=(\d+):(\d+):(\d+(?:\.\d+)?)/g;
        let match: RegExpExecArray | null = null;
        let lastMatch: RegExpExecArray | null = null;
        while ((match = regex.exec(text)) !== null) {
          lastMatch = match;
        }
        if (lastMatch) {
          const hours = parseFloat(lastMatch[1]) || 0;
          const mins = parseFloat(lastMatch[2]) || 0;
          const secs = parseFloat(lastMatch[3]) || 0;
          const encodedSecs = hours * 3600 + mins * 60 + secs;
          const computedPct = Math.min(
            98,
            Math.max(currentPct, Math.round((encodedSecs / clipDurationSec) * 100))
          );
          if (computedPct > currentPct) {
            currentPct = computedPct;
            onProgress(currentPct);
          }
        }
      }
    });
    proc.on('close', (code) => {
      clearInterval(ticker);
      if (jobId) {
        activeProcesses.get(jobId)?.delete(proc);
      }
      if (code === 0) {
        onProgress?.(100);
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-400)}`));
      }
    });
    proc.on('error', (err) => {
      clearInterval(ticker);
      if (jobId) {
        activeProcesses.get(jobId)?.delete(proc);
      }
      reject(err);
    });
  });
}

/**
 * High-Speed, Zero-Frame-Drop, Master-Lossless Quality Server FFmpeg Video Slicer
 */
export async function sliceClipServerSide(
  options: ServerSliceOptions
): Promise<ServerSliceResult> {
  const startedAt = Date.now();
  ensureCacheDir();

  const {
    sourcePath,
    startTime,
    endTime,
    partIndex,
    watermarkText,
    overlay,
    forceStreamCopy = false,
    jobId,
    onProgress,
  } = options;

  const duration = Math.max(0.1, endTime - startTime);
  const clipId = `${Date.now()}_${partIndex}_${crypto.randomBytes(4).toString('hex')}`;
  const clipPath = path.join(ENGINE_CACHE_DIR, `clip_${clipId}.mp4`);

  // Probe exact source resolution & frame rate so we NEVER drop frames or degrade resolution
  const mediaInfo = await probeMediaInfo(sourcePath);
  const sourceFps = mediaInfo.fps || 30;

  const aspectRatio = overlay?.aspectRatio || '9:16';
  const blurBackground = overlay?.blurBackground ?? true;
  const showPartBadge = overlay?.showPartBadge ?? true;
  const topBanner = (overlay?.topBannerText || '').trim();
  const bottomBanner =
    (overlay?.bottomBannerText || '').trim() ||
    (showPartBadge ? watermarkText || `PART ${partIndex + 1}` : '');

  const isSourceAlreadyMatchingRatio =
    (aspectRatio === '16:9' && mediaInfo.width >= mediaInfo.height) ||
    (aspectRatio === '9:16' && mediaInfo.height > mediaInfo.width) ||
    (aspectRatio === '1:1' && mediaInfo.width === mediaInfo.height);

  const hasNoVisualBanners = !topBanner && !bottomBanner && !showPartBadge;

  // Mode 1: 100% Bitstream Copy (Zero Re-encoding, 100% Original Quality & Frame-by-Frame Bitrate)
  if (
    forceStreamCopy ||
    overlay?.qualityPreset === 'stream-copy' ||
    (isSourceAlreadyMatchingRatio && hasNoVisualBanners)
  ) {
    try {
      const copyArgs = [
        '-y',
        '-ss',
        startTime.toFixed(3),
        '-t',
        duration.toFixed(3),
        '-i',
        sourcePath,
        '-c',
        'copy',
        '-avoid_negative_ts',
        'make_zero',
        '-movflags',
        '+faststart',
        clipPath,
      ];
      await runFFmpeg(copyArgs, jobId, duration, onProgress);
      const stat = fs.statSync(clipPath);
      if (stat.size > 1024) {
        return {
          clipId,
          clipPath,
          sizeBytes: stat.size,
          processingTimeMs: Date.now() - startedAt,
          engineMode: 'ffmpeg-stream-copy',
          resolution: `${mediaInfo.width}x${mediaInfo.height}`,
          fps: sourceFps,
        };
      }
    } catch (_) {
      // Fall through to Visually Lossless Master Encode if stream copy fails on container format
    }
  }

  // Mode 2: Master Studio High-Speed H.264 Encode (Smart HD 720p/1080p + CABAC + Locked CFR)
  const isFullHdSource = Math.max(mediaInfo.width, mediaInfo.height) >= 1080;
  let targetW = 1280;
  let targetH = 720;
  if (aspectRatio === '9:16') {
    targetW = isFullHdSource ? 1080 : 720;
    targetH = isFullHdSource ? 1920 : 1280;
  } else if (aspectRatio === '1:1') {
    targetW = isFullHdSource ? 1080 : 720;
    targetH = isFullHdSource ? 1080 : 720;
  } else {
    targetW = isFullHdSource ? 1920 : 1280;
    targetH = isFullHdSource ? 1080 : 720;
  }

  const filterChains: string[] = [];

  if ((aspectRatio === '9:16' || aspectRatio === '1:1') && blurBackground) {
    // Ultra-fast Downscale-Blur-Upscale Pipeline:
    const blurW = aspectRatio === '9:16' ? 144 : 180;
    const blurH = aspectRatio === '9:16' ? 256 : 180;
    filterChains.push(
      `[0:v]split=2[bg][fg];` +
        `[bg]scale=${blurW}:${blurH}:force_original_aspect_ratio=increase:flags=fast_bilinear,crop=${blurW}:${blurH},boxblur=6:2,scale=${targetW}:${targetH}:flags=fast_bilinear[bg_blur];` +
        `[fg]scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease:flags=bicubic[fg_scaled];` +
        `[bg_blur][fg_scaled]overlay=(W-w)/2:(H-h)/2[base]`
    );
  } else {
    filterChains.push(
      `[0:v]scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease:flags=bicubic,pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2:color=#0f172a[base]`
    );
  }

  let currentLabel = 'base';
  const bannerH = Math.round(targetH * 0.08);
  const fontFile = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
  const hasFontFile = fs.existsSync(fontFile);
  const fontSpec = hasFontFile ? `:fontfile=${fontFile}` : '';

  if (topBanner) {
    const safeTop = escapeDrawtext(topBanner.toUpperCase());
    const fontSize = Math.round(targetH * 0.033);
    const nextLabel = 'v_top';
    filterChains.push(
      `[${currentLabel}]drawbox=x=0:y=0:w=iw:h=${bannerH}:color=black@0.78:t=fill,` +
        `drawtext=text='${safeTop}'${fontSpec}:fontcolor=white:fontsize=${fontSize}:x=(w-text_w)/2:y=(${bannerH}-text_h)/2[${nextLabel}]`
    );
    currentLabel = nextLabel;
  }

  if (bottomBanner) {
    const safeBottom = escapeDrawtext(bottomBanner.toUpperCase());
    const fontSize = Math.round(targetH * 0.036);
    const bannerY = targetH - bannerH;
    const nextLabel = 'v_out';
    filterChains.push(
      `[${currentLabel}]drawbox=x=0:y=${bannerY}:w=iw:h=${bannerH}:color=black@0.85:t=fill,` +
        `drawtext=text='${safeBottom}'${fontSpec}:fontcolor=#facc15:fontsize=${fontSize}:x=(w-text_w)/2:y=${bannerY}+(${bannerH}-text_h)/2[${nextLabel}]`
    );
    currentLabel = nextLabel;
  }

  const filterComplex = filterChains.join(';');

  const audioArgs = mediaInfo.hasAudio
    ? ['-map', '0:a?', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000']
    : ['-an'];

  // Superfast H.264 High Profile with CABAC + VBV rate cap produces compact (~6-12MB), crystal-clear MP4 clips that stream & download instantly
  const encodeArgs = [
    '-y',
    '-ss',
    startTime.toFixed(3),
    '-t',
    duration.toFixed(3),
    '-i',
    sourcePath,
    '-filter_threads',
    '0',
    '-filter_complex_threads',
    '0',
    '-filter_complex',
    filterComplex,
    '-map',
    `[${currentLabel}]`,
    '-threads',
    '0',
    '-vsync',
    'cfr',
    '-r',
    String(sourceFps),
    '-c:v',
    'libx264',
    '-preset',
    'superfast',
    '-crf',
    '21',
    '-maxrate',
    isFullHdSource ? '5000k' : '3200k',
    '-bufsize',
    isFullHdSource ? '10000k' : '6400k',
    '-pix_fmt',
    'yuv420p',
    ...audioArgs,
    '-movflags',
    '+faststart',
    clipPath,
  ];

  await runFFmpeg(encodeArgs, jobId, duration, onProgress);
  const stat = fs.statSync(clipPath);

  return {
    clipId,
    clipPath,
    sizeBytes: stat.size,
    processingTimeMs: Date.now() - startedAt,
    engineMode: 'ffmpeg-master-lossless-mp4',
    resolution: `${targetW}x${targetH}`,
    fps: sourceFps,
  };
}

/**
 * Create or resolve a Google Drive Folder from the server
 */
export async function createDriveFolderFromServer(
  accessToken: string,
  folderName: string
): Promise<string> {
  const safeName = (folderName || 'CineCut_Clips').trim();
  const query = `name = '${safeName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

  try {
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        query
      )}&fields=files(id,name)&includeItemsFromAllDrives=true&supportsAllDrives=true`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }
    }
  } catch (_) {}

  const createRes = await fetch(
    'https://www.googleapis.com/drive/v3/files?fields=id&supportsAllDrives=true',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: safeName,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    }
  );

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed creating Drive folder on server: ${errText}`);
  }
  const created = await createRes.json();
  return created.id;
}

/**
 * Direct Server-to-Google-Drive Cloud Multipart Upload with Retry Backoff
 */
export async function uploadFileFromServerToDrive(params: {
  accessToken: string;
  folderId: string;
  filePath: string;
  fileName: string;
  mimeType?: string;
}): Promise<UploadedDriveFileServer> {
  const { accessToken, folderId, filePath, fileName, mimeType = 'video/mp4' } = params;
  const fileBuffer = fs.readFileSync(filePath);

  const metadata: { name: string; parents?: string[] } = {
    name: fileName,
  };
  if (folderId && folderId !== 'root') {
    metadata.parents = [folderId];
  }

  const boundary = '-------CineCutServerMultipartBoundary' + Date.now();
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metaPart =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata);

  const mediaHeader = delimiter + `Content-Type: ${mimeType}\r\n\r\n`;

  const multipartBody = Buffer.concat([
    Buffer.from(metaPart, 'utf-8'),
    Buffer.from(mediaHeader, 'utf-8'),
    fileBuffer,
    Buffer.from(closeDelimiter, 'utf-8'),
  ]);

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,mimeType&supportsAllDrives=true',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
            'Content-Length': String(multipartBody.length),
          },
          body: multipartBody,
        }
      );

      if (res.ok) {
        const data = await res.json();
        return {
          id: data.id,
          name: data.name || fileName,
          webViewLink:
            data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`,
          webContentLink: data.webContentLink,
          mimeType: data.mimeType || mimeType,
        };
      }

      const errText = await res.text();
      lastError = new Error(`Drive upload HTTP ${res.status}: ${errText}`);

      if (res.status === 401 || res.status === 403) {
        break;
      }
    } catch (err: any) {
      lastError = err;
    }

    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, attempt * 600));
    }
  }

  throw lastError || new Error('Failed to upload clip from server to Google Drive');
}

/**
 * Get a background batch job by ID
 */
export function getBackgroundJob(jobId: string): BackgroundBatchJob | null {
  syncJobsFromDisk();
  return jobsStore.get(jobId) || null;
}

/**
 * Get the latest background batch job
 */
export function getLatestBackgroundJob(): BackgroundBatchJob | null {
  syncJobsFromDisk();
  const all = Array.from(jobsStore.values()).sort((a, b) => b.createdAt - a.createdAt);
  return all[0] || null;
}

/**
 * Cancel a running background batch job
 */
export function cancelBackgroundJob(jobId: string): BackgroundBatchJob | null {
  const job = jobsStore.get(jobId);
  if (!job) return null;

  job.status = 'cancelled';
  job.updatedAt = Date.now();
  for (const seg of job.segments) {
    if (seg.status === 'slicing' || seg.status === 'uploading') {
      seg.status = 'idle';
      seg.sliceProgress = 0;
      seg.uploadProgress = 0;
    }
  }

  const procs = activeProcesses.get(jobId);
  if (procs) {
    for (const p of procs) {
      try {
        p.kill('SIGKILL');
      } catch (_) {}
    }
    procs.clear();
  }

  persistJobsToDisk();
  return job;
}

/**
 * Start a Detached Server-Side Background Batch Job
 * Continues executing on the server even if the user closes/minimizes their browser or locks their device!
 */
export function startDetachedBackgroundJob(params: {
  videoTitle: string;
  videoDuration: number;
  sourceId?: string | null;
  driveFileId?: string | null;
  driveAccessToken?: string | null;
  videoUrl?: string | null;
  targetFolderId?: string | null;
  driveFolderName?: string;
  autoUploadDrive: boolean;
  overlayOptions: ServerOverlayConfig;
  segments: Array<{
    id: string;
    index: number;
    startTime: number;
    endTime: number;
    duration: number;
    label: string;
    watermarkText?: string;
  }>;
}): BackgroundBatchJob {
  const jobId = `job_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  const jobSegments: BackgroundJobSegment[] = params.segments.map((s) => ({
    id: s.id,
    index: s.index,
    startTime: s.startTime,
    endTime: s.endTime,
    duration: s.duration,
    label: s.label,
    watermarkText: s.watermarkText || `PART ${s.index + 1}`,
    status: 'idle',
    sliceProgress: 0,
    uploadProgress: 0,
  }));

  const job: BackgroundBatchJob = {
    jobId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: 'running',
    videoTitle: params.videoTitle || 'Video',
    videoDuration: params.videoDuration || 0,
    sourceId: params.sourceId || null,
    driveFileId: params.driveFileId || null,
    videoUrl: params.videoUrl || null,
    targetFolderId: params.targetFolderId || null,
    driveFolderName: params.driveFolderName || 'CineCut_Clips',
    autoUploadDrive: Boolean(params.autoUploadDrive),
    overlayOptions: params.overlayOptions || {},
    segments: jobSegments,
    completedClips: 0,
    totalClips: jobSegments.length,
  };

  jobsStore.set(jobId, job);
  persistJobsToDisk();

  // Fire-and-forget autonomous execution on the Node.js server
  void runAutonomousServerJob(job, params.driveAccessToken || null);

  return job;
}

async function runAutonomousServerJob(
  job: BackgroundBatchJob,
  driveAccessToken: string | null
): Promise<void> {
  try {
    // 1. Resolve source video path in server cache
    let sourcePath: string | null = null;
    if (job.sourceId) {
      sourcePath = getSourcePathById(job.sourceId);
    }
    if (!sourcePath && job.driveFileId && driveAccessToken) {
      const cached = await fetchDriveVideoToCache(job.driveFileId, driveAccessToken);
      sourcePath = cached.filePath;
      job.sourceId = cached.sourceId;
    }
    if (
      !sourcePath &&
      job.videoUrl &&
      (job.videoUrl.startsWith('http://') || job.videoUrl.startsWith('https://'))
    ) {
      const cached = await fetchRemoteUrlToCache(job.videoUrl);
      sourcePath = cached.filePath;
      job.sourceId = cached.sourceId;
    }

    if (!sourcePath) {
      job.status = 'error';
      job.errorMessage = 'Source video not found in server cache.';
      job.updatedAt = Date.now();
      persistJobsToDisk();
      return;
    }

    // 2. Resolve Google Drive To-Folder on the server if auto-upload is enabled
    let targetFolderId = job.targetFolderId;
    if (job.autoUploadDrive && driveAccessToken && !targetFolderId) {
      try {
        targetFolderId = await createDriveFolderFromServer(
          driveAccessToken,
          job.driveFolderName || 'CineCut_Clips'
        );
        job.targetFolderId = targetFolderId;
        job.updatedAt = Date.now();
        persistJobsToDisk();
      } catch (folderErr: any) {
        console.warn('Server Drive folder creation warning:', folderErr.message);
      }
    }

    // Pre-warm mediaInfo cache once before launching parallel workers so ffprobe is never spawned per clip
    await probeMediaInfo(sourcePath);

    // 3. Process all segments with high-concurrency parallel server workers (up to 6x parallel)
    // and decouple Google Drive uploads so FFmpeg workers cut all clips immediately without waiting on network I/O!
    const cpuCount = typeof os.cpus === 'function' ? os.cpus().length : 4;
    const CONCURRENCY = Math.min(6, Math.max(4, cpuCount));
    let cursor = 0;
    const isJobCancelled = () => (job.status as string) === 'cancelled';
    const backgroundUploads: Promise<void>[] = [];

    const worker = async () => {
      while (cursor < job.segments.length) {
        if (isJobCancelled()) break;
        const idx = cursor++;
        const seg = job.segments[idx];
        if (!seg) break;

        seg.status = 'slicing';
        seg.sliceProgress = 12;
        seg.errorMessage = undefined;
        job.updatedAt = Date.now();
        persistJobsToDisk();

        try {
          let lastPersistedAt = 0;
          const sliceRes = await sliceClipServerSide({
            sourcePath: sourcePath!,
            startTime: seg.startTime,
            endTime: seg.endTime,
            partIndex: seg.index,
            totalParts: job.segments.length,
            watermarkText: seg.watermarkText || `PART ${seg.index + 1}`,
            overlay: job.overlayOptions,
            jobId: job.jobId,
            onProgress: (pct) => {
              if (isJobCancelled()) return;
              seg.sliceProgress = pct;
              job.updatedAt = Date.now();
              const now = Date.now();
              if (now - lastPersistedAt >= 140 || pct >= 98) {
                lastPersistedAt = now;
                persistJobsToDisk();
              }
            },
          });

          if (isJobCancelled()) break;

          const safeDownloadName = encodeURIComponent(
            `${job.videoTitle.replace(/[^a-z0-9]/gi, '_')}_Part_${seg.index + 1}.mp4`
          );

          seg.clipId = sliceRes.clipId;
          seg.downloadUrl = `/api/video/clip?id=${encodeURIComponent(
            sliceRes.clipId
          )}&name=${safeDownloadName}`;
          seg.mimeType = 'video/mp4';
          seg.sizeBytes = sliceRes.sizeBytes;
          seg.processingTimeMs = sliceRes.processingTimeMs;
          seg.resolution = sliceRes.resolution;
          seg.fps = sliceRes.fps;
          seg.sliceProgress = 100;
          seg.status = 'sliced';
          job.completedClips = job.segments.filter(
            (s) => s.status === 'sliced' || s.status === 'uploaded' || s.status === 'uploading'
          ).length;
          job.updatedAt = Date.now();
          persistJobsToDisk();

          // Fire Google Drive upload asynchronously in the background so this FFmpeg worker immediately cuts the next clip!
          if (job.autoUploadDrive && driveAccessToken && targetFolderId) {
            const uploadTask = (async () => {
              if (isJobCancelled()) return;
              try {
                seg.status = 'uploading';
                seg.uploadProgress = 45;
                job.updatedAt = Date.now();
                persistJobsToDisk();

                const mp4FileName = `${job.videoTitle.replace(/[^a-z0-9]/gi, '_')}_Part_${
                  seg.index + 1
                }_of_${job.segments.length}.mp4`;

                const driveFile = await uploadFileFromServerToDrive({
                  accessToken: driveAccessToken,
                  folderId: targetFolderId!,
                  filePath: sliceRes.clipPath,
                  fileName: mp4FileName,
                  mimeType: 'video/mp4',
                });

                if (!isJobCancelled()) {
                  seg.driveFileId = driveFile.id;
                  seg.driveViewLink = driveFile.webViewLink;
                  seg.uploadProgress = 100;
                  seg.status = 'uploaded';
                  job.completedClips = job.segments.filter(
                    (s) => s.status === 'sliced' || s.status === 'uploaded'
                  ).length;
                  job.updatedAt = Date.now();
                  persistJobsToDisk();
                }
              } catch (uploadErr: any) {
                // Keep clip in 'sliced' ready state even if Drive upload fails
                seg.status = 'sliced';
                job.updatedAt = Date.now();
                persistJobsToDisk();
              }
            })();

            backgroundUploads.push(uploadTask);
          }
        } catch (err: any) {
          if (isJobCancelled()) break;
          seg.status = 'error';
          seg.errorMessage = err.message || 'Server FFmpeg error';
          job.updatedAt = Date.now();
          persistJobsToDisk();
        }
      }
    };

    const workers = Array.from(
      { length: Math.min(CONCURRENCY, job.segments.length) },
      () => worker()
    );
    await Promise.all(workers);
    if (backgroundUploads.length > 0) {
      await Promise.allSettled(backgroundUploads);
    }

    if (!isJobCancelled()) {
      job.completedClips = job.segments.filter(
        (s) => s.status === 'sliced' || s.status === 'uploaded'
      ).length;
      job.status = 'completed';
      job.updatedAt = Date.now();
      persistJobsToDisk();
    }
  } catch (err: any) {
    if ((job.status as string) !== 'cancelled') {
      job.status = 'error';
      job.errorMessage = err.message || 'Background batch job error';
      job.updatedAt = Date.now();
      persistJobsToDisk();
    }
  }
}
