'use client';

import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  className?: string;
}

export function Logo({ size = 'md', showSubtitle = false, className = '' }: LogoProps) {
  const iconDimensions = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
    xl: 'text-3xl',
  };

  const aiBadgeSizes = {
    sm: 'text-[9px] px-1 py-0.2',
    md: 'text-[10px] px-1.5 py-0.5',
    lg: 'text-xs px-2 py-0.5',
    xl: 'text-sm px-2.5 py-1',
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Dynamic Animated Brand Icon Mark */}
      <div className={`relative ${iconDimensions[size]} shrink-0 group`}>
        {/* Ambient Glow */}
        <div className="absolute inset-0 bg-gradient-to-tr from-sky-500 to-indigo-500 rounded-xl blur-[6px] opacity-40 group-hover:opacity-75 transition-opacity" />
        
        {/* SVG Icon Container */}
        <div className="relative w-full h-full rounded-xl bg-gradient-to-b from-slate-900 to-slate-950 border border-sky-500/30 p-1.5 flex items-center justify-center shadow-inner overflow-hidden group-hover:border-sky-400/60 transition-colors">
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full fill-none drop-shadow-sm"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="logo-cyan-purple" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#c084fc" />
              </linearGradient>
              <linearGradient id="laser-slice" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#f43f5e" />
              </linearGradient>
            </defs>

            {/* Film frame top section */}
            <path
              d="M20 22 C 20 18, 24 16, 28 16 L 76 16 C 80 16, 83 19, 83 23 L 68 45 L 20 45 Z"
              fill="#1e293b"
              stroke="#38bdf8"
              strokeWidth="2.5"
              strokeOpacity="0.5"
            />
            {/* Sprockets top */}
            <rect x="28" y="22" width="6" height="8" rx="1.5" fill="#38bdf8" opacity="0.9" />
            <rect x="42" y="22" width="6" height="8" rx="1.5" fill="#38bdf8" opacity="0.9" />
            <rect x="56" y="22" width="6" height="8" rx="1.5" fill="#38bdf8" opacity="0.9" />

            {/* Film frame bottom section */}
            <path
              d="M32 55 L 80 55 L 80 78 C 80 82, 76 85, 72 85 L 24 85 C 20 85, 17 82, 17 78 L 17 55 Z"
              fill="#1e293b"
              stroke="#818cf8"
              strokeWidth="2.5"
              strokeOpacity="0.5"
            />
            {/* Sprockets bottom */}
            <rect x="38" y="70" width="6" height="8" rx="1.5" fill="#818cf8" opacity="0.9" />
            <rect x="52" y="70" width="6" height="8" rx="1.5" fill="#818cf8" opacity="0.9" />
            <rect x="66" y="70" width="6" height="8" rx="1.5" fill="#818cf8" opacity="0.9" />

            {/* Precision Laser Slice Slash */}
            <line
              x1="8"
              y1="82"
              x2="92"
              y2="18"
              stroke="url(#laser-slice)"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <line
              x1="8"
              y1="82"
              x2="92"
              y2="18"
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeLinecap="round"
            />

            {/* Center Playhead Glyph */}
            <polygon
              points="44,38 64,50 44,62"
              fill="url(#logo-cyan-purple)"
            />
            <polygon
              points="46,42 60,50 46,58"
              fill="#ffffff"
              opacity="0.9"
            />

            {/* Sparkle spark */}
            <circle cx="85" cy="18" r="2.5" fill="#38bdf8" />
          </svg>
        </div>
      </div>

      {/* Typography / Logotype */}
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-1.5 leading-none">
          <span className={`font-black tracking-tight text-slate-100 ${textSizes[size]}`}>
            Cine<span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-400 to-indigo-400">Cut</span>
          </span>
          <span
            className={`font-mono font-bold tracking-wider rounded-md bg-gradient-to-r from-sky-500/15 to-indigo-500/15 border border-sky-400/40 text-sky-400 uppercase shadow-sm ${aiBadgeSizes[size]}`}
          >
            AI
          </span>
        </div>

        {showSubtitle && (
          <span className="text-[11px] font-medium tracking-normal text-slate-400 mt-1">
            Precision Video Clipper & Cloud Sync
          </span>
        )}
      </div>
    </div>
  );
}
