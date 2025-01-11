# Sync Implementation

## Overview

The sync functionality allows users to synchronize their project files with a local directory. The implementation includes features like persistent project folders, configurable auto-sync, and detailed sync statistics.

## Key Features

### 1. Project Folder Management

- **Persistent Project Folders**: Each project has a dedicated folder that persists across sessions
- **Smart Folder Matching**: Uses project name normalization to match existing folders
- **Singleton Manager**: Centralized `ProjectFolderManager` for consistent folder handling
- **Local Storage**: Project folder mappings are stored in localStorage for persistence

### 2. Sync Settings

- **Auto Sync**: Enable/disable automatic syncing at configurable intervals
- **Sync Interval**: Configurable from 1 minute to 1 hour
- **Sync on Save**: Option to automatically sync when files are saved
- **Sync Mode**: Three modes available:
  - Ask before overwriting
  - Always overwrite
  - Skip existing files
- **Exclude Patterns**: Configurable patterns for files/folders to exclude from sync

### 3. Sync Statistics & History

- **Real-time Status**: Shows connection status and last sync time
- **Sync History**: Maintains detailed history of sync operations
- **Time-based Filtering**: Filter history by 24h, 7d, 30d, or all time
- **Detailed Stats**:
  - Total syncs performed
  - Total files synced
  - Total data transferred
  - Average sync duration
- **Per-sync Details**:
  - Project name
  - Number of files
  - Size of data
  - Duration
  - Status (success/partial/failed)
  - List of synced files

## Technical Implementation

### Project Folder Manager

```typescript
class ProjectFolderManager {
  private static _instance: ProjectFolderManager;
  private _projectFolders: Map<string, ProjectSyncInfo>;

  // Singleton instance management
  static getInstance(): ProjectFolderManager;

  // Core functionality
  private _loadFromStorage(): void;
  private _saveToStorage(): void;
  private _normalizeProjectName(name: string): string;
  findExistingProject(projectName: string): ProjectSyncInfo | null;
  verifyProjectFolder(handle: FileSystemDirectoryHandle, folderName: string): Promise<boolean>;
  registerProject(projectName: string, folderName: string): Promise<ProjectSyncInfo>;
  getOrCreateProjectFolder(
    rootHandle: FileSystemDirectoryHandle,
    projectName: string,
    createIfNotExists: boolean,
  ): Promise<{ folderHandle: FileSystemDirectoryHandle; projectInfo: ProjectSyncInfo }>;
}
```

### Data Structures

```typescript
interface ProjectSyncInfo {
  projectName: string;
  folderName: string;
  lastSync: number;
}

interface SyncSettings {
  autoSync: boolean;
  autoSyncInterval: number;
  syncOnSave: boolean;
  excludePatterns: string[];
  syncMode: 'ask' | 'overwrite' | 'skip';
  projectFolders: Record<string, ProjectSyncInfo>;
}

interface SyncSession {
  id: string;
  timestamp: number;
  lastSync: number;
  files: Set<string>;
  history: SyncHistoryEntry[];
  statistics: SyncStatistics[];
  projectFolder?: string;
  projectName?: string;
}

interface SyncStatistics {
  totalFiles: number;
  totalSize: number;
  duration: number;
  timestamp: number;
}

interface SyncHistoryEntry {
  id: string;
  projectName: string;
  timestamp: number;
  statistics: SyncStatistics;
  files: string[];
  status: 'success' | 'partial' | 'failed';
}
```

### UI Components

1. **SyncTab Component**:

   - Main sync configuration interface
   - Status bar with connection state and last sync time
   - Folder selection and management
   - Settings configuration
   - Exclude patterns management

2. **SyncStats Component**:
   - Time-range filtering for history
   - Statistics grid with key metrics
   - Latest sync summary
   - Detailed sync history with expandable entries

## Sync Process

1. **Initialization**:

   - Load saved settings from localStorage
   - Initialize ProjectFolderManager
   - Set up auto-sync interval checker

2. **Folder Selection**:

   - User selects root sync folder
   - Verify write permissions with test directory
   - Store folder handle

3. **Project Folder Handling**:

   - Normalize project name
   - Check for existing project folder
   - Create new folder only for new projects
   - Update project folder mappings

4. **Sync Operation**:

   - Check exclude patterns
   - Create directory structure
   - Handle file conflicts based on sync mode
   - Track progress with toast notifications
   - Update statistics and history
   - Save sync history to localStorage

5. **Auto-sync**:
   - Check every 30 seconds
   - Compare time since last sync with interval
   - Trigger sync if needed

## Usage Instructions

1. **Initial Setup**:

   - Select sync folder via UI
   - Configure auto-sync settings if desired
   - Set up exclude patterns

2. **Manual Sync**:

   - Click "Sync Now" button
   - Monitor progress in status bar
   - View results in sync history

3. **Auto Sync**:

   - Enable auto sync
   - Select desired interval
   - System will automatically sync at specified intervals

4. **Conflict Resolution**:

   - Choose preferred sync mode
   - Handle conflicts via UI prompts if in "ask" mode
   - View skipped files in sync history

5. **Monitoring**:
   - View real-time sync status
   - Check sync history for details
   - Monitor statistics for performance

## Best Practices

1. **Folder Organization**:

   - Use descriptive project names
   - Keep folder structure consistent
   - Regularly clean up unused folders

2. **Sync Settings**:

   - Configure appropriate exclude patterns
   - Choose suitable sync interval
   - Select appropriate sync mode

3. **Performance**:
   - Monitor sync statistics
   - Adjust settings based on usage patterns
   - Clean up old sync history periodically

## Future Improvements

### 1. Enhanced Sync Performance

- **Parallel File Processing**: Implement concurrent file transfers for larger projects
- **Differential Sync**: Only sync changed files by tracking file hashes
- **Compression**: Add optional compression for large file transfers
- **Chunked Transfers**: Split large files into chunks for better reliability

### 2. Advanced Conflict Resolution

- **Visual Diff Tool**: Implement a visual diff viewer for conflicting files
- **Merge Options**: Add the ability to merge changes instead of just overwrite/skip
- **Selective Sync**: Allow users to choose specific files/folders to sync
- **Conflict Prevention**: Add file locking mechanism for shared projects

### 3. Improved Project Management

- **Project Templates**: Save and reuse sync configurations as templates
- **Sync Groups**: Group related projects with shared sync settings
- **Batch Operations**: Perform sync operations on multiple projects at once
- **Project Archiving**: Archive old projects with their sync history

### 4. Enhanced Security

- **Encryption**: Add end-to-end encryption for sensitive files
- **Access Control**: Implement user-based permissions for shared projects
- **Audit Logging**: Detailed logging of all sync operations
- **Integrity Checks**: Verify file integrity after sync operations

### 5. Extended Statistics & Monitoring

- **Advanced Analytics**: Detailed sync performance metrics and trends
- **Custom Reports**: Generate customizable sync reports
- **Email Notifications**: Alert users about sync issues or conflicts
- **Dashboard**: Visual representation of sync statistics and history

### 6. Cloud Integration

- **Cloud Backup**: Optional backup to cloud storage providers
- **Cross-device Sync**: Sync between multiple devices via cloud
- **Version Control**: Integration with version control systems
- **Collaborative Features**: Real-time sync for collaborative editing

### 7. UI/UX Enhancements

- **Dark/Light Themes**: Theme support for sync interface
- **Custom Views**: Configurable statistics and history views
- **Quick Actions**: Shortcuts for common sync operations
- **Mobile Support**: Responsive design for mobile devices

### 8. Automation & Integration

- **API Integration**: Public API for external tool integration
- **Webhook Support**: Trigger external actions on sync events
- **Scripting**: Custom scripts for sync automation
- **CI/CD Integration**: Integration with development workflows