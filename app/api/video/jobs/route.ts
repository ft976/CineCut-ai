import { NextRequest, NextResponse } from 'next/server';
import {
  startDetachedBackgroundJob,
  getBackgroundJob,
  getLatestBackgroundJob,
  cancelBackgroundJob,
  ServerOverlayConfig,
} from '@/lib/server-video-engine';

export const runtime = 'nodejs';

/**
 * GET /api/video/jobs?jobId=... or /api/video/jobs?latest=1
 * Polls or restores background batch job state (even if user closed and reopened the app)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');
    const latest = searchParams.get('latest');

    if (jobId) {
      const job = getBackgroundJob(jobId);
      if (!job) {
        return NextResponse.json(
          { success: false, error: 'Background job not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, job });
    }

    if (latest) {
      const job = getLatestBackgroundJob();
      return NextResponse.json({ success: true, job: job || null });
    }

    return NextResponse.json(
      { success: false, error: 'Specify jobId or latest=1' },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to query background job' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/video/jobs
 * Launches a detached server-side background job that continues slicing & uploading to Google Drive
 * even if the user closes/minimizes the app or turns off their screen.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      videoTitle = 'Video',
      videoDuration = 0,
      sourceId,
      driveFileId,
      driveAccessToken,
      videoUrl,
      targetFolderId,
      driveFolderName = 'CineCut_Clips',
      autoUploadDrive = true,
      overlayOptions = {},
      segments = [],
    } = body;

    if (!Array.isArray(segments) || segments.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No segments provided for background job' },
        { status: 400 }
      );
    }

    const job = startDetachedBackgroundJob({
      videoTitle,
      videoDuration: Number(videoDuration) || 0,
      sourceId: sourceId || null,
      driveFileId: driveFileId || null,
      driveAccessToken: driveAccessToken || null,
      videoUrl: videoUrl || null,
      targetFolderId: targetFolderId || null,
      driveFolderName,
      autoUploadDrive: Boolean(autoUploadDrive),
      overlayOptions: overlayOptions as ServerOverlayConfig,
      segments,
    });

    return NextResponse.json({
      success: true,
      job,
    });
  } catch (error: any) {
    console.error('Error starting detached background job:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to start background batch job',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/video/jobs?jobId=...
 * Cancels a running background job and terminates active FFmpeg child processes
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');
    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'Missing jobId parameter' },
        { status: 400 }
      );
    }

    const job = cancelBackgroundJob(jobId);
    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, job });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to cancel background job' },
      { status: 500 }
    );
  }
}
