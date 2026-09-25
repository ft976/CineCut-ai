# CineCut AI — Automated Video Clipper & Google Drive Sync

<p align="center">
  <img src="./public/icon.svg" alt="CineCut AI Logo" width="120" height="120" />
</p>

<p align="center">
  <strong>Transform long movies, podcasts, and video recordings into viral short clips in seconds.</strong><br>
  Built-in 9:16 Shorts reframing, ambient background blur, sequential part badges, and automated Google Drive cloud export.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15.5-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19.2-blue?style=for-the-badge&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Google_Drive-OAuth_2.0-4285F4?style=for-the-badge&logo=googledrive" alt="Google Drive" />
  <img src="https://img.shields.io/badge/Developer-rehan97-emerald?style=for-the-badge" alt="Developer" />
</p>

---

## 📖 Overview

**CineCut AI** is a professional, high-performance web application designed to solve one of the biggest bottlenecks for content creators: **repurposing long-form content into short-form viral videos** for YouTube Shorts, Instagram Reels, TikTok, and Facebook Stories.

Unlike traditional cloud rendering farms that take hours to upload large GB files and charge expensive monthly subscriptions, CineCut AI runs **100% in the user's browser**. By leveraging hardware-accelerated HTML5 Video, Canvas 2D composition, and the Web MediaStream Recording API, your video is sliced, reframed, badged, and encoded locally with **zero server uploads and zero privacy risks**.

Once your clips are sliced, CineCut AI connects seamlessly to your **Google Drive** via official Google Workspace OAuth to create a dedicated folder and auto-upload every rendered clip in the background with real-time status monitoring.

---

## ✨ Key Features

### 1. ⏱️ Smart Slicing Modes
- **Fixed Interval Mode**: Automatically slice long footage into exact fixed-time segments (e.g. 30 seconds, 60 seconds, 90 seconds, or custom intervals).
- **Equal Count Mode**: Divide any video evenly into $N$ equal parts (e.g., 5 parts, 10 parts, or 20 parts) with mathematically calculated start and end timecodes.
- **Interactive Timeline Editor**: Visually inspect audio/video waveforms, drag start/end boundary handles, and audition segments before rendering.

### 2. 📱 Social Canvas Reframing (9:16 / 16:9 / 1:1)
- **9:16 Vertical (Shorts, Reels, TikTok)**: Centers standard horizontal 16:9 widescreen footage inside a vertical canvas.
- **Ambient Blurred Background Padding**: Automatically samples the video frames, enlarges them, and applies a dynamic cinematic blur filter to fill vertical dead space without ugly black bars.
- **16:9 Landscape**: Standard widescreen for YouTube and Vimeo.
- **1:1 Square**: Perfect for LinkedIn and Instagram feed posts.

### 3. 🏷️ Sequential Part Badges & Watermarks
- **Auto-Incrementing Tags**: Automatically stamps clips with sequential badges: `Part 1`, `Part 2`, `Part 3`, etc.
- **Customizable Top & Bottom Banners**: Add custom hook headlines (e.g., `"WAIT TILL THE END 😱"`, `"BEST SCENE 🔥"`) directly onto the canvas.
- **Styling Controls**: Customize font size, badge color, background pill opacity, and positioning.

### 4. ☁️ Google Drive Cloud Auto-Sync
- **1-Click OAuth Connection**: Securely authenticate with your Google account using client-side OAuth 2.0.
- **Automated Cloud Folder Creation**: Automatically provisions a designated Drive folder (defaults to `CineCut_Clips`).
- **Live Upload Streaming**: Watch real-time upload progress for each individual clip with instant clickable Drive view links.
- **Zero Local Disk Overhead**: Send rendered clips directly to cloud storage without taking up hard drive space.

### 5. 🔒 100% In-Browser Privacy & Speed
- **No Third-Party Uploads**: Your raw video never uploads to an external rendering server. Processing occurs locally in your browser sandbox.
- **Zero Queue Times**: Start slicing immediately with hardware-accelerated GPU canvas rendering.
- **Instant Demo Experience**: Includes a pre-bundled 93-second sample movie (`/demo.mp4`) so you can test all features with a single click.

### 6. 📦 Flexible Export Options
- **ZIP Archive Export**: Bundle all processed clips into a single compressed `.zip` download using JSZip.
- **Single-Clip Downloads**: Download individual clips directly from the preview modal.
- **Session History**: Persistent local history tracking past cuts, file names, durations, and timestamps.

---

## 🏗️ Architecture & Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                      CineCut AI Engine                      │
├──────────────────────────────┬──────────────────────────────┤
│ Frontend Framework           │ Next.js 15.5 (App Router)    │
│ UI Library                   │ React 19.2 + TypeScript      │
│ Styling Engine               │ Tailwind CSS v4 + tw-animate │
│ Icons                        │ Lucide React                 │
│ Cloud Storage API            │ Google Drive REST API v3     │
│ Video Processing             │ HTML5 Canvas + MediaRecorder │
│ Packaging                    │ JSZip + FileSaver            │
│ Animations & FX              │ Canvas Confetti              │
└──────────────────────────────┴──────────────────────────────┘
```

### Video Processing Pipeline (Under the Hood)
1. **Video Ingestion**: Local video file or bundled `demo.mp4` is loaded into a headless `<video>` element with `crossOrigin="anonymous"`.
2. **Seek & Synchronize**: The player seeks to `startTime` and waits for `seeked` events to ensure zero frame dropping.
3. **Dual-Layer Compositing**:
   - **Layer 1 (Background)**: Draws the frame stretched to canvas dimensions with `filter = "blur(18px) brightness(0.65)"`.
   - **Layer 2 (Foreground)**: Draws the aspect-ratio-fitted frame centered with a soft drop shadow.
   - **Layer 3 (Overlay)**: Renders custom text banners, font gradients, and sequential part badges (`Part N`).
4. **Stream Encoding**: Canvas stream is captured at 30 FPS (`canvas.captureStream(30)`) along with native audio tracks (`video.captureStream()`), passed into `MediaRecorder`.
5. **Direct Cloud Multipart Upload**: Processed WebM/MP4 blobs are uploaded directly via `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`.

---

## 📁 Project Directory Structure

```
├── app/
│   ├── api/
│   │   └── video/
│   │       └── process-clip/     # Server-side metadata validation endpoint
│   │           └── route.ts
│   ├── favicon.ico
│   ├── globals.css               # Tailwind CSS v4 styling rules
│   ├── icon.svg                  # High-resolution vector brand mark
│   ├── layout.tsx                # App root layout, SEO metadata, OpenGraph cards
│   └── page.tsx                  # Primary CineCut application dashboard
├── components/
│   ├── ClipPreviewModal.tsx      # Modal to playback, inspect, and test rendered clips
│   ├── ClipProcessingStatus.tsx  # Batch rendering progress bar and Drive upload monitor
│   ├── ConfirmModal.tsx          # Confirmation dialogs for resetting workspace
│   ├── Footer.tsx                # Brand footer with attribution: Developed by rehan97
│   ├── GoogleDriveAuth.tsx       # Google OAuth connection bar & folder settings
│   ├── Header.tsx                # Sticky top bar with logo, history, and guide triggers
│   ├── HeroSection.tsx           # Interactive visual hero section with diagram & demo
│   ├── HistoryModal.tsx          # Local history modal tracking past sliced clips
│   ├── InfoModal.tsx             # Interactive 3-tab documentation & guide dialog
│   ├── Logo.tsx                  # CineCut AI brand mark and logo variants
│   ├── SplitSettings.tsx         # Interval, equal-count, canvas reframing controls
│   ├── TimelineVisualizer.tsx    # Interactive drag-to-trim visual timeline
│   └── VideoUploader.tsx         # Drag-and-drop video importer with demo shortcut
├── lib/
│   ├── google-drive.ts           # Google Drive REST API wrapper (folders, uploads)
│   ├── sample-video.ts           # Bundled demo.mp4 loader and fallback generator
│   ├── utils.ts                  # Classname merging and utility helpers
│   └── video-processor.ts        # Core canvas video slicing and rendering engine
├── public/
│   ├── demo.mp4                  # 93-second sample HD video for 1-click testing
│   ├── favicon.svg               # Web SVG favicon
│   └── icon.svg                  # CineCut vector icon asset
├── metadata.json                 # AI Studio applet configuration & capabilities
├── next.config.ts                # Next.js configuration & remote patterns
├── package.json                  # Dependencies and build scripts
├── postcss.config.mjs            # PostCSS configuration for Tailwind v4
└── tsconfig.json                 # TypeScript compiler configuration
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/rehan97/cinecut-ai.git
   cd cinecut-ai
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Add any optional server keys:
   ```env
   # Optional: Google Gemini API key for automated AI scene analysis
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Build for Production:**
   ```bash
   npm run build
   npm start
   ```

---

## 🌐 Google Drive Integration Guide

CineCut AI uses the **Google Workspace Drive API** to sync clips directly to your account.

### Scopes Used:
- `https://www.googleapis.com/auth/drive.file`: Allows CineCut to create a folder and upload only the files that the application generates. It **cannot** read, modify, or delete any other files in your Google Drive.

### How It Works:
1. Click **Connect Google Drive** in the top bar.
2. Accept the Google OAuth authorization prompt.
3. Once authorized, CineCut automatically checks for or creates the specified folder (e.g., `CineCut_Clips`).
4. Whenever a clip finishes processing, it automatically uploads with real-time percentage progress and returns a direct link:
   ```
   https://drive.google.com/file/d/{FILE_ID}/view
   ```

---

## 🎯 Step-by-Step User Workflow

1. **Import Video**:
   - Drag and drop your `.mp4`, `.mov`, `.webm`, or `.mkv` file into the upload zone.
   - *Or click **"Try Demo Video"** in the Hero section to instantly load the built-in 93-second action clip.*
2. **Choose Splitting Mode**:
   - **Interval Mode**: Set interval duration (e.g., 60 seconds).
   - **Equal Count Mode**: Set the desired number of clips (e.g., 5 clips).
3. **Configure Canvas & Style**:
   - Choose **9:16 Vertical** with **Background Blur** enabled.
   - Enter your Header Title (e.g., `"CineCut Highlights"`).
   - Enable **Sequential Part Badges** to stamp `Part 1`, `Part 2`, etc.
4. **Preview on Timeline**:
   - Inspect segment cards on the interactive timeline.
   - Click the **Play** button on any card to audition the cut in the preview player.
5. **Process & Export**:
   - Click **"Process All Clips"**.
   - Monitor real-time rendering and Google Drive upload progress.
   - Download the full collection as a `.zip` archive or view them directly in your Google Drive folder.

---

## 🖥️ Browser Compatibility

| Browser | Windows | macOS | Linux | Android | iOS Safari |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Google Chrome** | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ⚠️ WebM playback |
| **Microsoft Edge** | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ⚠️ WebM playback |
| **Mozilla Firefox**| ✅ Full | ✅ Full | ✅ Full | ✅ Full | ⚠️ Partial |
| **Apple Safari**   | ⚠️ Partial | ✅ Full (v15+) | N/A | ⚠️ Partial | ⚠️ Partial |

*Note: For the best performance with high-bitrate 4K videos, Google Chrome or Microsoft Edge with hardware acceleration enabled is recommended.*

---

## 👨‍💻 Developer & Credits

- **Creator & Lead Engineer**: **rehan97**
- **Project**: CineCut AI
- **Repository**: [https://github.com/rehan97/cinecut-ai](https://github.com/rehan97/cinecut-ai)

---

## 📄 License

This project is licensed under the **MIT License** — you are free to use, modify, and distribute this software for personal and commercial projects. See the `LICENSE` file for full details.
