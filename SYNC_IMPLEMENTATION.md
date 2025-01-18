# Sync Implementation

## Overview

The sync functionality provides a robust system for synchronizing project files with a local directory. It features intelligent project folder management with timestamp-based naming, automated sync capabilities, comprehensive sync statistics tracking, and a modern UI with trend analysis.

## Key Components

### 1. Project Folder Management
- Singleton `ProjectFolderManager` for centralized folder handling
- Project name normalization (lowercase, alphanumeric with underscores)
- Timestamp-based unique folder naming (e.g., `project_name_a1b2c3`)
- Persistent storage of project mappings in localStorage
- Smart matching of existing projects (exact match and base name match)

### 2. Sync Settings
- Auto-sync with 30-second check intervals
- Sync-on-save option
- Three sync modes:
  - Ask: Prompt for each file conflict
  - Overwrite: Replace existing files without prompting
  - Skip: Preserve existing files
- Default exclude patterns: ['node_modules/**', '*.log', '.DS_Store']

### 3. Sync Process
- Real-time progress tracking with toast notifications
- Binary file handling (excluded from sync)
- Directory structure preservation
- Conflict detection and resolution based on sync mode
- Pattern-based file exclusion using 'ignore' package

### 4. Statistics & History
- Per-sync statistics tracking:
  - Number of files synced
  - Total data size
  - Sync duration
  - Timestamp
- Trend analysis comparing current vs previous periods
- Comprehensive sync history:
  - Unique UUID per sync
  - Project name
  - Status (success/partial/failed)
  - List of synced files
  - Limited to last 100 entries
  - Paginated view (10 items per page)

## UI Components

### 1. Core Components
- `SyncTab`: Main sync control interface
  - Sync folder selection and display
  - Manual sync trigger
  - Real-time sync status indicator
  - Settings configuration
  - File statistics display

- `SyncStats`: Comprehensive statistics and history view
  - Time-range filtered statistics
  - Trend indicators for key metrics
  - Visual timeline for sync history
  - Paginated history list
  - Latest sync summary

### 2. Reusable Components
- `StatsCard`: Statistics display with trend indicators
  ```typescript
  interface StatsCardProps {
    icon: string;
    label: string;
    value: string | number;
    color?: string;
    trend?: { value: number; isPositive: boolean } | null;
  }
  ```

- `SyncStatusIndicator`: Real-time sync status visualization
  ```typescript
  interface SyncStatusIndicatorProps {
    status: 'idle' | 'syncing' | 'error';
  }
  ```

- `TimeRangeSelector`: Time range filtering control
  ```typescript
  interface TimeRangeSelectorProps {
    value: string;
    onChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
  }
  ```

- `HistoryEntry`: Timeline-based history entry display
  ```typescript
  interface HistoryEntryProps {
    entry: SyncHistoryEntry;
    expanded: boolean;
    onToggle: () => void;
    formatters: {
      size: (bytes: number) => string;
      time: (date: number | Date) => string;
    };
  }
  ```

## Technical Implementation

### Core Data Structures

```typescript
interface SyncSettings {
  autoSync: boolean;
  autoSyncInterval: number;
  syncOnSave: boolean;
  excludePatterns: string[];
  syncMode: 'ask' | 'overwrite' | 'skip';
  projectFolders: Record<string, ProjectSyncInfo>;
}

interface ProjectSyncInfo {
  projectName: string;
  folderName: string;
  lastSync: number;
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
```

## Sync Process Flow

1. **Project Setup**
   - Normalize project name (lowercase, remove special chars)
   - Find existing project or create new one
   - Generate unique folder name with timestamp suffix
   - Create project directory if needed

2. **Sync Initialization**
   - Load sync settings from localStorage
   - Initialize ProjectFolderManager singleton
   - Set up 30-second auto-sync checker
   - Create or resume sync session

3. **File Synchronization**
   - Display progress toast notification
   - For each non-binary file:
     - Check against exclude patterns
     - Create necessary directories
     - Handle conflicts per sync mode
     - Write file content if approved
     - Track sync statistics

4. **History & Statistics**
   - Generate unique sync ID (UUID)
   - Record sync statistics (files, size, duration)
   - Update session history
   - Maintain last 100 entries in localStorage
   - Update last sync timestamp
   - Calculate trends for statistics

## Usage Guide

1. **Initial Setup**
   - Select root sync folder
   - Configure sync mode preference
   - Set exclude patterns if needed
   - Enable auto-sync if desired

2. **Manual Sync**
   - View current sync status via the status indicator
   - Click "Sync Now" to trigger manual synchronization
   - Monitor real-time progress with visual feedback
   - Review updated statistics and history entries
   - Handle any conflict prompts based on sync mode

3. **Auto-sync**
   - Enable "Auto Sync" in settings
   - Configure sync interval (1-3600 seconds)
   - System automatically syncs files when saved
   - Real-time status updates every 10 seconds
   - History and statistics refresh automatically

## Best Practices

1. **Project Organization**
   - Use descriptive project names
   - Let system handle folder naming
   - Review exclude patterns for efficiency

2. **Conflict Management**
   - Choose appropriate sync mode
   - Monitor partial sync status
   - Review conflict prompts carefully

3. **Performance**
   - Configure reasonable auto-sync intervals
   - Exclude unnecessary files/directories
   - Monitor sync statistics and trends
   - Clean old sync history periodically
