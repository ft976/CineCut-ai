import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { videoUrl, startTime, endTime, clipTitle } = await req.json();

    if (!videoUrl) {
      return NextResponse.json({ success: false, error: 'Missing videoUrl' }, { status: 400 });
    }

    // High-speed Range Request verification
    const headRes = await fetch(videoUrl, { method: 'HEAD' });
    const contentLength = headRes.headers.get('content-length');
    const acceptRanges = headRes.headers.get('accept-ranges');

    return NextResponse.json({
      success: true,
      message: 'Server video stream slicing initialized',
      metadata: {
        startTime,
        endTime,
        durationSeconds: (endTime || 0) - (startTime || 0),
        clipTitle: clipTitle || 'Clip',
        contentLength: contentLength ? parseInt(contentLength) : null,
        supportsByteRanges: acceptRanges === 'bytes',
      },
    });
  } catch (error: any) {
    console.error('Error in process-clip API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to initialize server slice' },
      { status: 500 }
    );
  }
}
