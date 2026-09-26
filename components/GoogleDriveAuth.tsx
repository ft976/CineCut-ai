'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  getGoogleUserProfile,
  listDriveVideoFiles,
  listAllDriveFolders,
  listFolderContents,
  downloadDriveFileBlob,
  createDriveFolder,
  extractDriveFolderId,
  getDriveFolderById,
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
  FolderOpen,
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
  X,
  Link2,
  Unlock,
} from 'lucide-react';
import firebaseConfig from '../firebase-applet-config.json';

const OAUTH_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  firebaseConfig.oAuthClientId ||
  '601414682497-aqug7n7le2te7li489slu7kdlt98jb3e.apps.googleusercontent.com';

const SCOPES =
  'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';

const TOKEN_STORAGE_KEY = 'cinecut_drive_token_v3';

interface GoogleDriveAuthProps {
  accessToken: string | null;
  onTokenChange: (token: string | null, user: GoogleDriveUser | null) => void;
  folderName: string;
  onFolderNameChange: (name: string) => void;
  toFolderId?: string | null;
  onToFolderIdChange?: (id: string | null) => void;
  autoUpload: boolean;
  onAutoUploadChange: (auto: boolean) => void;
  onSelectDriveVideo?: (file: File, title: string, driveFileId?: string) => void;
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
  toFolderId = null,
  onToFolderIdChange,
  autoUpload,
  onAutoUploadChange,
  onSelectDriveVideo,
  selectedVideoName,
}: GoogleDriveAuthProps) {
  const [user, setUser] = useState<GoogleDriveUser | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [gisLoaded, setGisLoaded] = useState<boolean>(false);

  // --- Global Drive Folders & "From Folder" / "To Folder" State ---
  const [allDriveFolders, setAllDriveFolders] = useState<DriveFolderItem[]>([]);
  const [loadingFolders, setLoadingFolders] = useState<boolean>(false);

  // "FROM FOLDER" state (where user takes videos from)
  const [fromFolderId, setFromFolderId] = useState<string>('all');
  const [fromFolderName, setFromFolderName] = useState<string>('All Drive Folders');
  const [fromFolderVideos, setFromFolderVideos] = useState<DriveVideoFile[]>([]);
  const [loadingFromVideos, setLoadingFromVideos] = useState<boolean>(false);

  // --- Source Video Browser Modal State ---
  const [showDriveBrowser, setShowDriveBrowser] = useState<boolean>(false);
  const [browserTab, setBrowserTab] = useState<'folders' | 'shared' | 'allVideos'>('folders');
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

  // --- Unified Folder Picker Modal State (for "From Folder" or "To Folder") ---
  const [showFolderPicker, setShowFolderPicker] = useState<boolean>(false);
  const [folderPickerMode, setFolderPickerMode] = useState<'from' | 'to'>('to');
  const [folderSearchTerm, setFolderSearchTerm] = useState<string>('');
  const [isSearchingApiFolders, setIsSearchingApiFolders] = useState<boolean>(false);
  const [newFolderNameInput, setNewFolderNameInput] = useState<string>('');
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);
  const [pasteFolderLinkInput, setPasteFolderLinkInput] = useState<string>('');
  const [isResolvingLink, setIsResolvingLink] = useState<boolean>(false);

  const verifyAndLoadUser = useCallback(
    async (token: string) => {
      setLoading(true);
      setError(null);
      const profile = await getGoogleUserProfile(token);
      if (profile) {
        setUser(profile);
        onTokenChange(token, profile);
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem('cinecut_drive_token');
        onTokenChange(null, null);
        setUser(null);
      }
      setLoading(false);
    },
    [onTokenChange]
  );

  // Automatically load all user's Drive folders and From-Folder videos when logged in
  const syncAllFoldersAndVideos = useCallback(
    async (token: string, targetFromFolderId: string = fromFolderId) => {
      if (!token) return;
      setLoadingFolders(true);
      setLoadingFromVideos(true);
      try {
        const [folders, videos] = await Promise.all([
          listAllDriveFolders(token),
          listDriveVideoFiles(token, targetFromFolderId),
        ]);
        setAllDriveFolders(folders);
        setFromFolderVideos(videos);
      } catch (err) {
        console.error('Error syncing Drive folders/videos:', err);
      } finally {
        setLoadingFolders(false);
        setLoadingFromVideos(false);
      }
    },
    [fromFolderId]
  );

  useEffect(() => {
    if (accessToken) {
      const timer = setTimeout(() => {
        syncAllFoldersAndVideos(accessToken, fromFolderId);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [accessToken, fromFolderId, syncAllFoldersAndVideos]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser && !user) {
        setUser((prev) =>
          prev || {
            name: fbUser.displayName || fbUser.email || 'Firebase User',
            email: fbUser.email || 'Authenticated',
            picture: fbUser.photoURL || '',
            hasFullDriveScope: true,
          }
        );
      }
    });

    return () => unsubscribe();
  }, [user]);

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
    // Purge legacy drive.file-only token key
    localStorage.removeItem('cinecut_drive_token');
    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (savedToken && !accessToken) {
      setTimeout(() => verifyAndLoadUser(savedToken), 0);
    }
  }, [accessToken, verifyAndLoadUser]);

  // Request Full Google Drive OAuth Token via GIS (Primary) or Firebase Auth (Fallback)
  const handleConnectDrive = async () => {
    setError(null);
    setLoading(true);

    // 1. Prefer Google Identity Services (GIS) Token Client with explicit consent for full Drive scope
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
      try {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: OAUTH_CLIENT_ID,
          scope: SCOPES,
          prompt: 'consent select_account',
          callback: async (response: any) => {
            setLoading(false);
            if (response.error) {
              setError(`Google Drive authorization: ${response.error_description || response.error}`);
              return;
            }
            if (response.access_token) {
              await verifyAndLoadUser(response.access_token);
            }
          },
        });

        client.requestAccessToken({ prompt: 'consent select_account' });
        return;
      } catch (gisErr: any) {
        console.warn('GIS token client fallback notice:', gisErr);
      }
    }

    // 2. Fallback to Firebase Google Popup with consent prompt
    try {
      const { user: fbUser, googleAccessToken } = await signInWithGoogleAuth();

      if (fbUser) {
        setUser({
          name: fbUser.displayName || fbUser.email || 'Firebase User',
          email: fbUser.email || 'Authenticated',
          picture: fbUser.photoURL || '',
          hasFullDriveScope: true,
        });
      }

      if (googleAccessToken) {
        await verifyAndLoadUser(googleAccessToken);
        setLoading(false);
        return;
      }
    } catch (firebaseErr: any) {
      setError(firebaseErr?.message || 'Google Drive sign-in was cancelled or blocked by popup blocker.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await signOutFirebaseUser();
    } catch (e) {}
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem('cinecut_drive_token');
    onTokenChange(null, null);
    setUser(null);
    setAllDriveFolders([]);
    setFromFolderVideos([]);
  };

  // Handle changing the "From Folder"
  const handleSelectFromFolder = async (folderId: string, name?: string) => {
    setFromFolderId(folderId);
    if (name) {
      setFromFolderName(name);
    } else if (folderId === 'all') {
      setFromFolderName('All Drive Folders');
    } else if (folderId === 'root') {
      setFromFolderName('My Drive (Root)');
    } else {
      const found = allDriveFolders.find((f) => f.id === folderId);
      if (found) setFromFolderName(found.name);
    }

    if (accessToken) {
      setLoadingFromVideos(true);
      const vids = await listDriveVideoFiles(accessToken, folderId);
      setFromFolderVideos(vids);
      setLoadingFromVideos(false);
    }
  };

  // Handle changing the "To Folder" (Destination folder for cut clips)
  const handleSelectToFolder = (folderId: string, name: string) => {
    onFolderNameChange(name);
    if (onToFolderIdChange) {
      onToFolderIdChange(folderId === 'custom' ? null : folderId);
    }
  };

  // Live Drive API Folder Search inside Folder Picker Modal
  const handleLiveSearchFolders = async (queryText: string) => {
    setFolderSearchTerm(queryText);
    if (!accessToken) return;
    if (!queryText.trim()) {
      setIsSearchingApiFolders(true);
      const folders = await listAllDriveFolders(accessToken);
      setAllDriveFolders(folders);
      setIsSearchingApiFolders(false);
      return;
    }

    setIsSearchingApiFolders(true);
    const matched = await listAllDriveFolders(accessToken, queryText.trim());
    setAllDriveFolders((prev) => {
      const map = new Map<string, DriveFolderItem>();
      matched.forEach((f) => map.set(f.id, f));
      prev.forEach((f) => {
        if (f.name.toLowerCase().includes(queryText.toLowerCase())) {
          map.set(f.id, f);
        }
      });
      return Array.from(map.values());
    });
    setIsSearchingApiFolders(false);
  };

  // Handle Pasting a Google Drive Folder URL or ID
  const handleResolvePastedFolderLink = async () => {
    if (!accessToken || !pasteFolderLinkInput.trim()) return;
    const extractedId = extractDriveFolderId(pasteFolderLinkInput);
    if (!extractedId) {
      setError('Could not find a valid Google Drive folder ID in that link.');
      return;
    }

    setIsResolvingLink(true);
    setError(null);
    try {
      const folderMeta = await getDriveFolderById(accessToken, extractedId);
      const resolvedName = folderMeta?.name || `Drive Folder (${extractedId.slice(0, 6)})`;
      const newFolderObj: DriveFolderItem = {
        id: extractedId,
        name: resolvedName,
      };

      setAllDriveFolders((prev) => {
        if (prev.some((f) => f.id === extractedId)) return prev;
        return [newFolderObj, ...prev];
      });

      if (folderPickerMode === 'to') {
        handleSelectToFolder(extractedId, resolvedName);
      } else {
        await handleSelectFromFolder(extractedId, resolvedName);
      }
      setPasteFolderLinkInput('');
      setShowFolderPicker(false);
    } catch (err: any) {
      setError(`Could not access folder by link: ${err.message}`);
    } finally {
      setIsResolvingLink(false);
    }
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
    const startFolderId = fromFolderId === 'all' ? 'root' : fromFolderId;
    const startFolderLabel =
      fromFolderId === 'all' || fromFolderId === 'root' ? 'My Drive' : fromFolderName;

    setCurrentFolderId(startFolderId);
    setBreadcrumbs(
      startFolderId === 'root'
        ? [{ id: 'root', name: 'My Drive' }]
        : [
            { id: 'root', name: 'My Drive' },
            { id: startFolderId, name: startFolderLabel },
          ]
    );
    setVideoSearchTerm('');

    setLoadingVideos(true);
    const [{ folders, videos }, allVids] = await Promise.all([
      listFolderContents(accessToken, startFolderId),
      listDriveVideoFiles(accessToken, 'all'),
    ]);
    setSubFolders(folders);
    setFolderVideos(videos);
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
    setError(null);
    try {
      const blob = await downloadDriveFileBlob(accessToken, fileItem.id);
      const file = new File([blob], fileItem.name, { type: fileItem.mimeType || 'video/mp4' });
      if (onSelectDriveVideo) {
        onSelectDriveVideo(file, fileItem.name.replace(/\.[^/.]+$/, ''), fileItem.id);
      }
      setShowDriveBrowser(false);
    } catch (err: any) {
      setError(`Failed downloading video from Drive: ${err.message}`);
    } finally {
      setDownloadingFileId(null);
    }
  };

  // --- Folder Picker Modal Handlers (Works for both FROM folder and TO folder) ---
  const handleOpenFolderModal = async (mode: 'from' | 'to') => {
    if (!accessToken) return;
    setFolderPickerMode(mode);
    setFolderSearchTerm('');
    setPasteFolderLinkInput('');
    setShowFolderPicker(true);
    setLoadingFolders(true);
    const folders = await listAllDriveFolders(accessToken);
    setAllDriveFolders(folders);
    setLoadingFolders(false);
  };

  const handleCreateNewDestinationFolder = async () => {
    if (!accessToken || !newFolderNameInput.trim()) return;
    setIsCreatingFolder(true);
    try {
      const createdId = await createDriveFolder(accessToken, newFolderNameInput.trim());
      const createdName = newFolderNameInput.trim();
      const updatedFolders = await listAllDriveFolders(accessToken);
      setAllDriveFolders(updatedFolders);

      if (folderPickerMode === 'to') {
        handleSelectToFolder(createdId, createdName);
      } else {
        await handleSelectFromFolder(createdId, createdName);
      }
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

  const filteredModalFolders = allDriveFolders.filter((f) =>
    f.name.toLowerCase().includes(folderSearchTerm.toLowerCase())
  );

  return (
    <div className="space-y-3">
      {/* Hidden buttons for programmatic trigger */}
      <button data-drive-connect-btn onClick={handleConnectDrive} className="hidden" />
      <button data-drive-disconnect-btn onClick={handleDisconnect} className="hidden" />

      {/* ACTIVE GOOGLE DRIVE FROM -> TO PIPELINE */}
      {isConnected ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
          {/* Scope Upgrade Callout if user has restricted token or 0 folders */}
          {(user.hasFullDriveScope === false || (!loadingFolders && allDriveFolders.length === 0)) && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start gap-2.5 text-amber-900">
                <Unlock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">
                    Can&apos;t see all your existing Google Drive folders?
                  </span>
                  <span className="text-[11px] text-amber-800">
                    Click <strong>Unlock All Drive Folders</strong> and make sure the Google Drive permission checkbox is ticked in the Google popup, or paste a Drive Folder link via <strong>Choose Folder</strong>.
                  </span>
                </div>
              </div>
              <button
                onClick={handleConnectDrive}
                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shrink-0 cursor-pointer shadow-2xs flex items-center gap-1.5"
              >
                <Unlock className="w-3.5 h-3.5" />
                Unlock All Drive Folders
              </button>
            </div>
          )}

          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Google Drive Folder Pipeline
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-mono">
                    {loadingFolders ? 'Loading...' : `${allDriveFolders.length} Folders Found`}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Connected as <strong className="text-slate-700">{user.email}</strong> • Pick a{' '}
                  <strong>From Folder</strong> to take videos and a <strong>To Folder</strong> to receive cut clips
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                onClick={() => syncAllFoldersAndVideos(accessToken, fromFolderId)}
                disabled={loadingFolders || loadingFromVideos}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                title="Refresh all Drive folders and videos"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 text-sky-600 ${
                    loadingFolders || loadingFromVideos ? 'animate-spin' : ''
                  }`}
                />
                <span>Refresh</span>
              </button>

              <button
                onClick={handleOpenDriveBrowser}
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Explore Drive Tree</span>
              </button>
            </div>
          </div>

          {/* FROM FOLDER -> TO FOLDER 2-COLUMN WORKFLOW */}
          <div className="grid grid-cols-1 lg:grid-cols-11 gap-4 items-stretch">
            {/* 1. FROM FOLDER CARD (5 cols) */}
            <div className="lg:col-span-5 bg-slate-50/90 border border-slate-200/90 rounded-xl p-3.5 space-y-3 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-sky-100/80 border border-sky-200 text-sky-700">
                      <FolderOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700 block">
                        1. From Folder (Source Videos)
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        Select folder to take videos from
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenFolderModal('from')}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 text-[11px] font-bold text-sky-700 transition-colors cursor-pointer shrink-0 shadow-2xs flex items-center gap-1"
                  >
                    <Search className="w-3 h-3" />
                    Search / Link
                  </button>
                </div>

                {/* Dropdown of All User Drive Folders for FROM */}
                <div className="flex items-center gap-2">
                  <select
                    value={fromFolderId}
                    onChange={(e) => handleSelectFromFolder(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-sky-500 cursor-pointer shadow-2xs"
                  >
                    <option value="all">📂 All Google Drive Folders (All Videos)</option>
                    <option value="root">📁 My Drive (Root Folder)</option>
                    {allDriveFolders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        📁 {folder.name} {folder.shared ? '(Shared)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Videos inside the selected From Folder */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                    <span>
                      Videos in <strong className="text-slate-700">{fromFolderName}</strong>:
                    </span>
                    <span className="font-mono text-sky-700 font-bold">
                      {loadingFromVideos ? 'Scanning...' : `${fromFolderVideos.length} videos`}
                    </span>
                  </div>

                  {loadingFromVideos ? (
                    <div className="py-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2 bg-white rounded-xl border border-slate-200/80">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-600" />
                      <span>Loading videos from folder...</span>
                    </div>
                  ) : fromFolderVideos.length === 0 ? (
                    <div className="py-3 px-3 text-center text-[11px] text-slate-500 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between gap-2">
                      <span>No videos found in this folder.</span>
                      <button
                        onClick={() => handleSelectFromFolder('all', 'All Drive Folders')}
                        className="text-sky-700 font-bold underline cursor-pointer shrink-0"
                      >
                        Show All Videos
                      </button>
                    </div>
                  ) : (
                    <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                      {fromFolderVideos.slice(0, 25).map((vid) => {
                        const isLoaded =
                          selectedVideoName &&
                          vid.name.replace(/\.[^/.]+$/, '') === selectedVideoName;
                        return (
                          <div
                            key={vid.id}
                            className={`px-2.5 py-1.5 rounded-lg border flex items-center justify-between gap-2 text-xs transition-colors ${
                              isLoaded
                                ? 'bg-sky-50 border-sky-300 text-sky-900'
                                : 'bg-white border-slate-200 hover:border-sky-300 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Video className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                              <span className="font-medium truncate" title={vid.name}>
                                {vid.name}
                              </span>
                            </div>
                            <button
                              disabled={downloadingFileId === vid.id}
                              onClick={() => handleChooseDriveVideo(vid)}
                              className="px-2.5 py-1 rounded-md bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] cursor-pointer shrink-0 disabled:opacity-50 flex items-center gap-1 shadow-2xs"
                            >
                              {downloadingFileId === vid.id ? (
                                <>
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                  <span>Loading</span>
                                </>
                              ) : isLoaded ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>Loaded</span>
                                </>
                              ) : (
                                <>
                                  <Download className="w-3 h-3" />
                                  <span>Take &amp; Cut</span>
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* CENTER ARROW / PIPELINE INDICATOR (1 col) */}
            <div className="lg:col-span-1 flex lg:flex-col items-center justify-center gap-1.5 py-1">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs">
                <Scissors className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Cut &amp; Send
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400 hidden lg:block" />
            </div>

            {/* 2. TO FOLDER CARD (5 cols) */}
            <div className="lg:col-span-5 bg-slate-50/90 border border-slate-200/90 rounded-xl p-3.5 space-y-3 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-100/80 border border-emerald-200 text-emerald-700">
                      <Folder className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 block">
                        2. To Folder (Destination for Cut Clips)
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        Select folder where cut clips are uploaded
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenFolderModal('to')}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-[11px] font-bold text-emerald-700 transition-colors cursor-pointer shrink-0 shadow-2xs flex items-center gap-1"
                  >
                    <Search className="w-3 h-3" />
                    Search / +New
                  </button>
                </div>

                {/* Dropdown of All User Drive Folders for TO */}
                <div className="space-y-1.5">
                  <select
                    value={toFolderId || 'custom'}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'custom') {
                        handleSelectToFolder('custom', folderName || 'CineCut_Clips');
                      } else if (val === 'root') {
                        handleSelectToFolder('root', 'My Drive (Root)');
                      } else {
                        const found = allDriveFolders.find((f) => f.id === val);
                        if (found) {
                          handleSelectToFolder(found.id, found.name);
                        }
                      }
                    }}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
                  >
                    <option value="custom">
                      ✨ Auto-Create / Custom Folder: &ldquo;{folderName || 'CineCut_Clips'}&rdquo;
                    </option>
                    <option value="root">📁 My Drive (Root Folder)</option>
                    {allDriveFolders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        📁 {folder.name} {folder.shared ? '(Shared)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom / Active Destination Folder Name & Auto-Upload Toggle */}
                <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500 font-semibold shrink-0">
                      Target To Folder:
                    </span>
                    <input
                      type="text"
                      value={folderName}
                      onChange={(e) => {
                        onFolderNameChange(e.target.value);
                        if (onToFolderIdChange) onToFolderIdChange(null);
                      }}
                      placeholder="CineCut_Clips"
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-emerald-700 focus:outline-none focus:border-emerald-500 flex-1 min-w-0"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <label className="flex items-center gap-2 text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={autoUpload}
                        onChange={(e) => onAutoUploadChange(e.target.checked)}
                        className="accent-emerald-600 w-3.5 h-3.5 cursor-pointer rounded"
                      />
                      <span className="text-[11px] font-semibold">
                        Auto-send every cut clip to this folder
                      </span>
                    </label>

                    {toFolderId && (
                      <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">
                        Linked Folder ID
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Google Drive From ➔ To Folder Pipeline
              </h4>
              <p className="text-xs text-slate-500">
                Sign in with Google to view all your Drive folders, pick a <strong>From Folder</strong> for source videos, and choose a <strong>To Folder</strong> for cut clips.
              </p>
            </div>
          </div>

          <button
            onClick={handleConnectDrive}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 shrink-0"
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
        <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-xl flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={handleConnectDrive}
            className="underline text-sky-700 font-semibold cursor-pointer shrink-0"
          >
            Re-Authorize Drive
          </button>
        </div>
      )}

      {/* 1. DRIVE VIDEO & FOLDER TREE BROWSER MODAL */}
      {showDriveBrowser && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={() => setShowDriveBrowser(false)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fixed Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-sky-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Explore Google Drive Folders &amp; Videos
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Navigate My Drive or Shared folders to set your From/To Folder or load a video
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDriveBrowser(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => {
                    setBrowserTab('folders');
                    setCurrentFolderId('root');
                    setBreadcrumbs([{ id: 'root', name: 'My Drive' }]);
                    fetchFolderContent('root');
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-colors ${
                    browserTab === 'folders'
                      ? 'bg-sky-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900'
                  }`}
                >
                  My Drive Tree
                </button>
                <button
                  onClick={() => {
                    setBrowserTab('shared');
                    setCurrentFolderId('shared');
                    setBreadcrumbs([{ id: 'shared', name: 'Shared with me' }]);
                    fetchFolderContent('shared');
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-colors ${
                    browserTab === 'shared'
                      ? 'bg-sky-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900'
                  }`}
                >
                  Shared with Me
                </button>
                <button
                  onClick={() => setBrowserTab('allVideos')}
                  className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-colors ${
                    browserTab === 'allVideos'
                      ? 'bg-sky-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900'
                  }`}
                >
                  All Videos ({allVideos.length})
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
                    className="bg-white border border-slate-200 rounded-lg pl-8 pr-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-sky-500 w-44"
                  />
                </div>
              )}
            </div>

            {/* Breadcrumb Bar */}
            {(browserTab === 'folders' || browserTab === 'shared') && (
              <div className="px-5 py-2 border-b border-slate-100 flex items-center justify-between gap-2 bg-white shrink-0">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 overflow-x-auto">
                  {breadcrumbs.map((crumb, idx) => (
                    <React.Fragment key={crumb.id}>
                      {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                      <button
                        onClick={() => handleNavigateBreadcrumb(idx)}
                        className={`hover:text-sky-600 font-medium shrink-0 cursor-pointer ${
                          idx === breadcrumbs.length - 1 ? 'text-sky-700 font-bold' : ''
                        }`}
                      >
                        {crumb.name}
                      </button>
                    </React.Fragment>
                  ))}
                </div>

                {currentFolderId !== 'root' && currentFolderId !== 'shared' && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        const activeCrumb = breadcrumbs[breadcrumbs.length - 1];
                        handleSelectFromFolder(currentFolderId, activeCrumb?.name);
                        setShowDriveBrowser(false);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 text-[11px] font-bold cursor-pointer"
                    >
                      Use as From Folder
                    </button>
                    <button
                      onClick={() => {
                        const activeCrumb = breadcrumbs[breadcrumbs.length - 1];
                        handleSelectToFolder(currentFolderId, activeCrumb?.name || 'Selected Folder');
                        setShowDriveBrowser(false);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[11px] font-bold cursor-pointer"
                    >
                      Use as To Folder
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-2">
              {loadingVideos ? (
                <div className="py-16 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-sky-600" />
                  <span>Scanning Google Drive...</span>
                </div>
              ) : browserTab === 'folders' || browserTab === 'shared' ? (
                <>
                  {subFolders.length === 0 && folderVideos.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                      <p>No folders or video files found in this view.</p>
                      <button
                        onClick={handleConnectDrive}
                        className="px-3 py-1.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 font-bold text-xs cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Unlock className="w-3.5 h-3.5" /> Re-Authorize Full Drive Access
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Folder Items */}
                      {subFolders.map((folder) => (
                        <div
                          key={folder.id}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-sky-400 flex items-center justify-between gap-2 text-xs transition-colors group"
                        >
                          <div
                            onClick={() => handleNavigateToSubfolder(folder)}
                            className="flex items-center gap-3 flex-1 cursor-pointer min-w-0"
                          >
                            <Folder className="w-4 h-4 text-amber-500 shrink-0 group-hover:scale-110 transition-transform" />
                            <span className="font-semibold text-slate-800 truncate">
                              {folder.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => {
                                handleSelectFromFolder(folder.id, folder.name);
                                setShowDriveBrowser(false);
                              }}
                              className="px-2 py-1 rounded-lg bg-white hover:bg-sky-50 border border-slate-200 text-sky-700 font-semibold text-[11px] cursor-pointer"
                            >
                              From Folder
                            </button>
                            <button
                              onClick={() => {
                                handleSelectToFolder(folder.id, folder.name);
                                setShowDriveBrowser(false);
                              }}
                              className="px-2 py-1 rounded-lg bg-white hover:bg-emerald-50 border border-slate-200 text-emerald-700 font-semibold text-[11px] cursor-pointer"
                            >
                              To Folder
                            </button>
                            <button
                              onClick={() => handleNavigateToSubfolder(folder)}
                              className="p-1 rounded-lg hover:bg-slate-200/70 text-slate-500 cursor-pointer"
                              title="Open subfolder"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Video Files */}
                      {folderVideos.map((file) => (
                        <div
                          key={file.id}
                          className="p-3 rounded-xl bg-white border border-slate-200 hover:border-sky-400 flex items-center justify-between gap-3 text-xs transition-colors shadow-2xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Video className="w-4 h-4 text-sky-600 shrink-0" />
                            <span className="font-semibold text-slate-800 truncate">{file.name}</span>
                          </div>

                          <button
                            disabled={downloadingFileId === file.id}
                            onClick={() => handleChooseDriveVideo(file)}
                            className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
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
              ) : filteredAllVideos.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No videos found matching &ldquo;{videoSearchTerm}&rdquo;.
                </div>
              ) : (
                filteredAllVideos.map((file) => (
                  <div
                    key={file.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-sky-400 flex items-center justify-between gap-3 text-xs transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Video className="w-4 h-4 text-sky-600 shrink-0" />
                      <span className="font-semibold text-slate-800 truncate">{file.name}</span>
                    </div>

                    <button
                      disabled={downloadingFileId === file.id}
                      onClick={() => handleChooseDriveVideo(file)}
                      className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
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
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. UNIFIED DRIVE FOLDER PICKER MODAL (FOR "FROM FOLDER" OR "TO FOLDER") */}
      {showFolderPicker && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={() => setShowFolderPicker(false)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Folder
                  className={`w-5 h-5 ${
                    folderPickerMode === 'to' ? 'text-emerald-600' : 'text-sky-600'
                  }`}
                />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {folderPickerMode === 'to'
                      ? 'Select "To Folder" (Destination for Cut Clips)'
                      : 'Select "From Folder" (Source Videos)'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Search by folder name, paste a Google Drive folder link, or create a new folder
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFolderPicker(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search, Paste Folder Link & Create Controls */}
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 space-y-2.5 shrink-0">
              {/* 1. Live Search Existing Folders on Drive API */}
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
                <input
                  type="text"
                  value={folderSearchTerm}
                  onChange={(e) => handleLiveSearchFolders(e.target.value)}
                  placeholder="Type folder name to search your entire Google Drive..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-8 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-sky-500"
                />
                {isSearchingApiFolders && (
                  <RefreshCw className="w-3.5 h-3.5 text-sky-600 animate-spin absolute right-3" />
                )}
              </div>

              {/* 2. Paste Google Drive Folder Link or ID */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Link2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2" />
                  <input
                    type="text"
                    value={pasteFolderLinkInput}
                    onChange={(e) => setPasteFolderLinkInput(e.target.value)}
                    placeholder="Or paste Google Drive Folder URL / ID..."
                    className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <button
                  disabled={!pasteFolderLinkInput.trim() || isResolvingLink}
                  onClick={handleResolvePastedFolderLink}
                  className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-colors disabled:opacity-50 flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
                >
                  {isResolvingLink ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  Use Link
                </button>
              </div>

              {/* 3. Create New Folder Input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newFolderNameInput}
                  onChange={(e) => setNewFolderNameInput(e.target.value)}
                  placeholder="Or type a new Drive folder name to create..."
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                />
                <button
                  disabled={!newFolderNameInput.trim() || isCreatingFolder}
                  onClick={handleCreateNewDestinationFolder}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors disabled:opacity-50 flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
                >
                  {isCreatingFolder ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FolderPlus className="w-3.5 h-3.5" />
                  )}
                  Create &amp; Select
                </button>
              </div>
            </div>

            {/* Scrollable List of All User Drive Folders */}
            <div className="flex-1 overflow-y-auto p-5 space-y-2">
              {loadingFolders ? (
                <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-sky-600" />
                  <span>Loading all folders from your Google Drive...</span>
                </div>
              ) : (
                <>
                  {/* Special Root / All Options */}
                  {folderPickerMode === 'from' && (
                    <div
                      onClick={() => {
                        handleSelectFromFolder('all', 'All Drive Folders');
                        setShowFolderPicker(false);
                      }}
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-colors ${
                        fromFolderId === 'all'
                          ? 'bg-sky-50 border-sky-300 text-sky-800 font-bold'
                          : 'bg-white border-slate-200 hover:border-sky-300 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <FolderOpen className="w-4 h-4 text-sky-600 shrink-0" />
                        <span>All Google Drive Folders (Show All Videos)</span>
                      </div>
                      {fromFolderId === 'all' && <Check className="w-4 h-4 text-sky-600" />}
                    </div>
                  )}

                  <div
                    onClick={() => {
                      if (folderPickerMode === 'to') {
                        handleSelectToFolder('root', 'My Drive (Root)');
                      } else {
                        handleSelectFromFolder('root', 'My Drive (Root)');
                      }
                      setShowFolderPicker(false);
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-colors ${
                      (folderPickerMode === 'to' && toFolderId === 'root') ||
                      (folderPickerMode === 'from' && fromFolderId === 'root')
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <HardDrive className="w-4 h-4 text-slate-600 shrink-0" />
                      <span>My Drive (Root Folder)</span>
                    </div>
                    {((folderPickerMode === 'to' && toFolderId === 'root') ||
                      (folderPickerMode === 'from' && fromFolderId === 'root')) && (
                      <Check className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>

                  {filteredModalFolders.length === 0 ? (
                    <div className="py-8 px-4 text-center text-slate-500 text-xs space-y-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <p>
                        {folderSearchTerm
                          ? `No Drive folders found matching "${folderSearchTerm}".`
                          : 'No sub-folders returned yet from your Google Drive.'}
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <button
                          onClick={handleConnectDrive}
                          className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Unlock className="w-3.5 h-3.5" /> Unlock All Drive Folders
                        </button>
                      </div>
                    </div>
                  ) : (
                    filteredModalFolders.map((folder) => {
                      const isSelected =
                        folderPickerMode === 'to'
                          ? toFolderId === folder.id
                          : fromFolderId === folder.id;

                      return (
                        <div
                          key={folder.id}
                          onClick={() => {
                            if (folderPickerMode === 'to') {
                              handleSelectToFolder(folder.id, folder.name);
                            } else {
                              handleSelectFromFolder(folder.id, folder.name);
                            }
                            setShowFolderPicker(false);
                          }}
                          className={`p-3 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                              : 'bg-slate-50/70 hover:bg-slate-100 border-slate-200 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <Folder
                              className={`w-4 h-4 shrink-0 ${
                                isSelected ? 'text-emerald-600' : 'text-amber-500'
                              }`}
                            />
                            <span className="truncate">{folder.name}</span>
                            {folder.shared && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-medium">
                                Shared
                              </span>
                            )}
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                        </div>
                      );
                    })
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
