import React, { useState, useEffect } from 'react';
import { logStore } from '~/lib/stores/logs';
import { classNames } from '~/utils/classNames';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';

interface GitHubUserResponse {
  login: string;
  avatar_url: string;
  html_url: string;
}

interface GitHubConnection {
  user: GitHubUserResponse | null;
  token: string;
}

export default function ConnectionsTab() {
  const [connection, setConnection] = useState<GitHubConnection>({
    user: null,
    token: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  // Load saved connection on mount
  useEffect(() => {
    const savedConnection = localStorage.getItem('github_connection');

    if (savedConnection) {
      setConnection(JSON.parse(savedConnection));
    }

    setIsLoading(false);
  }, []);

  const fetchGithubUser = async (token: string) => {
    try {
      setIsConnecting(true);

      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Invalid token or unauthorized');
      }

      const data = (await response.json()) as GitHubUserResponse;
      const newConnection = { user: data, token };

      // Save connection
      localStorage.setItem('github_connection', JSON.stringify(newConnection));
      setConnection(newConnection);
      toast.success('Successfully connected to GitHub');
    } catch (error) {
      logStore.logError('Failed to authenticate with GitHub', { error });
      toast.error('Failed to connect to GitHub');
      setConnection({ user: null, token: '' });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnect = async (event: React.FormEvent) => {
    event.preventDefault();
    await fetchGithubUser(connection.token);
  };

  const handleDisconnect = () => {
    localStorage.removeItem('github_connection');
    setConnection({ user: null, token: '' });
    toast.success('Disconnected from GitHub');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="flex items-center gap-2">
          <div className="i-ph:spinner-gap-bold animate-spin w-4 h-4" />
          <span className="text-bolt-elements-textSecondary">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        className="flex items-center gap-2 mb-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="i-ph:plugs-connected w-5 h-5 text-purple-500" />
        <h2 className="text-lg font-medium text-bolt-elements-textPrimary">Connection Settings</h2>
      </motion.div>
      <p className="text-sm text-bolt-elements-textSecondary mb-6">
        Manage your external service connections and integrations
      </p>

      <div className="grid grid-cols-1 gap-4">
        {/* GitHub Connection */}
        <motion.div
          className="bg-[#FFFFFF] dark:bg-[#0A0A0A] rounded-lg border border-[#E5E5E5] dark:border-[#1A1A1A]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-2">
              <div className="i-ph:github-logo w-5 h-5 text-bolt-elements-textPrimary" />
              <h3 className="text-base font-medium text-bolt-elements-textPrimary">GitHub Connection</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-bolt-elements-textSecondary mb-2">GitHub Username</label>
                <input
                  type="text"
                  value={connection.user?.login || ''}
                  disabled={true}
                  placeholder="Not connected"
                  className={classNames(
                    'w-full px-3 py-2 rounded-lg text-sm',
                    'bg-[#F8F8F8] dark:bg-[#1A1A1A]',
                    'border border-[#E5E5E5] dark:border-[#333333]',
                    'text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary',
                    'focus:outline-none focus:ring-1 focus:ring-purple-500',
                    'disabled:opacity-50',
                  )}
                />
              </div>

              <div>
                <label className="block text-sm text-bolt-elements-textSecondary mb-2">Personal Access Token</label>
                <input
                  type="password"
                  value={connection.token}
                  onChange={(e) => setConnection((prev) => ({ ...prev, token: e.target.value }))}
                  disabled={isConnecting || !!connection.user}
                  placeholder="Enter your GitHub token"
                  className={classNames(
                    'w-full px-3 py-2 rounded-lg text-sm',
                    'bg-[#F8F8F8] dark:bg-[#1A1A1A]',
                    'border border-[#E5E5E5] dark:border-[#333333]',
                    'text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary',
                    'focus:outline-none focus:ring-1 focus:ring-purple-500',
                    'disabled:opacity-50',
                  )}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              {!connection.user ? (
                <button
                  onClick={handleConnect}
                  disabled={isConnecting || !connection.token}
                  className={classNames(
                    'px-4 py-2 rounded-lg text-sm flex items-center gap-2',
                    'bg-purple-500 text-white',
                    'hover:bg-purple-600',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  {isConnecting ? (
                    <>
                      <div className="i-ph:spinner-gap animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <div className="i-ph:plug-charging w-4 h-4" />
                      Connect
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleDisconnect}
                  className={classNames(
                    'px-4 py-2 rounded-lg text-sm flex items-center gap-2',
                    'bg-red-500 text-white',
                    'hover:bg-red-600',
                  )}
                >
                  <div className="i-ph:plug-x w-4 h-4" />
                  Disconnect
                </button>
              )}

              {connection.user && (
                <span className="text-sm text-green-500 flex items-center gap-1">
                  <div className="i-ph:check-circle w-4 h-4" />
                  Connected to GitHub
                </span>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
