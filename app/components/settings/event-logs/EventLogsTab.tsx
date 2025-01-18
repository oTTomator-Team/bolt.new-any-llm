import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { useSettings } from '~/lib/hooks/useSettings';
import { toast } from 'react-toastify';
import { Switch } from '~/components/ui/Switch';
import { logStore, type LogEntry } from '~/lib/stores/logs';
import { useStore } from '@nanostores/react';
import { classNames } from '~/utils/classNames';
import { motion } from 'framer-motion';
import { settingsStyles } from '~/components/settings/settings.styles';

export default function EventLogsTab() {
  const {} = useSettings();
  const showLogs = useStore(logStore.showLogs);
  const logs = useStore(logStore.logs);
  const [logLevel, setLogLevel] = useState<LogEntry['level'] | 'all'>('info');
  const [autoScroll, setAutoScroll] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [, forceUpdate] = useState({});
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);

  const filteredLogs = useMemo(() => {
    const allLogs = Object.values(logs);
    const filtered = allLogs.filter((log) => {
      const matchesLevel = !logLevel || log.level === logLevel || logLevel === 'all';
      const matchesSearch =
        !searchQuery ||
        log.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        JSON.stringify(log.details)?.toLowerCase()?.includes(searchQuery?.toLowerCase());

      return matchesLevel && matchesSearch;
    });

    return filtered.reverse();
  }, [logs, logLevel, searchQuery]);

  // Effect to initialize showLogs
  useEffect(() => {
    logStore.showLogs.set(true);
  }, []);

  useEffect(() => {
    // System info logs
    logStore.logSystem('Application initialized', {
      version: process.env.NEXT_PUBLIC_APP_VERSION,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    });

    // Debug logs for system state
    logStore.logDebug('System configuration loaded', {
      runtime: 'Next.js',
      features: ['AI Chat', 'Event Logging', 'Provider Management', 'Theme Support'],
      locale: navigator.language,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    // Performance metrics
    logStore.logSystem('Performance metrics', {
      deviceMemory: (navigator as any).deviceMemory || 'unknown',
      hardwareConcurrency: navigator.hardwareConcurrency,
      connectionType: (navigator as any).connection?.effectiveType || 'unknown',
    });

    // Provider status
    logStore.logProvider('Provider status check', {
      availableProviders: ['OpenAI', 'Anthropic', 'Mistral', 'Ollama'],
      defaultProvider: 'OpenAI',
      status: 'operational',
    });

    // Theme and accessibility
    logStore.logSystem('User preferences loaded', {
      theme: document.documentElement.dataset.theme || 'system',
      prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      prefersDarkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
    });

    // Warning logs for potential issues
    logStore.logWarning('Resource usage threshold approaching', {
      memoryUsage: '75%',
      cpuLoad: '60%',
      timestamp: new Date().toISOString(),
    });

    // Security checks
    logStore.logSystem('Security status', {
      httpsEnabled: window.location.protocol === 'https:',
      cookiesEnabled: navigator.cookieEnabled,
      storageQuota: 'checking...',
    });

    // Error logs with detailed context
    logStore.logError('API connection failed', new Error('Connection timeout'), {
      endpoint: '/api/chat',
      retryCount: 3,
      lastAttempt: new Date().toISOString(),
      statusCode: 408,
    });

    // Debug logs for development
    if (process.env.NODE_ENV === 'development') {
      logStore.logDebug('Development mode active', {
        debugFlags: true,
        mockServices: false,
        apiEndpoint: 'local',
      });
    }
  }, []);

  // Scroll handling
  useEffect(() => {
    const container = logsContainerRef.current;

    if (!container) {
      return undefined;
    }

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 10;
      setIsScrolledToBottom(isBottom);
    };

    container.addEventListener('scroll', handleScroll);

    const cleanup = () => {
      container.removeEventListener('scroll', handleScroll);
    };

    return cleanup;
  }, []);

  // Auto-scroll effect
  useEffect(() => {
    const container = logsContainerRef.current;

    if (container && (autoScroll || isScrolledToBottom)) {
      container.scrollTop = 0;
    }
  }, [filteredLogs, autoScroll, isScrolledToBottom]);

  const handleClearLogs = useCallback(() => {
    if (confirm('Are you sure you want to clear all logs?')) {
      logStore.clearLogs();
      toast.success('Logs cleared successfully');
      forceUpdate({}); // Force a re-render after clearing logs
    }
  }, []);

  const handleExportLogs = useCallback(() => {
    try {
      const logText = logStore
        .getLogs()
        .map(
          (log) =>
            `[${log.level.toUpperCase()}] ${log.timestamp} - ${log.message}${
              log.details ? '\nDetails: ' + JSON.stringify(log.details, null, 2) : ''
            }`,
        )
        .join('\n\n');

      const blob = new Blob([logText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `event-logs-${new Date().toISOString()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Logs exported successfully');
    } catch (error) {
      toast.error('Failed to export logs');
      console.error('Export error:', error);
    }
  }, []);

  const getLevelIcon = (level: LogEntry['level']): string => {
    switch (level) {
      case 'info':
        return 'i-ph:info';
      case 'warning':
        return 'i-ph:warning';
      case 'error':
        return 'i-ph:x-circle';
      case 'debug':
        return 'i-ph:bug';
      default:
        return 'i-ph:circle';
    }
  };

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'info':
        return 'text-[#1389FD] dark:text-[#1389FD]';
      case 'warning':
        return 'text-[#FFDB6C] dark:text-[#FFDB6C]';
      case 'error':
        return 'text-[#EE4744] dark:text-[#EE4744]';
      case 'debug':
        return 'text-[#77828D] dark:text-[#77828D]';
      default:
        return 'text-bolt-elements-textPrimary';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-4">
        {/* Title and Toggles Row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="i-ph:list-bullets text-xl text-purple-500" />
            <div>
              <h3 className="text-lg font-medium text-bolt-elements-textPrimary">Event Logs</h3>
              <p className="text-sm text-bolt-elements-textSecondary">Track system events and debug information</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="i-ph:eye text-bolt-elements-textSecondary" />
              <span className="text-sm text-bolt-elements-textSecondary whitespace-nowrap">Show Actions</span>
              <Switch checked={showLogs} onCheckedChange={(checked) => logStore.showLogs.set(checked)} />
            </div>
            <div className="flex items-center gap-2">
              <div className="i-ph:arrow-clockwise text-bolt-elements-textSecondary" />
              <span className="text-sm text-bolt-elements-textSecondary whitespace-nowrap">Auto-scroll</span>
              <Switch checked={autoScroll} onCheckedChange={setAutoScroll} />
            </div>
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[150px] max-w-[200px]">
            <div className="relative group">
              <select
                value={logLevel}
                onChange={(e) => setLogLevel(e.target.value as LogEntry['level'])}
                className={classNames(
                  'w-full pl-9 pr-3 py-2 rounded-lg',
                  'bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor',
                  'text-sm text-bolt-elements-textPrimary',
                  'focus:outline-none focus:ring-2 focus:ring-purple-500/30',
                  'group-hover:border-purple-500/30',
                  'transition-all duration-200',
                )}
              >
                <option value="all">All Levels</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="debug">Debug</option>
              </select>
              <div className="i-ph:funnel absolute left-3 top-1/2 -translate-y-1/2 text-bolt-elements-textSecondary group-hover:text-purple-500 transition-colors" />
            </div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="relative group">
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={classNames(
                  'w-full pl-9 pr-3 py-2 rounded-lg',
                  'bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor',
                  'text-sm text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary',
                  'focus:outline-none focus:ring-2 focus:ring-purple-500/30',
                  'group-hover:border-purple-500/30',
                  'transition-all duration-200',
                )}
              />
              <div className="i-ph:magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-bolt-elements-textSecondary group-hover:text-purple-500 transition-colors" />
            </div>
          </div>
          {showLogs && (
            <div className="flex items-center gap-2 flex-nowrap">
              <motion.button
                onClick={handleExportLogs}
                className={classNames(settingsStyles.button.base, settingsStyles.button.primary, 'group')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="i-ph:download-simple group-hover:scale-110 transition-transform" />
                Export Logs
              </motion.button>
              <motion.button
                onClick={handleClearLogs}
                className={classNames(settingsStyles.button.base, settingsStyles.button.danger, 'group')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="i-ph:trash group-hover:scale-110 transition-transform" />
                Clear Logs
              </motion.button>
            </div>
          )}
        </div>
      </div>

      <motion.div
        ref={logsContainerRef}
        className={classNames(
          settingsStyles.card,
          'h-[calc(100vh-250px)] min-h-[400px] overflow-y-auto logs-container',
          'scrollbar-thin scrollbar-thumb-bolt-elements-borderColor scrollbar-track-transparent hover:scrollbar-thumb-purple-500/30',
        )}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="i-ph:clipboard-text text-6xl text-bolt-elements-textSecondary mb-4"
            />
            <motion.p
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-bolt-elements-textSecondary"
            >
              No logs found
            </motion.p>
          </div>
        ) : (
          <div className="divide-y divide-bolt-elements-borderColor">
            {filteredLogs.map((log, index) => (
              <motion.div
                key={index}
                className={classNames(
                  'p-4 font-mono hover:bg-bolt-elements-background-depth-3 transition-colors duration-200',
                  { 'border-t border-bolt-elements-borderColor': index === 0 },
                )}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={classNames(
                      getLevelIcon(log.level),
                      getLevelColor(log.level),
                      'mt-1 flex-shrink-0 text-lg',
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={classNames(
                          'font-bold whitespace-nowrap px-2 py-0.5 rounded-full text-xs',
                          {
                            'bg-blue-500/10': log.level === 'info',
                            'bg-yellow-500/10': log.level === 'warning',
                            'bg-red-500/10': log.level === 'error',
                            'bg-bolt-elements-textSecondary/10': log.level === 'debug',
                          },
                          getLevelColor(log.level),
                        )}
                      >
                        {log.level.toUpperCase()}
                      </span>
                      <span className="text-bolt-elements-textSecondary whitespace-nowrap text-xs">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                      <span className="text-bolt-elements-textPrimary break-all">{log.message}</span>
                    </div>
                    {log.details && (
                      <motion.pre
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ duration: 0.2 }}
                        className={classNames(
                          'mt-2 text-xs',
                          'overflow-x-auto whitespace-pre-wrap break-all',
                          'bg-[#1A1A1A] dark:bg-[#0A0A0A] rounded-md p-3',
                          'border border-[#333333] dark:border-[#1A1A1A]',
                          'text-[#666666] dark:text-[#999999]',
                        )}
                      >
                        {JSON.stringify(log.details, null, 2)}
                      </motion.pre>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
