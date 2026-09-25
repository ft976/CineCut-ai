'use client';

import React, { useState } from 'react';
import { HardDrive, Info, History, Folder, CheckCircle2, LogOut, RefreshCw } from 'lucide-react';
import { GoogleDriveUser } from '@/lib/google-drive';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Logo } from '@/components/Logo';

interface HeaderProps {
  onShowInfoModal: () => void;
  onShowHistoryModal: () => void;
  driveAccessToken: string | null;
  driveUser: GoogleDriveUser | null;
  onConnectDrive: () => void;
  onDisconnectDrive: () => void;
  folderName: string;
  onFolderNameChange: (name: string) => void;
  autoUpload: boolean;
  onAutoUploadChange: (auto: boolean) => void;
  isGisLoaded?: boolean;
  isDriveLoading?: boolean;
}

export function Header({
  onShowInfoModal,
  onShowHistoryModal,
  driveAccessToken,
  driveUser,
  onConnectDrive,
  onDisconnectDrive,
  folderName,
  onFolderNameChange,
  autoUpload,
  onAutoUploadChange,
  isGisLoaded = true,
  isDriveLoading = false,
}: HeaderProps) {
  const [showConfirmDisconnect, setShowConfirmDisconnect] = useState<boolean>(false);
  const isConnected = !!(driveAccessToken && driveUser);

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-4 md:px-6 py-3 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 md:gap-4">
          {/* Zone 1: Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <Logo size="md" />
          </div>

          {/* Zone 2: Inline Google Drive Sync Bar (ONLY visible when Google Drive is connected!) */}
          {isConnected && (
            <div className="hidden lg:flex items-center gap-2.5 bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-1 text-xs">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Folder className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>Folder:</span>
                <input
                  type="text"
                  value={folderName}
                  onChange={(e) => onFolderNameChange(e.target.value)}
                  placeholder="CineCut_Clips"
                  className="bg-transparent font-semibold text-slate-200 focus:outline-none w-28 text-xs border-b border-slate-700 focus:border-sky-400 transition-colors"
                />
              </div>

              <span className="text-slate-700">|</span>

              <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoUpload}
                  onChange={(e) => onAutoUploadChange(e.target.checked)}
                  className="accent-sky-500 cursor-pointer rounded"
                />
                <span className="font-medium">Auto-Upload</span>
              </label>
            </div>
          )}

          {/* Zone 3: Upper Dashboard Action Tools */}
          <div className="flex items-center gap-2 ml-auto lg:ml-0">
            {/* History Trigger */}
            <button
              onClick={onShowHistoryModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              title="Slicing History"
            >
              <History className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">History</span>
            </button>

            {/* Google Drive Account Status */}
            {isConnected ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-200 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate max-w-[100px] sm:max-w-[140px] font-medium">{driveUser?.email}</span>
                </div>
                <button
                  onClick={() => setShowConfirmDisconnect(true)}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-500/10 border border-slate-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                  title="Disconnect Google Drive"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onConnectDrive}
                disabled={isDriveLoading || !isGisLoaded}
                className="px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDriveLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <HardDrive className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">Connect</span> Drive
              </button>
            )}

            {/* Help Info Trigger */}
            <button
              onClick={onShowInfoModal}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title="Help & Info"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <ConfirmModal
        isOpen={showConfirmDisconnect}
        title="Disconnect Google Drive"
        message="Are you sure you want to disconnect your Google Drive account? Direct cloud sync will be disabled until you reconnect."
        confirmText="Yes, Disconnect"
        cancelText="Cancel"
        variant="warning"
        onConfirm={() => {
          onDisconnectDrive();
          setShowConfirmDisconnect(false);
        }}
        onCancel={() => setShowConfirmDisconnect(false)}
      />
    </>
  );
}
