import React, { useState, useEffect } from 'react';
import { useGit } from '~/lib/hooks/useGit';
import type { Message } from 'ai';
import { detectProjectCommands, createCommandsMessage } from '~/utils/projectCommands';
import { generateId } from '~/utils/fileUtils';
import { toast } from 'react-toastify';
import { logStore } from '~/lib/stores/logs';
import { motion } from 'framer-motion';
import { DialogRoot } from '~/components/ui/Dialog';
import { classNames } from '~/utils/classNames';
import ignore from 'ignore';
import Cookies from 'js-cookie';
import { GitHubClient, type Repository } from '~/lib/github/GitHubClient';
import styles from '~/components/settings/Settings.module.scss';

// Enhanced ignore patterns
const IGNORE_PATTERNS = [
  // Development
  'node_modules/**',
  '.git/**',
  '.github/**',
  '.vscode/**',
  'dist/**',
  'build/**',
  '.next/**',
  'coverage/**',
  '.cache/**',
  '.idea/**',

  // Dependency files
  '**/package-lock.json',
  '**/yarn.lock',
  '**/pnpm-lock.yaml',
  '**/composer.lock',
  '**/Gemfile.lock',

  // Logs and caches
  '**/*.log',
  '**/npm-debug.log*',
  '**/yarn-debug.log*',
  '**/yarn-error.log*',
  '**/.DS_Store',

  // Large binary files
  '**/*.jpg',
  '**/*.jpeg',
  '**/*.png',
  '**/*.gif',
  '**/*.ico',
  '**/*.pdf',
  '**/*.zip',
  '**/*.tar.gz',

  // Environment and secrets
  '**/.env*',
  '**/*.pem',
  '**/id_rsa*',
];

const ig = ignore().add(IGNORE_PATTERNS);

interface CloneProgress {
  stage: 'preparing' | 'cloning' | 'processing' | 'importing';
  progress: number;
  details: string;
  branch?: string;
  filesProcessed?: number;
  totalFiles?: number;
  currentFile?: string;
  error?: string;
}

interface RepoInfo {
  owner: string;
  name: string;
  branch: string;
  isPrivate: boolean;
}

function parseGitUrl(url: string): RepoInfo | null {
  try {
    // Handle HTTPS URLs
    if (url.startsWith('https://')) {
      const match = url.match(/https:\/\/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+))?/);

      if (match) {
        return {
          owner: match[1],
          name: match[2].replace('.git', ''),
          branch: match[3] || 'main',
          isPrivate: false,
        };
      }
    }

    // Handle SSH URLs
    if (url.startsWith('git@')) {
      const match = url.match(/git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/);

      if (match) {
        return {
          owner: match[1],
          name: match[2].replace('.git', ''),
          branch: 'main',
          isPrivate: true,
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}

interface GitCloneButtonProps {
  className?: string;
  importChat?: (description: string, messages: Message[]) => Promise<void>;
}

interface Branch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
  default?: boolean;
}

export default function GitCloneButton({ importChat }: GitCloneButtonProps) {
  const { ready, gitClone } = useGit();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<CloneProgress | null>(null);
  const [memoryWarningShown, setMemoryWarningShown] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('');
  const [error, setError] = useState<string>('');

  // New state for repository selection
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [customUrl, setCustomUrl] = useState(false);

  // Fetch repositories when dialog opens
  useEffect(() => {
    const fetchRepositories = async () => {
      if (!showDialog) {
        return;
      }

      try {
        setIsLoadingRepos(true);
        setError('');

        const token = Cookies.get('githubToken');
        const username = Cookies.get('githubUsername');

        if (!token || !username) {
          return;
        }

        const client = new GitHubClient({ token, username });
        const repoList = await client.listRepositories();
        setRepositories(repoList);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch repositories');
      } finally {
        setIsLoadingRepos(false);
      }
    };

    fetchRepositories();
  }, [showDialog]);

  // Fetch branches when repository is selected
  useEffect(() => {
    const fetchBranches = async () => {
      if (!selectedRepo) {
        setBranches([]);
        return;
      }

      try {
        setIsLoadingBranches(true);
        setError('');

        const token = Cookies.get('githubToken');
        const username = Cookies.get('githubUsername');

        if (!token || !username) {
          return;
        }

        const client = new GitHubClient({ token, username });
        const [owner, repo] = selectedRepo.split('/');
        const branchList = await client.listBranches(owner, repo);
        setBranches(branchList);

        // Set default branch if available
        const defaultBranch = branchList.find((b) => b.default);

        if (defaultBranch) {
          setBranch(defaultBranch.name);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch branches');
      } finally {
        setIsLoadingBranches(false);
      }
    };

    fetchBranches();
  }, [selectedRepo]);

  // Update repoUrl when repository is selected
  useEffect(() => {
    if (selectedRepo && !customUrl) {
      setRepoUrl(`https://github.com/${selectedRepo}`);
      setError('');
    }
  }, [selectedRepo, customUrl]);

  const validateGitUrl = (url: string): boolean => {
    return parseGitUrl(url) !== null;
  };

  const updateProgress = (update: Partial<CloneProgress>) => {
    setProgress((prev) => (prev ? { ...prev, ...update } : null));
  };

  const processFiles = async (data: Record<string, any>, _workdir: string) => {
    const filePaths = Object.keys(data).filter((filePath) => !ig.ignores(filePath));
    const textDecoder = new TextDecoder('utf-8');
    const processedFiles = [];
    let filesProcessed = 0;
    const totalFiles = filePaths.length;

    // Show warning for large repositories
    if (totalFiles > 1000 && !memoryWarningShown) {
      const proceed = window.confirm(
        `This repository contains ${totalFiles} files. Processing large repositories may affect performance. Continue?`,
      );
      setMemoryWarningShown(true);

      if (!proceed) {
        throw new Error('Operation cancelled by user');
      }
    }

    // Process files in chunks to avoid memory issues
    const CHUNK_SIZE = 50;

    for (let i = 0; i < filePaths.length; i += CHUNK_SIZE) {
      const chunk = filePaths.slice(i, i + CHUNK_SIZE);
      const chunkResults = await Promise.all(
        chunk.map(async (filePath) => {
          try {
            const { data: content, encoding } = data[filePath];
            filesProcessed++;

            updateProgress({
              stage: 'processing',
              progress: 50 + (30 * filesProcessed) / totalFiles,
              details: `Processing files (${filesProcessed}/${totalFiles})...`,
              filesProcessed,
              totalFiles,
              currentFile: filePath,
            });

            // Skip binary files and files over 1MB
            if (content instanceof Uint8Array && content.length > 1024 * 1024) {
              logStore.logSystem('Skipping large file', { path: filePath, size: content.length });
              return null;
            }

            return {
              path: filePath,
              content: encoding === 'utf8' ? content : content instanceof Uint8Array ? textDecoder.decode(content) : '',
            };
          } catch (error) {
            logStore.logError('Failed to process file', {
              path: filePath,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            return null;
          }
        }),
      );

      processedFiles.push(...chunkResults.filter((f): f is NonNullable<typeof f> => f !== null && Boolean(f.content)));

      // Allow UI to update
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    return processedFiles;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ready || !repoUrl.trim()) {
      return;
    }

    if (!validateGitUrl(repoUrl)) {
      setError('Invalid GitHub repository URL. Please use HTTPS or SSH format.');
      return;
    }

    const repoInfo = parseGitUrl(repoUrl)!;
    const selectedBranch = branch.trim() || repoInfo.branch;

    setLoading(true);
    setShowDialog(false);
    setProgress({
      stage: 'preparing',
      progress: 0,
      details: 'Initializing clone operation...',
      branch: selectedBranch,
    });

    try {
      logStore.logSystem('Starting repository clone', {
        url: repoUrl,
        branch: selectedBranch,
        owner: repoInfo.owner,
        repo: repoInfo.name,
        isPrivate: repoInfo.isPrivate,
      });

      updateProgress({
        stage: 'cloning',
        progress: 20,
        details: `Cloning repository (${selectedBranch})...`,
      });

      const { workdir, data } = await gitClone(repoUrl);

      if (importChat) {
        const processedFiles = await processFiles(data, workdir);

        updateProgress({
          stage: 'importing',
          progress: 80,
          details: 'Analyzing project structure...',
        });

        // Detect project commands
        const commands = await detectProjectCommands(processedFiles);
        const commandsMessage = createCommandsMessage(commands);

        // Create files message with branch info
        const filesMessage: Message = {
          role: 'assistant',
          content: `Successfully cloned repository: ${repoUrl} (branch: ${selectedBranch}) into ${workdir}
<boltArtifact id="imported-files" title="Git Cloned Files" type="bundled">
${processedFiles
  .map(
    (file) =>
      `<boltAction type="file" filePath="${file.path}">
${file.content}
</boltAction>`,
  )
  .join('\n')}
</boltArtifact>`,
          id: generateId(),
          createdAt: new Date(),
        };

        const messages = [filesMessage];

        if (commandsMessage) {
          messages.push(commandsMessage);
        }

        updateProgress({ progress: 90, details: 'Importing project...' });
        await importChat(`Git Project: ${repoInfo.name} (${selectedBranch})`, messages);

        logStore.logSystem('Repository clone completed', {
          url: repoUrl,
          branch: selectedBranch,
          fileCount: processedFiles.length,
          hasCommands: Boolean(commandsMessage),
        });

        toast.success(`Repository cloned successfully from branch ${selectedBranch}!`);
      }
    } catch (error) {
      logStore.logError('Failed to clone repository', {
        url: repoUrl,
        branch: selectedBranch,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('Authentication failed')) {
        toast.error('Authentication failed. Please check your GitHub credentials in Settings.');
      } else if (errorMessage.includes('Operation cancelled')) {
        toast.info('Clone operation cancelled by user.');
      } else if (errorMessage.includes('not found')) {
        toast.error(`Branch '${selectedBranch}' not found in repository.`);
      } else {
        toast.error('Failed to clone repository. Please try again.');
      }
    } finally {
      setLoading(false);
      setProgress(null);
      setRepoUrl('');
      setBranch('');
      setSelectedRepo('');
      setCustomUrl(false);
    }
  };

  return (
    <div className="flex">
      <button
        onClick={() => setShowDialog(true)}
        disabled={loading || !ready}
        className="px-4 py-2 rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-prompt-background text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-3 transition-all flex items-center gap-2"
      >
        {loading ? (
          <div className="i-ph:spinner-gap-bold animate-spin text-lg" />
        ) : (
          <span className="i-ph:git-branch-bold text-lg" />
        )}
        <span>Clone Repository</span>
      </button>

      {/* Clone Dialog */}
      {showDialog && (
        <DialogRoot open={showDialog} onOpenChange={setShowDialog}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-bolt-elements-background/80 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded-xl p-6 max-w-md w-full mx-4 shadow-lg"
            >
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="i-ph:git-branch-bold text-2xl text-bolt-elements-textPrimary" />
                    <h3 className="text-lg font-semibold text-bolt-elements-textPrimary">Clone Repository</h3>
                  </div>
                  <motion.button
                    type="button"
                    onClick={() => setShowDialog(false)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={classNames(
                      'text-bolt-elements-textTertiary hover:text-bolt-elements-textSecondary transition-colors',
                      'hover:bg-bolt-elements-button-primary-backgroundHover rounded-md p-1',
                    )}
                  >
                    <span className="i-ph:x-bold text-xl" />
                  </motion.button>
                </div>

                <div className="space-y-4 border-t border-bolt-elements-borderColor pt-4">
                  {/* Repository Selection */}
                  <div>
                    <label className="block text-sm font-medium text-bolt-elements-textSecondary mb-2">
                      Select Repository
                    </label>
                    {isLoadingRepos ? (
                      <div className="flex items-center gap-2 text-sm text-bolt-elements-textTertiary">
                        <div className="i-ph:spinner-gap animate-spin" />
                        Loading repositories...
                      </div>
                    ) : repositories.length > 0 ? (
                      <select
                        value={selectedRepo}
                        onChange={(e) => {
                          setSelectedRepo(e.target.value);
                          setCustomUrl(false);
                        }}
                        className={classNames(
                          'w-full px-3 py-2 bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-lg',
                          'text-bolt-elements-textPrimary focus:outline-none focus:ring-2 focus:ring-bolt-elements-accent/50',
                          'focus:border-bolt-elements-accent transition-all duration-200',
                        )}
                      >
                        <option value="">Select a repository</option>
                        {repositories.map((repo) => (
                          <option key={repo.id} value={repo.full_name}>
                            {repo.name} ({repo.private ? 'Private' : 'Public'})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-sm text-bolt-elements-textTertiary">No repositories found</div>
                    )}
                  </div>

                  {/* Custom URL Toggle */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="customUrl"
                      checked={customUrl}
                      onChange={(e) => setCustomUrl(e.target.checked)}
                      className="rounded border-bolt-elements-borderColor bg-bolt-elements-background-depth-1"
                    />
                    <label htmlFor="customUrl" className="text-sm text-bolt-elements-textSecondary">
                      Use custom repository URL
                    </label>
                  </div>

                  {/* Repository URL Input (shown when custom URL is enabled) */}
                  {customUrl && (
                    <div>
                      <label className="block text-sm font-medium text-bolt-elements-textSecondary mb-2">
                        Repository URL
                      </label>
                      <input
                        type="text"
                        value={repoUrl}
                        onChange={(e) => {
                          setRepoUrl(e.target.value);
                          setError('');
                        }}
                        placeholder="https://github.com/username/repo or git@github.com:username/repo.git"
                        className={classNames(
                          'w-full px-3 py-2 bg-bolt-elements-background-depth-1 border rounded-lg',
                          'text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary',
                          'focus:outline-none focus:ring-2 focus:ring-bolt-elements-accent/50',
                          'focus:border-bolt-elements-accent transition-all duration-200',
                          error ? 'border-red-500' : 'border-bolt-elements-borderColor',
                        )}
                      />
                      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
                    </div>
                  )}

                  {/* Branch Selection */}
                  {selectedRepo && !customUrl && (
                    <div>
                      <label className="block text-sm font-medium text-bolt-elements-textSecondary mb-2">
                        Select Branch
                      </label>
                      {isLoadingBranches ? (
                        <div className="flex items-center gap-2 text-sm text-bolt-elements-textTertiary">
                          <div className="i-ph:spinner-gap animate-spin" />
                          Loading branches...
                        </div>
                      ) : branches.length > 0 ? (
                        <select
                          value={branch}
                          onChange={(e) => setBranch(e.target.value)}
                          className={classNames(
                            'w-full px-3 py-2 bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-lg',
                            'text-bolt-elements-textPrimary focus:outline-none focus:ring-2 focus:ring-bolt-elements-accent/50',
                            'focus:border-bolt-elements-accent transition-all duration-200',
                          )}
                        >
                          {branches.map((b) => (
                            <option key={b.name} value={b.name}>
                              {b.name} {b.default ? '(default)' : ''} {b.protected ? '(protected)' : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-sm text-bolt-elements-textTertiary">No branches found</div>
                      )}
                    </div>
                  )}

                  {/* Custom Branch Input (shown when custom URL is enabled) */}
                  {customUrl && (
                    <div>
                      <label className="block text-sm font-medium text-bolt-elements-textSecondary mb-2">
                        Branch (optional)
                      </label>
                      <input
                        type="text"
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        placeholder="main"
                        className={classNames(
                          'w-full px-3 py-2 bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-lg',
                          'text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary',
                          'focus:outline-none focus:ring-2 focus:ring-bolt-elements-accent/50',
                          'focus:border-bolt-elements-accent transition-all duration-200',
                        )}
                      />
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-bolt-elements-borderColor">
                    <button type="button" onClick={() => setShowDialog(false)} className={styles['settings-button']}>
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!repoUrl.trim()}
                      className={classNames(
                        styles['settings-button'],
                        'bg-bolt-elements-accent text-white flex items-center gap-2',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                      )}
                    >
                      <div className="i-ph:git-branch text-lg" />
                      Clone Repository
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        </DialogRoot>
      )}

      {/* Progress Dialog */}
      {loading && progress && (
        <div className="fixed inset-0 bg-bolt-elements-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded-xl p-6 max-w-md w-full mx-4 shadow-lg">
            <div className="flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-center gap-3">
                {progress.stage === 'preparing' && <div className="i-ph:git-branch-bold text-xl" />}
                {progress.stage === 'cloning' && <div className="i-ph:git-fork-bold text-xl animate-pulse" />}
                {progress.stage === 'processing' && <div className="i-ph:file-text-bold text-xl" />}
                {progress.stage === 'importing' && <div className="i-ph:arrow-square-in-bold text-xl" />}
                <h3 className="text-lg font-semibold text-bolt-elements-textPrimary">
                  {progress.stage === 'preparing' && 'Preparing Repository'}
                  {progress.stage === 'cloning' && 'Cloning Repository'}
                  {progress.stage === 'processing' && 'Processing Files'}
                  {progress.stage === 'importing' && 'Importing Project'}
                </h3>
              </div>

              {/* Progress Details */}
              <div className="space-y-3">
                <div className="text-sm text-bolt-elements-textSecondary">
                  {progress.details}
                  {progress.branch && (
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="i-ph:git-branch text-[1.1em]" />
                      <span>Branch: {progress.branch}</span>
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="h-2 bg-bolt-elements-background-depth-1 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-bolt-elements-accent transition-all duration-300 rounded-full"
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>

                {/* File Progress */}
                {progress.currentFile && (
                  <div className="text-xs text-bolt-elements-textTertiary space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="i-ph:file-text text-[1.1em]" />
                      <span className="truncate">{progress.currentFile}</span>
                    </div>
                    {progress.filesProcessed !== undefined && progress.totalFiles !== undefined && (
                      <div className="flex items-center gap-1.5">
                        <span className="i-ph:files text-[1.1em]" />
                        <span>
                          {progress.filesProcessed} / {progress.totalFiles} files
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
