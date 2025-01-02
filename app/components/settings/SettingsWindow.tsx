import * as RadixDialog from '@radix-ui/react-dialog';
import { motion } from 'framer-motion';
import { useState, type ReactElement } from 'react';
import { classNames } from '~/utils/classNames';
import { DialogTitle, dialogVariants, dialogBackdropVariants } from '~/components/ui/Dialog';
import { IconButton } from '~/components/ui/IconButton';
import styles from './Settings.module.scss';
import ProvidersTab from './providers/ProvidersTab';
import { useSettings } from '~/lib/hooks/useSettings';
import FeaturesTab from './features/FeaturesTab';
import DebugTab from './debug/DebugTab';
import EventLogsTab from './event-logs/EventLogsTab';
import ConnectionsTab from './connections/ConnectionsTab';
import TokenUsageTab from './tokenusagestats/TokenUsageTab';
import { useTokenUsage } from '~/lib/hooks/useTokenUsage';
import { useStore } from '@nanostores/react';
import { chatStore } from '~/lib/stores/chat';
import DataTab from './data/DataTab';

interface SettingsProps {
  open: boolean;
  onClose: () => void;
}

type TabType =
  | 'chat-history'
  | 'providers'
  | 'features'
  | 'debug'
  | 'event-logs'
  | 'connection'
  | 'advanced-usage'
  | 'data';

export const SettingsWindow = ({ open, onClose }: SettingsProps) => {
  const { debug, eventLogs } = useSettings();
  const [activeTab, setActiveTab] = useState<TabType>('chat-history');
  const { modelUsages, totalUsage } = useTokenUsage();
  const chatState = useStore(chatStore);

  // Get all model usages and sort them by total tokens
  const sortedUsages = Array.from(modelUsages.values()).sort((a, b) => b.totalTokens - a.totalTokens);

  const tabs: { id: TabType; label: string; icon: string; component?: ReactElement }[] = [
    { id: 'data', label: 'Data', icon: 'i-ph:database', component: <DataTab /> },
    { id: 'providers', label: 'Providers', icon: 'i-ph:key', component: <ProvidersTab /> },
    { id: 'connection', label: 'Connection', icon: 'i-ph:link', component: <ConnectionsTab /> },
    { id: 'features', label: 'Features', icon: 'i-ph:star', component: <FeaturesTab /> },
    {
      id: 'advanced-usage',
      label: 'Advanced Usage ',
      icon: 'i-ph:chart-line',
      component:
        sortedUsages.length > 0 ? (
          <div className="space-y-3">
            {sortedUsages.map((usage, index) => (
              <TokenUsageTab
                key={`${usage.provider}:${usage.model}`}
                usage={usage}
                totalTokens={totalUsage.totalTokens}
                showTitle={index === 0}
                chatTitle={chatState.title || 'New Chat'}
              />
            ))}
          </div>
        ) : (
          <div>No usage data available</div>
        ),
    },
    ...(debug
      ? [
          {
            id: 'debug' as TabType,
            label: 'Debug Tab',
            icon: 'i-ph:bug',
            component: <DebugTab />,
          },
        ]
      : []),
    ...(eventLogs
      ? [
          {
            id: 'event-logs' as TabType,
            label: 'Event Logs',
            icon: 'i-ph:list-bullets',
            component: <EventLogsTab />,
          },
        ]
      : []),
  ];

  return (
    <RadixDialog.Root open={open}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay asChild onClick={onClose}>
          <motion.div
            className="bg-black/50 fixed inset-0 z-max backdrop-blur-sm"
            initial="closed"
            animate="open"
            exit="closed"
            variants={dialogBackdropVariants}
          />
        </RadixDialog.Overlay>
        <RadixDialog.Content aria-describedby={undefined} asChild>
          <motion.div
            className="fixed top-[50%] left-[50%] z-max h-[85vh] w-[90vw] max-w-[900px] translate-x-[-50%] translate-y-[-50%] border border-bolt-elements-borderColor rounded-lg shadow-lg focus:outline-none overflow-hidden"
            initial="closed"
            animate="open"
            exit="closed"
            variants={dialogVariants}
          >
            <div className="flex h-full">
              <div
                className={classNames(
                  'w-48 border-r border-bolt-elements-borderColor bg-bolt-elements-background-depth-1 p-4 flex flex-col justify-between',
                  styles['settings-tabs'],
                )}
              >
                <DialogTitle className="flex-shrink-0 text-lg font-semibold text-bolt-elements-textPrimary mb-2">
                  Settings
                </DialogTitle>
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={classNames(
                      activeTab === tab.id ? styles.active : '',
                      tab.id === 'advanced-usage' ? 'justify-between' : '',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className={tab.icon} />
                      {tab.id !== 'advanced-usage' && tab.label}
                    </div>
                    {tab.id === 'advanced-usage' && <div className="flex-1 text-center pr-6">{tab.label}</div>}
                  </button>
                ))}
                <div className="mt-auto flex flex-col gap-2">
                  <a
                    href="https://github.com/stackblitz-labs/bolt.diy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={classNames(styles['settings-button'], 'flex items-center gap-2')}
                  >
                    <div className="i-ph:github-logo" />
                    GitHub
                  </a>
                  <a
                    href="https://stackblitz-labs.github.io/bolt.diy/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={classNames(styles['settings-button'], 'flex items-center gap-2')}
                  >
                    <div className="i-ph:book" />
                    Docs
                  </a>
                </div>
              </div>

              <div className="flex-1 flex flex-col p-8 pt-10 bg-bolt-elements-background-depth-2">
                <div className="flex-1 overflow-y-auto">{tabs.find((tab) => tab.id === activeTab)?.component}</div>
              </div>
            </div>
            <RadixDialog.Close asChild onClick={onClose}>
              <IconButton icon="i-ph:x" className="absolute top-[10px] right-[10px]" />
            </RadixDialog.Close>
          </motion.div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
};
