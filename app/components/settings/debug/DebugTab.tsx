import React, { useCallback, useEffect, useState } from 'react';
import { useSettings } from '~/lib/hooks/useSettings';
import { toast } from 'react-toastify';
import { providerBaseUrlEnvKeys } from '~/utils/constants';
import { motion } from 'framer-motion';
import { classNames } from '~/utils/classNames';
import { settingsStyles } from '~/components/settings/settings.styles';

interface ProviderStatus {
  name: string;
  enabled: boolean;
  isLocal: boolean;
  isRunning: boolean | null;
  error?: string;
  lastChecked: Date;
  responseTime?: number;
  url: string | null;
}

interface SystemInfo {
  os: string;
  browser: string;
  screen: string;
  language: string;
  timezone: string;
  memory: string;
  cores: number;
  deviceType: string;
  colorDepth: string;
  pixelRatio: number;
  online: boolean;
  cookiesEnabled: boolean;
  doNotTrack: boolean;
}

interface IProviderConfig {
  name: string;
  settings: {
    enabled: boolean;
    baseUrl?: string;
  };
}

interface CommitData {
  commit: string;
  version?: string;
}

const connitJson: CommitData = {
  commit: __COMMIT_HASH,
  version: __APP_VERSION,
};

const LOCAL_PROVIDERS = ['Ollama', 'LMStudio', 'OpenAILike'];

const versionHash = connitJson.commit;
const versionTag = connitJson.version;

const GITHUB_URLS = {
  original: 'https://api.github.com/repos/stackblitz-labs/bolt.diy/commits/main',
  fork: 'https://api.github.com/repos/Stijnus/bolt.new-any-llm/commits/main',
  commitJson: async (branch: string) => {
    try {
      const response = await fetch(`https://api.github.com/repos/stackblitz-labs/bolt.diy/commits/${branch}`);
      const data: { sha: string } = await response.json();

      const packageJsonResp = await fetch(
        `https://raw.githubusercontent.com/stackblitz-labs/bolt.diy/${branch}/package.json`,
      );
      const packageJson: { version: string } = await packageJsonResp.json();

      return {
        commit: data.sha.slice(0, 7),
        version: packageJson.version,
      };
    } catch (error) {
      console.log('Failed to fetch local commit info:', error);
      throw new Error('Failed to fetch local commit info');
    }
  },
};

function getSystemInfo(): SystemInfo {
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) {
      return '0 Bytes';
    }

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getBrowserInfo = (): string => {
    const ua = navigator.userAgent;
    let browser = 'Unknown';

    if (ua.includes('Firefox/')) {
      browser = 'Firefox';
    } else if (ua.includes('Chrome/')) {
      if (ua.includes('Edg/')) {
        browser = 'Edge';
      } else if (ua.includes('OPR/')) {
        browser = 'Opera';
      } else {
        browser = 'Chrome';
      }
    } else if (ua.includes('Safari/')) {
      if (!ua.includes('Chrome')) {
        browser = 'Safari';
      }
    }

    // Extract version number
    const match = ua.match(new RegExp(`${browser}\\/([\\d.]+)`));
    const version = match ? ` ${match[1]}` : '';

    return `${browser}${version}`;
  };

  const getOperatingSystem = (): string => {
    const ua = navigator.userAgent;
    const platform = navigator.platform;

    if (ua.includes('Win')) {
      return 'Windows';
    }

    if (ua.includes('Mac')) {
      if (ua.includes('iPhone') || ua.includes('iPad')) {
        return 'iOS';
      }

      return 'macOS';
    }

    if (ua.includes('Linux')) {
      return 'Linux';
    }

    if (ua.includes('Android')) {
      return 'Android';
    }

    return platform || 'Unknown';
  };

  const getDeviceType = (): string => {
    const ua = navigator.userAgent;

    if (ua.includes('Mobile')) {
      return 'Mobile';
    }

    if (ua.includes('Tablet')) {
      return 'Tablet';
    }

    return 'Desktop';
  };

  // Get more detailed memory info if available
  const getMemoryInfo = (): string => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return `${formatBytes(memory.jsHeapSizeLimit)} (Used: ${formatBytes(memory.usedJSHeapSize)})`;
    }

    return 'Not available';
  };

  return {
    os: getOperatingSystem(),
    browser: getBrowserInfo(),
    screen: `${window.screen.width}x${window.screen.height}`,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    memory: getMemoryInfo(),
    cores: navigator.hardwareConcurrency || 0,
    deviceType: getDeviceType(),

    // Add new fields
    colorDepth: `${window.screen.colorDepth}-bit`,
    pixelRatio: window.devicePixelRatio,
    online: navigator.onLine,
    cookiesEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack === '1',
  };
}

const checkProviderStatus = async (url: string | null, providerName: string): Promise<ProviderStatus> => {
  if (!url) {
    console.log(`[Debug] No URL provided for ${providerName}`);
    return {
      name: providerName,
      enabled: false,
      isLocal: true,
      isRunning: false,
      error: 'No URL configured',
      lastChecked: new Date(),
      url: null,
    };
  }

  console.log(`[Debug] Checking status for ${providerName} at ${url}`);

  const startTime = performance.now();

  try {
    if (providerName.toLowerCase() === 'ollama') {
      // Special check for Ollama root endpoint
      try {
        console.log(`[Debug] Checking Ollama root endpoint: ${url}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            Accept: 'text/plain,application/json',
          },
        });
        clearTimeout(timeoutId);

        const text = await response.text();
        console.log(`[Debug] Ollama root response:`, text);

        if (text.includes('Ollama is running')) {
          console.log(`[Debug] Ollama running confirmed via root endpoint`);
          return {
            name: providerName,
            enabled: false,
            isLocal: true,
            isRunning: true,
            lastChecked: new Date(),
            responseTime: performance.now() - startTime,
            url,
          };
        }
      } catch (error) {
        console.log(`[Debug] Ollama root check failed:`, error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        if (errorMessage.includes('aborted')) {
          return {
            name: providerName,
            enabled: false,
            isLocal: true,
            isRunning: false,
            error: 'Connection timeout',
            lastChecked: new Date(),
            responseTime: performance.now() - startTime,
            url,
          };
        }
      }
    }

    // Try different endpoints based on provider
    const checkUrls = [`${url}/api/health`, url.endsWith('v1') ? `${url}/models` : `${url}/v1/models`];
    console.log(`[Debug] Checking additional endpoints:`, checkUrls);

    const results = await Promise.all(
      checkUrls.map(async (checkUrl) => {
        try {
          console.log(`[Debug] Trying endpoint: ${checkUrl}`);

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const response = await fetch(checkUrl, {
            signal: controller.signal,
            headers: {
              Accept: 'application/json',
            },
          });
          clearTimeout(timeoutId);

          const ok = response.ok;
          console.log(`[Debug] Endpoint ${checkUrl} response:`, ok);

          if (ok) {
            try {
              const data = await response.json();
              console.log(`[Debug] Endpoint ${checkUrl} data:`, data);
            } catch {
              console.log(`[Debug] Could not parse JSON from ${checkUrl}`);
            }
          }

          return ok;
        } catch (error) {
          console.log(`[Debug] Endpoint ${checkUrl} failed:`, error);
          return false;
        }
      }),
    );

    const isRunning = results.some((result) => result);
    console.log(`[Debug] Final status for ${providerName}:`, isRunning);

    return {
      name: providerName,
      enabled: false,
      isLocal: true,
      isRunning,
      lastChecked: new Date(),
      responseTime: performance.now() - startTime,
      url,
    };
  } catch (error) {
    console.log(`[Debug] Provider check failed for ${providerName}:`, error);
    return {
      name: providerName,
      enabled: false,
      isLocal: true,
      isRunning: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      lastChecked: new Date(),
      responseTime: performance.now() - startTime,
      url,
    };
  }
};

export default function DebugTab() {
  const { providers, isLatestBranch } = useSettings();
  const [activeProviders, setActiveProviders] = useState<ProviderStatus[]>([]);
  const [updateMessage, setUpdateMessage] = useState<string>('');
  const [systemInfo] = useState<SystemInfo>(getSystemInfo());
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  const updateProviderStatuses = async () => {
    if (!providers) {
      return;
    }

    try {
      const entries = Object.entries(providers) as [string, IProviderConfig][];
      const statuses = await Promise.all(
        entries
          .filter(([, provider]) => LOCAL_PROVIDERS.includes(provider.name))
          .map(async ([, provider]) => {
            const envVarName =
              providerBaseUrlEnvKeys[provider.name].baseUrlKey || `REACT_APP_${provider.name.toUpperCase()}_URL`;

            // Access environment variables through import.meta.env
            let settingsUrl = provider.settings.baseUrl;

            if (settingsUrl && settingsUrl.trim().length === 0) {
              settingsUrl = undefined;
            }

            const url = settingsUrl || import.meta.env[envVarName] || null; // Ensure baseUrl is used
            console.log(`[Debug] Using URL for ${provider.name}:`, url, `(from ${envVarName})`);

            const status = await checkProviderStatus(url, provider.name);

            return {
              ...status,
              enabled: provider.settings.enabled ?? false,
            };
          }),
      );

      setActiveProviders(statuses);
    } catch (error) {
      console.error('[Debug] Failed to update provider statuses:', error);
    }
  };

  useEffect(() => {
    updateProviderStatuses();

    const interval = setInterval(updateProviderStatuses, 30000);

    return () => clearInterval(interval);
  }, [providers]);

  const handleCheckForUpdate = useCallback(async () => {
    if (isCheckingUpdate) {
      return;
    }

    try {
      setIsCheckingUpdate(true);
      setUpdateMessage('Checking for updates...');

      const branchToCheck = isLatestBranch ? 'main' : 'stable';
      console.log(`[Debug] Checking for updates against ${branchToCheck} branch`);

      const latestCommitResp = await GITHUB_URLS.commitJson(branchToCheck);

      const remoteCommitHash = latestCommitResp.commit;
      const currentCommitHash = versionHash;

      if (remoteCommitHash !== currentCommitHash) {
        setUpdateMessage(
          `Update available from ${branchToCheck} branch!\n` +
            `Current: ${currentCommitHash.slice(0, 7)}\n` +
            `Latest: ${remoteCommitHash.slice(0, 7)}`,
        );
      } else {
        setUpdateMessage(`You are on the latest version from the ${branchToCheck} branch`);
      }
    } catch (error) {
      setUpdateMessage('Failed to check for updates');
      console.error('[Debug] Failed to check for updates:', error);
    } finally {
      setIsCheckingUpdate(false);
    }
  }, [isCheckingUpdate, isLatestBranch]);

  const handleCopyToClipboard = useCallback(() => {
    const debugInfo = {
      System: systemInfo,
      Providers: activeProviders.map((provider) => ({
        name: provider.name,
        enabled: provider.enabled,
        isLocal: provider.isLocal,
        running: provider.isRunning,
        error: provider.error,
        lastChecked: provider.lastChecked,
        responseTime: provider.responseTime,
        url: provider.url,
      })),
      Version: {
        hash: versionHash.slice(0, 7),
        branch: isLatestBranch ? 'main' : 'stable',
      },
      Timestamp: new Date().toISOString(),
    };

    navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2)).then(() => {
      toast.success('Debug information copied to clipboard!');
    });
  }, [activeProviders, systemInfo, isLatestBranch]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="i-ph:bug-fill text-xl text-purple-500" />
          <h3 className="text-lg font-medium text-bolt-elements-textPrimary">Debug Information</h3>
        </div>
        <div className="flex gap-2">
          <motion.button
            onClick={handleCopyToClipboard}
            className={classNames(settingsStyles.button.base, settingsStyles.button.primary)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="i-ph:copy" />
            Copy Debug Info
          </motion.button>
          <motion.button
            onClick={handleCheckForUpdate}
            disabled={isCheckingUpdate}
            className={classNames(settingsStyles.button.base, settingsStyles.button.primary)}
            whileHover={!isCheckingUpdate ? { scale: 1.02 } : undefined}
            whileTap={!isCheckingUpdate ? { scale: 0.98 } : undefined}
          >
            {isCheckingUpdate ? (
              <>
                <div className={settingsStyles['loading-spinner']} />
                Checking...
              </>
            ) : (
              <>
                <div className="i-ph:arrow-clockwise" />
                Check for Updates
              </>
            )}
          </motion.button>
        </div>
      </div>

      {updateMessage && (
        <motion.div
          className={classNames(
            settingsStyles.card,
            'bg-bolt-elements-background-depth-2',
            updateMessage.includes('Update available') ? 'border-l-4 border-yellow-500' : '',
          )}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-start gap-3">
            <div
              className={classNames(
                updateMessage.includes('Update available')
                  ? 'i-ph:warning-fill text-yellow-500'
                  : 'i-ph:info text-bolt-elements-textSecondary',
                'text-xl flex-shrink-0',
              )}
            />
            <div className="flex-1">
              <p className="text-bolt-elements-textSecondary whitespace-pre-line">{updateMessage}</p>
              {updateMessage.includes('Update available') && (
                <div className="mt-3">
                  <p className="font-medium text-bolt-elements-textPrimary">To update:</p>
                  <ol className="list-decimal ml-4 mt-1 space-y-2">
                    <li className="text-bolt-elements-textSecondary">
                      <div className="flex items-center gap-2">
                        <div className="i-ph:git-branch text-purple-500" />
                        Pull the latest changes:{' '}
                        <code className="px-1.5 py-0.5 rounded bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary">
                          git pull upstream main
                        </code>
                      </div>
                    </li>
                    <li className="text-bolt-elements-textSecondary">
                      <div className="flex items-center gap-2">
                        <div className="i-ph:package text-purple-500" />
                        Install any new dependencies:{' '}
                        <code className="px-1.5 py-0.5 rounded bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary">
                          pnpm install
                        </code>
                      </div>
                    </li>
                    <li className="text-bolt-elements-textSecondary">
                      <div className="flex items-center gap-2">
                        <div className="i-ph:arrows-clockwise text-purple-500" />
                        Restart the application
                      </div>
                    </li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      <section className="space-y-4">
        <motion.div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="i-ph:desktop text-xl text-purple-500" />
            <h4 className="text-md font-medium text-bolt-elements-textPrimary">System Information</h4>
          </div>
          <motion.div className={classNames(settingsStyles.card, 'bg-bolt-elements-background-depth-2')}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="i-ph:computer-tower text-bolt-elements-textSecondary" />
                  <p className="text-xs text-bolt-elements-textSecondary">Operating System</p>
                </div>
                <p className="text-sm font-medium text-bolt-elements-textPrimary">{systemInfo.os}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="i-ph:device-mobile text-bolt-elements-textSecondary" />
                  <p className="text-xs text-bolt-elements-textSecondary">Device Type</p>
                </div>
                <p className="text-sm font-medium text-bolt-elements-textPrimary">{systemInfo.deviceType}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="i-ph:browser text-bolt-elements-textSecondary" />
                  <p className="text-xs text-bolt-elements-textSecondary">Browser</p>
                </div>
                <p className="text-sm font-medium text-bolt-elements-textPrimary">{systemInfo.browser}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="i-ph:monitor text-bolt-elements-textSecondary" />
                  <p className="text-xs text-bolt-elements-textSecondary">Display</p>
                </div>
                <p className="text-sm font-medium text-bolt-elements-textPrimary">
                  {systemInfo.screen} ({systemInfo.colorDepth}) @{systemInfo.pixelRatio}x
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="i-ph:wifi-high text-bolt-elements-textSecondary" />
                  <p className="text-xs text-bolt-elements-textSecondary">Connection</p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={classNames('w-2 h-2 rounded-full', systemInfo.online ? 'bg-green-500' : 'bg-red-500')}
                  />
                  <span
                    className={classNames('text-sm font-medium', systemInfo.online ? 'text-green-500' : 'text-red-500')}
                  >
                    {systemInfo.online ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="i-ph:translate text-bolt-elements-textSecondary" />
                  <p className="text-xs text-bolt-elements-textSecondary">Language</p>
                </div>
                <p className="text-sm font-medium text-bolt-elements-textPrimary">{systemInfo.language}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="i-ph:clock text-bolt-elements-textSecondary" />
                  <p className="text-xs text-bolt-elements-textSecondary">Timezone</p>
                </div>
                <p className="text-sm font-medium text-bolt-elements-textPrimary">{systemInfo.timezone}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="i-ph:cpu text-bolt-elements-textSecondary" />
                  <p className="text-xs text-bolt-elements-textSecondary">CPU Cores</p>
                </div>
                <p className="text-sm font-medium text-bolt-elements-textPrimary">{systemInfo.cores}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-bolt-elements-borderColor">
              <div className="flex items-center gap-2 mb-1">
                <div className="i-ph:git-commit text-bolt-elements-textSecondary" />
                <p className="text-xs text-bolt-elements-textSecondary">Version</p>
              </div>
              <p className="text-sm font-medium text-bolt-elements-textPrimary font-mono">
                {connitJson.commit.slice(0, 7)}
                <span className="ml-2 text-xs text-bolt-elements-textSecondary">
                  (v{versionTag || '0.0.1'}) - {isLatestBranch ? 'nightly' : 'stable'}
                </span>
              </p>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="i-ph:robot text-xl text-purple-500" />
            <h4 className="text-md font-medium text-bolt-elements-textPrimary">Local LLM Status</h4>
          </div>
          <motion.div className={classNames(settingsStyles.card, 'bg-bolt-elements-background-depth-2')}>
            <div className="divide-y divide-bolt-elements-borderColor">
              {activeProviders.map((provider) => (
                <div key={provider.name} className="p-4 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <div
                          className={classNames(
                            'w-2 h-2 rounded-full',
                            !provider.enabled ? 'bg-gray-400' : provider.isRunning ? 'bg-green-500' : 'bg-red-500',
                          )}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-bolt-elements-textPrimary">{provider.name}</p>
                        {provider.url && (
                          <p className="text-xs text-bolt-elements-textSecondary truncate max-w-[300px]">
                            {provider.url}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={classNames(
                          'px-2 py-0.5 text-xs rounded-full',
                          provider.enabled
                            ? 'bg-green-500/10 text-green-500'
                            : 'bg-gray-500/10 text-bolt-elements-textSecondary',
                        )}
                      >
                        {provider.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      {provider.enabled && (
                        <span
                          className={classNames(
                            'px-2 py-0.5 text-xs rounded-full',
                            provider.isRunning ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500',
                          )}
                        >
                          {provider.isRunning ? 'Running' : 'Not Running'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pl-5 mt-2 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs text-bolt-elements-textSecondary">
                        Last checked: {new Date(provider.lastChecked).toLocaleTimeString()}
                      </span>
                      {provider.responseTime && (
                        <span className="text-xs text-bolt-elements-textSecondary">
                          Response time: {Math.round(provider.responseTime)}ms
                        </span>
                      )}
                    </div>

                    {provider.error && (
                      <div className="mt-2 text-xs text-red-500 bg-red-500/10 rounded-md p-2">
                        <span className="font-medium">Error:</span> {provider.error}
                      </div>
                    )}

                    {provider.url && (
                      <div className="text-xs text-bolt-elements-textSecondary mt-2">
                        <span className="font-medium">Endpoints checked:</span>
                        <ul className="list-disc list-inside pl-2 mt-1 space-y-1">
                          <li>{provider.url} (root)</li>
                          <li>{provider.url}/api/health</li>
                          <li>{provider.url}/v1/models</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {activeProviders.length === 0 && (
                <div className="p-4 text-center text-bolt-elements-textSecondary">No local LLMs configured</div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
