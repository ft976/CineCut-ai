export interface GoogleDriveUser {
  name: string;
  email: string;
  picture: string;
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
}

/**
 * Fetch Google user profile using access token
 */
export async function getGoogleUserProfile(accessToken: string): Promise<GoogleDriveUser | null> {
  if (!accessToken) return null;

  try {
    const driveAboutRes = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (driveAboutRes.ok) {
      const data = await driveAboutRes.json();
      if (data.user) {
        return {
          name: data.user.displayName || data.user.emailAddress || 'Google Drive User',
          email: data.user.emailAddress || 'Connected Account',
          picture: data.user.photoLink || '',
        };
      }
    }

    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      return {
        name: data.name || data.email || 'Google Drive User',
        email: data.email || 'Connected Account',
        picture: data.picture || '',
      };
    }

    return {
      name: 'Google Drive User',
      email: 'Drive Account Active',
      picture: '',
    };
  } catch (error) {
    console.warn('Google profile fetch notice:', error);
    return {
      name: 'Google Drive User',
      email: 'Drive Account Active',
      picture: '',
    };
  }
}

/**
 * List video files in user's Google Drive
 */
export async function listDriveVideoFiles(accessToken: string): Promise<DriveVideoFile[]> {
  const query = `mimeType contains 'video/' and trashed = false`;
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        query
      )}&fields=files(id,name,mimeType,size,createdTime,parents)&pageSize=50&orderBy=createdTime desc`,
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
 * List all folders in user's Google Drive
 */
export async function listAllDriveFolders(accessToken: string): Promise<DriveFolderItem[]> {
  const query = `mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        query
      )}&fields=files(id,name,parents)&pageSize=100&orderBy=name asc`,
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
    console.error('Failed to list drive folders:', err);
    return [];
  }
}

/**
 * List folders and videos within a specific parent folder ID (or root)
 */
export async function listFolderContents(
  accessToken: string,
  parentFolderId: string = 'root'
): Promise<{ folders: DriveFolderItem[]; videos: DriveVideoFile[] }> {
  try {
    const query = `'${parentFolderId}' in parents and trashed = false`;
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        query
      )}&fields=files(id,name,mimeType,size,createdTime,parents)&pageSize=100&orderBy=name asc`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    if (!res.ok) {
      // Fallback to global list if folder search fails
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
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
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
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
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

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create Google Drive folder: ${errText}`);
  }

  const folderData = await createRes.json();
  return folderData.id;
}

/**
 * Upload a file blob to Google Drive in multipart format
 */
export async function uploadFileToDrive(
  accessToken: string,
  folderId: string,
  fileBlob: Blob,
  fileName: string,
  onProgress?: (progress: DriveUploadProgress) => void
): Promise<UploadedDriveFile> {
  const metadata = {
    name: fileName,
    parents: [folderId],
  };

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
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,mimeType'
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
}
