import { useCallback, useEffect, useState } from 'react';
import { GitHubClient } from '~/lib/github/GitHubClient';
import { toast } from 'react-toastify';

interface UseGitHubOptions {
  autoConnect?: boolean;
  onAuthChange?: (isAuthenticated: boolean) => void;
}

export function useGitHub(options: UseGitHubOptions = {}) {
  const [client, setClient] = useState<GitHubClient | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const initialize = useCallback(async () => {
    try {
      const githubClient = new GitHubClient();
      const isValid = await githubClient.validateAuth();

      if (isValid) {
        setClient(githubClient);
        setIsAuthenticated(true);
        options.onAuthChange?.(true);
      } else {
        setClient(null);
        setIsAuthenticated(false);
        options.onAuthChange?.(false);
      }
    } catch (error) {
      console.error('GitHub initialization error:', error);
      setClient(null);
      setIsAuthenticated(false);
      options.onAuthChange?.(false);
    } finally {
      setIsLoading(false);
    }
  }, [options.onAuthChange]);

  useEffect(() => {
    if (options.autoConnect) {
      initialize();
    } else {
      setIsLoading(false);
    }
  }, [initialize, options.autoConnect]);

  const connect = useCallback(
    async (token: string, username: string) => {
      try {
        const githubClient = new GitHubClient({ token, username });
        const isValid = await githubClient.validateAuth();

        if (isValid) {
          setClient(githubClient);
          setIsAuthenticated(true);
          options.onAuthChange?.(true);

          return true;
        } else {
          toast.error('Invalid GitHub credentials');
          return false;
        }
      } catch (error) {
        console.error('GitHub connection error:', error);
        toast.error('Failed to connect to GitHub');

        return false;
      }
    },
    [options.onAuthChange],
  );

  const disconnect = useCallback(() => {
    setClient(null);
    setIsAuthenticated(false);
    options.onAuthChange?.(false);
  }, [options.onAuthChange]);

  // Repository operations
  const createRepository = useCallback(
    async (
      name: string,
      options?: {
        description?: string;
        private?: boolean;
        autoInit?: boolean;
      },
    ) => {
      if (!client) {
        throw new Error('GitHub client not initialized');
      }

      try {
        return await client.createRepository(name, options);
      } catch (error) {
        console.error('Create repository error:', error);
        throw error;
      }
    },
    [client],
  );

  const createPullRequest = useCallback(
    async (
      owner: string,
      repo: string,
      options: {
        title: string;
        body?: string;
        head: string;
        base?: string;
      },
    ) => {
      if (!client) {
        throw new Error('GitHub client not initialized');
      }

      try {
        return await client.createPullRequest(owner, repo, options);
      } catch (error) {
        console.error('Create pull request error:', error);
        throw error;
      }
    },
    [client],
  );

  const pushFiles = useCallback(
    async (
      owner: string,
      repo: string,
      options: {
        message: string;
        branch?: string;
        files: Array<{
          path: string;
          content: string;
          encoding?: 'utf-8' | 'base64';
        }>;
      },
    ) => {
      if (!client) {
        throw new Error('GitHub client not initialized');
      }

      try {
        const branch = options.branch || 'main';

        // Get the current commit SHA
        const ref = await client.getRef(owner, repo, `heads/${branch}`);
        const currentCommitSha = ref.object.sha;

        // Create blobs for each file
        const fileBlobs = await Promise.all(
          options.files.map(async (file) => {
            const blob = await client.createBlob(owner, repo, file.content, file.encoding);
            return {
              path: file.path,
              sha: blob.sha,
            };
          }),
        );

        // Create a new tree
        const newTree = await client.createTree(owner, repo, fileBlobs, currentCommitSha);

        // Create the commit
        const newCommit = await client.createCommit(owner, repo, options.message, newTree.sha, [currentCommitSha]);

        // Update the reference
        await client.updateRef(owner, repo, `heads/${branch}`, newCommit.sha);

        return newCommit;
      } catch (error) {
        console.error('Push files error:', error);
        throw error;
      }
    },
    [client],
  );

  const searchCode = useCallback(
    async (
      query: string,
      options?: {
        filename?: string;
        extension?: string;
        user?: string;
        repo?: string;
      },
    ) => {
      if (!client) {
        throw new Error('GitHub client not initialized');
      }

      try {
        return await client.searchCode(query, options);
      } catch (error) {
        console.error('Search code error:', error);
        throw error;
      }
    },
    [client],
  );

  const getRateLimits = useCallback(async () => {
    if (!client) {
      throw new Error('GitHub client not initialized');
    }

    try {
      return await client.getRateLimitInfo();
    } catch (error) {
      console.error('Get rate limits error:', error);
      throw error;
    }
  }, [client]);

  return {
    client,
    isAuthenticated,
    isLoading,
    connect,
    disconnect,
    initialize,
    createRepository,
    createPullRequest,
    pushFiles,
    searchCode,
    getRateLimits,
  };
}
