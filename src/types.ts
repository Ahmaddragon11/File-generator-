export interface DownloadEvent {
  timestamp: string;
  speedMbps?: number;
  ipIndicator?: string;
}

export interface FileMetadata {
  id: string;
  name: string;
  extension: string;
  size: number; // raw size in bytes
  unit: 'B' | 'KB' | 'MB' | 'GB';
  type: 'zeros' | 'random' | 'custom';
  customText?: string;
  createdAt: string;
  downloadCount: number;
  maxDownloads?: number; // 0 or undefined means unlimited
  password?: string; // Optional password to protect download
  downloadHistory?: DownloadEvent[]; // Historic entries for visual analytics
}
