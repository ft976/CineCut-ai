/**
 * Loads the bundled high-definition 93-second demo video from /demo.mp4
 * and creates a File object for immediate in-browser processing.
 */
export async function loadDemoVideo(): Promise<{ file: File; url: string; duration: number }> {
  try {
    const response = await fetch('/demo.mp4');
    if (!response.ok) {
      throw new Error(`Failed to fetch /demo.mp4: ${response.statusText}`);
    }
    const blob = await response.blob();
    const file = new File([blob], 'demo.mp4', { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);

    // Get exact video duration
    const duration = await new Promise<number>((resolve) => {
      const vid = document.createElement('video');
      vid.preload = 'metadata';
      vid.src = url;
      vid.onloadedmetadata = () => {
        resolve(vid.duration || 93.4);
      };
      vid.onerror = () => {
        resolve(93.4);
      };
    });

    return { file, url, duration };
  } catch (err) {
    console.warn('Falling back to canvas generator for demo video:', err);
    return generateCanvasDemoVideo();
  }
}

/**
 * Fallback procedural video generator if network fetch fails
 */
async function generateCanvasDemoVideo(): Promise<{ file: File; url: string; duration: number }> {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d')!;

  const stream = canvas.captureStream(30);
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';

  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: Blob[] = [];

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  return new Promise((resolve) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const file = new File([blob], 'demo.mp4', { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      resolve({ file, url, duration: 90 });
    };

    recorder.start(100);

    let frame = 0;
    const totalFrames = 30;

    const renderLoop = setInterval(() => {
      frame++;
      const grad = ctx.createLinearGradient(0, 0, 1280, 720);
      grad.addColorStop(0, '#090d16');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1280, 720);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 44px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CINECUT AI • DEMO VIDEO', 640, 360);

      if (frame >= totalFrames) {
        clearInterval(renderLoop);
        recorder.stop();
      }
    }, 40);
  });
}
