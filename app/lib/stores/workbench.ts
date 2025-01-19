import { atom, map, type MapStore, type ReadableAtom, type WritableAtom } from 'nanostores';
import type { EditorDocument, ScrollPosition } from '~/components/editor/codemirror/CodeMirrorEditor';
import { ActionRunner } from '~/lib/runtime/action-runner';
import type { ActionCallbackData, ArtifactCallbackData } from '~/lib/runtime/message-parser';
import { webcontainer } from '~/lib/webcontainer';
import type { ITerminal } from '~/types/terminal';
import { unreachable } from '~/utils/unreachable';
import { EditorStore } from './editor';
import { FilesStore, type FileMap } from './files';
import { PreviewsStore } from './previews';
import { TerminalStore } from './terminal';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Octokit, type RestEndpointMethodTypes } from '@octokit/rest';
import * as nodePath from 'node:path';
import { extractRelativePath } from '~/utils/diff';
import { description } from '~/lib/persistence';
import Cookies from 'js-cookie';
import { createSampler } from '~/utils/sampler';
import type { ActionAlert } from '~/types/actions';
import { toast } from 'react-toastify';
import { logStore } from '~/lib/stores/logs';
import type { GitHubError } from '~/lib/github/GitHubClient';

export interface ArtifactState {
  id: string;
  title: string;
  type?: string;
  closed: boolean;
  runner: ActionRunner;
}

export type ArtifactUpdateState = Pick<ArtifactState, 'title' | 'closed'>;

type Artifacts = MapStore<Record<string, ArtifactState>>;

export type WorkbenchViewType = 'code' | 'preview';

export interface GitHubPushProgress {
  stage: 'preparing' | 'uploading' | 'committing';
  progress: number;
  details: string;
  uploadedFiles?: number;
  totalFiles?: number;
  currentFile?: string;
  error?: string;
  icon?: 'spinner' | 'check' | 'warning' | 'error' | 'github';
  subText?: string;
  color?: 'default' | 'success' | 'warning' | 'error';
}

interface GitHubPushOptions {
  commitMessage?: string;
  branch?: string;
  description?: string;
  onProgress?: (progress: GitHubPushProgress) => void;
  concurrentUploads?: number;
  chunkSize?: number;
}

const MAX_CHUNK_SIZE = 1024 * 1024; // 1MB chunk size
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const DEFAULT_CONCURRENT_UPLOADS = 3;

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryOperation<T>(operation: () => Promise<T>, maxRetries = MAX_RETRIES): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delayMs = RETRY_DELAY * Math.pow(2, attempt - 1);
        await delay(delayMs);
      }
    }
  }
  throw lastError;
}

function isGitHubError(error: unknown): error is GitHubError {
  return error instanceof Error && 'status' in error && typeof (error as any).status === 'number';
}

function shouldCompressContent(content: string): boolean {
  return content.length > 100 * 1024; // Compress if larger than 100KB
}

async function compressContent(content: string): Promise<string> {
  const textEncoder = new TextEncoder();
  const compressed = await new Response(
    new Blob([textEncoder.encode(content)]).stream().pipeThrough(new CompressionStream('gzip')),
  ).blob();

  return Buffer.from(await compressed.arrayBuffer()).toString('base64');
}

export class WorkbenchStore {
  #previewsStore = new PreviewsStore(webcontainer);
  #filesStore = new FilesStore(webcontainer);
  #editorStore = new EditorStore(this.#filesStore);
  #terminalStore = new TerminalStore(webcontainer);

  #reloadedMessages = new Set<string>();

  artifacts: Artifacts = import.meta.hot?.data.artifacts ?? map({});

  showWorkbench: WritableAtom<boolean> = import.meta.hot?.data.showWorkbench ?? atom(false);
  currentView: WritableAtom<WorkbenchViewType> = import.meta.hot?.data.currentView ?? atom('code');
  unsavedFiles: WritableAtom<Set<string>> = import.meta.hot?.data.unsavedFiles ?? atom(new Set<string>());
  actionAlert: WritableAtom<ActionAlert | undefined> =
    import.meta.hot?.data.unsavedFiles ?? atom<ActionAlert | undefined>(undefined);
  modifiedFiles = new Set<string>();
  artifactIdList: string[] = [];
  #globalExecutionQueue = Promise.resolve();
  constructor() {
    if (import.meta.hot) {
      import.meta.hot.data.artifacts = this.artifacts;
      import.meta.hot.data.unsavedFiles = this.unsavedFiles;
      import.meta.hot.data.showWorkbench = this.showWorkbench;
      import.meta.hot.data.currentView = this.currentView;
      import.meta.hot.data.actionAlert = this.actionAlert;
    }
  }

  addToExecutionQueue(callback: () => Promise<void>) {
    this.#globalExecutionQueue = this.#globalExecutionQueue.then(() => callback());
  }

  get previews() {
    return this.#previewsStore.previews;
  }

  get files() {
    return this.#filesStore.files;
  }

  get currentDocument(): ReadableAtom<EditorDocument | undefined> {
    return this.#editorStore.currentDocument;
  }

  get selectedFile(): ReadableAtom<string | undefined> {
    return this.#editorStore.selectedFile;
  }

  get firstArtifact(): ArtifactState | undefined {
    return this.#getArtifact(this.artifactIdList[0]);
  }

  get filesCount(): number {
    return this.#filesStore.filesCount;
  }

  get showTerminal() {
    return this.#terminalStore.showTerminal;
  }
  get boltTerminal() {
    return this.#terminalStore.boltTerminal;
  }
  get alert() {
    return this.actionAlert;
  }
  clearAlert() {
    this.actionAlert.set(undefined);
  }

  toggleTerminal(value?: boolean) {
    this.#terminalStore.toggleTerminal(value);
  }

  attachTerminal(terminal: ITerminal) {
    this.#terminalStore.attachTerminal(terminal);
  }
  attachBoltTerminal(terminal: ITerminal) {
    this.#terminalStore.attachBoltTerminal(terminal);
  }

  onTerminalResize(cols: number, rows: number) {
    this.#terminalStore.onTerminalResize(cols, rows);
  }

  setDocuments(files: FileMap) {
    this.#editorStore.setDocuments(files);

    if (this.#filesStore.filesCount > 0 && this.currentDocument.get() === undefined) {
      // we find the first file and select it
      for (const [filePath, dirent] of Object.entries(files)) {
        if (dirent?.type === 'file') {
          this.setSelectedFile(filePath);
          break;
        }
      }
    }
  }

  setShowWorkbench(show: boolean) {
    this.showWorkbench.set(show);
  }

  setCurrentDocumentContent(newContent: string) {
    const filePath = this.currentDocument.get()?.filePath;

    if (!filePath) {
      return;
    }

    const originalContent = this.#filesStore.getFile(filePath)?.content;
    const unsavedChanges = originalContent !== undefined && originalContent !== newContent;

    this.#editorStore.updateFile(filePath, newContent);

    const currentDocument = this.currentDocument.get();

    if (currentDocument) {
      const previousUnsavedFiles = this.unsavedFiles.get();

      if (unsavedChanges && previousUnsavedFiles.has(currentDocument.filePath)) {
        return;
      }

      const newUnsavedFiles = new Set(previousUnsavedFiles);

      if (unsavedChanges) {
        newUnsavedFiles.add(currentDocument.filePath);
      } else {
        newUnsavedFiles.delete(currentDocument.filePath);
      }

      this.unsavedFiles.set(newUnsavedFiles);
    }
  }

  setCurrentDocumentScrollPosition(position: ScrollPosition) {
    const editorDocument = this.currentDocument.get();

    if (!editorDocument) {
      return;
    }

    const { filePath } = editorDocument;

    this.#editorStore.updateScrollPosition(filePath, position);
  }

  setSelectedFile(filePath: string | undefined) {
    this.#editorStore.setSelectedFile(filePath);
  }

  async saveFile(filePath: string) {
    const documents = this.#editorStore.documents.get();
    const document = documents[filePath];

    if (document === undefined) {
      return;
    }

    await this.#filesStore.saveFile(filePath, document.value);

    const newUnsavedFiles = new Set(this.unsavedFiles.get());
    newUnsavedFiles.delete(filePath);

    this.unsavedFiles.set(newUnsavedFiles);
  }

  async saveCurrentDocument() {
    const currentDocument = this.currentDocument.get();

    if (currentDocument === undefined) {
      return;
    }

    await this.saveFile(currentDocument.filePath);
  }

  resetCurrentDocument() {
    const currentDocument = this.currentDocument.get();

    if (currentDocument === undefined) {
      return;
    }

    const { filePath } = currentDocument;
    const file = this.#filesStore.getFile(filePath);

    if (!file) {
      return;
    }

    this.setCurrentDocumentContent(file.content);
  }

  async saveAllFiles() {
    for (const filePath of this.unsavedFiles.get()) {
      await this.saveFile(filePath);
    }
  }

  getFileModifcations() {
    return this.#filesStore.getFileModifications();
  }

  resetAllFileModifications() {
    this.#filesStore.resetFileModifications();
  }

  abortAllActions() {
    // TODO: what do we wanna do and how do we wanna recover from this?
  }

  setReloadedMessages(messages: string[]) {
    this.#reloadedMessages = new Set(messages);
  }

  addArtifact({ messageId, title, id, type }: ArtifactCallbackData) {
    const artifact = this.#getArtifact(messageId);

    if (artifact) {
      return;
    }

    if (!this.artifactIdList.includes(messageId)) {
      this.artifactIdList.push(messageId);
    }

    this.artifacts.setKey(messageId, {
      id,
      title,
      closed: false,
      type,
      runner: new ActionRunner(
        webcontainer,
        () => this.boltTerminal,
        (alert) => {
          if (this.#reloadedMessages.has(messageId)) {
            return;
          }

          this.actionAlert.set(alert);
        },
      ),
    });
  }

  updateArtifact({ messageId }: ArtifactCallbackData, state: Partial<ArtifactUpdateState>) {
    const artifact = this.#getArtifact(messageId);

    if (!artifact) {
      return;
    }

    this.artifacts.setKey(messageId, { ...artifact, ...state });
  }
  addAction(data: ActionCallbackData) {
    // this._addAction(data);

    this.addToExecutionQueue(() => this._addAction(data));
  }
  async _addAction(data: ActionCallbackData) {
    const { messageId } = data;

    const artifact = this.#getArtifact(messageId);

    if (!artifact) {
      unreachable('Artifact not found');
    }

    return artifact.runner.addAction(data);
  }

  runAction(data: ActionCallbackData, isStreaming: boolean = false) {
    if (isStreaming) {
      this.actionStreamSampler(data, isStreaming);
    } else {
      this.addToExecutionQueue(() => this._runAction(data, isStreaming));
    }
  }
  async _runAction(data: ActionCallbackData, isStreaming: boolean = false) {
    const { messageId } = data;

    const artifact = this.#getArtifact(messageId);

    if (!artifact) {
      unreachable('Artifact not found');
    }

    const action = artifact.runner.actions.get()[data.actionId];

    if (!action || action.executed) {
      return;
    }

    if (data.action.type === 'file') {
      const wc = await webcontainer;
      const fullPath = nodePath.join(wc.workdir, data.action.filePath);

      if (this.selectedFile.value !== fullPath) {
        this.setSelectedFile(fullPath);
      }

      if (this.currentView.value !== 'code') {
        this.currentView.set('code');
      }

      const doc = this.#editorStore.documents.get()[fullPath];

      if (!doc) {
        await artifact.runner.runAction(data, isStreaming);
      }

      this.#editorStore.updateFile(fullPath, data.action.content);

      if (!isStreaming) {
        await artifact.runner.runAction(data);
        this.resetAllFileModifications();
      }
    } else {
      await artifact.runner.runAction(data);
    }
  }

  actionStreamSampler = createSampler(async (data: ActionCallbackData, isStreaming: boolean = false) => {
    return await this._runAction(data, isStreaming);
  }, 100); // TODO: remove this magic number to have it configurable

  #getArtifact(id: string) {
    const artifacts = this.artifacts.get();
    return artifacts[id];
  }

  async downloadZip() {
    const zip = new JSZip();
    const files = this.files.get();

    // Get the project name from the description input, or use a default name
    const projectName = (description.value ?? 'project').toLocaleLowerCase().split(' ').join('_');

    // Generate a simple 6-character hash based on the current timestamp
    const timestampHash = Date.now().toString(36).slice(-6);
    const uniqueProjectName = `${projectName}_${timestampHash}`;

    for (const [filePath, dirent] of Object.entries(files)) {
      if (dirent?.type === 'file' && !dirent.isBinary) {
        const relativePath = extractRelativePath(filePath);

        // split the path into segments
        const pathSegments = relativePath.split('/');

        // if there's more than one segment, we need to create folders
        if (pathSegments.length > 1) {
          let currentFolder = zip;

          for (let i = 0; i < pathSegments.length - 1; i++) {
            currentFolder = currentFolder.folder(pathSegments[i])!;
          }
          currentFolder.file(pathSegments[pathSegments.length - 1], dirent.content);
        } else {
          // if there's only one segment, it's a file in the root
          zip.file(relativePath, dirent.content);
        }
      }
    }

    // Generate the zip file and save it
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `${uniqueProjectName}.zip`);
  }

  async syncFiles(targetHandle: FileSystemDirectoryHandle) {
    const files = this.files.get();
    const syncedFiles = [];

    for (const [filePath, dirent] of Object.entries(files)) {
      if (dirent?.type === 'file' && !dirent.isBinary) {
        const relativePath = extractRelativePath(filePath);
        const pathSegments = relativePath.split('/');
        let currentHandle = targetHandle;

        for (let i = 0; i < pathSegments.length - 1; i++) {
          currentHandle = await currentHandle.getDirectoryHandle(pathSegments[i], { create: true });
        }

        // create or get the file
        const fileHandle = await currentHandle.getFileHandle(pathSegments[pathSegments.length - 1], {
          create: true,
        });

        // write the file content
        const writable = await fileHandle.createWritable();
        await writable.write(dirent.content);
        await writable.close();

        syncedFiles.push(relativePath);
      }
    }

    return syncedFiles;
  }

  async pushToGitHub(repoName: string, githubUsername?: string, ghToken?: string, options: GitHubPushOptions = {}) {
    const { concurrentUploads = DEFAULT_CONCURRENT_UPLOADS, chunkSize = MAX_CHUNK_SIZE } = options;

    const updateProgress = (progress: Partial<GitHubPushProgress>) => {
      options.onProgress?.({
        stage: 'preparing',
        progress: 0,
        details: '',
        icon: 'spinner',
        color: 'default',
        ...progress,
      });
    };

    try {
      const githubToken = ghToken || Cookies.get('githubToken');
      const owner = githubUsername || Cookies.get('githubUsername');

      if (!githubToken || !owner) {
        throw new Error('GitHub token or username is not set in cookies or provided.');
      }

      updateProgress({
        stage: 'preparing',
        progress: 0,
        details: 'Initializing GitHub connection...',
        icon: 'github',
        subText: `Connecting to GitHub as ${owner}`,
      });

      const octokit = new Octokit({
        auth: githubToken,
        retry: {
          enabled: true,
          retries: 3,
        },
      });

      // Check repository existence and create if needed
      let repo: RestEndpointMethodTypes['repos']['get']['response']['data'];

      try {
        const resp = await retryOperation(() => octokit.repos.get({ owner, repo: repoName }));
        repo = resp.data;
        updateProgress({
          details: 'Repository found',
          subText: `Using existing repository: ${owner}/${repoName}`,
          icon: 'check',
          color: 'success',
        });
      } catch (error: unknown) {
        if (error instanceof Error && 'status' in error && error.status === 404) {
          updateProgress({
            details: 'Creating new repository...',
            subText: `Creating ${owner}/${repoName}`,
            icon: 'spinner',
          });

          const { data: newRepo } = await octokit.repos.createForAuthenticatedUser({
            name: repoName,
            private: false,
            auto_init: true,
            description: options.description || 'Created by Bolt.diy',
          });
          repo = newRepo;

          updateProgress({
            details: 'Repository created successfully',
            subText: `Created ${owner}/${repoName}`,
            icon: 'check',
            color: 'success',
          });
        } else {
          throw new Error(`Failed to access repository: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      updateProgress({
        stage: 'preparing',
        progress: 20,
        details: 'Processing files...',
        icon: 'spinner',
        subText: 'Analyzing project structure',
      });

      // Get and validate files
      const files = this.files.get();

      if (!files || Object.keys(files).length === 0) {
        throw new Error('No files found to push');
      }

      // Create blobs in parallel batches
      const fileEntries = Object.entries(files);
      const totalFiles = fileEntries.length;
      const blobs: { path: string; sha: string }[] = [];
      let uploadedFiles = 0;
      let totalSize = 0;
      let compressedSize = 0;

      // Process files in batches
      for (let i = 0; i < fileEntries.length; i += concurrentUploads) {
        const batch = fileEntries.slice(i, i + concurrentUploads);
        const batchPromises = batch.map(async ([filePath, dirent]) => {
          if (dirent?.type === 'file' && dirent.content) {
            try {
              const content = dirent.content;
              const relativePath = extractRelativePath(filePath);

              updateProgress({
                stage: 'uploading',
                progress: 20 + (60 * uploadedFiles) / totalFiles,
                details: `Uploading files to GitHub...`,
                subText: `${uploadedFiles + 1}/${totalFiles}: ${relativePath}`,
                uploadedFiles,
                totalFiles,
                currentFile: relativePath,
                icon: 'spinner',
              });

              let encodedContent: string;

              if (shouldCompressContent(content)) {
                totalSize += content.length;
                encodedContent = await compressContent(content);
                compressedSize += encodedContent.length;
                logStore.logSystem('Compressed file', {
                  path: relativePath,
                  originalSize: content.length,
                  compressedSize: encodedContent.length,
                });
              } else {
                encodedContent = Buffer.from(content).toString('base64');
              }

              if (encodedContent.length > chunkSize) {
                // Handle large files
                const chunks = Math.ceil(encodedContent.length / chunkSize);
                const chunkBlobs = await Promise.all(
                  Array.from({ length: chunks }, async (_, j) => {
                    const chunk = encodedContent.slice(j * chunkSize, (j + 1) * chunkSize);
                    const { data: blob } = await retryOperation(() =>
                      octokit.git.createBlob({
                        owner: repo.owner.login,
                        repo: repo.name,
                        content: chunk,
                        encoding: 'base64',
                      }),
                    );

                    return blob.sha;
                  }),
                );

                // Combine chunks if needed
                blobs.push({ path: relativePath, sha: chunkBlobs[0] });
              } else {
                const { data: blob } = await retryOperation(() =>
                  octokit.git.createBlob({
                    owner: repo.owner.login,
                    repo: repo.name,
                    content: encodedContent,
                    encoding: 'base64',
                  }),
                );
                blobs.push({ path: relativePath, sha: blob.sha });
              }
            } catch (error) {
              logStore.logError('Failed to create blob', {
                path: filePath,
                error: error instanceof Error ? error.message : 'Unknown error',
              });
              updateProgress({
                icon: 'warning',
                color: 'warning',
                subText: `Failed to upload: ${filePath}`,
              });
              throw new Error(
                `Failed to upload file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
              );
            }
          }

          uploadedFiles++;
        });

        await Promise.all(batchPromises);
      }

      if (blobs.length === 0) {
        throw new Error('No valid files to push');
      }

      if (totalSize > 0) {
        const compressionRatio = (((totalSize - compressedSize) / totalSize) * 100).toFixed(2);
        updateProgress({
          icon: 'check',
          color: 'success',
          subText: `Compressed ${totalFiles} files (saved ${compressionRatio}%)`,
        });
      }

      updateProgress({
        stage: 'committing',
        progress: 80,
        details: 'Creating commit...',
        subText: `Preparing changes for ${options.branch || repo.default_branch || 'main'}`,
        icon: 'spinner',
      });

      // Get the latest commit SHA and tree
      type GitRefResponse = RestEndpointMethodTypes['git']['getRef']['response'];
      type GitCommitResponse = RestEndpointMethodTypes['git']['getCommit']['response'];

      interface GitHubResponse<T> {
        data: T;
        status: number;
      }

      type RefData = GitRefResponse['data'];
      type CommitData = GitCommitResponse['data'];

      async function getRefSha(octokit: Octokit, owner: string, repoName: string, branch: string): Promise<string> {
        const response = (await retryOperation(() =>
          octokit.git.getRef({
            owner,
            repo: repoName,
            ref: `heads/${branch}`,
          }),
        )) as GitHubResponse<RefData>;
        return response.data.object.sha;
      }

      const refSha = await getRefSha(
        octokit,
        repo.owner.login,
        repo.name,
        options.branch || repo.default_branch || 'main',
      );

      const commitResponse = (await retryOperation(() =>
        octokit.git.getCommit({
          owner: repo.owner.login,
          repo: repo.name,
          commit_sha: refSha,
        }),
      )) as GitHubResponse<CommitData>;

      const lastCommit = commitResponse.data;

      // Create a new tree
      const { data: newTree } = await retryOperation(() =>
        octokit.git.createTree({
          owner: repo.owner.login,
          repo: repo.name,
          base_tree: lastCommit.tree.sha,
          tree: blobs.map((blob) => ({
            path: blob.path,
            mode: '100644',
            type: 'blob',
            sha: blob.sha,
          })),
        }),
      );

      // Create a new commit
      const { data: newCommit } = await retryOperation(() =>
        octokit.git.createCommit({
          owner: repo.owner.login,
          repo: repo.name,
          message: options.commitMessage || 'Update from Bolt.diy',
          tree: newTree.sha,
          parents: [lastCommit.sha],
        }),
      );

      // Update the reference
      await retryOperation(() =>
        octokit.git.updateRef({
          owner: repo.owner.login,
          repo: repo.name,
          ref: `heads/${options.branch || repo.default_branch || 'main'}`,
          sha: newCommit.sha,
        }),
      );

      updateProgress({
        stage: 'committing',
        progress: 100,
        details: 'Push completed successfully!',
        subText: `Files are now available on GitHub`,
        icon: 'check',
        color: 'success',
      });

      logStore.logSystem('GitHub push completed', {
        repository: `${owner}/${repoName}`,
        filesCount: blobs.length,
        commitSha: newCommit.sha,
        branch: options.branch || repo.default_branch || 'main',
      });

      return {
        success: true,
        repoUrl: repo.html_url,
        commitSha: newCommit.sha,
        branch: options.branch || repo.default_branch || 'main',
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const statusCode = isGitHubError(error) ? error.status : undefined;

      logStore.logError('Failed to push to GitHub', {
        error: errorMessage,
        statusCode,
      });

      const userMessage = (() => {
        if (statusCode === 403) {
          return {
            message: 'Failed to push to GitHub. Please check your permissions.',
            subText: 'Repository access denied',
            icon: 'error' as const,
            color: 'error' as const,
          };
        }

        if (statusCode === 404) {
          return {
            message: 'Repository not found. Please check the repository name.',
            subText: 'Repository does not exist',
            icon: 'error' as const,
            color: 'error' as const,
          };
        }

        if (statusCode === 401) {
          return {
            message: 'Authentication failed. Please check your GitHub token.',
            subText: 'Invalid or expired token',
            icon: 'error' as const,
            color: 'error' as const,
          };
        }

        if (statusCode === 422) {
          return {
            message: 'Invalid repository name or branch.',
            subText: 'Please check your input',
            icon: 'error' as const,
            color: 'error' as const,
          };
        }

        return {
          message: 'Failed to push to GitHub. Please try again.',
          subText: errorMessage,
          icon: 'error' as const,
          color: 'error' as const,
        };
      })();

      updateProgress({
        stage: 'preparing',
        progress: 0,
        details: userMessage.message,
        subText: userMessage.subText,
        icon: userMessage.icon,
        color: userMessage.color,
        error: errorMessage,
      });

      toast.error(userMessage.message);
      throw error;
    }
  }
}

export const workbenchStore = new WorkbenchStore();
