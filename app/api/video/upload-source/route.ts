import { NextRequest, NextResponse } from 'next/server';
import {
  saveUploadedFileToCache,
  fetchDriveVideoToCache,
  fetchRemoteUrlToCache,
  probeMediaInfo,
} from '@/lib/server-video-engine';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // Case 1: Multipart FormData (Local video file upload from browser)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const cacheKey = (formData.get('cacheKey') as string) || undefined;

      if (!file) {
        return NextResponse.json(
          { success: false, error: 'Missing video file in form data' },
          { status: 400 }
        );
      }

      const cached = await saveUploadedFileToCache(
        file,
        cacheKey || `${file.name}_${file.size}`
      );
      const mediaInfo = await probeMediaInfo(cached.filePath);

      return NextResponse.json({
        success: true,
        sourceId: cached.sourceId,
        sizeBytes: cached.sizeBytes,
        mediaInfo,
      });
    }

    // Case 2: JSON payload (Google Drive file ID or remote HTTP video URL)
    const body = await req.json();
    const { driveFileId, accessToken, videoUrl } = body;

    if (driveFileId && accessToken) {
      const cached = await fetchDriveVideoToCache(driveFileId, accessToken);
      const mediaInfo = await probeMediaInfo(cached.filePath);
      return NextResponse.json({
        success: true,
        sourceId: cached.sourceId,
        sizeBytes: cached.sizeBytes,
        mediaInfo,
      });
    }

    if (videoUrl && (videoUrl.startsWith('http://') || videoUrl.startsWith('https://'))) {
      const cached = await fetchRemoteUrlToCache(videoUrl);
      const mediaInfo = await probeMediaInfo(cached.filePath);
      return NextResponse.json({
        success: true,
        sourceId: cached.sourceId,
        sizeBytes: cached.sizeBytes,
        mediaInfo,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Provide either a multipart file, { driveFileId, accessToken }, or { videoUrl }',
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error in /api/video/upload-source:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to cache source video on server',
      },
      { status: 500 }
    );
  }
}
