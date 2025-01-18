import { useStore } from '@nanostores/react';
import { workbenchStore } from '~/lib/stores/workbench';
import type { SyncHistoryEntry, SyncSession } from '~/types/sync';
import { useEffect, useState, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-toastify';
import { IconButton } from '~/components/ui/IconButton';
import { classNames } from '~/utils/classNames';
import { StatsCard } from './components/StatsCard';
import { TimeRangeSelector } from './components/TimeRangeSelector';
import { HistoryEntry } from './components/HistoryEntry';

const timeRangeOptions = [
  { value: '24h', label: 'Last 24h' },
  { value: '7d', label: 'Last 7d' },
  { value: '30d', label: 'Last 30d' },
  { value: 'all', label: 'All time' },
];

const SYNC_HISTORY_KEY = 'syncHistory';
const ITEMS_PER_PAGE = 10;
const UPDATE_INTERVAL = 10000; // 10 seconds

export default function SyncStats() {
  const currentSession = useStore(workbenchStore.currentSession);
  const [syncHistory, setSyncHistory] = useState<SyncHistoryEntry[]>([]);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [selectedTimeRange, setSelectedTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('all');
  const [isClearing, setIsClearing] = useState(false);
  const [page, setPage] = useState(1);

  // Load initial history from localStorage and set up real-time updates
  useEffect(() => {
    const loadHistory = () => {
      try {
        const history = JSON.parse(localStorage.getItem(SYNC_HISTORY_KEY) || '[]');

        if (Array.isArray(history)) {
          setSyncHistory(history);
        } else {
          console.error('Invalid sync history format in localStorage');
          localStorage.setItem(SYNC_HISTORY_KEY, '[]');
          setSyncHistory([]);
        }
      } catch (error) {
        console.error('Failed to load sync history:', error);
        localStorage.setItem(SYNC_HISTORY_KEY, '[]');
        setSyncHistory([]);
      }
    };

    // Initial load
    loadHistory();

    // Set up polling interval for real-time updates
    const interval = setInterval(loadHistory, UPDATE_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  // Update history when new syncs happen
  useEffect(() => {
    if (currentSession?.history) {
      setSyncHistory((prev) => {
        try {
          const newHistory = [...prev];

          for (const entry of currentSession.history) {
            const existingIndex = newHistory.findIndex((h) => h.id === entry.id);

            if (existingIndex === -1) {
              newHistory.push(entry);
            } else {
              newHistory[existingIndex] = entry;
            }
          }

          newHistory.sort((a, b) => b.timestamp - a.timestamp);

          const latestHistory = newHistory.slice(0, 100);
          localStorage.setItem(SYNC_HISTORY_KEY, JSON.stringify(latestHistory));

          return latestHistory;
        } catch (error) {
          console.error('Failed to update sync history:', error);
          return prev;
        }
      });
    }
  }, [currentSession?.history]);

  // Reset page when time range changes
  useEffect(() => {
    setPage(1);
  }, [selectedTimeRange]);

  const handleClearHistory = useCallback(async () => {
    if (isClearing) {
      return;
    }

    if (confirm('Are you sure you want to clear all sync history? This cannot be undone.')) {
      try {
        setIsClearing(true);
        localStorage.setItem(SYNC_HISTORY_KEY, '[]');
        setSyncHistory([]);
        setExpandedEntries(new Set());

        if (currentSession) {
          const clearedSession: SyncSession = {
            ...currentSession,
            id: currentSession.id,
            timestamp: currentSession.timestamp,
            history: [],
            statistics: [],
            files: new Set(),
          };
          await workbenchStore.currentSession.set(clearedSession);
        }

        toast.success('Sync history cleared');
      } catch (error) {
        console.error('Failed to clear sync history:', error);
        toast.error('Failed to clear sync history');
      } finally {
        setIsClearing(false);
      }
    }
  }, [currentSession, isClearing]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }, []);

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) {
      return '0 B';
    }

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }, []);

  const getFilteredHistory = useCallback(() => {
    const now = Date.now();

    return syncHistory.filter((entry) => {
      switch (selectedTimeRange) {
        case '24h':
          return now - entry.timestamp < 24 * 60 * 60 * 1000;
        case '7d':
          return now - entry.timestamp < 7 * 24 * 60 * 60 * 1000;
        case '30d':
          return now - entry.timestamp < 30 * 24 * 60 * 60 * 1000;
        default:
          return true;
      }
    });
  }, [syncHistory, selectedTimeRange]);

  const filteredHistory = getFilteredHistory();
  const totalSyncs = filteredHistory.length;
  const totalFilesSynced = filteredHistory.reduce((sum, entry) => sum + entry.statistics.totalFiles, 0);
  const totalDataSynced = filteredHistory.reduce((sum, entry) => sum + entry.statistics.totalSize, 0);
  const averageDuration =
    totalSyncs > 0 ? filteredHistory.reduce((sum, entry) => sum + entry.statistics.duration, 0) / totalSyncs / 1000 : 0;

  const getTrends = useCallback(() => {
    const currentPeriod = filteredHistory.slice(0, Math.floor(filteredHistory.length / 2));
    const previousPeriod = filteredHistory.slice(Math.floor(filteredHistory.length / 2));

    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) {
        return null;
      }

      const change = ((current - previous) / previous) * 100;

      return {
        value: Math.abs(Math.round(change)),
        isPositive: change >= 0,
      };
    };

    return {
      syncs: calculateTrend(currentPeriod.length, previousPeriod.length),
      files: calculateTrend(
        currentPeriod.reduce((sum, entry) => sum + entry.statistics.totalFiles, 0),
        previousPeriod.reduce((sum, entry) => sum + entry.statistics.totalFiles, 0),
      ),
      data: calculateTrend(
        currentPeriod.reduce((sum, entry) => sum + entry.statistics.totalSize, 0),
        previousPeriod.reduce((sum, entry) => sum + entry.statistics.totalSize, 0),
      ),
      duration: calculateTrend(
        currentPeriod.reduce((sum, entry) => sum + entry.statistics.duration, 0) / currentPeriod.length,
        previousPeriod.reduce((sum, entry) => sum + entry.statistics.duration, 0) / previousPeriod.length,
      ),
    };
  }, [filteredHistory]);

  const trends = getTrends();

  if (!syncHistory.length) {
    return (
      <div className="bg-bolt-elements-background-depth-1 p-6 rounded-lg text-center">
        <div className="i-ph:cloud-slash text-4xl text-gray-400 mx-auto mb-4" />
        <div className="text-lg font-medium mb-2">No Sync History</div>
        <div className="text-sm text-gray-400">Start syncing your files to see statistics here</div>
      </div>
    );
  }

  const paginatedHistory = filteredHistory.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-medium text-bolt-elements-textPrimary">Sync History</h3>
          <TimeRangeSelector
            value={selectedTimeRange}
            onChange={(value) => setSelectedTimeRange(value as typeof selectedTimeRange)}
            options={timeRangeOptions}
          />
        </div>
        <IconButton
          onClick={handleClearHistory}
          disabled={isClearing}
          className={classNames('text-bolt-elements-textSecondary hover:text-red-400 transition-colors', {
            'opacity-50 cursor-not-allowed': isClearing,
          })}
          title="Clear History"
        >
          <div className={classNames('i-ph:trash', { 'animate-pulse': isClearing })} />
        </IconButton>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatsCard icon="i-ph:list-numbers" label="Total Syncs" value={totalSyncs} color="blue" trend={trends.syncs} />
        <StatsCard
          icon="i-ph:files"
          label="Files Synced"
          value={totalFilesSynced}
          color="purple"
          trend={trends.files}
        />
        <StatsCard
          icon="i-ph:database"
          label="Data Synced"
          value={formatFileSize(totalDataSynced)}
          color="green"
          trend={trends.data}
        />
        <StatsCard
          icon="i-ph:timer"
          label="Avg Duration"
          value={`${averageDuration.toFixed(1)}s`}
          color="yellow"
          trend={trends.duration}
        />
      </div>

      {filteredHistory.length > 0 && (
        <div className="bg-bolt-elements-background-depth-3 p-3 rounded-lg border border-bolt-elements-borderColor/10">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-bolt-elements-textPrimary">
            <div className="i-ph:clock-clockwise text-blue-400" />
            Latest Sync
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="i-ph:folder text-bolt-elements-textTertiary" />
                <span className="text-sm text-bolt-elements-textPrimary truncate">
                  {filteredHistory[0].projectName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="i-ph:clock text-bolt-elements-textTertiary" />
                <span className="text-sm text-bolt-elements-textPrimary">
                  {formatDistanceToNow(filteredHistory[0].timestamp)} ago
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="i-ph:files text-bolt-elements-textTertiary" />
                <span className="text-sm text-bolt-elements-textPrimary">
                  {filteredHistory[0].statistics.totalFiles} files
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="i-ph:database text-bolt-elements-textTertiary" />
                <span className="text-sm text-bolt-elements-textPrimary">
                  {formatFileSize(filteredHistory[0].statistics.totalSize)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="i-ph:timer text-bolt-elements-textTertiary" />
                <span className="text-sm text-bolt-elements-textPrimary">
                  {(filteredHistory[0].statistics.duration / 1000).toFixed(1)}s
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-bolt-elements-borderColor scrollbar-track-transparent">
        {paginatedHistory.map((entry) => (
          <HistoryEntry
            key={entry.id}
            entry={entry}
            expanded={expandedEntries.has(entry.id)}
            onToggle={() => toggleExpand(entry.id)}
            formatters={{ size: formatFileSize, time: formatDistanceToNow }}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <IconButton
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-bolt-elements-textSecondary disabled:opacity-50"
          >
            <div className="i-ph:caret-left" />
          </IconButton>
          <span className="text-sm text-bolt-elements-textSecondary">
            Page {page} of {totalPages}
          </span>
          <IconButton
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="text-bolt-elements-textSecondary disabled:opacity-50"
          >
            <div className="i-ph:caret-right" />
          </IconButton>
        </div>
      )}
    </div>
  );
}
