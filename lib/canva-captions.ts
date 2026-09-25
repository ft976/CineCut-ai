'use client';

export interface CaptionWord {
  word: string;
  start: number;
  end: number;
}

export interface CaptionItem {
  id: string;
  startTime: number; // in seconds
  endTime: number;   // in seconds
  text: string;
  words?: CaptionWord[];
}

export type CanvaCaptionStyleId =
  | 'canva-hormozi'       // Bold yellow text, thick black border, punchy impact
  | 'canva-neon'          // Electric cyan & magenta neon drop glow
  | 'canva-minimal-pill'  // Modern sleek sans white in translucent dark rounded capsule
  | 'canva-karaoke'       // White text with live lime green / yellow word fill
  | 'canva-retro-comic'   // Comic bold with warm gradient & heavy outline
  | 'canva-cinematic'     // Elegant letterspaced subtitle at bottom third
  | 'canva-headline-box'; // Inverted bold background tag

export interface CanvaCaptionConfig {
  enabled: boolean;
  styleId: CanvaCaptionStyleId;
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  position: 'top' | 'middle' | 'bottom';
  highlightColor: string; // e.g. '#FFDE59' (Canva yellow), '#00F0FF', '#00F59B'
  textColor: string;      // e.g. '#FFFFFF'
  bgColor?: string;       // capsule background
  burnIntoVideo: boolean; // whether to draw onto frames during slicing
  displayMode: 'line' | 'word' | 'chunk'; // full line, single word, or 3-word chunk
}

export interface CanvaStylePreset {
  id: CanvaCaptionStyleId;
  name: string;
  tagline: string;
  category: string;
  previewBg: string;
  previewTextColor: string;
  previewBorderColor?: string;
  previewGlowColor?: string;
  defaultHighlight: string;
}

export const CANVA_CAPTION_PRESETS: CanvaStylePreset[] = [
  {
    id: 'canva-hormozi',
    name: 'Canva Hormozi Impact',
    tagline: 'High-contrast bold yellow with thick black outline. #1 choice for TikTok & Reels.',
    category: 'Viral / High Retention',
    previewBg: '#0f172a',
    previewTextColor: '#FFDE59',
    previewBorderColor: '#000000',
    defaultHighlight: '#FFDE59',
  },
  {
    id: 'canva-karaoke',
    name: 'Canva Live Karaoke',
    tagline: 'Words light up dynamically as spoken in vibrant neon lime green.',
    category: 'Dynamic Animation',
    previewBg: 'rgba(15, 23, 42, 0.85)',
    previewTextColor: '#FFFFFF',
    previewGlowColor: '#00F59B',
    defaultHighlight: '#00F59B',
  },
  {
    id: 'canva-neon',
    name: 'Canva Cyber Neon Glow',
    tagline: 'Electric cyan text with magenta neon glow shadows for modern gaming & tech videos.',
    category: 'Glow / Futuristic',
    previewBg: '#080811',
    previewTextColor: '#00F0FF',
    previewGlowColor: '#FF007A',
    defaultHighlight: '#00F0FF',
  },
  {
    id: 'canva-minimal-pill',
    name: 'Canva Minimal Capsule',
    tagline: 'Ultra-clean modern sans typography inside a frosted translucent dark pill.',
    category: 'Clean / Modern',
    previewBg: 'rgba(2, 6, 23, 0.75)',
    previewTextColor: '#FFFFFF',
    defaultHighlight: '#38BDF8',
  },
  {
    id: 'canva-retro-comic',
    name: 'Canva Retro Comic Pop',
    tagline: 'Chunky bubbly pop font with playful thick borders and golden warmth.',
    category: 'Playful / Creator',
    previewBg: '#1e1b4b',
    previewTextColor: '#FDBA74',
    previewBorderColor: '#000000',
    defaultHighlight: '#F59E0B',
  },
  {
    id: 'canva-cinematic',
    name: 'Canva Cinematic Subtitle',
    tagline: 'Sophisticated letter-spaced subtitles with subtle drop shadow for movies & docuseries.',
    category: 'Cinema / Film',
    previewBg: 'transparent',
    previewTextColor: '#F8FAFC',
    defaultHighlight: '#E2E8F0',
  },
  {
    id: 'canva-headline-box',
    name: 'Canva Bold Headline Tag',
    tagline: 'Sharp rectangular contrast container with high-retention newsroom styling.',
    category: 'Editorial / News',
    previewBg: '#000000',
    previewTextColor: '#FFFFFF',
    previewBorderColor: '#EF4444',
    defaultHighlight: '#EF4444',
  },
];

export const DEFAULT_CANVA_CONFIG: CanvaCaptionConfig = {
  enabled: true,
  styleId: 'canva-hormozi',
  fontSize: 'medium',
  position: 'middle',
  highlightColor: '#FFDE59',
  textColor: '#FFFFFF',
  bgColor: 'rgba(0, 0, 0, 0.75)',
  burnIntoVideo: true,
  displayMode: 'chunk',
};

/**
 * Render Canva-Styled Captions directly onto a 2D Canvas frame
 */
export function drawCanvaCaptionToCanvas(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  currentTime: number,
  config: CanvaCaptionConfig,
  captions: CaptionItem[]
) {
  if (!config.enabled || !captions || captions.length === 0) return;

  // Find active caption segment for the current timestamp
  const activeCaption = captions.find(
    (c) => currentTime >= c.startTime && currentTime <= c.endTime
  );

  if (!activeCaption || !activeCaption.text.trim()) return;

  ctx.save();

  // Determine base font size according to canvas dimensions & config
  let sizeMultiplier = 0.045; // medium default relative to canvas height
  if (config.fontSize === 'small') sizeMultiplier = 0.032;
  else if (config.fontSize === 'large') sizeMultiplier = 0.058;
  else if (config.fontSize === 'xlarge') sizeMultiplier = 0.075;

  const fontSize = Math.max(18, Math.round(canvasHeight * sizeMultiplier));

  // Determine Y position
  let yPos = canvasHeight * 0.78; // bottom default
  if (config.position === 'top') {
    yPos = canvasHeight * 0.18;
  } else if (config.position === 'middle') {
    yPos = canvasHeight * 0.5;
  }

  const textToRender = activeCaption.text.trim();

  // 1. Canva Hormozi / Beast Style
  if (config.styleId === 'canva-hormozi') {
    const uppercaseText = textToRender.toUpperCase();
    ctx.font = `900 ${fontSize}px "Impact", "Arial Black", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Black heavy stroke outline
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.lineWidth = Math.max(4, Math.round(fontSize * 0.16));
    ctx.strokeStyle = '#000000';
    ctx.strokeText(uppercaseText, canvasWidth / 2, yPos);

    // Vibrant Yellow text fill
    ctx.fillStyle = config.highlightColor || '#FFDE59';
    ctx.fillText(uppercaseText, canvasWidth / 2, yPos);
  }

  // 2. Canva Live Karaoke Style (Highlights current active word)
  else if (config.styleId === 'canva-karaoke') {
    ctx.font = `800 ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const words = activeCaption.words || activeCaption.text.split(' ').map((w, idx, arr) => {
      const dur = activeCaption.endTime - activeCaption.startTime;
      const step = dur / arr.length;
      return {
        word: w,
        start: activeCaption.startTime + idx * step,
        end: activeCaption.startTime + (idx + 1) * step,
      };
    });

    // Measure total line width
    let totalWidth = 0;
    const wordWidths = words.map((w) => {
      const wWidth = ctx.measureText(w.word + ' ').width;
      totalWidth += wWidth;
      return wWidth;
    });

    let currentX = (canvasWidth - totalWidth) / 2;

    // Draw frosted capsule background
    const padX = fontSize * 0.7;
    const padY = fontSize * 0.4;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    roundRect(
      ctx,
      currentX - padX,
      yPos - fontSize * 0.65 - padY,
      totalWidth + padX * 2,
      fontSize * 1.3 + padY * 2,
      fontSize * 0.4
    );
    ctx.fill();

    // Draw each word
    words.forEach((wObj, i) => {
      const isWordActive = currentTime >= wObj.start && currentTime <= wObj.end;
      const hasSpoken = currentTime > wObj.end;

      ctx.save();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      // Outline
      ctx.lineWidth = Math.max(2, Math.round(fontSize * 0.08));
      ctx.strokeStyle = '#000000';
      ctx.strokeText(wObj.word, currentX, yPos);

      if (isWordActive) {
        ctx.fillStyle = config.highlightColor || '#00F59B';
        ctx.shadowColor = config.highlightColor || '#00F59B';
        ctx.shadowBlur = 12;
      } else if (hasSpoken) {
        ctx.fillStyle = '#FFFFFF';
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      }

      ctx.fillText(wObj.word, currentX, yPos);
      ctx.restore();

      currentX += wordWidths[i];
    });
  }

  // 3. Canva Cyber Neon Glow
  else if (config.styleId === 'canva-neon') {
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Outer Neon Glow
    ctx.shadowColor = '#FF007A';
    ctx.shadowBlur = Math.round(fontSize * 0.4);
    ctx.lineWidth = Math.max(3, Math.round(fontSize * 0.1));
    ctx.strokeStyle = '#FF007A';
    ctx.strokeText(textToRender, canvasWidth / 2, yPos);

    // Inner Cyan pop
    ctx.shadowColor = config.highlightColor || '#00F0FF';
    ctx.shadowBlur = Math.round(fontSize * 0.2);
    ctx.fillStyle = config.highlightColor || '#00F0FF';
    ctx.fillText(textToRender, canvasWidth / 2, yPos);
  }

  // 4. Canva Minimal Capsule
  else if (config.styleId === 'canva-minimal-pill') {
    ctx.font = `600 ${fontSize}px "Inter", -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const metrics = ctx.measureText(textToRender);
    const boxW = metrics.width + fontSize * 1.2;
    const boxH = fontSize * 1.5;
    const boxX = (canvasWidth - boxW) / 2;
    const boxY = yPos - boxH / 2;

    // Draw modern translucent dark pill
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    roundRect(ctx, boxX, boxY, boxW, boxH, boxH / 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(textToRender, canvasWidth / 2, yPos);
  }

  // 5. Canva Retro Comic Pop
  else if (config.styleId === 'canva-retro-comic') {
    ctx.font = `900 ${fontSize}px "Impact", cursive, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Thick drop shadow
    ctx.lineWidth = Math.max(4, Math.round(fontSize * 0.18));
    ctx.strokeStyle = '#000000';
    ctx.strokeText(textToRender, canvasWidth / 2 + 2, yPos + 3);

    // Comic border
    ctx.strokeText(textToRender, canvasWidth / 2, yPos);

    ctx.fillStyle = config.highlightColor || '#FDBA74';
    ctx.fillText(textToRender, canvasWidth / 2, yPos);
  }

  // 6. Canva Cinematic Subtitle
  else if (config.styleId === 'canva-cinematic') {
    ctx.font = `500 ${fontSize}px Georgia, "Times New Roman", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(textToRender, canvasWidth / 2, yPos);
  }

  // 7. Canva Bold Headline Tag
  else {
    ctx.font = `800 ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const metrics = ctx.measureText(textToRender);
    const boxW = metrics.width + fontSize * 1.4;
    const boxH = fontSize * 1.6;
    const boxX = (canvasWidth - boxW) / 2;
    const boxY = yPos - boxH / 2;

    // Solid dark box with accent border
    ctx.fillStyle = '#090D16';
    roundRect(ctx, boxX, boxY, boxW, boxH, 8);
    ctx.fill();

    ctx.strokeStyle = config.highlightColor || '#EF4444';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(textToRender, canvasWidth / 2, yPos);
  }

  ctx.restore();
}

/**
 * Helper to draw rounded rectangle in Canvas
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Convert Caption Items to SubRip (.SRT) format for export & Canva import
 */
export function exportCaptionsToSRT(captions: CaptionItem[]): string {
  if (!captions || captions.length === 0) return '';

  return captions
    .map((cap, idx) => {
      const startSrt = formatSecondsToSrtTime(cap.startTime);
      const endSrt = formatSecondsToSrtTime(cap.endTime);
      return `${idx + 1}\n${startSrt} --> ${endSrt}\n${cap.text.trim()}\n`;
    })
    .join('\n');
}

/**
 * Format seconds into SRT timestamp 00:00:00,000
 */
function formatSecondsToSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

/**
 * Open Canva Video Editor for direct styling and cloud enhancements
 */
export function openInCanvaVideoEditor(aspectRatio: '9:16' | '16:9' | '1:1') {
  let canvaUrl = 'https://www.canva.com/create/videos/';
  if (aspectRatio === '9:16') {
    // Direct Canva link for TikTok / Reel / Mobile Video
    canvaUrl = 'https://www.canva.com/design?create=true&type=mobile_video';
  } else if (aspectRatio === '16:9') {
    // Standard YouTube / Video format
    canvaUrl = 'https://www.canva.com/design?create=true&type=video';
  } else {
    // Square Instagram Video
    canvaUrl = 'https://www.canva.com/design?create=true&type=instagram_post';
  }

  if (typeof window !== 'undefined') {
    window.open(canvaUrl, '_blank', 'noopener,noreferrer');
  }
}
