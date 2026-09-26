import { NextRequest, NextResponse } from 'next/server';
import {
  getSourcePathById,
  fetchDriveVideoToCache,
  fetchRemoteUrlToCache,
  sliceClipServerSide,
  uploadFileFromServerToDrive,
  ServerOverlayConfig,
} from '@/lib/server-video-engine';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      sourceId,
      driveFileId,
      driveAccessToken,
      videoUrl,
      startTime = 0,
      endTime = 10,
      partIndex = 0,
      totalParts = 1,
      watermarkText,
      clipTitle = 'Clip',
      overlayOptions,
      forceStreamCopy = false,
      driveUpload, // Optional: { accessToken: string, folderId: string, fileName: string }
    } = body;

    // 1. Resolve cached source video path on server
    let sourcePath: string | null = null;
    let resolvedSourceId = sourceId;

    if (sourceId) {
      sourcePath = getSourcePathById(sourceId);
    }

    if (!sourcePath && driveFileId && (driveAccessToken || driveUpload?.accessToken)) {
      const tokenToUse = driveAccessToken || driveUpload?.accessToken;
      const cached = await fetchDriveVideoToCache(driveFileId, tokenToUse);
      sourcePath = cached.filePath;
      resolvedSourceId = cached.sourceId;
    }

    if (
      !sourcePath &&
      videoUrl &&
      (videoUrl.startsWith('http://') || videoUrl.startsWith('https://'))
    ) {
      const cached = await fetchRemoteUrlToCache(videoUrl);
      sourcePath = cached.filePath;
      resolvedSourceId = cached.sourceId;
    }

    if (!sourcePath) {
      return NextResponse.json(
        {
          success: false,
          error: 'Source video not found in server cache. Upload or register source first.',
        },
        { status: 404 }
      );
    }

    // 2. Run High-Speed Server-Side FFmpeg Slicer
    const sliceResult = await sliceClipServerSide({
      sourcePath,
      startTime: Number(startTime) || 0,
      endTime: Number(endTime) || 10,
      partIndex: Number(partIndex) || 0,
      totalParts: Number(totalParts) || 1,
      watermarkText: watermarkText || `PART ${(Number(partIndex) || 0) + 1}`,
      overlay: overlayOptions as ServerOverlayConfig | undefined,
      forceStreamCopy: Boolean(forceStreamCopy),
    });

    // 3. Optional Direct Server-to-Google-Drive Upload (To Folder)
    let driveFile = null;
    if (driveUpload && driveUpload.accessToken && driveUpload.folderId) {
      const cleanName = (
        driveUpload.fileName ||
        `${clipTitle.replace(/[^a-z0-9]/gi, '_')}_Part_${partIndex + 1}.mp4`
      ).replace(/\.webm$/i, '.mp4');

      driveFile = await uploadFileFromServerToDrive({
        accessToken: driveUpload.accessToken,
        folderId: driveUpload.folderId,
        filePath: sliceResult.clipPath,
        fileName: cleanName,
        mimeType: 'video/mp4',
      });
    }

    const safeDownloadName = encodeURIComponent(
      `${clipTitle.replace(/[^a-z0-9]/gi, '_')}_Part_${partIndex + 1}.mp4`
    );

    return NextResponse.json({
      success: true,
      sourceId: resolvedSourceId,
      clipId: sliceResult.clipId,
      downloadUrl: `/api/video/clip?id=${encodeURIComponent(sliceResult.clipId)}&name=${safeDownloadName}`,
      mimeType: 'video/mp4',
      sizeBytes: sliceResult.sizeBytes,
      processingTimeMs: sliceResult.processingTimeMs,
      engineMode: sliceResult.engineMode,
      resolution: sliceResult.resolution,
      fps: sliceResult.fps,
      driveFile,
    });
  } catch (error: any) {
    console.error('Error in /api/video/process-clip:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Server FFmpeg slicing failed',
      },
      { status: 500 }
    );
  }
}
