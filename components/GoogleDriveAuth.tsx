'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  getGoogleUserProfile,
  listDriveVideoFiles,
  listAllDriveFolders,
  listFolderContents,
  downloadDriveFileBlob,
  createDriveFolder,
  GoogleDriveUser,
  DriveVideoFile,
  DriveFolderItem,
} from '@/lib/google-drive';
import { signInWithGoogleAuth, signOutFirebaseUser, auth, onAuthStateChanged } from '@/lib/firebase';
import {
  HardDrive,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Folder,
  ArrowRight,
  Video,
  Scissors,
  Download,
  LogIn,
  UserCheck,
  ChevronRight,
  FolderPlus,
  Search,
  Check,
} from 'lucide-react';
import firebaseConfig from '../firebase-applet-config.json';

const OAUTH_CLIENT_ID =
  firebaseConfig.oAuthClientId ||
  '601414682497-aqug7n7le2te7li489slu7kdlt98jb3e.apps.googleusercontent.com';
const SCOPES =
  'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';

interface GoogleDriveAuthProps {
  accessToken: string | null;
  onTokenChange: (token: string | null, user: GoogleDriveUser | null) => void;
  folderName: string;
  onFolderNameChange: (name: string) => void;
  autoUpload: boolean;
  onAutoUploadChange: (auto: boolean) => void;
  onSelectDriveVideo?: (file: File, title: string) => void;
  selectedVideoName?: string;
}

interface FolderBreadcrumb {
  id: string;
  name: string;
}

export function GoogleDriveAuth({
  accessToken,
  onTokenChange,
  folderName,
  onFolderNameChange,
  autoUpload,
  onAutoUploadChange,
  onSelectDriveVideo,
  selectedVideoName,
}: GoogleDriveAuthProps) {
  const [user, setUser] = useState<GoogleDriveUser | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [gisLoaded, setGisLoaded] = useState<boolean>(false);

  // --- Source Video Browser Modal State ---
  const [showDriveBrowser, setShowDriveBrowser] = useState<boolean>(false);
  const [browserTab, setBrowserTab] = useState<'folders' | 'allVideos'>('folders');
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');
  const [breadcrumbs, setBreadcrumbs] = useState<FolderBreadcrumb[]>([
    { id: 'root', name: 'My Drive' },
  ]);
  const [subFolders, setSubFolders] = useState<DriveFolderItem[]>([]);
  const [folderVideos, setFolderVideos] = useState<DriveVideoFile[]>([]);
  const [allVideos, setAllVideos] = useState<DriveVideoFile[]>([]);
  const [loadingVideos, setLoadingVideos] = useState<boolean>(false);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [videoSearchTerm, setVideoSearchTerm] = useState<string>('');

  // --- Destination Folder Picker Modal State ---
  const [showFolderPicker, setShowFolderPicker] = useState<boolean>(false);
  const [allDriveFolders, setAllDriveFolders] = useState<DriveFolderItem[]>([]);
  const [loadingFolders, setLoadingFolders] = useState<boolean>(false);
  const [newFolderNameInput, setNewFolderNameInput] = useState<string>('');
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);

  const verifyAndLoadUser = useCallback(
    async (token: string) => {
      setLoading(true);
      setError(null);
      const profile = await getGoogleUserProfile(token);
      if (profile) {
        setUser(profile);
        onTokenChange(token, profile);
        localStorage.setItem('cinecut_drive_token', token);
      } else {
        localStorage.removeItem('cinecut_drive_token');
        onTokenChange(null, null);
        setUser(null);
      }
      setLoading(false);
    },
    [onTokenChange]
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setUser({
          name: fbUser.displayName || fbUser.email || 'Firebase User',
          email: fbUser.email || 'Authenticated',
          picture: fbUser.photoURL || '',
        });
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
      setTimeout(() => setGisLoaded(true), 0);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setGisLoaded(true);
    script.onerror = () => setError('Failed to load Google Identity Services SDK');
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem('cinecut_drive_token');
    if (savedToken && !accessToken) {
      setTimeout(() => verifyAndLoadUser(savedToken), 0);
    }
  }, [accessToken, verifyAndLoadUser]);

  // Combined Authentication & Google Drive Authorization
  const handleConnectDrive = async () => {
    setError(null);
    setLoading(true);

    try {
      const { user: fbUser, googleAccessToken } = await signInWithGoogleAuth();

      if (fbUser) {
        setUser({
          name: fbUser.displayName || fbUser.email || 'Firebase User',
          email: fbUser.email || 'Authenticated',
          picture: fbUser.photoURL || '',
        });
      }

      if (googleAccessToken) {
        await verifyAndLoadUser(googleAccessToken);
        setLoading(false);
        return;
      }
    } catch (firebaseErr: any) {
      console.warn('Firebase login notice:', firebaseErr?.message || firebaseErr);
    }

    if (typeof window === 'undefined' || !(window as any).google?.accounts?.oauth2) {
      setError('Google Sign-In SDK is initializing. Please try again.');
      setLoading(false);
      return;
    }

    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: OAUTH_CLIENT_ID,
        scope: SCOPES,
        prompt: 'select_account',
        callback: async (response: any) => {
          setLoading(false);
          if (response.error) {
            setError(`Google Drive login: ${response.error_description || response.error}`);
            return;
          }
          if (response.access_token) {
            await verifyAndLoadUser(response.access_token);
          }
        },
      });

      client.requestAccessToken({ prompt: 'select_account' });
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Failed Google Drive authentication request');
    }
  };

  const handleDisconnect = async () => {
    try {
      await signOutFirebaseUser();
    } catch (e) {}
    localStorage.removeItem('cinecut_drive_token');
    onTokenChange(null, null);
    setUser(null);
  };

  // --- Source Video Browser Handlers ---
  const fetchFolderContent = async (folderId: string) => {
    if (!accessToken) return;
    setLoadingVideos(true);
    const { folders, videos } = await listFolderContents(accessToken, folderId);
    setSubFolders(folders);
    setFolderVideos(videos);
    setLoadingVideos(false);
  };

  const handleOpenDriveBrowser = async () => {
    if (!accessToken) return;
    setShowDriveBrowser(true);
    setCurrentFolderId('root');
    setBreadcrumbs([{ id: 'root', name: 'My Drive' }]);
    setVideoSearchTerm('');

    setLoadingVideos(true);
    const { folders, videos } = await listFolderContents(accessToken, 'root');
    setSubFolders(folders);
    setFolderVideos(videos);

    const allVids = await listDriveVideoFiles(accessToken);
    setAllVideos(allVids);
    setLoadingVideos(false);
  };

  const handleNavigateToSubfolder = (folder: DriveFolderItem) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
    fetchFolderContent(folder.id);
  };

  const handleNavigateBreadcrumb = (index: number) => {
    const target = breadcrumbs[index];
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
    setCurrentFolderId(target.id);
    fetchFolderContent(target.id);
  };

  const handleChooseDriveVideo = async (fileItem: DriveVideoFile) => {
    if (!accessToken) return;
    setDownloadingFileId(fileItem.id);
    try {
      const blob = await downloadDriveFileBlob(accessToken, fileItem.id);
      const file = new File([blob], fileItem.name, { type: fileItem.mimeType || 'video/mp4' });
      if (onSelectDriveVideo) {
        onSelectDriveVideo(file, fileItem.name.replace(/\.[^/.]+$/, ''));
      }
      setShowDriveBrowser(false);
    } catch (err: any) {
      setError(`Failed downloading video from Drive: ${err.message}`);
    } finally {
      setDownloadingFileId(null);
    }
  };

  // --- Destination Folder Picker Handlers ---
  const handleOpenFolderPicker = async () => {
    if (!accessToken) return;
    setShowFolderPicker(true);
    setLoadingFolders(true);
    const folders = await listAllDriveFolders(accessToken);
    setAllDriveFolders(folders);
    setLoadingFolders(false);
  };

  const handleSelectDestinationFolder = (name: string) => {
    onFolderNameChange(name);
    setShowFolderPicker(false);
  };

  const handleCreateNewDestinationFolder = async () => {
    if (!accessToken || !newFolderNameInput.trim()) return;
    setIsCreatingFolder(true);
    try {
      await createDriveFolder(accessToken, newFolderNameInput.trim());
      onFolderNameChange(newFolderNameInput.trim());
      setNewFolderNameInput('');
      setShowFolderPicker(false);
    } catch (err: any) {
      setError(`Failed to create Drive folder: ${err.message}`);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const isConnected = !!(accessToken && user);

  const filteredAllVideos = allVideos.filter((v) =>
    v.name.toLowerCase().includes(videoSearchTerm.toLowerCase())
  );

  return (
    <div className="space-y-3">
      {/* Hidden buttons for programmatic trigger */}
      <button data-drive-connect-btn onClick={handleConnectDrive} className="hidden" />
      <button data-drive-disconnect-btn onClick={handleDisconnect} className="hidden" />

      {/* ACTIVE GOOGLE DRIVE ROUTE BAR */}
      {isConnected ? (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-bold text-slate-200">Google Drive Storage Linked</span>
              <span className="text-[11px] text-slate-400">({user.email})</span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={handleOpenDriveBrowser}
                className="px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 hover:bg-sky-500/20 font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Video className="w-3.5 h-3.5" /> Select Video from Drive
              </button>
            </div>
          </div>

          {/* Route Visualizer */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 text-xs">
            {/* Step 1: Input Route */}
            <div className="flex items-center gap-3 text-slate-300 w-full md:w-auto">
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-sky-400 shrink-0">
                <HardDrive className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Source Route (Google Drive)
                </div>
                <div className="font-semibold text-slate-200 truncate max-w-[200px]">
                  {selectedVideoName ? (
                    <span className="text-sky-400">{selectedVideoName}</span>
                  ) : (
                    'Select a video from Drive'
                  )}
                </div>
              </div>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-600 hidden md:block shrink-0" />

            {/* Step 2: CineCut Engine */}
            <div className="flex items-center gap-3 text-slate-300 w-full md:w-auto">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                <Scissors className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                  CineCut 16x Slicer
                </div>
                <div className="font-semibold text-slate-200">Frame-Accurate Video Engine</div>
              </div>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-600 hidden md:block shrink-0" />

            {/* Step 3: Destination Folder */}
            <div className="flex items-center gap-3 text-slate-300 w-full md:w-auto">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                <Folder className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2">
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    Destination Drive Folder
                  </div>
                  <input
                    type="text"
                    value={folderName}
                    onChange={(e) => onFolderNameChange(e.target.value)}
                    placeholder="CineCut_Clips"
                    className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-xs font-semibold text-emerald-400 focus:outline-none focus:border-emerald-400 w-32"
                  />
                </div>
                <button
                  onClick={handleOpenFolderPicker}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 font-medium transition-colors cursor-pointer shrink-0"
                  title="Browse Drive Folders"
                >
                  Browse
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Google Authentication & Drive Storage
              </h4>
              <p className="text-xs text-slate-400">
                Sign in with Google to browse all Drive folders, load videos, and auto-save sliced clips.
              </p>
            </div>
          </div>

          <button
            onClick={handleConnectDrive}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 shrink-0"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            Sign In with Google
          </button>
        </div>
      )}

      {error && (
        <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={handleConnectDrive}
            className="underline text-sky-400 font-semibold cursor-pointer shrink-0"
          >
            Retry Login
          </button>
        </div>
      )}

      {/* 1. DRIVE VIDEO BROWSER MODAL (FOLDER NAVIGATION & VIDEO SELECTION) */}
      {showDriveBrowser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-sky-400" />
                <h3 className="text-sm font-bold text-slate-100">Browse Google Drive for Videos</h3>
              </div>
              <button
                onClick={() => setShowDriveBrowser(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer font-semibold"
              >
                Close
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => setBrowserTab('folders')}
                  className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-colors ${
                    browserTab === 'folders'
                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Folders & Files
                </button>
                <button
                  onClick={() => setBrowserTab('allVideos')}
                  className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-colors ${
                    browserTab === 'allVideos'
                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All Videos in Drive ({allVideos.length})
                </button>
              </div>

              {browserTab === 'allVideos' && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={videoSearchTerm}
                    onChange={(e) => setVideoSearchTerm(e.target.value)}
                    placeholder="Search video name..."
                    className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-400 w-40"
                  />
                </div>
              )}
            </div>

            {/* Breadcrumb Bar */}
            {browserTab === 'folders' && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 overflow-x-auto pb-1">
                {breadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={crumb.id}>
                    {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
                    <button
                      onClick={() => handleNavigateBreadcrumb(idx)}
                      className={`hover:text-sky-400 font-medium shrink-0 cursor-pointer ${
                        idx === breadcrumbs.length - 1 ? 'text-sky-400 font-bold' : ''
                      }`}
                    >
                      {crumb.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {loadingVideos ? (
                <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-sky-400" />
                  <span>Scanning Google Drive...</span>
                </div>
              ) : browserTab === 'folders' ? (
                <>
                  {subFolders.length === 0 && folderVideos.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 text-xs">
                      This folder is empty or contains no video files.
                    </div>
                  ) : (
                    <>
                      {/* Folder Items */}
                      {subFolders.map((folder) => (
                        <div
                          key={folder.id}
                          onClick={() => handleNavigateToSubfolder(folder)}
                          className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-sky-500/50 flex items-center justify-between text-xs cursor-pointer transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <Folder className="w-4 h-4 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                            <span className="font-semibold text-slate-200">{folder.name}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
                        </div>
                      ))}

                      {/* Video Files */}
                      {folderVideos.map((file) => (
                        <div
                          key={file.id}
                          className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-sky-500/50 flex items-center justify-between gap-3 text-xs transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Video className="w-4 h-4 text-sky-400 shrink-0" />
                            <span className="font-semibold text-slate-200 truncate">{file.name}</span>
                          </div>

                          <button
                            disabled={downloadingFileId === file.id}
                            onClick={() => handleChooseDriveVideo(file)}
                            className="px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                          >
                            {downloadingFileId === file.id ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                Loading...
                              </>
                            ) : (
                              <>
                                <Download className="w-3.5 h-3.5" />
                                Load Video
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                </>
              ) : (
                /* All Videos List */
                filteredAllVideos.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    No videos found matching &ldquo;{videoSearchTerm}&rdquo;.
                  </div>
                ) : (
                  filteredAllVideos.map((file) => (
                    <div
                      key={file.id}
                      className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-sky-500/50 flex items-center justify-between gap-3 text-xs transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Video className="w-4 h-4 text-sky-400 shrink-0" />
                        <span className="font-semibold text-slate-200 truncate">{file.name}</span>
                      </div>

                      <button
                        disabled={downloadingFileId === file.id}
                        onClick={() => handleChooseDriveVideo(file)}
                        className="px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                      >
                        {downloadingFileId === file.id ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5" />
                            Load Video
                          </>
                        )}
                      </button>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. DESTINATION FOLDER PICKER MODAL */}
      {showFolderPicker && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Folder className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100">Select Destination Drive Folder</h3>
              </div>
              <button
                onClick={() => setShowFolderPicker(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {/* Create New Folder Input */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newFolderNameInput}
                onChange={(e) => setNewFolderNameInput(e.target.value)}
                placeholder="Create new folder name..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-400"
              />
              <button
                disabled={!newFolderNameInput.trim() || isCreatingFolder}
                onClick={handleCreateNewDestinationFolder}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs transition-colors disabled:opacity-50 flex items-center gap-1 cursor-pointer shrink-0"
              >
                {isCreatingFolder ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FolderPlus className="w-3.5 h-3.5" />
                )}
                Create
              </button>
            </div>

            <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500 pt-2">
              Existing Drive Folders
            </div>

            {/* List of Existing Folders */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {loadingFolders ? (
                <div className="py-10 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
                  <span>Loading Google Drive folders...</span>
                </div>
              ) : allDriveFolders.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No existing custom folders found in Drive. Enter a name above to create one.
                </div>
              ) : (
                allDriveFolders.map((f) => {
                  const isSelected = f.name === folderName;
                  return (
                    <div
                      key={f.id}
                      onClick={() => handleSelectDestinationFolder(f.name)}
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-950 border-slate-800/80 hover:border-emerald-500/30 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Folder className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="font-semibold">{f.name}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
