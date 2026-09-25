export type CanvaTemplateType =
  | 'youtube-thumbnail'
  | 'tiktok-video'
  | 'instagram-reel'
  | 'instagram-post'
  | 'video-intro'
  | 'blank';

export interface CanvaTemplatePreset {
  id: CanvaTemplateType;
  title: string;
  category: string;
  dimensions: string;
  aspectRatio: string;
  canvaUrl: string;
  description: string;
  badge: string;
}

export const CANVA_PRESETS: CanvaTemplatePreset[] = [
  {
    id: 'tiktok-video',
    title: 'TikTok & Shorts Video Cover',
    category: 'Vertical 9:16',
    dimensions: '1080 × 1920 px',
    aspectRatio: '9:16',
    canvaUrl: 'https://www.canva.com/create/tiktok-videos/',
    description: 'Perfect for TikTok, YouTube Shorts, and Instagram Reels cover design.',
    badge: 'Trending',
  },
  {
    id: 'youtube-thumbnail',
    title: 'YouTube Video Thumbnail',
    category: 'Widescreen 16:9',
    dimensions: '1280 × 720 px',
    aspectRatio: '16:9',
    canvaUrl: 'https://www.canva.com/create/youtube-thumbnails/',
    description: 'High-CTR YouTube thumbnail templates with viral text hooks.',
    badge: 'Popular',
  },
  {
    id: 'instagram-reel',
    title: 'Instagram Reels Cover',
    category: 'Vertical 9:16',
    dimensions: '1080 × 1920 px',
    aspectRatio: '9:16',
    canvaUrl: 'https://www.canva.com/create/instagram-reels/',
    description: 'Aesthetic cover frames and story templates for Instagram Reels.',
    badge: 'Reels',
  },
  {
    id: 'instagram-post',
    title: 'Square Social Post / Carousel',
    category: 'Square 1:1',
    dimensions: '1080 × 1080 px',
    aspectRatio: '1:1',
    canvaUrl: 'https://www.canva.com/create/instagram-posts/',
    description: 'Square preview cards and announcement covers.',
    badge: 'Feed',
  },
  {
    id: 'video-intro',
    title: 'Clip Intro & Title Card',
    category: 'Video 16:9',
    dimensions: '1920 × 1080 px',
    aspectRatio: '16:9',
    canvaUrl: 'https://www.canva.com/create/video-intros/',
    description: 'Animated intro screens, lower thirds, and creator channel openers.',
    badge: 'Motion',
  },
];

/**
 * Capture frame from video element or source URL at a specific timestamp
 */
export async function captureVideoFrame(
  videoSource: HTMLVideoElement | string,
  timestamp: number
): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    let video: HTMLVideoElement;
    let shouldCleanup = false;

    if (typeof videoSource === 'string') {
      video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.src = videoSource;
      video.muted = true;
      video.playsInline = true;
      shouldCleanup = true;
    } else {
      video = videoSource;
    }

    const onSeeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to create canvas context'));
          return;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');

        canvas.toBlob((blob) => {
          if (blob) {
            resolve({ blob, dataUrl });
          } else {
            reject(new Error('Failed converting canvas to Blob'));
          }
          if (shouldCleanup) {
            video.removeEventListener('seeked', onSeeked);
            video.src = '';
          }
        }, 'image/png');
      } catch (err) {
        reject(err);
      }
    };

    video.addEventListener('seeked', onSeeked, { once: true });

    if (video.readyState >= 2) {
      video.currentTime = Math.max(0, timestamp);
    } else {
      video.addEventListener(
        'loadedmetadata',
        () => {
          video.currentTime = Math.max(0, timestamp);
        },
        { once: true }
      );
    }
  });
}

/**
 * Copy an image Blob directly into the user's system clipboard (Ctrl+V into Canva)
 */
export async function copyImageBlobToClipboard(blob: Blob): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.write) {
      return false;
    }
    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': blob,
      }),
    ]);
    return true;
  } catch (err) {
    console.warn('Clipboard write error:', err);
    return false;
  }
}
