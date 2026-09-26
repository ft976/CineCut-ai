import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { getClipPathById } from '@/lib/server-video-engine';

export const runtime = 'nodejs';

export async function HEAD(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clipId = searchParams.get('id');
  if (!clipId) {
    return new NextResponse(null, { status: 400 });
  }
  const clipPath = getClipPathById(clipId);
  if (!clipPath || !fs.existsSync(clipPath)) {
    return new NextResponse(null, { status: 404 });
  }
  const stat = fs.statSync(clipPath);
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Content-Length': String(stat.size),
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clipId = searchParams.get('id');
    const fileName = searchParams.get('name') || `clip_${clipId || 'video'}.mp4`;
    const isDownload = searchParams.get('download') === '1';

    if (!clipId) {
      return NextResponse.json({ error: 'Missing clip id' }, { status: 400 });
    }

    const clipPath = getClipPathById(clipId);
    if (!clipPath || !fs.existsSync(clipPath)) {
      return NextResponse.json({ error: 'Clip not found or expired' }, { status: 404 });
    }

    const stat = fs.statSync(clipPath);
    const fileSize = stat.size;
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const dispositionType = isDownload ? 'attachment' : 'inline';
    const range = req.headers.get('range');

    if (range && !isDownload && fileSize > 0) {
      const parts = range.replace(/bytes=/, '').split('-');
      const rawStart = parseInt(parts[0], 10);
      const start = isNaN(rawStart) ? 0 : Math.max(0, Math.min(rawStart, fileSize - 1));
      const rawEnd = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const end = isNaN(rawEnd) ? fileSize - 1 : Math.max(start, Math.min(rawEnd, fileSize - 1));
      const chunkSize = end - start + 1;

      const buffer = Buffer.alloc(chunkSize);
      const fd = fs.openSync(clipPath, 'r');
      try {
        fs.readSync(fd, buffer, 0, chunkSize, start);
      } finally {
        fs.closeSync(fd);
      }

      return new NextResponse(buffer, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunkSize),
          'Content-Type': 'video/mp4',
          'Content-Disposition': `${dispositionType}; filename="${safeFileName}"`,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    const fileBuffer = fs.readFileSync(clipPath);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Length': String(fileSize),
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Content-Disposition': `${dispositionType}; filename="${safeFileName}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('Error streaming clip from /api/video/clip:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to stream clip' },
      { status: 500 }
    );
  }
}
