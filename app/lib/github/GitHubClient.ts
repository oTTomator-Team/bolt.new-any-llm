import { Octokit } from '@octokit/rest';
import Cookies from 'js-cookie';
import { logStore } from '~/lib/stores/logs';
import { toast } from 'react-toastify';

export interface GitHubAuth {
  token: string;
  username: string;
  scopes?: string[];
}

export interface GitHubError extends Error {
  status?: number;
  response?: {
    data?: any;
    status: number;
    headers: any;
  };
}

export interface Repository {
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

export interface Branch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
  default?: boolean;
}

function isGitHubError(error: unknown): error is GitHubError {
  return error instanceof Error && 'status' in error;
}

export class GitHubClient {
  private _octokit: Octokit;
  private _auth: GitHubAuth;
  private _failedLoginAttempts: number = 0;
  private _lastFailedAttempt?: Date;

  constructor(auth?: GitHubAuth) {
    this._auth = auth || this._loadAuthFromCookies();
    this._octokit = new Octokit({
      auth: `Bearer ${this._auth.token}`,
      retry: {
        enabled: true,
        retries: 3,
        doNotRetry: [401, 403, 404],
      },
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
        accept: 'application/vnd.github+json',
      },
    });
  }

  private _loadAuthFromCookies(): GitHubAuth {
    const token = Cookies.get('githubToken');
    const username = Cookies.get('githubUsername');

    if (!token || !username) {
      throw new Error('GitHub credentials not found in cookies');
    }

    return { token, username };
  }

  private _handleAuthError(error: GitHubError): boolean {
    this._failedLoginAttempts++;
    this._lastFailedAttempt = new Date();

    if (this._failedLoginAttempts >= 3) {
      const cooldownMinutes = Math.min(5 * Math.pow(2, this._failedLoginAttempts - 3), 60);
      throw new Error(`Too many failed login attempts. Please try again in ${cooldownMinutes} minutes.`);
    }

    switch (error.status) {
      case 401:
        throw new Error('Invalid credentials. Please check your token.');
      case 403:
        if (error.response?.headers['x-github-sso']) {
          const ssoUrl = error.response.headers['x-github-sso'];
          throw new Error(
            `This token requires SAML SSO authorization. Please visit ${ssoUrl} to authorize this token.`,
          );
        }

        if (this._failedLoginAttempts >= 3) {
          throw new Error('Authentication temporarily blocked due to too many failed attempts.');
        }

        throw new Error('Access forbidden. Please check your token permissions.');
      case 404:
        throw new Error('Resource not found or token lacks required permissions.');
      default:
        throw error;
    }

    return false;
  }

  async validateAuth(): Promise<boolean> {
    try {
      const response = await this._octokit.users.getAuthenticated();
      this._failedLoginAttempts = 0;
      this._lastFailedAttempt = undefined;

      const scopesHeader = response.headers['x-oauth-scopes'] || '';
      const scopes = scopesHeader
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      this._auth = {
        ...this._auth,
        scopes,
      };

      const ssoHeader = response.headers['x-github-sso'];

      if (ssoHeader) {
        console.warn('SAML SSO authorization may be required:', ssoHeader);
      }

      const isValid = response.data.login === this._auth.username;

      if (!isValid) {
        console.warn('GitHub username mismatch:', {
          expected: this._auth.username,
          received: response.data.login,
        });
      }

      return isValid;
    } catch (error: unknown) {
      return this._handleAuthError(error as GitHubError);
    }
  }

  // Add a method to check specific scopes
  async validateScope(scope: string): Promise<boolean> {
    try {
      const response = await this._octokit.users.getAuthenticated();
      const scopesHeader = response.headers['x-oauth-scopes'] || '';
      const scopes = scopesHeader.split(',').map((s) => s.trim());

      return scopes.includes(scope);
    } catch {
      return false;
    }
  }

  // Add a method to get all scopes
  async getScopes(): Promise<string[]> {
    try {
      const response = await this._octokit.users.getAuthenticated();
      const scopesHeader = response.headers['x-oauth-scopes'] || '';

      return scopesHeader.split(',').map((s) => s.trim());
    } catch {
      return [];
    }
  }

  async getRepository(owner: string, repo: string) {
    try {
      const response = await this._octokit.repos.get({ owner, repo });
      return response.data;
    } catch (error: unknown) {
      if ((error as GitHubError).status === 404) {
        return null;
      }

      throw error;
    }
  }

  async createRepository(
    name: string,
    options: {
      description?: string;
      private?: boolean;
      autoInit?: boolean;
    } = {},
  ) {
    const { data } = await this._octokit.repos.createForAuthenticatedUser({
      name,
      description: options.description,
      private: options.private ?? false,
      auto_init: options.autoInit ?? true,
    });

    return data;
  }

  async createBranch(owner: string, repo: string, branchName: string, sourceBranch = 'main') {
    // Get the SHA of the source branch
    const { data: sourceRef } = await this._octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${sourceBranch}`,
    });

    // Create new branch
    await this._octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: sourceRef.object.sha,
    });
  }

  async createPullRequest(
    owner: string,
    repo: string,
    options: {
      title: string;
      body?: string;
      head: string;
      base?: string;
    },
  ) {
    const { data } = await this._octokit.pulls.create({
      owner,
      repo,
      title: options.title,
      body: options.body,
      head: options.head,
      base: options.base || 'main',
    });

    return data;
  }

  async getFileContents(owner: string, repo: string, path: string, ref?: string) {
    try {
      const { data } = await this._octokit.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });

      if ('content' in data) {
        return {
          content: Buffer.from(data.content, 'base64').toString('utf-8'),
          sha: data.sha,
        };
      }

      throw new Error('Not a file');
    } catch (error: unknown) {
      if ((error as GitHubError).status === 404) {
        return null;
      }

      throw error;
    }
  }

  async createIssue(
    owner: string,
    repo: string,
    options: {
      title: string;
      body?: string;
      labels?: string[];
      assignees?: string[];
    },
  ) {
    const { data } = await this._octokit.issues.create({
      owner,
      repo,
      title: options.title,
      body: options.body,
      labels: options.labels,
      assignees: options.assignees,
    });

    return data;
  }

  async searchCode(
    query: string,
    options: {
      filename?: string;
      extension?: string;
      user?: string;
      repo?: string;
    } = {},
  ) {
    let q = query;

    if (options.filename) {
      q += ` filename:${options.filename}`;
    }

    if (options.extension) {
      q += ` extension:${options.extension}`;
    }

    if (options.user) {
      q += ` user:${options.user}`;
    }

    if (options.repo) {
      q += ` repo:${options.repo}`;
    }

    const { data } = await this._octokit.search.code({ q });

    return data.items;
  }

  async createTree(owner: string, repo: string, tree: Array<{ path: string; sha: string }>, baseTree?: string) {
    type TreeMode = '100644' | '100755' | '040000' | '160000' | '120000';
    type TreeType = 'blob' | 'tree' | 'commit';

    const { data } = await this._octokit.git.createTree({
      owner,
      repo,
      tree: tree.map((item) => ({
        path: item.path,
        mode: '100644' as TreeMode,
        type: 'blob' as TreeType,
        sha: item.sha,
      })),
      base_tree: baseTree,
    });

    return data;
  }

  // Rate limit information
  async getRateLimitInfo() {
    const { data } = await this._octokit.rateLimit.get();

    return data.resources;
  }

  async getRef(owner: string, repo: string, ref: string) {
    const { data } = await this._octokit.git.getRef({
      owner,
      repo,
      ref,
    });

    return data;
  }

  async createBlob(owner: string, repo: string, content: string, encoding: 'utf-8' | 'base64' = 'base64') {
    const { data } = await this._octokit.git.createBlob({
      owner,
      repo,
      content: encoding === 'base64' ? content : Buffer.from(content).toString('base64'),
      encoding: 'base64',
    });

    return data;
  }

  async createCommit(owner: string, repo: string, message: string, tree: string, parents: string[]) {
    const { data } = await this._octokit.git.createCommit({
      owner,
      repo,
      message,
      tree,
      parents,
    });

    return data;
  }

  async updateRef(owner: string, repo: string, ref: string, sha: string) {
    const { data } = await this._octokit.git.updateRef({
      owner,
      repo,
      ref,
      sha,
    });

    return data;
  }

  async getUserDetails() {
    const response = await this._octokit.users.getAuthenticated();
    const { data } = response;

    return {
      login: data.login,
      id: data.id,
      avatar_url: data.avatar_url,
      html_url: data.html_url,
      public_repos: data.public_repos,
      followers: data.followers,
      created_at: data.created_at,
      plan: data.plan,
    };
  }

  // Add a method to check organization access
  async validateOrganizationAccess(orgName?: string): Promise<{
    hasAccess: boolean;
    error?: string;
    details?: string;
  }> {
    try {
      if (!this._auth.scopes?.includes('read:org')) {
        return {
          hasAccess: false,
          error: 'Missing read:org scope',
          details: 'The read:org scope is required to access organization data.',
        };
      }

      if (orgName) {
        // Check specific organization
        const { data: org } = await this._octokit.orgs.get({ org: orgName });
        return {
          hasAccess: true,
          details: `Access verified for organization: ${org.login}`,
        };
      } else {
        // Check all organizations
        const { data: orgs } = await this._octokit.orgs.listForAuthenticatedUser();
        return {
          hasAccess: true,
          details: `Access verified for ${orgs.length} organizations`,
        };
      }
    } catch (error: unknown) {
      const githubError = error as GitHubError;

      if (githubError.status === 403) {
        return {
          hasAccess: false,
          error: 'Organization access restricted',
          details:
            'OAuth app access needs to be enabled in organization settings. Steps to fix:\n' +
            '1. Go to your organization settings\n' +
            '2. Click on "Third-party Access"\n' +
            '3. Click on "Remove restrictions" or add the app to the allowed list\n' +
            '4. If needed, regenerate your token',
        };
      }

      return {
        hasAccess: false,
        error: 'Failed to verify organization access',
        details: githubError.message,
      };
    }
  }

  async listRepositories(): Promise<Repository[]> {
    const { data } = await this._octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 10,
      affiliation: 'owner,collaborator,organization_member',
    });

    return data.map((repo) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      html_url: repo.html_url,
      private: repo.private,
      fork: repo.fork,
      archived: repo.archived,
      stargazers_count: repo.stargazers_count,
      updated_at: repo.updated_at || new Date().toISOString(),
      language: repo.language || null,
    }));
  }

  async listBranches(owner: string, repo: string): Promise<Branch[]> {
    try {
      logStore.logSystem('Fetching branches', { owner, repo });

      const [branchesResponse, defaultBranchResponse] = await Promise.all([
        this._octokit.repos.listBranches({
          owner,
          repo,
          per_page: 100,
        }),
        this._octokit.repos.get({
          owner,
          repo,
        }),
      ]);

      const defaultBranch = defaultBranchResponse.data.default_branch;
      logStore.logSystem('Default branch found', { defaultBranch });
      logStore.logSystem('Branches found', { count: branchesResponse.data.length });

      return branchesResponse.data.map((branch) => ({
        name: branch.name,
        commit: {
          sha: branch.commit.sha,
          url: branch.commit.url,
        },
        protected: branch.protected,
        default: branch.name === defaultBranch,
      }));
    } catch (error) {
      const githubError = error as GitHubError;
      logStore.logError('Failed to list branches', {
        owner,
        repo,
        status: githubError.status,
        message: githubError.message,
      });

      if (githubError.status === 404) {
        logStore.logWarning('Repository not found or no access', { owner, repo });
        return [];
      }

      if (githubError.status === 403) {
        logStore.logWarning('No permission to list branches', { owner, repo });
        toast.error('No permission to list branches. Please check your token permissions.');

        return [];
      }

      throw error;
    }
  }

  async deleteRepository(fullName: string): Promise<void> {
    try {
      const [owner, repo] = fullName.split('/');
      await this._octokit.repos.delete({
        owner,
        repo,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const statusCode = isGitHubError(error) ? error.status : undefined;
      logStore.logError('Failed to delete repository', { error: errorMessage, statusCode });
      throw error;
    }
  }

  async updateRepository(
    fullName: string,
    data: {
      name?: string;
      description?: string;
      private?: boolean;
      archived?: boolean;
    },
  ): Promise<void> {
    try {
      const [owner, repo] = fullName.split('/');
      await this._octokit.repos.update({
        owner,
        repo,
        ...data,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const statusCode = isGitHubError(error) ? error.status : undefined;
      logStore.logError('Failed to update repository', { error: errorMessage, statusCode });
      throw error;
    }
  }

  async transferRepository(fullName: string, newOwner: string): Promise<void> {
    try {
      const [owner, repo] = fullName.split('/');
      await this._octokit.repos.transfer({
        owner,
        repo,
        new_owner: newOwner,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const statusCode = isGitHubError(error) ? error.status : undefined;
      logStore.logError('Failed to transfer repository', { error: errorMessage, statusCode });
      throw error;
    }
  }

  async getRepositoryContents(
    owner: string,
    repo: string,
    ref: string,
    path: string = '',
  ): Promise<
    Array<{
      name: string;
      path: string;
      type: 'file' | 'dir';
      size?: number;
      html_url: string;
    }>
  > {
    try {
      const { data } = await this._octokit.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });

      if (!Array.isArray(data)) {
        return [];
      }

      return data
        .filter((file) => file.html_url != null)
        .map((file) => ({
          name: file.name,
          path: file.path,
          type: file.type as 'file' | 'dir',
          size: file.size,
          html_url: file.html_url as string,
        }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const statusCode = isGitHubError(error) ? error.status : undefined;
      logStore.logError('Failed to get repository contents', { error: errorMessage, statusCode });
      throw error;
    }
  }

  async createOrUpdateFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    branch: string,
    sha?: string,
  ): Promise<{ sha: string; content: { html_url: string } }> {
    try {
      const { data } = await this._octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message,
        content: Buffer.from(content).toString('base64'),
        branch,
        sha, // Include SHA if updating existing file
      });

      if (!data.content?.sha || !data.content?.html_url) {
        throw new Error('Invalid response from GitHub API');
      }

      return {
        sha: data.content.sha,
        content: {
          html_url: data.content.html_url,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const statusCode = isGitHubError(error) ? error.status : undefined;
      logStore.logError('Failed to create/update file', { error: errorMessage, statusCode });
      throw error;
    }
  }

  async deleteFile(
    owner: string,
    repo: string,
    path: string,
    message: string,
    branch: string,
    sha: string,
  ): Promise<void> {
    try {
      await this._octokit.repos.deleteFile({
        owner,
        repo,
        path,
        message,
        sha,
        branch,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const statusCode = isGitHubError(error) ? error.status : undefined;
      logStore.logError('Failed to delete file', { error: errorMessage, statusCode });
      throw error;
    }
  }

  async renameFile(
    owner: string,
    repo: string,
    oldPath: string,
    newPath: string,
    content: string,
    message: string,
    branch: string,
    sha: string,
  ): Promise<{ sha: string; content: { html_url: string } }> {
    try {
      // Delete the old file
      await this.deleteFile(owner, repo, oldPath, `Delete ${oldPath} for rename`, branch, sha);

      // Create the new file
      return await this.createOrUpdateFile(owner, repo, newPath, content, message, branch);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const statusCode = isGitHubError(error) ? error.status : undefined;
      logStore.logError('Failed to rename file', { error: errorMessage, statusCode });
      throw error;
    }
  }

  async createFolder(owner: string, repo: string, path: string, message: string, branch: string): Promise<void> {
    try {
      // Create an empty .gitkeep file in the folder to create it
      await this.createOrUpdateFile(owner, repo, `${path}/.gitkeep`, '', message, branch);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const statusCode = isGitHubError(error) ? error.status : undefined;
      logStore.logError('Failed to create folder', { error: errorMessage, statusCode });
      throw error;
    }
  }

  async getFileSha(owner: string, repo: string, path: string, ref: string): Promise<string | null> {
    try {
      const { data } = await this._octokit.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });

      if ('sha' in data) {
        return data.sha;
      }

      return null;
    } catch (error) {
      if (isGitHubError(error) && error.status === 404) {
        return null;
      }

      throw error;
    }
  }
}
