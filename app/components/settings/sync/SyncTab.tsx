import { useStore } from '@nanostores/react';
import { workbenchStore } from '~/lib/stores/workbench';
import { PanelHeaderButton } from '~/components/ui/PanelHeaderButton';
import { useState, useEffect, useCallback } from 'react';
import SyncStats from './SyncStats';
import { classNames } from '~/utils/classNames';
import { IconButton } from '~/components/ui/IconButton';
import { SyncStatusIndicator } from './components/SyncStatusIndicator';

export default function SyncTab() {
  const syncFolder = useStore(workbenchStore.syncFolder);
  const syncSettings = useStore(workbenchStore.syncSettings);
  const currentSession = useStore(workbenchStore.currentSession);
  const syncStatus = useStore(workbenchStore.syncStatus);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [totalFiles, setTotalFiles] = useState(0);
  const [totalSize, setTotalSize] = useState(0);

  const handleSelectFolder = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      await workbenchStore.setSyncFolder(handle);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      console.error('Failed to select sync folder:', error);
    }
  };

  const handleManualSync = async () => {
    if (!syncFolder) {
      return;
    }

    try {
      setIsManualSyncing(true);
      await workbenchStore.syncFiles();

      // Force immediate updates
      updateLastSyncTime();
      updateSyncStats();
    } catch (error) {
      console.error('Manual sync error:', error);
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleSaveSettings = (settings: Partial<typeof syncSettings>) => {
    workbenchStore.saveSyncSettings({
      ...syncSettings,
      ...settings,
    });
  };

  const updateLastSyncTime = useCallback(() => {
    const lastSync = currentSession?.lastSync;

    if (!lastSync) {
      setLastSyncTime('');
      return;
    }

    const now = Date.now();
    const diff = now - lastSync;
    const date = new Date(lastSync);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const timeString = `${hours}:${minutes}:${seconds}`;

    if (diff < 60000) {
      // less than 1 minute
      setLastSyncTime(timeString);
    } else if (diff < 3600000) {
      // less than 1 hour
      const mins = Math.floor(diff / 60000);
      setLastSyncTime(`${timeString} (${mins}m ago)`);
    } else {
      // more than 1 hour
      const hours = Math.floor(diff / 3600000);
      setLastSyncTime(`${timeString} (${hours}h ago)`);
    }
  }, [currentSession?.lastSync]);

  const updateSyncStats = useCallback(() => {
    if (currentSession?.statistics?.length) {
      const latest = currentSession.statistics[currentSession.statistics.length - 1];
      setTotalFiles(latest.totalFiles);
      setTotalSize(latest.totalSize);
    }
  }, [currentSession?.statistics]);

  // Update stats whenever session changes
  useEffect(() => {
    updateSyncStats();
    updateLastSyncTime();
  }, [currentSession, updateSyncStats, updateLastSyncTime]);

  // Update last sync time periodically
  useEffect(() => {
    if (!currentSession?.lastSync) {
      setLastSyncTime('');
      return undefined;
    }

    const interval = setInterval(updateLastSyncTime, 10000);

    return () => clearInterval(interval);
  }, [currentSession?.lastSync, updateLastSyncTime]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) {
      return '0 B';
    }

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="space-y-8">
      {/* Sync Controls */}
      <div className="bg-bolt-elements-background-depth-3 p-4 rounded-lg border border-bolt-elements-borderColor/10">
        <div className="flex flex-col gap-4">
          {/* Header and Status */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-medium text-bolt-elements-textPrimary">Sync Controls</h3>
              <div className="mt-1.5 flex items-center gap-3">
                {syncFolder && lastSyncTime && (
                  <div className="text-sm text-bolt-elements-textSecondary flex items-center gap-2">
                    <div className="i-ph:clock-duotone text-bolt-elements-textTertiary" />
                    Last synced {lastSyncTime}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={classNames(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md border transition-colors cursor-default',
                  {
                    'bg-green-500/10 border-green-500/20': !isManualSyncing && syncStatus.isReady,
                    'bg-bolt-elements-background-depth-4 border-bolt-elements-borderColor/5':
                      isManualSyncing || !syncStatus.isReady,
                  },
                )}
              >
                <div className="relative">
                  <SyncStatusIndicator status={isManualSyncing ? 'syncing' : !syncStatus.isReady ? 'error' : 'idle'} />
                  {isManualSyncing && (
                    <div className="absolute inset-0 animate-ping">
                      <SyncStatusIndicator status="syncing" />
                    </div>
                  )}
                </div>
                <span
                  className={classNames('text-sm whitespace-nowrap', {
                    'text-green-500 font-medium': !isManualSyncing && syncStatus.isReady,
                    'text-bolt-elements-textSecondary': isManualSyncing || !syncStatus.isReady,
                  })}
                >
                  {isManualSyncing ? 'Syncing...' : !syncStatus.isReady ? 'Not Connected' : 'Connected'}
                </span>
              </div>
              <PanelHeaderButton
                onClick={handleSelectFolder}
                className="text-sm px-3 py-1.5 bg-bolt-elements-button-primary-background hover:bg-bolt-elements-button-primary-backgroundHover text-bolt-elements-button-primary-text transition-all rounded-md flex items-center gap-1.5"
              >
                <div className="i-ph:folder-simple-plus-duotone" />
                {syncFolder ? 'Change Main Folder' : 'Set Main Folder'}
              </PanelHeaderButton>
              {syncFolder && (
                <PanelHeaderButton
                  onClick={handleManualSync}
                  disabled={isManualSyncing}
                  aria-label={isManualSyncing ? 'Sync in progress...' : 'Manually sync files now'}
                  className="text-sm px-3 py-1.5 bg-bolt-elements-button-primary-background hover:bg-bolt-elements-button-primary-backgroundHover text-bolt-elements-button-primary-text disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-md flex items-center gap-1.5"
                >
                  <div className={classNames('i-ph:arrows-clockwise-duotone', { 'animate-spin': isManualSyncing })} />
                  {isManualSyncing ? 'Syncing...' : 'Sync Now'}
                </PanelHeaderButton>
              )}
            </div>
          </div>

          {/* Sync Settings Indicators */}
          {(syncSettings.autoSync || syncSettings.syncOnSave) && (
            <div className="flex items-center gap-4 p-3 rounded-md bg-bolt-elements-background-depth-4 border border-bolt-elements-borderColor/5">
              {syncSettings.autoSync && (
                <div className="flex items-center gap-1.5 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-sm shadow-green-500/20" />
                  <span className="text-green-500">Auto-sync every {syncSettings.autoSyncInterval}m</span>
                </div>
              )}
              {syncSettings.syncOnSave && (
                <div className="flex items-center gap-1.5 text-sm">
                  <div className="i-ph:check-circle-duotone text-green-500" />
                  <span className="text-green-500">Sync on save</span>
                </div>
              )}
            </div>
          )}

          {/* Folders */}
          <div className="grid gap-3">
            {/* Main Sync Folder */}
            <div className="flex items-center gap-4 p-3 rounded-lg bg-bolt-elements-background-depth-4 border border-bolt-elements-borderColor/5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="i-ph:folder-simple-duotone text-2xl text-bolt-elements-textTertiary" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-bolt-elements-textSecondary">Main Sync Folder</span>
                    {syncFolder ? (
                      <span className="truncate font-medium text-bolt-elements-textPrimary">{syncFolder.name}</span>
                    ) : (
                      <span className="text-bolt-elements-textSecondary italic">No folder selected</span>
                    )}
                  </div>
                </div>
              </div>
              {syncFolder && (
                <div className="flex items-center gap-4 text-sm text-bolt-elements-textSecondary border-l border-bolt-elements-borderColor/10 pl-4">
                  <div className="flex items-center gap-2">
                    <div className="i-ph:files-duotone" />
                    <span>{totalFiles} files</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="i-ph:database-duotone" />
                    <span>{formatFileSize(totalSize)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Project Folder */}
            {syncFolder && currentSession?.projectFolder && (
              <div className="flex items-center gap-4 p-3 rounded-lg bg-bolt-elements-background-depth-4 border border-bolt-elements-borderColor/5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="i-ph:folder-notch-duotone text-2xl text-bolt-elements-textTertiary" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-medium text-bolt-elements-textSecondary">Project Folder</span>
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium text-bolt-elements-textPrimary">
                          {currentSession.projectFolder}
                        </span>
                        {currentSession.projectName && (
                          <span className="text-xs text-bolt-elements-textTertiary">
                            ({currentSession.projectName})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sync Settings */}
      <div className="bg-bolt-elements-background-depth-3 p-4 rounded-lg border border-bolt-elements-borderColor/10">
        <h3 className="text-lg font-medium text-bolt-elements-textPrimary mb-4">Sync Settings</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm text-bolt-elements-textPrimary">Sync Settings</div>
            <div className="space-y-4">
              {/* Default Sync Behavior */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-bolt-elements-background-depth-4">
                <div>
                  <div className="text-sm font-medium text-bolt-elements-textPrimary">Default Sync Behavior</div>
                  <div className="text-xs text-bolt-elements-textSecondary mt-0.5">
                    Choose whether new projects should be synced by default
                  </div>
                </div>
                <IconButton
                  onClick={() => handleSaveSettings({ defaultSyncEnabled: !syncSettings.defaultSyncEnabled })}
                  className={classNames(
                    'text-xl transition-colors',
                    syncSettings.defaultSyncEnabled
                      ? 'text-green-400 hover:text-green-500'
                      : 'text-bolt-elements-textTertiary hover:text-bolt-elements-textSecondary',
                  )}
                >
                  <div className={syncSettings.defaultSyncEnabled ? 'i-ph:check-square-fill' : 'i-ph:square'} />
                </IconButton>
              </div>

              {/* Project Sync Control */}
              {currentSession?.projectName && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-bolt-elements-background-depth-4">
                  <div>
                    <div className="text-sm font-medium text-bolt-elements-textPrimary">
                      Sync for "{currentSession.projectName}"
                    </div>
                    <div className="text-xs text-bolt-elements-textSecondary mt-0.5">
                      Enable or disable sync for this specific project
                    </div>
                  </div>
                  <IconButton
                    onClick={() => {
                      const projectName = currentSession.projectName;

                      if (!projectName) {
                        return;
                      }

                      const projectInfo = syncSettings.projectFolders[projectName] || {
                        projectName,
                        folderName: currentSession.projectFolder || '',
                        lastSync: Date.now(),
                        syncEnabled: syncSettings.defaultSyncEnabled,
                      };
                      workbenchStore.toggleProjectSync(!projectInfo.syncEnabled);
                    }}
                    className={classNames(
                      'text-xl transition-colors',
                      ((currentSession.projectName &&
                        syncSettings.projectFolders[currentSession.projectName]?.syncEnabled) ??
                        syncSettings.defaultSyncEnabled)
                        ? 'text-green-400 hover:text-green-500'
                        : 'text-bolt-elements-textTertiary hover:text-bolt-elements-textSecondary',
                    )}
                  >
                    <div
                      className={
                        ((currentSession.projectName &&
                          syncSettings.projectFolders[currentSession.projectName]?.syncEnabled) ??
                        syncSettings.defaultSyncEnabled)
                          ? 'i-ph:check-square-fill'
                          : 'i-ph:square'
                      }
                    />
                  </IconButton>
                </div>
              )}

              {/* Existing Auto-sync settings */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={syncSettings.autoSync}
                  onChange={(e) => handleSaveSettings({ autoSync: e.target.checked })}
                  className="checkbox"
                />
                <div className="text-sm text-bolt-elements-textSecondary">Enable automatic sync</div>
              </div>
              {syncSettings.autoSync && (
                <div className="flex items-center gap-2 pl-6">
                  <div className="text-sm text-bolt-elements-textSecondary">Sync every</div>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={syncSettings.autoSyncInterval}
                    onChange={(e) =>
                      handleSaveSettings({ autoSyncInterval: Math.max(1, Math.min(60, parseInt(e.target.value) || 1)) })
                    }
                    className="w-16 px-2 py-1 text-sm rounded-md bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary border border-bolt-elements-borderColor/10"
                  />
                  <div className="text-sm text-bolt-elements-textSecondary">minutes</div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-bolt-elements-textPrimary">Sync on save</div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-bolt-elements-background-depth-4">
              <div>
                <div className="text-sm font-medium text-bolt-elements-textPrimary">Sync on save</div>
                <div className="text-xs text-bolt-elements-textSecondary mt-0.5">
                  Automatically sync files when saved
                </div>
              </div>
              <IconButton
                onClick={() => handleSaveSettings({ syncOnSave: !syncSettings.syncOnSave })}
                className={classNames(
                  'text-xl transition-colors',
                  syncSettings.syncOnSave
                    ? 'text-green-400 hover:text-green-500'
                    : 'text-bolt-elements-textTertiary hover:text-bolt-elements-textSecondary',
                )}
              >
                <div className={syncSettings.syncOnSave ? 'i-ph:check-square-fill' : 'i-ph:square'} />
              </IconButton>
            </div>
          </div>
        </div>
      </div>

      {/* Sync History */}
      <SyncStats />
    </div>
  );
}
