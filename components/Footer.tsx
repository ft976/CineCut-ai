'use client';

import React from 'react';
import { Logo } from '@/components/Logo';
import { Code2, Heart, Sparkles, HardDrive, Shield } from 'lucide-react';

interface FooterProps {
  onShowInfoModal: () => void;
  onShowHistoryModal: () => void;
}

export function Footer({ onShowInfoModal, onShowHistoryModal }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-slate-200 bg-white/95 backdrop-blur-md py-8 px-6 text-xs text-slate-600">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & Tagline */}
          <div className="space-y-1.5 text-center md:text-left">
            <Logo size="sm" showSubtitle={false} />
            <p className="text-[11px] text-slate-500 max-w-sm">
              Turbo FFmpeg video clipper, 9:16 vertical reframer, and autonomous Google Drive cloud pipeline.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
            <button
              onClick={onShowInfoModal}
              className="text-slate-600 hover:text-sky-600 transition-colors cursor-pointer flex items-center gap-1.5 font-medium"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span>How It Works</span>
            </button>
            <span className="text-slate-300">•</span>
            <button
              onClick={onShowHistoryModal}
              className="text-slate-600 hover:text-sky-600 transition-colors cursor-pointer flex items-center gap-1.5 font-medium"
            >
              <span>Slicing History</span>
            </button>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1.5 text-slate-500">
              <HardDrive className="w-3.5 h-3.5 text-sky-600" />
              <span>Drive Cloud Sync</span>
            </span>
          </div>

          {/* Developer Attribution (Requested by User) */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-50 border border-slate-200 shadow-2xs group hover:border-sky-300 transition-colors">
            <Code2 className="w-4 h-4 text-sky-600" />
            <span className="text-slate-600 text-xs">
              Developed by{' '}
              <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-600 via-cyan-600 to-indigo-600">
                rehan97
              </span>
            </span>
          </div>
        </div>

        {/* Bottom Credits Line */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>Dual-Engine Architecture • Turbo FFmpeg Backend (.MP4) &amp; Browser Engine (.WebM)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span>© {currentYear} CineCut AI</span>
            <span>•</span>
            <span className="text-slate-600 font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
              MIT License
            </span>
            <span>•</span>
            <span>Developed by rehan97</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
