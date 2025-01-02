import { useStore } from '@nanostores/react';
import { XMarkIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { chatStore } from '~/lib/stores/chat';
import { useTokenUsage } from '~/lib/hooks/useTokenUsage';
import { ModelUsageCard } from '~/components/ui/ModelUsageCard';
import WithTooltip from '~/components/ui/Tooltip';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

interface ChatDetailsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatDetailsSidebar({ isOpen, onClose }: ChatDetailsSidebarProps) {
  const chat = useStore(chatStore);
  const [isStatsMinimized, setIsStatsMinimized] = useState(false);

  // Ensure we have messages and they're in the correct format
  const messages = chat.messages || [];
  console.log('Messages:', messages); // Debug log

  const { modelUsages, totalUsage, promptPercentage, completionPercentage } = useTokenUsage(messages);
  console.log('Token Usage:', { modelUsages, totalUsage }); // Debug log

  if (!isOpen) {
    return null;
  }

  const hasMessages = messages.length > 0;
  const hasTokenUsage = totalUsage.totalTokens > 0;

  return (
    <TooltipPrimitive.Provider>
      <div className="fixed inset-y-0 right-0 w-80 bg-bolt-elements-background-depth-1 border-l border-bolt-elements-borderColor transform transition-transform duration-300 ease-in-out z-50">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-bolt-elements-borderColor">
            <h2 className="text-lg font-semibold text-bolt-elements-textPrimary">Chat Details</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-bolt-elements-background-depth-2 rounded-md"
              aria-label="Close sidebar"
            >
              <XMarkIcon className="h-5 w-5 text-bolt-elements-textSecondary" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Chat Title */}
            <div className="p-4 border-b border-bolt-elements-borderColor">
              <p className="text-bolt-elements-textPrimary">{chat.title}</p>
            </div>

            {/* Token Usage Stats */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-bolt-elements-textSecondary">Token Usage</h3>
                {hasTokenUsage && (
                  <button
                    onClick={() => setIsStatsMinimized(!isStatsMinimized)}
                    className="p-1 hover:bg-bolt-elements-background-depth-2 rounded-md"
                    aria-label={isStatsMinimized ? 'Show details' : 'Hide details'}
                  >
                    {isStatsMinimized ? (
                      <ChevronDownIcon className="h-4 w-4 text-bolt-elements-textSecondary" />
                    ) : (
                      <ChevronUpIcon className="h-4 w-4 text-bolt-elements-textSecondary" />
                    )}
                  </button>
                )}
              </div>

              {!hasMessages ? (
                <p className="text-sm text-bolt-elements-textSecondary">No messages in this chat yet.</p>
              ) : !hasTokenUsage ? (
                <p className="text-sm text-bolt-elements-textSecondary">No token usage data available.</p>
              ) : (
                <div className="space-y-3">
                  {/* Summary */}
                  <div className="flex items-center gap-2 text-sm text-bolt-elements-textSecondary">
                    <span>{modelUsages.size} models used</span>
                    <span>•</span>
                    <span>{totalUsage.totalTokens.toLocaleString()} tokens</span>
                  </div>

                  {/* Model Cards */}
                  {!isStatsMinimized && (
                    <div className="space-y-2">
                      {Array.from(modelUsages.values()).map((usage) => (
                        <ModelUsageCard
                          key={`${usage.provider}-${usage.model}`}
                          usage={usage}
                          totalTokens={totalUsage.totalTokens}
                        />
                      ))}

                      {/* Total Distribution */}
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-xs text-bolt-elements-textSecondary">
                          <span>Total Token Distribution</span>
                          <div className="flex gap-3">
                            <span>Input: {promptPercentage}%</span>
                            <span>Output: {completionPercentage}%</span>
                          </div>
                        </div>
                        <WithTooltip tooltip="Input tokens (prompts) vs Output tokens (completions)">
                          <div className="h-1.5 bg-bolt-elements-background-depth-2 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500" style={{ width: `${promptPercentage}%` }} />
                          </div>
                        </WithTooltip>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipPrimitive.Provider>
  );
}
