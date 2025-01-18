import * as RadixDialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { classNames } from '~/utils/classNames';
import { DialogTitle } from '~/components/ui/Dialog';
import type { SettingCategory, TabType } from './settings.types';
import { categoryLabels, categoryIcons } from './settings.types';
import ProfileTab from './profile/ProfileTab';
import ProvidersTab from './providers/ProvidersTab';
import { useSettings } from '~/lib/hooks/useSettings';
import FeaturesTab from './features/FeaturesTab';
import DebugTab from './debug/DebugTab';
import EventLogsTab from './event-logs/EventLogsTab';
import ConnectionsTab from './connections/ConnectionsTab';
import DataTab from './data/DataTab';

interface SettingsProps {
  open: boolean;
  onClose: () => void;
}

export const SettingsWindow = ({ open, onClose }: SettingsProps) => {
  const { debug, eventLogs } = useSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType | null>(null);

  const settingItems = [
    {
      id: 'profile' as const,
      label: 'Profile Settings',
      icon: 'i-ph:user-circle',
      category: 'profile' as const,
      description: 'Manage your personal information and preferences',
      component: () => <ProfileTab />,
      keywords: ['profile', 'account', 'avatar', 'email', 'name', 'theme', 'notifications'],
    },

    {
      id: 'data' as const,
      label: 'Data Management',
      icon: 'i-ph:database',
      category: 'file_sharing' as const,
      description: 'Manage your chat history and application data',
      component: () => <DataTab />,
      keywords: ['data', 'export', 'import', 'backup', 'delete'],
    },

    {
      id: 'providers' as const,
      label: 'Providers',
      icon: 'i-ph:key',
      category: 'file_sharing' as const,
      description: 'Configure AI providers and API keys',
      component: () => <ProvidersTab />,
      keywords: ['api', 'keys', 'providers', 'configuration'],
    },

    {
      id: 'connection' as const,
      label: 'Connection',
      icon: 'i-ph:link',
      category: 'connectivity' as const,
      description: 'Manage network and connection settings',
      component: () => <ConnectionsTab />,
      keywords: ['network', 'connection', 'proxy', 'ssl'],
    },

    {
      id: 'features' as const,
      label: 'Features',
      icon: 'i-ph:star',
      category: 'system' as const,
      description: 'Configure application features and preferences',
      component: () => <FeaturesTab />,
      keywords: ['features', 'settings', 'options'],
    },
  ] as const;

  const debugItems = debug
    ? [
        {
          id: 'debug' as const,
          label: 'Debug',
          icon: 'i-ph:bug',
          category: 'system' as const,
          description: 'Advanced debugging tools and options',
          component: () => <DebugTab />,
          keywords: ['debug', 'logs', 'developer'],
        },
      ]
    : [];

  const eventLogItems = eventLogs
    ? [
        {
          id: 'event-logs' as const,
          label: 'Event Logs',
          icon: 'i-ph:list-bullets',
          category: 'system' as const,
          description: 'View system events and application logs',
          component: () => <EventLogsTab />,
          keywords: ['logs', 'events', 'history'],
        },
      ]
    : [];

  const allSettingItems = [...settingItems, ...debugItems, ...eventLogItems];

  const filteredItems = allSettingItems.filter(
    (item) =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.keywords?.some((keyword) => keyword.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const groupedItems = filteredItems.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = allSettingItems.filter((i) => i.category === item.category);
      }

      return acc;
    },
    {} as Record<SettingCategory, typeof allSettingItems>,
  );

  const handleBackToDashboard = () => {
    setActiveTab(null);
    onClose();
  };

  const activeTabItem = allSettingItems.find((item) => item.id === activeTab);

  return (
    <RadixDialog.Root open={open}>
      <RadixDialog.Portal>
        <div className="fixed inset-0 flex items-center justify-center z-[9999]">
          <RadixDialog.Overlay asChild>
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          </RadixDialog.Overlay>
          <RadixDialog.Content aria-describedby={undefined} asChild>
            <motion.div
              className={classNames(
                'relative',
                'w-[1000px] max-h-[90vh] min-h-[700px]',
                'bg-[#FAFAFA] dark:bg-[#0A0A0A]',
                'rounded-2xl overflow-hidden shadow-2xl',
                'border border-[#E5E5E5] dark:border-[#1A1A1A]',
                'overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent',
              )}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
            >
              <AnimatePresence mode="wait">
                {activeTab ? (
                  <motion.div
                    className="flex flex-col h-full"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center justify-between p-6 border-b border-[#E5E5E5] dark:border-[#1A1A1A] sticky top-0 bg-[#FAFAFA] dark:bg-[#0A0A0A] z-10">
                      <div className="flex items-center">
                        <button
                          onClick={() => setActiveTab(null)}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-[#F5F5F5] dark:bg-[#1A1A1A] text-[#666666] dark:text-[#999999] hover:text-[#333333] dark:hover:text-white"
                        >
                          <div className="i-ph:arrow-left w-4 h-4" />
                          Back to Settings
                        </button>

                        <div className="text-bolt-elements-textTertiary mx-6 select-none">|</div>

                        {activeTabItem && (
                          <div className="flex items-center gap-4">
                            <div className={classNames(activeTabItem.icon, 'w-6 h-6 text-purple-500')} />
                            <div>
                              <h2 className="text-lg font-medium text-bolt-elements-textPrimary">
                                {activeTabItem.label}
                              </h2>
                              <p className="text-sm text-bolt-elements-textSecondary">{activeTabItem.description}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={handleBackToDashboard}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-[#F5F5F5] dark:bg-[#1A1A1A] text-[#666666] dark:text-[#999999] hover:text-[#333333] dark:hover:text-white"
                      >
                        <div className="i-ph:house w-4 h-4" />
                        Back to Bolt DIY
                      </button>
                    </div>
                    <div className="flex-1 p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
                      {allSettingItems.find((item) => item.id === activeTab)?.component()}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    className="flex flex-col h-full"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center justify-between p-6 border-b border-[#E5E5E5] dark:border-[#1A1A1A] sticky top-0 bg-[#FAFAFA] dark:bg-[#0A0A0A] z-10">
                      <div className="flex items-center gap-3">
                        <div className="i-ph:lightning-fill w-5 h-5 text-purple-500" />
                        <DialogTitle className="text-lg font-medium text-bolt-elements-textPrimary">
                          Bolt Control Panel
                        </DialogTitle>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="relative w-[320px]">
                          <input
                            type="text"
                            placeholder="Search settings..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={classNames(
                              'w-full h-10 pl-10 pr-4 rounded-lg text-sm',
                              'bg-[#F8F8F8] dark:bg-[#1A1A1A]',
                              'border border-[#E5E5E5] dark:border-[#333333]',
                              'text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary',
                              'focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all',
                            )}
                          />
                          <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                            <div className="i-ph:magnifying-glass w-4 h-4 text-bolt-elements-textTertiary" />
                          </div>
                        </div>
                        <button
                          onClick={handleBackToDashboard}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-[#F5F5F5] dark:bg-[#1A1A1A] text-[#666666] dark:text-[#999999] hover:text-[#333333] dark:hover:text-white"
                        >
                          <div className="i-ph:house w-4 h-4" />
                          Back to Bolt DIY
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
                      <div className="space-y-8">
                        {(Object.keys(groupedItems) as SettingCategory[]).map((category) => (
                          <div key={category} className="space-y-4">
                            <div className="flex items-center gap-3">
                              <div className={classNames(categoryIcons[category], 'w-5 h-5 text-purple-500')} />
                              <h2 className="text-base font-medium text-bolt-elements-textPrimary">
                                {categoryLabels[category]}
                              </h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {groupedItems[category].map((item) => (
                                <button
                                  key={item.id}
                                  onClick={() => setActiveTab(item.id)}
                                  className={classNames(
                                    'flex flex-col gap-2 p-4 rounded-lg text-left',
                                    'bg-white dark:bg-[#0A0A0A]',
                                    'border border-[#E5E5E5] dark:border-[#1A1A1A]',
                                    'hover:bg-[#F8F8F8] dark:hover:bg-[#1A1A1A]',
                                    'transition-all duration-200',
                                  )}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={classNames(item.icon, 'w-5 h-5 text-purple-500')} />
                                    <span className="text-sm font-medium text-bolt-elements-textPrimary">
                                      {item.label}
                                    </span>
                                  </div>
                                  {item.description && (
                                    <p className="text-sm text-bolt-elements-textSecondary">{item.description}</p>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </RadixDialog.Content>
        </div>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
};
