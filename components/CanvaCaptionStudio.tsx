'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Type,
  Palette,
  Check,
  Copy,
  Download,
  ExternalLink,
  Plus,
  Trash2,
  RefreshCw,
  Film,
  X,
  Play,
  Languages,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import {
  CanvaCaptionConfig,
  CanvaCaptionStyleId,
  CaptionItem,
  CANVA_CAPTION_PRESETS,
  exportCaptionsToSRT,
  openInCanvaVideoEditor,
} from '@/lib/canva-captions';
import { formatTime } from '@/lib/video-processor';
import { ConfirmModal } from '@/components/ConfirmModal';

interface CanvaCaptionStudioProps {
  isOpen: boolean;
  onClose: () => void;
  config: CanvaCaptionConfig;
  onConfigChange: (newConfig: CanvaCaptionConfig) => void;
  captions: CaptionItem[];
  onCaptionsChange: (newCaptions: CaptionItem[]) => void;
  videoTitle: string;
  videoDuration: number;
  aspectRatio: '9:16' | '16:9' | '1:1';
  onSeekToTime?: (seconds: number) => void;
}

export function CanvaCaptionStudio({
  isOpen,
  onClose,
  config,
  onConfigChange,
  captions,
  onCaptionsChange,
  videoTitle,
  videoDuration,
  aspectRatio,
  onSeekToTime,
}: CanvaCaptionStudioProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('English');
  const [selectedTone, setSelectedTone] = useState<string>('viral-hook');
  const [customTopic, setCustomTopic] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copiedSrt, setCopiedSrt] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'styles' | 'editor' | 'canva-integration'>('styles');
  const [captionToDelete, setCaptionToDelete] = useState<CaptionItem | null>(null);

  if (!isOpen) return null;

  // Handle AI Auto-Caption Generation via Backend Route
  const handleGenerateCaptions = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/captions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoTitle: videoTitle || 'Video Slices',
          duration: videoDuration || 60,
          language: selectedLanguage,
          styleHint: selectedTone,
          customTopic: customTopic.trim() || videoTitle,
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.captions) && data.captions.length > 0) {
        onCaptionsChange(data.captions);
        onConfigChange({ ...config, enabled: true });
        setActiveTab('styles');
      }
    } catch (err) {
      console.error('Failed to generate captions:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy SRT
  const handleCopySRT = () => {
    const srt = exportCaptionsToSRT(captions);
    navigator.clipboard.writeText(srt);
    setCopiedSrt(true);
    setTimeout(() => setCopiedSrt(false), 2000);
  };

  // Download SRT File
  const handleDownloadSRT = () => {
    const srt = exportCaptionsToSRT(captions);
    const blob = new Blob([srt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(videoTitle || 'captions').replace(/[^a-z0-9]/gi, '_')}.srt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Add a new manual caption line
  const handleAddCaption = () => {
    const lastCap = captions[captions.length - 1];
    const newStart = lastCap ? lastCap.endTime : 0;
    const newEnd = Math.min(videoDuration || 300, newStart + 3);

    const newCap: CaptionItem = {
      id: `canva_cap_${Date.now()}`,
      startTime: Number(newStart.toFixed(1)),
      endTime: Number(newEnd.toFixed(1)),
      text: 'New animated caption text',
    };

    onCaptionsChange([...captions, newCap]);
  };

  // Update caption item
  const handleUpdateCaption = (id: string, updates: Partial<CaptionItem>) => {
    onCaptionsChange(
      captions.map((cap) => (cap.id === id ? { ...cap, ...updates } : cap))
    );
  };

  const CANVA_PALETTE = [
    { label: 'Canva Yellow', hex: '#FFDE59' },
    { label: 'Cyber Cyan', hex: '#00F0FF' },
    { label: 'Neon Mint', hex: '#00F59B' },
    { label: 'Canva Violet', hex: '#7D2AE8' },
    { label: 'Vivid Pink', hex: '#FF007A' },
    { label: 'Sunset Coral', hex: '#FF5722' },
    { label: 'Pure White', hex: '#FFFFFF' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in duration-200">
        {/* Header with Canva Brand Styling */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00C4CC] via-[#7D2AE8] to-[#FF007A] p-0.5 flex items-center justify-center shadow-lg shadow-purple-500/10">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#00C4CC]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
                  Canva <span className="bg-gradient-to-r from-[#00C4CC] to-[#7D2AE8] bg-clip-text text-transparent">Caption Studio</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#7D2AE8]/20 text-[#c084fc] border border-[#7D2AE8]/30">
                  AI Powered
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Generate dynamic TikTok/Reels captions & apply authentic Canva typography styles
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openInCanvaVideoEditor(aspectRatio)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#00C4CC] to-[#7D2AE8] hover:opacity-90 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open in Canva
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Studio Sub-Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800/80 px-6 py-2 bg-slate-950/40 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('styles')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'styles'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Palette className="w-3.5 h-3.5" /> Canva Caption Styles ({CANVA_CAPTION_PRESETS.length})
            </button>
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'editor'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Type className="w-3.5 h-3.5" /> Timed Subtitles ({captions.length})
            </button>
            <button
              onClick={() => setActiveTab('canva-integration')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'canva-integration'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#00C4CC]" /> Canva Video Export
            </button>
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={config.burnIntoVideo}
              onChange={(e) => onConfigChange({ ...config, burnIntoVideo: e.target.checked })}
              className="accent-sky-500 cursor-pointer rounded"
            />
            <span>Burn into Slices</span>
          </label>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* AI Auto-Generation Bar */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950/30 border border-slate-800 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#00C4CC]" />
                  AI Automatic Caption Generation
                </span>
                <p className="text-xs text-slate-400">
                  Transcribe & generate synced high-retention subtitles tailored to &quot;{videoTitle || 'your video'}&quot;
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
                  <Languages className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="English" className="bg-slate-900">English</option>
                    <option value="Spanish" className="bg-slate-900">Spanish (Español)</option>
                    <option value="Hindi" className="bg-slate-900">Hindi (हिंदी)</option>
                    <option value="French" className="bg-slate-900">French (Français)</option>
                    <option value="German" className="bg-slate-900">German (Deutsch)</option>
                    <option value="Portuguese" className="bg-slate-900">Portuguese (Português)</option>
                    <option value="Japanese" className="bg-slate-900">Japanese (日本語)</option>
                    <option value="Arabic" className="bg-slate-900">Arabic (العربية)</option>
                  </select>
                </div>

                <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
                  <Sliders className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={selectedTone}
                    onChange={(e) => setSelectedTone(e.target.value)}
                    className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="viral-hook" className="bg-slate-900">Viral Hook (TikTok / Shorts)</option>
                    <option value="storytelling" className="bg-slate-900">Narrative & Storytelling</option>
                    <option value="educational" className="bg-slate-900">Educational & Tutorial</option>
                    <option value="cinematic" className="bg-slate-900">Cinematic Movie Style</option>
                  </select>
                </div>

                <button
                  onClick={handleGenerateCaptions}
                  disabled={isGenerating}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Auto-Generate Captions
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* TAB 1: Canva Caption Styles Showcase */}
          {activeTab === 'styles' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-sky-400" />
                  Select Canva Typography & Animation Preset
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {CANVA_CAPTION_PRESETS.map((preset) => {
                    const isSelected = config.styleId === preset.id;

                    return (
                      <div
                        key={preset.id}
                        onClick={() => {
                          onConfigChange({
                            ...config,
                            styleId: preset.id,
                            highlightColor: preset.defaultHighlight,
                            enabled: true,
                          });
                        }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer relative group flex flex-col justify-between gap-3 ${
                          isSelected
                            ? 'bg-gradient-to-b from-sky-500/10 to-indigo-500/10 border-sky-400 ring-2 ring-sky-500/20 shadow-lg'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                              {preset.category}
                            </span>
                            {isSelected && (
                              <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-sm">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </span>
                            )}
                          </div>

                          <h5 className="text-sm font-extrabold text-slate-100">{preset.name}</h5>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{preset.tagline}</p>
                        </div>

                        {/* Interactive Visual Preview Box */}
                        <div
                          className="h-16 rounded-xl flex items-center justify-center p-2 border border-slate-800/80 shadow-inner relative overflow-hidden"
                          style={{ backgroundColor: preset.previewBg }}
                        >
                          <span
                            className="font-black text-center text-sm transition-transform group-hover:scale-105"
                            style={{
                              color: preset.previewTextColor,
                              textShadow: preset.previewGlowColor
                                ? `0 0 10px ${preset.previewGlowColor}`
                                : preset.previewBorderColor
                                ? `-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000`
                                : 'none',
                            }}
                          >
                            VIRAL MOMENT
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Customization Controls: Size, Position & Color Palette */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Customization Controls
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  {/* Font Size */}
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-semibold">Font Size</label>
                    <div className="grid grid-cols-4 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                      {(['small', 'medium', 'large', 'xlarge'] as const).map((sz) => (
                        <button
                          key={sz}
                          onClick={() => onConfigChange({ ...config, fontSize: sz })}
                          className={`py-1 rounded-lg font-bold capitalize transition-colors cursor-pointer text-center ${
                            config.fontSize === sz
                              ? 'bg-sky-500 text-white'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {sz === 'xlarge' ? 'XL' : sz[0].toUpperCase() + sz.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Position */}
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-semibold">Vertical Position</label>
                    <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                      {(['top', 'middle', 'bottom'] as const).map((pos) => (
                        <button
                          key={pos}
                          onClick={() => onConfigChange({ ...config, position: pos })}
                          className={`py-1 rounded-lg font-bold capitalize transition-colors cursor-pointer text-center ${
                            config.position === pos
                              ? 'bg-sky-500 text-white'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Highlight Palette */}
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-semibold">Canva Highlight Color</label>
                    <div className="flex items-center gap-2 pt-0.5">
                      {CANVA_PALETTE.map((c) => (
                        <button
                          key={c.hex}
                          onClick={() => onConfigChange({ ...config, highlightColor: c.hex })}
                          style={{ backgroundColor: c.hex }}
                          title={c.label}
                          className={`w-6 h-6 rounded-full transition-transform cursor-pointer relative ${
                            config.highlightColor === c.hex ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'hover:scale-110'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Timed Subtitle Editor */}
          {activeTab === 'editor' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Interactive Caption Segments ({captions.length})
                  </h4>
                  <p className="text-xs text-slate-500">
                    Edit words and exact timestamps for each subtitle card
                  </p>
                </div>

                <button
                  onClick={handleAddCaption}
                  className="px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Line
                </button>
              </div>

              {captions.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40 p-6 space-y-3">
                  <Type className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">
                    No captions added yet. Click &quot;Auto-Generate Captions&quot; above to create AI synced subtitles!
                  </p>
                  <button
                    onClick={handleGenerateCaptions}
                    className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs cursor-pointer shadow-md inline-flex items-center gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Auto-Generate Now
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {captions.map((cap, idx) => (
                    <div
                      key={cap.id}
                      className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2 font-mono text-slate-400 shrink-0">
                        <span className="font-bold text-sky-400">#{idx + 1}</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            value={cap.startTime}
                            onChange={(e) =>
                              handleUpdateCaption(cap.id, { startTime: parseFloat(e.target.value) || 0 })
                            }
                            className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center text-sky-300 font-bold"
                          />
                          <span>-</span>
                          <input
                            type="number"
                            step="0.1"
                            value={cap.endTime}
                            onChange={(e) =>
                              handleUpdateCaption(cap.id, { endTime: parseFloat(e.target.value) || 0 })
                            }
                            className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center text-emerald-300 font-bold"
                          />
                          <span className="text-[10px] text-slate-500">s</span>
                        </div>
                      </div>

                      <input
                        type="text"
                        value={cap.text}
                        onChange={(e) => handleUpdateCaption(cap.id, { text: e.target.value })}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 font-medium focus:outline-none focus:border-sky-500 text-xs"
                      />

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        {onSeekToTime && (
                          <button
                            onClick={() => onSeekToTime(cap.startTime)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                            title="Jump video to this caption"
                          >
                            <Play className="w-3 h-3 fill-current text-sky-400" />
                          </button>
                        )}
                        <button
                          onClick={() => setCaptionToDelete(cap)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Delete caption"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Canva Integration & Export Suite */}
          {activeTab === 'canva-integration' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00C4CC] to-[#7D2AE8] flex items-center justify-center text-white shadow-lg">
                    <ExternalLink className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-white">Canva Video Creator Suite</h4>
                    <p className="text-xs text-slate-400">
                      Take your sliced clips and timed subtitles directly into Canva&apos;s full-featured cloud studio
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <button
                    onClick={() => openInCanvaVideoEditor(aspectRatio)}
                    className="p-4 rounded-xl bg-gradient-to-r from-[#00C4CC] to-[#7D2AE8] hover:opacity-95 text-white font-bold text-xs flex flex-col items-center justify-center gap-2 shadow-lg transition-transform hover:scale-[1.02] cursor-pointer text-center"
                  >
                    <ExternalLink className="w-5 h-5" />
                    <span>Launch Canva Video Studio</span>
                    <span className="text-[10px] font-normal opacity-90">({aspectRatio} format)</span>
                  </button>

                  <button
                    onClick={handleCopySRT}
                    className="p-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold text-xs flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer text-center"
                  >
                    {copiedSrt ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <span className="text-emerald-400">Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5 text-sky-400" />
                        <span>Copy Subtitle Track (SRT)</span>
                        <span className="text-[10px] font-normal text-slate-400">For Canva subtitle upload</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleDownloadSRT}
                    className="p-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold text-xs flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer text-center"
                  >
                    <Download className="w-5 h-5 text-amber-400" />
                    <span>Download .SRT File</span>
                    <span className="text-[10px] font-normal text-slate-400">Import to Premiere/Canva</span>
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs text-slate-400">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-sky-400" />
                  How Canva Captions Work in CineCut AI:
                </span>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Your selected Canva caption style is automatically rendered in real-time over the video preview.</li>
                  <li>When you tap <strong>&quot;Cut Video &amp; Sync to Drive&quot;</strong>, the Canva typography &amp; animations are burned directly into each sliced clip output.</li>
                  <li>You can also download or copy the SRT subtitles to import into Canva Video or CapCut.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>
              Active Style: <strong className="text-white capitalize">{config.styleId.replace('canva-', '').replace('-', ' ')}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              Apply Canva Captions to Video
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal for Caption Lines */}
      <ConfirmModal
        isOpen={captionToDelete !== null}
        title="Delete Caption Line"
        message={`Are you sure you want to delete caption "${captionToDelete?.text || 'this line'}"?`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={() => {
          if (captionToDelete) {
            onCaptionsChange(captions.filter((c) => c.id !== captionToDelete.id));
          }
          setCaptionToDelete(null);
        }}
        onCancel={() => setCaptionToDelete(null)}
      />
    </div>
  );
}
