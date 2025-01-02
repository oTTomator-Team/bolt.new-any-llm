import { useState } from 'react';
import { MODEL_LIST } from '~/utils/constants';
import { PROVIDER_ICONS } from '~/utils/provider-icons';
import type { ModelUsage } from '~/types/token-usage';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface ModelCardProps {
  usage: ModelUsage;
  totalTokens: number;
}

export function ModelUsageCard({ usage, totalTokens }: ModelCardProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const percentage = ((usage.totalTokens / totalTokens) * 100).toFixed(1);

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg bg-bolt-elements-background-depth-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex-shrink-0">
            <img
              src={PROVIDER_ICONS[usage.provider] || PROVIDER_ICONS.Default}
              alt={`${usage.provider} icon`}
              className="w-6 h-6 rounded-md bg-bolt-elements-background-depth-1 p-1"
            />
            <span className="absolute -top-1 -right-1 bg-bolt-elements-background-depth-1 text-[10px] px-1 rounded-full ring-1 ring-bolt-elements-background-depth-2 font-medium">
              {usage.count}×
            </span>
          </div>
          <div className="min-w-0">
            <div className="font-medium text-sm truncate">
              {MODEL_LIST.find((m) => m.name === usage.model)?.label || usage.model}
            </div>
            <div className="text-xs text-bolt-elements-textSecondary">{usage.provider}</div>
          </div>
        </div>
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="p-1 hover:bg-bolt-elements-background-depth-1 rounded-md"
          aria-label={isMinimized ? 'Show details' : 'Hide details'}
        >
          {isMinimized ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronUpIcon className="h-4 w-4" />}
        </button>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 bg-bolt-elements-background-depth-1 rounded-full overflow-hidden">
        <div className="h-full bg-purple-500" style={{ width: `${percentage}%` }} />
      </div>

      {/* Details */}
      {!isMinimized && (
        <div className="pt-1 space-y-1 text-xs text-bolt-elements-textSecondary">
          <div className="flex justify-between">
            <span>Total Tokens:</span>
            <span>
              {usage.totalTokens.toLocaleString()} ({percentage}%)
            </span>
          </div>
          <div className="flex justify-between">
            <span>Input:</span>
            <span>{usage.promptTokens.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Output:</span>
            <span>{usage.completionTokens.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}
