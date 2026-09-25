'use client';

import React, { useState } from 'react';
import { X, History, HardDrive, Trash2, Calendar, Film } from 'lucide-react';
import { formatTime } from '@/lib/video-processor';
import { ConfirmModal } from '@/components/ConfirmModal';

export interface HistoryItem {
  id: string;
  videoTitle: string;
  videoDuration: number;
  clipCount: number;
  aspectRatio: string;
  timestamp: string;
  driveFolderName?: string;
  driveFolderId?: string;
}

interface HistoryModalProps {
  history: HistoryItem[];
  onClose: () => void;
  onClearHistory: () => void;
  onDeleteItem?: (id: string) => void;
}

export function HistoryModal({ history, onClose, onClearHistory, onDeleteItem }: HistoryModalProps) {
  const [showConfirmClear, setShowConfirmClear] = useState<boolean>(false);
  const [itemToDelete, setItemToDelete] = useState<HistoryItem | null>(null);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-sky-400" />
              <h3 className="text-base font-bold text-slate-100">Slicing History</h3>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 font-mono text-slate-400">
                {history.length} items
              </span>
            </div>

            <div className="flex items-center gap-2">
              {history.length > 0 && (
                <button
                  onClick={() => setShowConfirmClear(true)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Clear History"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear All
                </button>
              )}
              <button onClick={onClose} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {history.length === 0 ? (
              <div className="text-slate-500 text-center py-12 text-xs">
                No slicing history recorded yet. Completed jobs will appear here.
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Film className="w-4 h-4 text-sky-400 shrink-0" />
                      <span className="font-bold text-slate-100 truncate">{item.videoTitle}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-slate-400 text-[11px]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {item.timestamp}
                      </span>
                      <span>• {formatTime(item.videoDuration)}</span>
                      <span>• {item.clipCount} Clips</span>
                      <span className="text-sky-400 font-semibold">{item.aspectRatio}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.driveFolderId && (
                      <a
                        href={`https://drive.google.com/drive/folders/${item.driveFolderId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs font-semibold border border-sky-500/30 transition-colors"
                      >
                        <HardDrive className="w-3.5 h-3.5" />
                        Drive
                      </a>
                    )}

                    {onDeleteItem && (
                      <button
                        onClick={() => setItemToDelete(item)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-500/10 border border-slate-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Delete this history record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Clear All Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirmClear}
        title="Clear Slicing History"
        message="Are you sure you want to clear all your saved slicing history? This action cannot be undone."
        confirmText="Yes, Clear All"
        cancelText="Cancel"
        variant="danger"
        onConfirm={() => {
          onClearHistory();
          setShowConfirmClear(false);
        }}
        onCancel={() => setShowConfirmClear(false)}
      />

      {/* Single Item Deletion Confirmation Modal */}
      <ConfirmModal
        isOpen={itemToDelete !== null}
        title="Delete History Record"
        message={`Are you sure you want to delete the history record for "${itemToDelete?.videoTitle || 'this project'}"?`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={() => {
          if (itemToDelete && onDeleteItem) {
            onDeleteItem(itemToDelete.id);
          }
          setItemToDelete(null);
        }}
        onCancel={() => setItemToDelete(null)}
      />
    </>
  );
}
