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
    <footer className="mt-auto border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-md py-8 px-6 text-xs text-slate-400">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & Tagline */}
          <div className="space-y-1.5 text-center md:text-left">
            <Logo size="sm" showSubtitle={false} />
            <p className="text-[11px] text-slate-500 max-w-sm">
              Smart client-side video clipper, reframer, and automated Google Drive cloud synchronizer.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
            <button
              onClick={onShowInfoModal}
              className="text-slate-300 hover:text-sky-400 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>How It Works</span>
            </button>
            <span className="text-slate-700">•</span>
            <button
              onClick={onShowHistoryModal}
              className="text-slate-300 hover:text-sky-400 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>Slicing History</span>
            </button>
            <span className="text-slate-700">•</span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <HardDrive className="w-3.5 h-3.5 text-sky-400" />
              <span>Drive Cloud Sync</span>
            </span>
          </div>

          {/* Developer Attribution (Requested by User) */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 shadow-inner group hover:border-sky-500/40 transition-colors">
            <Code2 className="w-4 h-4 text-sky-400" />
            <span className="text-slate-400 text-xs">
              Developed by{' '}
              <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-300 to-indigo-400">
                rehan97
              </span>
            </span>
          </div>
        </div>

        {/* Bottom Credits Line */}
        <div className="pt-4 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-emerald-400/80" />
            <span>100% Client-Side Processing • Your Videos Never Leave Your Browser</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span>© {currentYear} CineCut AI</span>
            <span>•</span>
            <span className="text-slate-400 font-mono text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
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
