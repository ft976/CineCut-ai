export interface GoogleDriveUser {
  name: string;
  email: string;
  picture: string;
  hasFullDriveScope?: boolean;
}

export interface DriveUploadProgress {
  bytesUploaded: number;
  totalBytes: number;
  percentage: number;
}

export interface UploadedDriveFile {
  id: string;
  name: string;
  webViewLink: string;
  webContentLink?: string;
  mimeType: string;
}

export interface DriveVideoFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  parents?: string[];
}

export interface DriveFolderItem {
  id: string;
  name: string;
  parents?: string[];
  shared?: boolean;
}

// Fast in-memory cache for Drive folders (TTL: 30s)
const folderCache = new Map<string, { timestamp: number; data: DriveFolderItem[] }>();
const FOLDER_CACHE_TTL_MS = 30 * 1000;

export function invalidateDriveFolderCache() {
  folderCache.clear();
}

/**
 * Extract folder ID from a Google Drive folder URL or raw ID string
 */
export function extractDriveFolderId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Match /folders/<ID> in URLs like https://drive.google.com/drive/folders/1AbCdEfG...
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch && folderMatch[1]) {
    return folderMatch[1];
  }

  // Match id=<ID> query param
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && idParamMatch[1]) {
    return idParamMatch[1];
  }

  // Raw Drive ID (typically 19-60 alphanumeric/dash/underscore characters, no slashes or spaces)
  if (/^[a-zA-Z0-9_-]{15,80}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Fetch metadata for a specific Google Drive folder ID
 */
export async function getDriveFolderById(
  accessToken: string,
  folderId: string
): Promise<DriveFolderItem | null> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
        folderId
      )}?fields=id,name,mimeType,parents&supportsAllDrives=true`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.id) return null;
    return {
      id: data.id,
      name: data.name || `Folder (${data.id.slice(0, 6)})`,
      parents: data.parents,
    };
  } catch (err) {
    console.error('Failed to look up Drive folder by ID:', err);
    return null;
  }
}

/**
 * Verify access token validity, check granted scopes, and fetch Google user profile.
 * Returns null if the token is expired or invalid (401/400).
 */
export async function getGoogleUserProfile(accessToken: string): Promise<GoogleDriveUser | null> {
  if (!accessToken) return null;

  let hasFullDriveScope = true;
  let tokenEmail = '';

  try {
    // 1. Validate token & inspect granted scopes via tokeninfo
    const tokenRes = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(
        accessToken
      )}`
    );

    if (!tokenRes.ok) {
      // Token is expired or invalid! Return null so stale tokens are cleared.
      return null;
    }

    const tokenData = await tokenRes.json();
    const scopes: string[] = (tokenData.scope || '').split(' ');
    hasFullDriveScope =
      scopes.includes('https://www.googleapis.com/auth/drive') ||
      scopes.includes('https://www.googleapis.com/auth/drive.readonly') ||
      scopes.includes('https://www.googleapis.com/auth/drive.metadata') ||
      scopes.includes('https://www.googleapis.com/auth/drive.metadata.readonly');
    tokenEmail = tokenData.email || '';
  } catch (err) {
    console.warn('Tokeninfo check notice:', err);
  }

  try {
    const driveAboutRes = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (driveAboutRes.status === 401) {
      return null;
    }

    if (driveAboutRes.ok) {
      const data = await driveAboutRes.json();
      if (data.user) {
        return {
          name: data.user.displayName || data.user.emailAddress || tokenEmail || 'Google Drive User',
          email: data.user.emailAddress || tokenEmail || 'Connected Account',
          picture: data.user.photoLink || '',
          hasFullDriveScope,
        };
      }
    }

    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (res.status === 401) {
      return null;
    }

    if (res.ok) {
      const data = await res.json();
      return {
        name: data.name || data.email || tokenEmail || 'Google Drive User',
        email: data.email || tokenEmail || 'Connected Account',
        picture: data.picture || '',
        hasFullDriveScope,
      };
    }

    if (tokenEmail) {
      return {
        name: tokenEmail.split('@')[0],
        email: tokenEmail,
        picture: '',
        hasFullDriveScope,
      };
    }

    return null;
  } catch (error) {
    console.warn('Google profile fetch error:', error);
    return null;
  }
}

/**
 * List video files in user's Google Drive (optionally filtered by parent folderId)
 */
export async function listDriveVideoFiles(
  accessToken: string,
  parentFolderId?: string
): Promise<DriveVideoFile[]> {
  let query = `mimeType contains 'video/' and trashed = false`;
  if (parentFolderId && parentFolderId !== 'all') {
    query = `'${parentFolderId}' in parents and mimeType contains 'video/' and trashed = false`;
  }
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        query
      )}&fields=files(id,name,mimeType,size,createdTime,parents)&pageSize=200&orderBy=createdTime desc&includeItemsFromAllDrives=true&supportsAllDrives=true`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.files || [];
  } catch (err) {
    console.error('Failed to list drive video files:', err);
    return [];
  }
}

/**
 * List all folders in user's Google Drive (My Drive + Shared with me + optional search term)
 */
export async function listAllDriveFolders(
  accessToken: string,
  searchQuery?: string,
  forceRefresh: boolean = false
): Promise<DriveFolderItem[]> {
  const cacheKey = `${accessToken.slice(-12)}_${(searchQuery || '').trim().toLowerCase()}`;
  if (!forceRefresh) {
    const cached = folderCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < FOLDER_CACHE_TTL_MS) {
      return cached.data;
    }
  }

  let query = `mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  if (searchQuery && searchQuery.trim()) {
    const cleanSearch = searchQuery.trim().replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    query += ` and name contains '${cleanSearch}'`;
  }

  try {
    const allFolders: DriveFolderItem[] = [];
    let pageToken: string | undefined = undefined;
    let pagesFetched = 0;

    // Fetch up to 3 pages (up to 600 folders) so users with large Drives see all their folders
    do {
      const pageUrl = new URL('https://www.googleapis.com/drive/v3/files');
      pageUrl.searchParams.set('q', query);
      pageUrl.searchParams.set('fields', 'nextPageToken,files(id,name,parents,shared)');
      pageUrl.searchParams.set('pageSize', '200');
      pageUrl.searchParams.set('orderBy', 'name asc');
      pageUrl.searchParams.set('includeItemsFromAllDrives', 'true');
      pageUrl.searchParams.set('supportsAllDrives', 'true');
      if (pageToken) {
        pageUrl.searchParams.set('pageToken', pageToken);
      }

      const res = await fetch(pageUrl.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) break;
      const data = await res.json();
      if (Array.isArray(data.files)) {
        allFolders.push(...data.files);
      }
      pageToken = data.nextPageToken;
      pagesFetched += 1;
    } while (pageToken && pagesFetched < 3);

    if (allFolders.length > 0) {
      folderCache.set(cacheKey, { timestamp: Date.now(), data: allFolders });
    }
    return allFolders;
  } catch (err) {
    console.error('Failed to list drive folders:', err);
    return [];
  }
}

/**
 * List folders and videos within a specific parent folder ID (or 'root' or 'shared')
 */
export async function listFolderContents(
  accessToken: string,
  parentFolderId: string = 'root'
): Promise<{ folders: DriveFolderItem[]; videos: DriveVideoFile[] }> {
  try {
    const query =
      parentFolderId === 'shared'
        ? `sharedWithMe = true and trashed = false`
        : `'${parentFolderId}' in parents and trashed = false`;

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        query
      )}&fields=files(id,name,mimeType,size,createdTime,parents,shared)&pageSize=200&orderBy=name asc&includeItemsFromAllDrives=true&supportsAllDrives=true`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    if (!res.ok) {
      const videos = await listDriveVideoFiles(accessToken);
      const folders = await listAllDriveFolders(accessToken);
      return { folders, videos };
    }
    const data = await res.json();
    const files = data.files || [];

    const folders = files.filter(
      (f: any) => f.mimeType === 'application/vnd.google-apps.folder'
    );
    const videos = files.filter((f: any) => f.mimeType && f.mimeType.includes('video/'));

    return { folders, videos };
  } catch (err) {
    console.error('Error listing folder contents:', err);
    return { folders: [], videos: [] };
  }
}

/**
 * Download a file from Google Drive as a Blob
 */
export async function downloadDriveFileBlob(accessToken: string, fileId: string): Promise<Blob> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      fileId
    )}?alt=media&supportsAllDrives=true`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to download file from Google Drive (Status ${res.status})`);
  }
  return await res.blob();
}

/**
 * Create or get a folder in Google Drive
 */
export async function createDriveFolder(
  accessToken: string,
  folderName: string,
  parentFolderId?: string
): Promise<string> {
  let query = `name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  if (parentFolderId) {
    query += ` and '${parentFolderId}' in parents`;
  }

  try {
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        query
      )}&fields=files(id,name)&includeItemsFromAllDrives=true&supportsAllDrives=true`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id;
      }
    }
  } catch (e) {
    console.warn('Drive folder search failed, creating new one:', e);
  }

  const metadata: { name: string; mimeType: string; parents?: string[] } = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };

  if (parentFolderId && parentFolderId !== 'root') {
    metadata.parents = [parentFolderId];
  }

  const createRes = await fetch(
    'https://www.googleapis.com/drive/v3/files?fields=id&supportsAllDrives=true',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create Google Drive folder: ${errText}`);
  }

  const folderData = await createRes.json();
  invalidateDriveFolderCache();
  return folderData.id;
}

/**
 * Upload a file blob to Google Drive in multipart format with automatic retry
 */
export async function uploadFileToDrive(
  accessToken: string,
  folderId: string,
  fileBlob: Blob,
  fileName: string,
  onProgress?: (progress: DriveUploadProgress) => void
): Promise<UploadedDriveFile> {
  const metadata: { name: string; parents?: string[] } = {
    name: fileName,
  };
  if (folderId && folderId !== 'root') {
    metadata.parents = [folderId];
  }

  const attemptUpload = (): Promise<UploadedDriveFile> => {
    const form = new FormData();
    form.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    form.append('file', fileBlob);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.open(
        'POST',
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,mimeType&supportsAllDrives=true'
      );
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percentage = Math.round((e.loaded / e.total) * 100);
            onProgress({
              bytesUploaded: e.loaded,
              totalBytes: e.total,
              percentage,
            });
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            resolve({
              id: res.id,
              name: res.name,
              webViewLink: res.webViewLink || `https://drive.google.com/file/d/${res.id}/view`,
              webContentLink: res.webContentLink,
              mimeType: res.mimeType,
            });
          } catch (err) {
            reject(new Error('Failed to parse Google Drive response'));
          }
        } else {
          reject(new Error(`Drive upload error ${xhr.status}: ${xhr.responseText}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error uploading to Google Drive'));
      xhr.send(form);
    });
  };

  let lastErr: any;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await attemptUpload();
    } catch (err: any) {
      lastErr = err;
      if (err.message?.includes('401') || err.message?.includes('403')) {
        break;
      }
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, attempt * 600));
      }
    }
  }
  throw lastErr;
}
