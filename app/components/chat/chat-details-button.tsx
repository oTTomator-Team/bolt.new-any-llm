import { ChartBarIcon } from '@heroicons/react/24/outline';
import * as Tooltip from '@radix-ui/react-tooltip';

interface ChatDetailsButtonProps {
  onClick: () => void;
}

export function ChatDetailsButton({ onClick }: ChatDetailsButtonProps) {
  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            onClick={onClick}
            className="p-2 hover:bg-bolt-elements-background-depth-1 rounded-md text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors"
            aria-label="Open chat details"
          >
            <ChartBarIcon className="h-5 w-5" />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="px-2.5 py-1.5 rounded-md bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary text-sm leading-tight shadow-lg animate-in fade-in-0 zoom-in-95"
            sideOffset={5}
          >
            Chat Details
            <Tooltip.Arrow className="fill-bolt-elements-background-depth-3" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
