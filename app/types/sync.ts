export interface SyncStatistics {
  totalFiles: number;
  totalSize: number;
  duration: number;
  timestamp: number;
}

export interface SyncHistoryEntry {
  id: string;
  projectName: string;
  timestamp: number;
  statistics: SyncStatistics;
  files: string[];
  status: 'success' | 'partial' | 'failed';
}

export interface ProjectSyncInfo {
  projectName: string;
  folderName: string;
  lastSync: number;
  syncEnabled: boolean;
}

export interface SyncSettings {
  autoSync: boolean;
  autoSyncInterval: number;
  syncOnSave: boolean;
  excludePatterns: string[];
  syncMode: 'ask' | 'overwrite' | 'skip';
  projectFolders: Record<string, ProjectSyncInfo>;
  defaultSyncEnabled: boolean;
}

export interface SyncSession {
  id: string;
  timestamp: number;
  lastSync: number;
  files: Set<string>;
  history: SyncHistoryEntry[];
  statistics: SyncStatistics[];
  projectFolder?: string;
  projectName?: string;
}
