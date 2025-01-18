import { classNames } from '~/utils/classNames';

interface SyncStatusIndicatorProps {
  status: 'idle' | 'syncing' | 'error';
}

export function SyncStatusIndicator({ status }: SyncStatusIndicatorProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div
        className={classNames('w-2 h-2 rounded-full', {
          'bg-gray-400': status === 'idle',
          'bg-blue-400 animate-pulse': status === 'syncing',
          'bg-red-400': status === 'error',
        })}
      />
      <span className="text-bolt-elements-textSecondary">
        {status === 'idle' && 'Ready to sync'}
        {status === 'syncing' && 'Syncing...'}
        {status === 'error' && 'Sync error'}
      </span>
    </div>
  );
}
