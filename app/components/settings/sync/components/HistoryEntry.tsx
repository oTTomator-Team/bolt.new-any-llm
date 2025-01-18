import type { SyncHistoryEntry } from '~/types/sync';
import { classNames } from '~/utils/classNames';

interface HistoryEntryProps {
  entry: SyncHistoryEntry;
  expanded: boolean;
  onToggle: () => void;
  formatters: {
    size: (bytes: number) => string;
    time: (date: number | Date) => string;
  };
}

export function HistoryEntry({ entry, expanded, onToggle, formatters }: HistoryEntryProps) {
  const getStatusIcon = (status: 'success' | 'partial' | 'failed') => {
    switch (status) {
      case 'success':
        return <div className="i-ph:check-circle text-green-500" />;
      case 'partial':
        return <div className="i-ph:warning-circle text-yellow-500" />;
      case 'failed':
        return <div className="i-ph:x-circle text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="relative pl-8">
      <div className="absolute left-0 top-0 bottom-0 w-px bg-bolt-elements-borderColor/20" />
      <div className="absolute left-0 top-4 w-4 h-px bg-bolt-elements-borderColor/20" />
      <div className="absolute left-0 top-3.5 w-2 h-2 rounded-full bg-bolt-elements-borderColor/40" />

      <div className="bg-bolt-elements-background-depth-3 p-3 rounded-lg text-sm hover:bg-bolt-elements-background-depth-4 transition-colors border border-bolt-elements-borderColor/10">
        <div className="flex items-center justify-between cursor-pointer" onClick={onToggle}>
          <div className="flex items-center gap-3 flex-1">
            {getStatusIcon(entry.status)}
            <div>
              <div className="font-medium text-bolt-elements-textPrimary">{entry.projectName}</div>
              <div className="text-xs text-bolt-elements-textSecondary flex items-center gap-2">
                <span>{formatters.time(entry.timestamp)} ago</span>
                <span>•</span>
                <span>{entry.statistics.totalFiles} files</span>
                <span>•</span>
                <span>{formatters.size(entry.statistics.totalSize)}</span>
                <span>•</span>
                <span>{(entry.statistics.duration / 1000).toFixed(1)}s</span>
              </div>
            </div>
          </div>
          <div className={classNames('i-ph:caret-down transition-transform', { 'rotate-180': expanded })} />
        </div>

        {expanded && (
          <div className="mt-3 border-t border-bolt-elements-borderColor/10 pt-3">
            <div className="text-xs space-y-1">
              {entry.files.map((file) => (
                <div
                  key={file}
                  className="text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors flex items-center gap-2"
                >
                  <div className="i-ph:file-text text-xs" />
                  {file}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
