import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Cookies from 'js-cookie';
import { logStore } from '~/lib/stores/logs';
import { GitHubClient } from '~/lib/github/GitHubClient';
import { Dialog, DialogTitle, DialogRoot } from '~/components/ui/Dialog';

interface GitHubApiResponse {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  public_repos: number;
  followers: number;
  created_at: string;
  plan?: {
    name: string;
    collaborators: number;
  };
  [key: string]: any;
}

interface TokenTypeInfo {
  type: 'classic' | 'fine-grained';
  createdAt?: Date;
  expiresAt?: Date;
}

interface GitHubTokenInfo {
  token: string;
  scopes: string[];
  tokenInfo?: TokenTypeInfo;
  userDetails?: GitHubApiResponse;
}

interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  private: boolean;
  fork: boolean;
  archived: boolean;
  stargazers_count: number;
  updated_at: string;
  language: string | null;
}

interface Branch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
  default?: boolean;
  isExpanded?: boolean;
  files?: RepoFile[];
  isLoadingFiles?: boolean;
}

interface RepoFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
  url: string;
  isExpanded?: boolean;
  isLoading?: boolean;
  files?: RepoFile[];
}

interface RepositoryState extends Repository {
  isExpanded?: boolean;
  isLoadingBranches?: boolean;
  branches?: Branch[];
  archived: boolean;
}

interface GitHubAuthState {
  username: string;
  tokenInfo: GitHubTokenInfo | null;
  isConnected: boolean;
  isVerifying: boolean;
  rateLimits?: {
    remaining: number;
    limit: number;
    reset: Date;
  };
  repositories?: RepositoryState[];
  isLoadingRepos: boolean;
}

interface RepositoryAction {
  name: string;
  icon: string;
  onClick: () => void;
  color?: 'red' | 'yellow';
}

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  repositoryName: string;
}

function DeleteConfirmationDialog({ isOpen, onClose, onConfirm, repositoryName }: DeleteConfirmationDialogProps) {
  return (
    <DialogRoot open={isOpen} onOpenChange={onClose}>
      <Dialog onClose={onClose}>
        <div className="p-6">
          <DialogTitle>
            <div className="flex items-center gap-3">
              <div className="i-ph:warning-circle-bold text-xl text-red-500" />
              <span>Delete Repository</span>
            </div>
          </DialogTitle>
          <div className="mt-4 space-y-4">
            <p className="text-sm text-bolt-elements-textSecondary">
              Are you sure you want to delete <span className="font-semibold">{repositoryName}</span>? This action
              cannot be undone.
            </p>
            <p className="text-sm text-red-500">
              All repository data, issues, pull requests, and settings will be permanently deleted.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-bolt-elements-textSecondary 
                  hover:text-bolt-elements-textPrimary transition-colors rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 
                  hover:bg-red-600 transition-colors rounded-lg"
              >
                Delete Repository
              </button>
            </div>
          </div>
        </div>
      </Dialog>
    </DialogRoot>
  );
}

function RepositoryMenu({ repo: _repo, actions }: { repo: Repository; actions: RepositoryAction[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 text-bolt-elements-textTertiary hover:text-bolt-elements-textSecondary 
          hover:bg-bolt-elements-background-depth-1 rounded-lg transition-colors"
      >
        <div className="i-ph:dots-three-vertical-bold text-lg" />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div
            className="absolute right-0 mt-1 w-48 bg-bolt-elements-background-depth-2 border 
            border-bolt-elements-borderColor rounded-lg shadow-lg overflow-hidden z-20"
          >
            {actions.map((action) => (
              <button
                key={action.name}
                onClick={() => {
                  action.onClick();
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2 text-sm flex items-center gap-2 hover:bg-bolt-elements-background-depth-1
                  ${
                    action.color === 'red'
                      ? 'text-red-500 hover:bg-red-500/10'
                      : action.color === 'yellow'
                        ? 'text-yellow-500 hover:bg-yellow-500/10'
                        : 'text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary'
                  }`}
              >
                <div className={action.icon} />
                {action.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const REQUIRED_SCOPES = ['repo', 'user', 'read:org', 'workflow'];
const OPTIONAL_SCOPES = [
  'delete_repo',
  'write:packages',
  'read:packages',
  'admin:org',
  'write:org',
  'manage_runners:org',
  'admin:public_key',
  'admin:repo_hook',
  'admin:org_hook',
  'gist',
  'notifications',
  'user:email',
  'user:follow',
  'write:discussion',
  'read:discussion',
  'codespace',
  'project',
  'admin:gpg_key',
  'admin:ssh_signing_key',
  'repo:status',
  'repo:deployment',
  'public_repo',
  'repo:invite',
  'security_events',
];

export default function ConnectionsTab() {
  const [authState, setAuthState] = useState<GitHubAuthState>({
    username: Cookies.get('githubUsername') || '',
    tokenInfo: null,
    isConnected: false,
    isVerifying: false,
    isLoadingRepos: false,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);

  const loadRepositoriesAndBranches = async () => {
    if (!authState.isConnected || !authState.tokenInfo) {
      logStore.logSystem('Skipping repository load - not connected or no token');
      return;
    }

    logStore.logSystem('Starting to load repositories', { username: authState.username });
    setAuthState((prev) => ({ ...prev, isLoadingRepos: true }));

    try {
      const client = new GitHubClient({
        token: authState.tokenInfo.token,
        username: authState.username,
      });

      const repositories = await client.listRepositories();
      logStore.logSystem('Repositories loaded', { count: repositories.length });

      const reposWithBranches = await Promise.all(
        repositories.map(async (repo) => {
          try {
            const [owner, repoName] = repo.full_name.split('/');
            const branches = await client.listBranches(owner, repoName);

            logStore.logSystem('Branches loaded', {
              repoName: repo.full_name,
              branchCount: branches.length,
              defaultBranch: branches.find((b) => b.default)?.name,
            });

            return {
              ...repo,
              branches,
              isExpanded: false,
              isLoadingBranches: false,
              archived: repo.archived || false,
            } as RepositoryState;
          } catch (error) {
            logStore.logError('Failed to load branches', {
              repoName: repo.full_name,
              error: error instanceof Error ? error.message : 'Unknown error',
            });

            return {
              ...repo,
              branches: [],
              isExpanded: false,
              isLoadingBranches: false,
              archived: repo.archived || false,
            } as RepositoryState;
          }
        }),
      );

      logStore.logSystem('Setting repositories in state', { count: reposWithBranches.length });
      setAuthState((prev) => ({
        ...prev,
        repositories: reposWithBranches,
        isLoadingRepos: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logStore.logError('Failed to load repositories', { error: errorMessage });
      toast.error('Failed to load repositories. Please try again.');
      setAuthState((prev) => ({ ...prev, isLoadingRepos: false }));
    }
  };

  useEffect(() => {
    // Load token info from secure storage
    const storedToken = Cookies.get('githubToken');
    logStore.logSystem('Initial load - checking for stored token', { hasToken: !!storedToken });

    if (storedToken) {
      verifyAndLoadTokenInfo(storedToken);
    }
  }, []);

  // Load repositories when connected
  useEffect(() => {
    logStore.logSystem('Connection state changed', {
      isConnected: authState.isConnected,
      hasRepositories: !!authState.repositories,
      username: authState.username,
      hasToken: !!authState.tokenInfo?.token,
    });

    if (authState.isConnected && !authState.repositories) {
      logStore.logSystem('Loading repositories due to connection state change');
      loadRepositoriesAndBranches();
    }
  }, [authState.isConnected]);

  // Periodically check rate limits when connected
  useEffect(() => {
    if (authState.isConnected) {
      const checkRateLimits = async () => {
        try {
          const response = await fetch('https://api.github.com/rate_limit', {
            headers: {
              Authorization: `Bearer ${authState.tokenInfo?.token}`,
              Accept: 'application/vnd.github.v3+json',
            },
          });

          if (response.ok) {
            const data = (await response.json()) as {
              resources: {
                core: {
                  remaining: number;
                  limit: number;
                  reset: number;
                };
              };
            };

            setAuthState((prev) => ({
              ...prev,
              rateLimits: {
                remaining: data.resources.core.remaining,
                limit: data.resources.core.limit,
                reset: new Date(data.resources.core.reset * 1000),
              },
            }));
          }
        } catch (error) {
          console.error('Failed to fetch rate limits:', error);
        }
      };

      checkRateLimits();

      const interval = setInterval(checkRateLimits, 60000); // Check every minute

      return () => clearInterval(interval);
    }

    return undefined;
  }, [authState.isConnected, authState.tokenInfo?.token]);

  const verifyAndLoadTokenInfo = async (token: string) => {
    logStore.logSystem('Starting token verification', { username: authState.username });
    setAuthState((prev) => ({ ...prev, isVerifying: true }));

    try {
      const client = new GitHubClient({ token, username: authState.username });

      // First validate basic authentication
      const isValid = await client.validateAuth();
      logStore.logSystem('Token validation result', { isValid });

      if (!isValid) {
        throw new Error('Invalid GitHub credentials');
      }

      // Get all scopes and user details
      const [scopes, userDetails] = await Promise.all([client.getScopes(), client.getUserDetails()]);
      logStore.logSystem('Token verified successfully', {
        username: userDetails.login,
        scopesCount: scopes.length,
        scopes,
      });

      // Store token securely
      Cookies.set('githubToken', token, {
        secure: true,
        sameSite: 'strict',
      });
      Cookies.set('githubUsername', userDetails.login, {
        secure: true,
        sameSite: 'strict',
      });

      setAuthState((prev) => ({
        ...prev,
        username: userDetails.login,
        tokenInfo: {
          token,
          scopes,
          userDetails,
        },
        isConnected: true,
        isVerifying: false,
      }));

      // Load repositories after successful authentication
      logStore.logSystem('Loading repositories after successful authentication');
      await loadRepositoriesAndBranches();

      toast.success('GitHub connection verified successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify GitHub token';
      logStore.logError('Failed to verify GitHub token', { error: errorMessage });
      toast.error(errorMessage);
      setAuthState((prev) => ({ ...prev, isVerifying: false }));
    }
  };

  const handleSaveConnection = async () => {
    const { username, tokenInfo } = authState;

    if (!username || !tokenInfo?.token) {
      toast.error('Please provide both GitHub username and token');
      return;
    }

    await verifyAndLoadTokenInfo(tokenInfo.token);
  };

  const handleDisconnect = () => {
    if (!confirm('Are you sure you want to disconnect from GitHub?')) {
      return;
    }

    // Clear all GitHub-related data
    Cookies.remove('githubUsername');
    Cookies.remove('githubToken');
    Cookies.remove('git:github.com');

    setAuthState({
      username: '',
      tokenInfo: null,
      isConnected: false,
      isVerifying: false,
      isLoadingRepos: false,
    });

    logStore.logSystem('GitHub connection removed');
    toast.success('GitHub connection removed successfully!');
  };

  const getScopeDescription = (scope: string) => {
    const descriptions: Record<string, string> = {
      repo: 'Full repository access',
      user: 'Read user profile data',
      'read:org': 'Read organization data',
      workflow: 'Manage GitHub Actions',
      delete_repo: 'Delete repositories',
      'write:packages': 'Upload packages',
      'read:packages': 'Download packages',
      'admin:org': 'Manage organizations',
      'write:org': 'Write organization data',
      'manage_runners:org': 'Manage Actions runners',
      'admin:public_key': 'Manage SSH keys',
      'admin:repo_hook': 'Manage repository webhooks',
      'admin:org_hook': 'Manage organization webhooks',
      gist: 'Create and edit gists',
      notifications: 'Access notifications',
      'user:email': 'Access email addresses',
      'user:follow': 'Follow/unfollow users',
      'write:discussion': 'Manage discussions',
      'read:discussion': 'Read discussions',
      codespace: 'Manage codespaces',
      project: 'Manage projects',
      'admin:gpg_key': 'Manage GPG keys',
      'admin:ssh_signing_key': 'Manage SSH signing keys',
      'repo:status': 'Access commit status',
      'repo:deployment': 'Access deployment status',
      public_repo: 'Access public repositories',
      'repo:invite': 'Access repository invitations',
      security_events: 'Read and write security events',
    };
    return descriptions[scope] || scope;
  };

  const handleDeleteRepository = async (repo: Repository) => {
    if (!authState.tokenInfo?.scopes.includes('delete_repo')) {
      toast.error('Missing required permission: delete_repo. Please update your token permissions.');
      return;
    }

    try {
      const client = new GitHubClient({
        token: authState.tokenInfo?.token || '',
        username: authState.username,
      });

      logStore.logSystem('Deleting repository', { repoName: repo.full_name });
      await client.deleteRepository(repo.full_name);

      toast.success(`Repository ${repo.name} deleted successfully`);

      // First remove from local state for immediate feedback
      setAuthState((prev) => ({
        ...prev,
        repositories: prev.repositories?.filter((r) => r.id !== repo.id),
      }));

      // Then refresh from API
      await loadRepositoriesAndBranches();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logStore.logError('Failed to delete repository', {
        repoName: repo.full_name,
        error: errorMessage,
      });

      if (errorMessage.includes('403')) {
        toast.error('Permission denied. Please check your token has the delete_repo scope.');
      } else {
        toast.error(`Failed to delete repository: ${errorMessage}`);
      }
    }
  };

  const handleRenameRepository = async (repo: Repository, newName: string) => {
    if (!authState.tokenInfo?.scopes.includes('repo')) {
      toast.error('Missing required permission: repo. Please update your token permissions.');
      return;
    }

    try {
      const client = new GitHubClient({
        token: authState.tokenInfo?.token || '',
        username: authState.username,
      });

      logStore.logSystem('Renaming repository', {
        repoName: repo.full_name,
        newName,
      });

      await client.updateRepository(repo.full_name, { name: newName });
      toast.success(`Repository renamed to ${newName}`);

      // First update local state for immediate feedback
      setAuthState((prev) => ({
        ...prev,
        repositories: prev.repositories?.map((r) =>
          r.id === repo.id
            ? {
                ...r,
                name: newName,
                full_name: `${authState.username}/${newName}`,
                html_url: repo.html_url.replace(repo.name, newName),
              }
            : r,
        ),
      }));

      // Wait for GitHub to process the change before refreshing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Then refresh from API
      await loadRepositoriesAndBranches();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logStore.logError('Failed to rename repository', {
        repoName: repo.full_name,
        newName,
        error: errorMessage,
      });

      if (errorMessage.includes('403')) {
        toast.error('Permission denied. Please check your token has the repo scope.');
      } else {
        toast.error(`Failed to rename repository: ${errorMessage}`);
      }
    }
  };

  const handleUpdateRepository = async (
    repo: Repository,
    data: {
      name?: string;
      description?: string;
      private?: boolean;
      archived?: boolean;
    },
  ) => {
    try {
      const client = new GitHubClient({
        token: authState.tokenInfo?.token || '',
        username: authState.username,
      });

      logStore.logSystem('Updating repository', {
        repoName: repo.full_name,
        updates: data,
      });

      await client.updateRepository(repo.full_name, data);
      toast.success('Repository updated successfully');

      // First update local state for immediate feedback
      setAuthState((prev) => ({
        ...prev,
        repositories: prev.repositories?.map((r) => (r.id === repo.id ? { ...r, ...data } : r)),
      }));

      // Then refresh from API
      await loadRepositoriesAndBranches();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logStore.logError('Failed to update repository', {
        repoName: repo.full_name,
        updates: data,
        error: errorMessage,
      });
      toast.error(`Failed to update repository: ${errorMessage}`);
    }
  };

  const handleTransferRepository = async (repo: Repository, newOwner: string) => {
    try {
      const client = new GitHubClient({
        token: authState.tokenInfo?.token || '',
        username: authState.username,
      });

      logStore.logSystem('Transferring repository', {
        repoName: repo.full_name,
        newOwner,
      });

      await client.transferRepository(repo.full_name, newOwner);
      toast.success(`Repository transfer to ${newOwner} initiated`);

      // First remove from local state for immediate feedback
      setAuthState((prev) => ({
        ...prev,
        repositories: prev.repositories?.filter((r) => r.id !== repo.id),
      }));

      // Then refresh from API
      await loadRepositoriesAndBranches();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logStore.logError('Failed to transfer repository', {
        repoName: repo.full_name,
        newOwner,
        error: errorMessage,
      });
      toast.error(`Failed to transfer repository: ${errorMessage}`);
    }
  };

  const getRepositoryActions = (repo: Repository): RepositoryAction[] => [
    {
      name: 'View on GitHub',
      icon: 'i-ph:arrow-square-out-bold',
      onClick: () => window.open(repo.html_url, '_blank'),
    },
    {
      name: 'Copy Clone URL',
      icon: 'i-ph:copy-bold',
      onClick: () => {
        navigator.clipboard.writeText(repo.html_url);
        toast.success('Clone URL copied to clipboard');
      },
    },
    {
      name: 'Rename',
      icon: 'i-ph:pencil-simple-bold',
      onClick: () => {
        const newName = prompt('Enter new repository name:', repo.name);

        if (newName && newName !== repo.name) {
          handleRenameRepository(repo, newName);
        }
      },
    },
    {
      name: repo.private ? 'Make Public' : 'Make Private',
      icon: repo.private ? 'i-ph:lock-open-bold' : 'i-ph:lock-bold',
      onClick: () => {
        const action = repo.private ? 'public' : 'private';

        if (confirm(`Are you sure you want to make this repository ${action}?`)) {
          handleUpdateRepository(repo, { private: !repo.private });
        }
      },
      color: repo.private ? undefined : 'yellow',
    },
    {
      name: 'Transfer Ownership',
      icon: 'i-ph:user-switch-bold',
      onClick: () => {
        const newOwner = prompt('Enter the new owner username:');

        if (newOwner && confirm(`Are you sure you want to transfer this repository to ${newOwner}?`)) {
          handleTransferRepository(repo, newOwner);
        }
      },
      color: 'yellow',
    },
    {
      name: repo.archived ? 'Unarchive' : 'Archive',
      icon: 'i-ph:archive-bold',
      onClick: () => {
        const action = repo.archived ? 'unarchive' : 'archive';

        if (
          confirm(
            `Are you sure you want to ${action} this repository? ${!repo.archived ? 'It will become read-only.' : ''}`,
          )
        ) {
          handleUpdateRepository(repo, { archived: !repo.archived });
        }
      },
      color: 'yellow',
    },
    {
      name: 'Delete',
      icon: 'i-ph:trash-bold',
      onClick: () => {
        setSelectedRepo(repo);
        setShowDeleteConfirmation(true);
      },
      color: 'red',
    },
  ];

  const handleLoadBranchFiles = async (repo: Repository, branch: Branch) => {
    try {
      const client = new GitHubClient({
        token: authState.tokenInfo?.token || '',
        username: authState.username,
      });

      // Set loading state
      setAuthState((prev) => ({
        ...prev,
        repositories: prev.repositories?.map((r) =>
          r.id === repo.id
            ? {
                ...r,
                branches: r.branches?.map((b) => (b.name === branch.name ? { ...b, isLoadingFiles: true } : b)),
              }
            : r,
        ),
      }));

      const [owner, repoName] = repo.full_name.split('/');
      const files = await client.getRepositoryContents(owner, repoName, branch.name);

      // Update state with files
      setAuthState((prev) => ({
        ...prev,
        repositories: prev.repositories?.map((r) =>
          r.id === repo.id
            ? {
                ...r,
                branches: r.branches?.map((b) =>
                  b.name === branch.name
                    ? {
                        ...b,
                        files: files.map((f) => ({
                          ...f,
                          url: f.html_url,
                        })),
                        isLoadingFiles: false,
                        isExpanded: true,
                      }
                    : b,
                ),
              }
            : r,
        ),
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logStore.logError('Failed to load branch files', {
        repoName: repo.full_name,
        branch: branch.name,
        error: errorMessage,
      });
      toast.error(`Failed to load files: ${errorMessage}`);

      // Reset loading state on error
      setAuthState((prev) => ({
        ...prev,
        repositories: prev.repositories?.map((r) =>
          r.id === repo.id
            ? {
                ...r,
                branches: r.branches?.map((b) => (b.name === branch.name ? { ...b, isLoadingFiles: false } : b)),
              }
            : r,
        ),
      }));
    }
  };

  const handleLoadFolderContents = async (repo: Repository, branch: Branch, folder: RepoFile) => {
    try {
      const client = new GitHubClient({
        token: authState.tokenInfo?.token || '',
        username: authState.username,
      });

      // Set loading state for the folder
      setAuthState((prev) => ({
        ...prev,
        repositories: prev.repositories?.map((r) =>
          r.id === repo.id
            ? {
                ...r,
                branches: r.branches?.map((b) =>
                  b.name === branch.name
                    ? {
                        ...b,
                        files: b.files?.map((f) => (f.path === folder.path ? { ...f, isLoading: true } : f)),
                      }
                    : b,
                ),
              }
            : r,
        ),
      }));

      const [owner, repoName] = repo.full_name.split('/');
      const contents = await client.getRepositoryContents(owner, repoName, branch.name, folder.path);

      // Map API response to RepoFile type
      const files: RepoFile[] = contents.map((file) => ({
        name: file.name,
        path: file.path,
        type: file.type,
        size: file.size,
        url: file.html_url,
      }));

      // Update state with folder contents
      setAuthState((prev) => ({
        ...prev,
        repositories: prev.repositories?.map((r) =>
          r.id === repo.id
            ? {
                ...r,
                branches: r.branches?.map((b) =>
                  b.name === branch.name
                    ? {
                        ...b,
                        files: b.files?.map((f) =>
                          f.path === folder.path
                            ? {
                                ...f,
                                files,
                                isLoading: false,
                                isExpanded: true,
                              }
                            : f,
                        ),
                      }
                    : b,
                ),
              }
            : r,
        ),
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logStore.logError('Failed to load folder contents', {
        repoName: repo.full_name,
        branch: branch.name,
        folder: folder.path,
        error: errorMessage,
      });
      toast.error(`Failed to load folder contents: ${errorMessage}`);

      // Reset loading state on error
      setAuthState((prev) => ({
        ...prev,
        repositories: prev.repositories?.map((r) =>
          r.id === repo.id
            ? {
                ...r,
                branches: r.branches?.map((b) =>
                  b.name === branch.name
                    ? {
                        ...b,
                        files: b.files?.map((f) => (f.path === folder.path ? { ...f, isLoading: false } : f)),
                      }
                    : b,
                ),
              }
            : r,
        ),
      }));
    }
  };

  const handleCreateFile = async (repo: Repository, branch: Branch, path: string = '') => {
    const fileName = prompt('Enter file name:');

    if (!fileName) {
      return;
    }

    // Show a more user-friendly textarea for content
    const contentDialog = document.createElement('dialog');
    contentDialog.innerHTML = `
      <div class="p-4 bg-bolt-elements-background-depth-1 rounded-lg">
        <h3 class="text-lg font-medium mb-2">Enter file content</h3>
        <textarea 
          id="file-content" 
          class="w-full h-64 p-2 bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded-lg text-sm font-mono"
          placeholder="Enter file content here..."
        ></textarea>
        <div class="flex justify-end mt-4 space-x-2">
          <button id="cancel-btn" class="px-4 py-2 text-sm text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary">Cancel</button>
          <button id="save-btn" class="px-4 py-2 text-sm bg-bolt-elements-button-primary-background text-bolt-elements-button-primary-text rounded-lg">Save</button>
        </div>
      </div>
    `;
    document.body.appendChild(contentDialog);
    contentDialog.showModal();

    const saveContent = () =>
      new Promise<string>((resolve, reject) => {
        const saveBtn = contentDialog.querySelector('#save-btn');
        const cancelBtn = contentDialog.querySelector('#cancel-btn');
        const textarea = contentDialog.querySelector('#file-content') as HTMLTextAreaElement;

        saveBtn?.addEventListener('click', () => {
          contentDialog.close();
          resolve(textarea.value);
        });

        cancelBtn?.addEventListener('click', () => {
          contentDialog.close();
          reject(new Error('Cancelled'));
        });
      });

    try {
      const content = await saveContent();
      const fullPath = path ? `${path}/${fileName}` : fileName;

      const client = new GitHubClient({
        token: authState.tokenInfo?.token || '',
        username: authState.username,
      });

      const [owner, repoName] = repo.full_name.split('/');
      await client.createOrUpdateFile(owner, repoName, fullPath, content, `Create ${fullPath}`, branch.name);

      toast.success('File created successfully');

      // Refresh the current folder contents
      if (path) {
        const folder = branch.files?.find((f) => f.path === path);

        if (folder) {
          await handleLoadFolderContents(repo, branch, folder);
        }
      } else {
        await handleLoadBranchFiles(repo, branch);
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Cancelled') {
        return;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to create file: ${errorMessage}`);
    } finally {
      contentDialog.remove();
    }
  };

  const handleCreateFolder = async (repo: Repository, branch: Branch, path: string = '') => {
    const folderName = prompt('Enter folder name:');

    if (!folderName) {
      return;
    }

    // Clean up folder name and path
    const cleanFolderName = folderName.replace(/[^a-zA-Z0-9-_./]/g, '-').replace(/^\/+|\/+$/g, '');
    const fullPath = path ? `${path}/${cleanFolderName}` : cleanFolderName;

    try {
      const client = new GitHubClient({
        token: authState.tokenInfo?.token || '',
        username: authState.username,
      });

      const [owner, repoName] = repo.full_name.split('/');

      // Create a README.md in the folder instead of .gitkeep
      const readmeContent = `# ${cleanFolderName}\n\nFolder created via Bolt.diy`;
      await client.createOrUpdateFile(
        owner,
        repoName,
        `${fullPath}/README.md`,
        readmeContent,
        `Create folder ${fullPath}`,
        branch.name,
      );

      toast.success('Folder created successfully');

      // Refresh the current folder contents
      if (path) {
        const folder = branch.files?.find((f) => f.path === path);

        if (folder) {
          await handleLoadFolderContents(repo, branch, folder);
        }
      } else {
        await handleLoadBranchFiles(repo, branch);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to create folder: ${errorMessage}`);
    }
  };

  const handleDeleteFile = async (repo: Repository, branch: Branch, file: RepoFile) => {
    if (!confirm(`Are you sure you want to delete ${file.name}?`)) {
      return;
    }

    try {
      const client = new GitHubClient({
        token: authState.tokenInfo?.token || '',
        username: authState.username,
      });

      const [owner, repoName] = repo.full_name.split('/');

      // Get file SHA first
      const sha = await client.getFileSha(owner, repoName, file.path, branch.name);

      if (!sha) {
        throw new Error('Could not get file SHA');
      }

      await client.deleteFile(owner, repoName, file.path, `Delete ${file.path}`, branch.name, sha);

      toast.success('File deleted successfully');

      // Refresh the parent folder contents
      const parentPath = file.path.split('/').slice(0, -1).join('/');

      if (parentPath) {
        const parentFolder = branch.files?.find((f) => f.path === parentPath);

        if (parentFolder) {
          await handleLoadFolderContents(repo, branch, parentFolder);
        }
      } else {
        await handleLoadBranchFiles(repo, branch);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to delete file: ${errorMessage}`);
    }
  };

  const handleRenameFile = async (repo: Repository, branch: Branch, file: RepoFile) => {
    const newName = prompt('Enter new name:', file.name);

    if (!newName || newName === file.name) {
      return;
    }

    try {
      const client = new GitHubClient({
        token: authState.tokenInfo?.token || '',
        username: authState.username,
      });

      const [owner, repoName] = repo.full_name.split('/');

      // Get current file content and SHA
      const { content, sha } = (await client.getFileContents(owner, repoName, file.path, branch.name)) || {};

      if (!content || !sha) {
        throw new Error('Could not get file content');
      }

      const parentPath = file.path.split('/').slice(0, -1).join('/');
      const newPath = parentPath ? `${parentPath}/${newName}` : newName;

      await client.renameFile(
        owner,
        repoName,
        file.path,
        newPath,
        content,
        `Rename ${file.path} to ${newPath}`,
        branch.name,
        sha,
      );

      toast.success('File renamed successfully');

      // Refresh the parent folder contents
      if (parentPath) {
        const parentFolder = branch.files?.find((f) => f.path === parentPath);

        if (parentFolder) {
          await handleLoadFolderContents(repo, branch, parentFolder);
        }
      } else {
        await handleLoadBranchFiles(repo, branch);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to rename file: ${errorMessage}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor/20">
            <div className="i-ph:git-branch-fill text-xl text-bolt-elements-textPrimary opacity-80" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-bolt-elements-textPrimary">GitHub Connection</h3>
            <p className="text-sm text-bolt-elements-textSecondary mt-1">
              Manage your GitHub integration and permissions
            </p>
          </div>
        </div>
        {authState.isConnected && (
          <div className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor/20">
            <div className="h-2 w-2 rounded-full bg-green-500/80 ring-4 ring-green-500/20" />
            <span className="text-sm text-bolt-elements-textSecondary">
              {authState.rateLimits?.remaining}/{authState.rateLimits?.limit} requests remaining
            </span>
          </div>
        )}
      </div>

      {/* User Profile */}
      {authState.tokenInfo?.userDetails && (
        <div className="rounded-xl bg-gradient-to-br from-bolt-elements-background-depth-2 to-bolt-elements-background-depth-3 border border-bolt-elements-borderColor/20 overflow-hidden">
          <div className="p-6">
            <div className="flex items-start space-x-6">
              <div className="relative group">
                <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-br from-bolt-elements-borderColor/30 to-bolt-elements-borderColor/10 opacity-0 group-hover:opacity-100 transition-all duration-300" />
                <img
                  src={authState.tokenInfo.userDetails.avatar_url}
                  alt={`${authState.tokenInfo.userDetails.login}'s avatar`}
                  className="relative w-20 h-20 rounded-xl object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-medium text-bolt-elements-textPrimary">
                      {authState.tokenInfo.userDetails.login}
                    </h4>
                    <p className="text-sm text-bolt-elements-textSecondary mt-1">
                      Member since {new Date(authState.tokenInfo.userDetails.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="inline-flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary rounded-lg bg-bolt-elements-background-depth-4 border border-bolt-elements-borderColor/20 transition-colors duration-200"
                  >
                    <span>{showAdvanced ? 'Hide Details' : 'Show Details'}</span>
                    <div
                      className={`i-ph:caret-down transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
                    />
                  </button>
                </div>
                <div className="mt-4 flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-bolt-elements-background-depth-4 border border-bolt-elements-borderColor/20">
                      <div className="i-ph:book-bookmark-fill opacity-60" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-bolt-elements-textPrimary">
                        {authState.tokenInfo.userDetails.public_repos}
                      </div>
                      <div className="text-xs text-bolt-elements-textSecondary">Repositories</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-bolt-elements-background-depth-4 border border-bolt-elements-borderColor/20">
                      <div className="i-ph:users-fill opacity-60" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-bolt-elements-textPrimary">
                        {authState.tokenInfo.userDetails.followers}
                      </div>
                      <div className="text-xs text-bolt-elements-textSecondary">Followers</div>
                    </div>
                  </div>
                  {authState.tokenInfo.userDetails.plan && (
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 rounded-lg bg-bolt-elements-background-depth-4 border border-bolt-elements-borderColor/20">
                        <div className="i-ph:star-fill opacity-60" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-bolt-elements-textPrimary capitalize">
                          {authState.tokenInfo.userDetails.plan.name}
                        </div>
                        <div className="text-xs text-bolt-elements-textSecondary">Plan</div>
                      </div>
                    </div>
                  )}
                  <a
                    href={authState.tokenInfo.userDetails.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto inline-flex items-center space-x-2 px-3 py-1.5 text-sm text-bolt-elements-textLink hover:text-bolt-elements-textLinkHover rounded-lg bg-bolt-elements-background-depth-4 border border-bolt-elements-borderColor/20 transition-all duration-200 hover:scale-105"
                  >
                    <span>View Profile</span>
                    <div className="i-ph:arrow-square-out" />
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-lg bg-bolt-elements-background-depth-4 border border-bolt-elements-borderColor/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-bolt-elements-background-depth-5 border border-bolt-elements-borderColor/20">
                    <div className="i-ph:key-fill text-bolt-elements-textTertiary" />
                  </div>
                  <div>
                    <h5 className="text-sm font-medium text-bolt-elements-textPrimary">Classic Access Token</h5>
                    <p className="text-xs text-bolt-elements-textSecondary mt-0.5">
                      Full repository and organization access
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex flex-col items-end">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-bolt-elements-textSecondary">Token Health</span>
                      <div
                        className={`h-2 w-2 rounded-full ${
                          authState.tokenInfo?.scopes.length >= REQUIRED_SCOPES.length
                            ? 'bg-green-500'
                            : 'bg-yellow-500'
                        }`}
                      />
                    </div>
                    <span className="text-[10px] text-bolt-elements-textTertiary mt-0.5">
                      {authState.tokenInfo?.scopes.length || 0} permissions enabled
                    </span>
                  </div>
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="inline-flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary rounded-lg bg-bolt-elements-background-depth-5 border border-bolt-elements-borderColor/20 transition-all duration-200 hover:scale-105"
                  >
                    <span>{showAdvanced ? 'Hide Permissions' : 'Show Permissions'}</span>
                    <div
                      className={`i-ph:caret-down transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Token Scopes */}
            <div
              className={`mt-6 transition-all duration-300 ${showAdvanced ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-1.5 rounded-lg bg-bolt-elements-background-depth-4 border border-bolt-elements-borderColor/20">
                    <div className="i-ph:shield-check-fill text-bolt-elements-textTertiary" />
                  </div>
                  <div>
                    <h5 className="text-sm font-medium text-bolt-elements-textPrimary">Access Permissions</h5>
                    <p className="text-xs text-bolt-elements-textSecondary mt-0.5">
                      {authState.tokenInfo?.scopes.length || 0} of {REQUIRED_SCOPES.length + OPTIONAL_SCOPES.length}{' '}
                      available permissions
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 px-3 py-1.5 text-xs rounded-lg bg-bolt-elements-background-depth-4 border border-bolt-elements-borderColor/20">
                    <span className="text-bolt-elements-textSecondary">Required:</span>
                    <span className="font-medium text-bolt-elements-textPrimary">
                      {authState.tokenInfo?.scopes.filter((s) => REQUIRED_SCOPES.includes(s)).length || 0}/
                      {REQUIRED_SCOPES.length}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 px-3 py-1.5 text-xs rounded-lg bg-bolt-elements-background-depth-4 border border-bolt-elements-borderColor/20">
                    <span className="text-bolt-elements-textSecondary">Optional:</span>
                    <span className="font-medium text-bolt-elements-textPrimary">
                      {authState.tokenInfo?.scopes.filter((s) => OPTIONAL_SCOPES.includes(s)).length || 0}/
                      {OPTIONAL_SCOPES.length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[...REQUIRED_SCOPES, ...OPTIONAL_SCOPES].map((scope) => {
                  const hasScope = authState.tokenInfo?.scopes.includes(scope);
                  const isRequired = REQUIRED_SCOPES.includes(scope);

                  return (
                    <div
                      key={scope}
                      className={`group flex flex-col p-3 rounded-lg border ${
                        hasScope
                          ? 'bg-green-500/5 border-green-500/20 text-green-700 dark:text-green-400'
                          : 'bg-red-500/5 border-red-500/20 text-red-700 dark:text-red-400'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className={`h-2 w-2 rounded-full ${hasScope ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="ml-3 text-sm font-medium">{scope}</span>
                        {isRequired && (
                          <span className="ml-auto text-[10px] font-medium uppercase tracking-wider opacity-60">
                            Required
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs opacity-60 group-hover:opacity-100 transition-opacity duration-200">
                        {getScopeDescription(scope)}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 p-4 rounded-lg bg-bolt-elements-background-depth-4 border border-bolt-elements-borderColor/20">
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-lg bg-bolt-elements-background-depth-5 border border-bolt-elements-borderColor/20">
                    <div className="i-ph:info text-bolt-elements-textTertiary" />
                  </div>
                  <div>
                    <h5 className="text-sm font-medium text-bolt-elements-textPrimary">About Access Tokens</h5>
                    <p className="mt-1 text-sm text-bolt-elements-textSecondary">
                      You're using a Classic Personal Access Token which provides full repository and organization
                      access.
                      {!authState.tokenInfo?.scopes.includes('repo') && (
                        <span className="block mt-2 text-red-500">
                          ⚠️ The 'repo' scope is required for full repository access and management.
                        </span>
                      )}
                      {authState.tokenInfo?.scopes.length === 0 && (
                        <span className="block mt-2 text-red-500">
                          ⚠️ No permissions granted. Please generate a new token with the required permissions.
                        </span>
                      )}
                    </p>
                    <div className="mt-3 flex items-center space-x-3">
                      <a
                        href="https://github.com/settings/tokens"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 px-3 py-1.5 text-xs text-bolt-elements-textLink hover:text-bolt-elements-textLinkHover rounded-lg bg-bolt-elements-background-depth-5 border border-bolt-elements-borderColor/20 transition-all duration-200 hover:scale-105"
                      >
                        <div className="i-ph:gear" />
                        <span>Manage Tokens</span>
                      </a>
                      <a
                        href="https://docs.github.com/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 px-3 py-1.5 text-xs text-bolt-elements-textLink hover:text-bolt-elements-textLinkHover rounded-lg bg-bolt-elements-background-depth-5 border border-bolt-elements-borderColor/20 transition-all duration-200 hover:scale-105"
                      >
                        <div className="i-ph:book" />
                        <span>Learn More</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Repository List Section */}
      {authState.isConnected && (
        <div className="rounded-xl border border-bolt-elements-borderColor/20 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-bolt-elements-background-depth-2 to-bolt-elements-background-depth-3 border border-bolt-elements-borderColor/20">
                  <div className="i-ph:books-fill text-bolt-elements-textTertiary" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-bolt-elements-textPrimary">Recent Repositories</h3>
                  <p className="text-sm text-bolt-elements-textSecondary">Your most recently updated repositories</p>
                </div>
              </div>
              <a
                href={`https://github.com/${authState.username}?tab=repositories`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 px-3 py-1.5 text-sm text-bolt-elements-textLink hover:text-bolt-elements-textLinkHover bg-gradient-to-br from-bolt-elements-background-depth-2 to-bolt-elements-background-depth-3 rounded-lg border border-bolt-elements-borderColor/20 transition-all duration-200 hover:scale-105 hover:shadow-lg"
              >
                <span>View All</span>
                <div className="i-ph:arrow-square-out" />
              </a>
            </div>

            {authState.isLoadingRepos ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="i-ph:spinner animate-spin text-3xl text-bolt-elements-textTertiary mb-3" />
                <p className="text-sm text-bolt-elements-textSecondary">Loading repositories...</p>
              </div>
            ) : authState.repositories && authState.repositories.length > 0 ? (
              <div className="space-y-3">
                {authState.repositories.map((repo) => (
                  <div
                    key={repo.id}
                    className={`relative group p-4 rounded-lg border border-bolt-elements-borderColor/20 
                      ${repo.archived ? 'bg-bolt-elements-background-depth-1 opacity-75' : 'bg-bolt-elements-background-depth-2'} 
                      hover:bg-bolt-elements-background-depth-3 transition-all duration-200`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setAuthState((prev) => ({
                                ...prev,
                                repositories: prev.repositories?.map((r) =>
                                  r.id === repo.id ? { ...r, isExpanded: !r.isExpanded } : r,
                                ),
                              }));
                            }}
                            className="inline-flex items-center text-bolt-elements-textLink hover:text-bolt-elements-textLinkHover font-medium truncate"
                          >
                            <div
                              className={`i-ph:caret-right transform transition-transform ${repo.isExpanded ? 'rotate-90' : ''} mr-1`}
                            />
                            {repo.name}
                          </button>
                          {repo.private && (
                            <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-bolt-elements-background-depth-4 text-bolt-elements-textTertiary">
                              <div className="i-ph:lock-simple-fill mr-1" />
                              Private
                            </span>
                          )}
                          {repo.archived && (
                            <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-bolt-elements-background-depth-4 text-bolt-elements-textTertiary">
                              <div className="i-ph:archive-fill mr-1" />
                              Archived
                            </span>
                          )}
                          {repo.fork && (
                            <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-bolt-elements-background-depth-4 text-bolt-elements-textTertiary">
                              <div className="i-ph:git-fork-fill mr-1" />
                              Fork
                            </span>
                          )}
                        </div>
                        {repo.description && (
                          <p className="mt-1 text-sm text-bolt-elements-textSecondary line-clamp-2">
                            {repo.description}
                          </p>
                        )}
                        <div className="mt-2 flex items-center space-x-4 text-sm text-bolt-elements-textTertiary">
                          {repo.language && (
                            <span className="inline-flex items-center">
                              <span className="w-2 h-2 rounded-full bg-bolt-elements-textTertiary mr-1.5" />
                              {repo.language}
                            </span>
                          )}
                          {repo.stargazers_count > 0 && (
                            <span className="inline-flex items-center">
                              <div className="i-ph:star-fill mr-1" />
                              {repo.stargazers_count}
                            </span>
                          )}
                          <span className="inline-flex items-center">
                            <div className="i-ph:clock-clockwise mr-1" />
                            Updated {new Date(repo.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <RepositoryMenu repo={repo} actions={getRepositoryActions(repo)} />
                    </div>

                    {/* Branch List */}
                    {repo.isExpanded && (
                      <div className="mt-4 pl-6 border-l-2 border-bolt-elements-borderColor/20">
                        <div className="space-y-2">
                          {repo.branches?.map((branch) => (
                            <div
                              key={branch.name}
                              className={`flex flex-col p-2 rounded-lg ${
                                branch.default
                                  ? 'bg-green-500/5 border border-green-500/20'
                                  : 'bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor/20'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => {
                                      if (!branch.files && !branch.isLoadingFiles) {
                                        handleLoadBranchFiles(repo, branch);
                                      } else {
                                        setAuthState((prev) => ({
                                          ...prev,
                                          repositories: prev.repositories?.map((r) =>
                                            r.id === repo.id
                                              ? {
                                                  ...r,
                                                  branches: r.branches?.map((b) =>
                                                    b.name === branch.name ? { ...b, isExpanded: !b.isExpanded } : b,
                                                  ),
                                                }
                                              : r,
                                          ),
                                        }));
                                      }
                                    }}
                                    className="flex items-center space-x-2 hover:text-bolt-elements-textPrimary transition-colors"
                                  >
                                    <div
                                      className={`i-ph:caret-right transform transition-transform ${branch.isExpanded ? 'rotate-90' : ''}`}
                                    />
                                    <div className="i-ph:git-branch text-bolt-elements-textTertiary" />
                                    <span
                                      className={`text-sm ${branch.default ? 'text-green-600 dark:text-green-400 font-medium' : 'text-bolt-elements-textSecondary'}`}
                                    >
                                      {branch.name}
                                    </span>
                                  </button>
                                  {branch.protected && (
                                    <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-bolt-elements-background-depth-4 text-bolt-elements-textTertiary">
                                      <div className="i-ph:shield-check-fill mr-1" />
                                      Protected
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(branch.commit.sha);
                                      toast.success('Commit SHA copied to clipboard');
                                    }}
                                    className="p-1.5 text-bolt-elements-textTertiary hover:text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-2 rounded-lg transition-colors"
                                    title="Copy commit SHA"
                                  >
                                    <div className="i-ph:copy" />
                                  </button>
                                  <a
                                    href={`${repo.html_url}/tree/${branch.name}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 text-bolt-elements-textTertiary hover:text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-2 rounded-lg transition-colors"
                                    title="View branch on GitHub"
                                  >
                                    <div className="i-ph:arrow-square-out" />
                                  </a>
                                </div>
                              </div>

                              {/* Files List */}
                              {branch.isLoadingFiles && (
                                <div className="mt-2 pl-8 py-2">
                                  <div className="animate-spin i-ph:spinner text-bolt-elements-textTertiary" />
                                </div>
                              )}
                              {branch.isExpanded && branch.files && (
                                <div className="mt-2 pl-8 space-y-1">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <button
                                      onClick={() => handleCreateFile(repo, branch)}
                                      className="inline-flex items-center space-x-1 px-2 py-1 text-xs text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary bg-bolt-elements-background-depth-1 rounded-lg transition-colors"
                                    >
                                      <div className="i-ph:plus-circle" />
                                      <span>New File</span>
                                    </button>
                                    <button
                                      onClick={() => handleCreateFolder(repo, branch)}
                                      className="inline-flex items-center space-x-1 px-2 py-1 text-xs text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary bg-bolt-elements-background-depth-1 rounded-lg transition-colors"
                                    >
                                      <div className="i-ph:folder-plus" />
                                      <span>New Folder</span>
                                    </button>
                                  </div>
                                  {branch.files.map((file) => (
                                    <div key={file.path}>
                                      <div className="flex items-center justify-between py-1">
                                        <div className="flex items-center space-x-2">
                                          {file.type === 'dir' ? (
                                            <button
                                              onClick={() => {
                                                if (!file.files && !file.isLoading) {
                                                  handleLoadFolderContents(repo, branch, file);
                                                } else {
                                                  setAuthState((prev) => ({
                                                    ...prev,
                                                    repositories: prev.repositories?.map((r) =>
                                                      r.id === repo.id
                                                        ? {
                                                            ...r,
                                                            branches: r.branches?.map((b) =>
                                                              b.name === branch.name
                                                                ? {
                                                                    ...b,
                                                                    files: b.files?.map((f) =>
                                                                      f.path === file.path
                                                                        ? { ...f, isExpanded: !f.isExpanded }
                                                                        : f,
                                                                    ),
                                                                  }
                                                                : b,
                                                            ),
                                                          }
                                                        : r,
                                                    ),
                                                  }));
                                                }
                                              }}
                                              className="flex items-center space-x-2 hover:text-bolt-elements-textPrimary transition-colors"
                                            >
                                              <div
                                                className={`i-ph:caret-right transform transition-transform ${file.isExpanded ? 'rotate-90' : ''}`}
                                              />
                                              <div className="i-ph:folder-fill" />
                                              <span className="text-sm text-bolt-elements-textSecondary">
                                                {file.name}
                                              </span>
                                            </button>
                                          ) : (
                                            <>
                                              <div className="i-ph:file-fill" />
                                              <span className="text-sm text-bolt-elements-textSecondary">
                                                {file.name}
                                              </span>
                                            </>
                                          )}
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          {file.type === 'file' && file.size && (
                                            <span className="text-xs text-bolt-elements-textTertiary">
                                              {(file.size / 1024).toFixed(1)} KB
                                            </span>
                                          )}
                                          <button
                                            onClick={() => handleRenameFile(repo, branch, file)}
                                            className="p-1 text-bolt-elements-textTertiary hover:text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-2 rounded-lg transition-colors"
                                            title="Rename"
                                          >
                                            <div className="i-ph:pencil-simple" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteFile(repo, branch, file)}
                                            className="p-1 text-bolt-elements-textTertiary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                            title="Delete"
                                          >
                                            <div className="i-ph:trash" />
                                          </button>
                                          <a
                                            href={file.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1 text-bolt-elements-textTertiary hover:text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-2 rounded-lg transition-colors"
                                          >
                                            <div className="i-ph:arrow-square-out" />
                                          </a>
                                        </div>
                                      </div>
                                      {/* Nested files */}
                                      {file.type === 'dir' && file.isLoading && (
                                        <div className="mt-1 ml-8 py-2">
                                          <div className="animate-spin i-ph:spinner text-bolt-elements-textTertiary" />
                                        </div>
                                      )}
                                      {file.type === 'dir' && file.isExpanded && file.files && (
                                        <div className="mt-1 ml-8 space-y-1">
                                          <div className="flex items-center space-x-2 mb-2">
                                            <button
                                              onClick={() => handleCreateFile(repo, branch, file.path)}
                                              className="inline-flex items-center space-x-1 px-2 py-1 text-xs text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary bg-bolt-elements-background-depth-1 rounded-lg transition-colors"
                                            >
                                              <div className="i-ph:plus-circle" />
                                              <span>New File</span>
                                            </button>
                                            <button
                                              onClick={() => handleCreateFolder(repo, branch, file.path)}
                                              className="inline-flex items-center space-x-1 px-2 py-1 text-xs text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary bg-bolt-elements-background-depth-1 rounded-lg transition-colors"
                                            >
                                              <div className="i-ph:folder-plus" />
                                              <span>New Folder</span>
                                            </button>
                                          </div>
                                          {file.files.map((nestedFile) => (
                                            <div
                                              key={nestedFile.path}
                                              className="flex items-center justify-between py-1"
                                            >
                                              <div className="flex items-center space-x-2">
                                                <div
                                                  className={
                                                    nestedFile.type === 'dir' ? 'i-ph:folder-fill' : 'i-ph:file-fill'
                                                  }
                                                />
                                                <span className="text-sm text-bolt-elements-textSecondary">
                                                  {nestedFile.name}
                                                </span>
                                              </div>
                                              <div className="flex items-center space-x-2">
                                                {nestedFile.type === 'file' && nestedFile.size && (
                                                  <span className="text-xs text-bolt-elements-textTertiary">
                                                    {(nestedFile.size / 1024).toFixed(1)} KB
                                                  </span>
                                                )}
                                                <button
                                                  onClick={() => handleRenameFile(repo, branch, nestedFile)}
                                                  className="p-1 text-bolt-elements-textTertiary hover:text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-2 rounded-lg transition-colors"
                                                  title="Rename"
                                                >
                                                  <div className="i-ph:pencil-simple" />
                                                </button>
                                                <button
                                                  onClick={() => handleDeleteFile(repo, branch, nestedFile)}
                                                  className="p-1 text-bolt-elements-textTertiary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                  title="Delete"
                                                >
                                                  <div className="i-ph:trash" />
                                                </button>
                                                <a
                                                  href={nestedFile.url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="p-1 text-bolt-elements-textTertiary hover:text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-2 rounded-lg transition-colors"
                                                >
                                                  <div className="i-ph:arrow-square-out" />
                                                </a>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="i-ph:book-bookmark text-4xl text-bolt-elements-textTertiary mb-3" />
                <p className="text-sm text-bolt-elements-textSecondary mb-4">No repositories found</p>
                <a
                  href="https://github.com/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 px-4 py-2 text-sm text-bolt-elements-textLink hover:text-bolt-elements-textLinkHover bg-gradient-to-br from-bolt-elements-background-depth-2 to-bolt-elements-background-depth-3 rounded-lg border border-bolt-elements-borderColor/20 transition-all duration-200 hover:scale-105 hover:shadow-lg"
                >
                  <div className="i-ph:plus" />
                  <span>Create Repository</span>
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Connection Form */}
      <div className="rounded-xl border border-bolt-elements-borderColor/20 overflow-hidden">
        <form
          className="p-6 space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveConnection();
          }}
        >
          <div className="grid grid-cols-2 gap-6">
            {/* Username Field */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="github-username"
                  className="flex items-center space-x-2 text-sm font-medium text-bolt-elements-textSecondary"
                >
                  <div className="i-ph:user-circle-fill opacity-60" />
                  <span>GitHub Username</span>
                </label>
              </div>
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <div className="i-ph:at text-bolt-elements-textTertiary" />
                </div>
                <input
                  id="github-username"
                  type="text"
                  value={authState.username}
                  onChange={(e) => setAuthState((prev) => ({ ...prev, username: e.target.value }))}
                  disabled={authState.isVerifying}
                  className="w-full h-10 pl-9 pr-3 bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor/30 rounded-lg text-sm text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary focus:outline-none focus:ring-2 focus:ring-bolt-elements-borderColor/50 disabled:opacity-60 transition-all duration-200"
                  placeholder="Enter username"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Token Field */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="github-token"
                  className="flex items-center space-x-2 text-sm font-medium text-bolt-elements-textSecondary"
                >
                  <div className="i-ph:key-fill opacity-60" />
                  <span>Personal Access Token</span>
                </label>
                <a
                  href="https://github.com/settings/tokens/new?scopes=repo,user,read:org,workflow,delete_repo,write:packages,read:packages"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 text-xs text-bolt-elements-textLink hover:text-bolt-elements-textLinkHover transition-colors duration-200"
                >
                  <span>Generate new token</span>
                  <div className="i-ph:plus-circle" />
                </a>
              </div>
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <div className="i-ph:lock-key text-bolt-elements-textTertiary" />
                </div>
                <input
                  id="github-token"
                  type="password"
                  value={authState.tokenInfo?.token || ''}
                  onChange={(e) =>
                    setAuthState((prev) => ({
                      ...prev,
                      tokenInfo: {
                        ...prev.tokenInfo,
                        token: e.target.value,
                      } as GitHubTokenInfo,
                    }))
                  }
                  disabled={authState.isVerifying}
                  className="w-full h-10 pl-9 pr-3 bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor/30 rounded-lg text-sm text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary focus:outline-none focus:ring-2 focus:ring-bolt-elements-borderColor/50 disabled:opacity-60 transition-all duration-200"
                  placeholder="Enter access token"
                  autoComplete="current-password"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-4">
              {!authState.isConnected ? (
                <button
                  type="submit"
                  disabled={authState.isVerifying || !authState.username || !authState.tokenInfo?.token}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-bolt-elements-button-primary-background text-bolt-elements-button-primary-text hover:bg-bolt-elements-button-primary-backgroundHover disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {authState.isVerifying ? (
                    <>
                      <div className="i-ph:spinner animate-spin opacity-80" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <div className="i-ph:plug-fill opacity-80" />
                      <span>Connect</span>
                    </>
                  )}
                </button>
              ) : (
                <>
                  <button
                    onClick={handleDisconnect}
                    className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-bolt-elements-button-danger-background text-bolt-elements-button-danger-text hover:bg-bolt-elements-button-danger-backgroundHover transition-all duration-200"
                  >
                    <div className="i-ph:plug-fill opacity-80" />
                    <span>Disconnect</span>
                  </button>
                  <span className="inline-flex items-center space-x-2 px-3 py-1.5 text-sm text-green-600 dark:text-green-400 bg-green-500/5 rounded-lg border border-green-500/20">
                    <div className="i-ph:check-circle-fill" />
                    <span>Connected</span>
                  </span>
                </>
              )}
            </div>
            {authState.rateLimits && (
              <div className="flex items-center space-x-2 text-sm text-bolt-elements-textTertiary">
                <div className="i-ph:clock-countdown opacity-60" />
                <span>Rate limit resets at {authState.rateLimits.reset.toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </form>
      </div>

      {showDeleteConfirmation && selectedRepo && (
        <DeleteConfirmationDialog
          isOpen={showDeleteConfirmation}
          onClose={() => {
            setShowDeleteConfirmation(false);
            setSelectedRepo(null);
          }}
          onConfirm={() => {
            handleDeleteRepository(selectedRepo);
            setShowDeleteConfirmation(false);
            setSelectedRepo(null);
          }}
          repositoryName={selectedRepo.full_name}
        />
      )}
    </div>
  );
}
