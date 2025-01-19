import { useStore } from '@nanostores/react';
import { motion, type HTMLMotionProps, type Variants } from 'framer-motion';
import { computed } from 'nanostores';
import { memo, useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  type OnChangeCallback as OnEditorChange,
  type OnScrollCallback as OnEditorScroll,
} from '~/components/editor/codemirror/CodeMirrorEditor';
import { IconButton } from '~/components/ui/IconButton';
import { PanelHeaderButton } from '~/components/ui/PanelHeaderButton';
import { Slider, type SliderOptions } from '~/components/ui/Slider';
import { workbenchStore, type WorkbenchViewType } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';
import { cubicEasingFn } from '~/utils/easings';
import { renderLogger } from '~/utils/logger';
import { EditorPanel } from './EditorPanel';
import { Preview } from './Preview';
import useViewport from '~/lib/hooks';
import Cookies from 'js-cookie';
import { GitHubCreateRepoDialog } from '~/components/settings/GitHubCreateRepoDialog';
import { GitHubCredentialsDialog } from '~/components/settings/GitHubCredentialsDialog';
import { GitHubPushDialog } from '~/components/settings/GitHubPushDialog';
import { type GitHubPushProgress } from '~/lib/stores/workbench';

interface WorkspaceProps {
  chatStarted?: boolean;
  isStreaming?: boolean;
}

const viewTransition = { ease: cubicEasingFn };

const sliderOptions: SliderOptions<WorkbenchViewType> = {
  left: {
    value: 'code',
    text: 'Code',
  },
  right: {
    value: 'preview',
    text: 'Preview',
  },
};

const workbenchVariants = {
  closed: {
    width: 0,
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
  open: {
    width: 'var(--workbench-width)',
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
} satisfies Variants;

export const Workbench = memo(({ chatStarted, isStreaming }: WorkspaceProps) => {
  renderLogger.trace('Workbench');

  const [isSyncing, setIsSyncing] = useState(false);
  const [showCreateRepoDialog, setShowCreateRepoDialog] = useState(false);
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);
  const [pendingRepoName, setPendingRepoName] = useState<string | null>(null);
  const [pushProgress, setPushProgress] = useState<GitHubPushProgress | null>(null);

  const hasPreview = useStore(computed(workbenchStore.previews, (previews) => previews.length > 0));
  const showWorkbench = useStore(workbenchStore.showWorkbench);
  const selectedFile = useStore(workbenchStore.selectedFile);
  const currentDocument = useStore(workbenchStore.currentDocument);
  const unsavedFiles = useStore(workbenchStore.unsavedFiles);
  const files = useStore(workbenchStore.files);
  const selectedView = useStore(workbenchStore.currentView);

  const isSmallViewport = useViewport(1024);

  const setSelectedView = (view: WorkbenchViewType) => {
    workbenchStore.currentView.set(view);
  };

  useEffect(() => {
    if (hasPreview) {
      setSelectedView('preview');
    }
  }, [hasPreview]);

  useEffect(() => {
    workbenchStore.setDocuments(files);
  }, [files]);

  const onEditorChange = useCallback<OnEditorChange>((update) => {
    workbenchStore.setCurrentDocumentContent(update.content);
  }, []);

  const onEditorScroll = useCallback<OnEditorScroll>((position) => {
    workbenchStore.setCurrentDocumentScrollPosition(position);
  }, []);

  const onFileSelect = useCallback((filePath: string | undefined) => {
    workbenchStore.setSelectedFile(filePath);
  }, []);

  const onFileSave = useCallback(() => {
    workbenchStore.saveCurrentDocument().catch(() => {
      toast.error('Failed to update file content');
    });
  }, []);

  const onFileReset = useCallback(() => {
    workbenchStore.resetCurrentDocument();
  }, []);

  const handleSyncFiles = useCallback(async () => {
    setIsSyncing(true);

    try {
      const directoryHandle = await window.showDirectoryPicker();
      await workbenchStore.syncFiles(directoryHandle);
      toast.success('Files synced successfully');
    } catch (error) {
      console.error('Error syncing files:', error);
      toast.error('Failed to sync files');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const handleCreateRepo = (repoName: string) => {
    const githubUsername = Cookies.get('githubUsername');
    const githubToken = Cookies.get('githubToken');

    setPendingRepoName(repoName);

    if (!githubUsername || !githubToken) {
      setShowCredentialsDialog(true);
    } else {
      setPushProgress({
        stage: 'preparing',
        progress: 0,
        details: 'Select repository and branch',
        icon: 'github',
        color: 'default',
      });
    }
  };

  const handlePushSubmit = (repository: string, branch: string) => {
    const githubUsername = Cookies.get('githubUsername');
    const githubToken = Cookies.get('githubToken');

    if (!githubUsername || !githubToken) {
      setShowCredentialsDialog(true);
      return;
    }

    workbenchStore.pushToGitHub(repository, githubUsername, githubToken, {
      onProgress: setPushProgress,
      branch,
    });
  };

  const handleCredentialsSubmit = (_username: string, _token: string) => {
    if (pendingRepoName) {
      setPushProgress({
        stage: 'preparing',
        progress: 0,
        details: 'Select repository and branch',
        icon: 'github',
        color: 'default',
      });
      setShowCredentialsDialog(false);
    }
  };

  const handlePushComplete = () => {
    setPushProgress(null);
    setPendingRepoName(null);
  };

  const handleBranchSelect = (_branch: string) => {
    // We don't need to store the branch locally anymore since it's handled in the dialog
  };

  return (
    chatStarted && (
      <motion.div
        initial="closed"
        animate={showWorkbench ? 'open' : 'closed'}
        variants={workbenchVariants}
        className="z-workbench"
      >
        <div
          className={classNames(
            'fixed top-[calc(var(--header-height)+1.5rem)] bottom-6 w-[var(--workbench-inner-width)] mr-4 z-0 transition-[left,width] duration-200 bolt-ease-cubic-bezier',
            {
              'w-full': isSmallViewport,
              'left-0': showWorkbench && isSmallViewport,
              'left-[var(--workbench-left)]': showWorkbench,
              'left-[100%]': !showWorkbench,
            },
          )}
        >
          <div className="absolute inset-0 px-2 lg:px-6">
            <div className="h-full flex flex-col bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor shadow-sm rounded-lg overflow-hidden">
              <div className="flex items-center px-3 py-2 border-b border-bolt-elements-borderColor">
                <Slider selected={selectedView} options={sliderOptions} setSelected={setSelectedView} />
                <div className="ml-auto" />
                {selectedView === 'code' && (
                  <div className="flex items-center gap-3">
                    <PanelHeaderButton
                      onClick={() => {
                        workbenchStore.downloadZip();
                      }}
                    >
                      <div className="i-ph:code text-lg" />
                      Download Code
                    </PanelHeaderButton>
                    <PanelHeaderButton onClick={handleSyncFiles} disabled={isSyncing}>
                      {isSyncing ? (
                        <div className="i-ph:spinner animate-spin text-lg" />
                      ) : (
                        <div className="i-ph:cloud-arrow-down text-lg" />
                      )}
                      {isSyncing ? 'Syncing...' : 'Sync Files'}
                    </PanelHeaderButton>
                    <PanelHeaderButton
                      onClick={() => {
                        workbenchStore.toggleTerminal(!workbenchStore.showTerminal.get());
                      }}
                    >
                      <div className="i-ph:terminal text-lg" />
                      Toggle Terminal
                    </PanelHeaderButton>
                    <div className="w-[1px] h-6 bg-bolt-elements-borderColor mx-1" />
                    <PanelHeaderButton
                      onClick={() => setShowCreateRepoDialog(true)}
                      disabled={isSyncing}
                      className="bg-bolt-elements-accent/10 hover:bg-bolt-elements-accent/20 text-bolt-elements-accent"
                    >
                      <div className="i-ph:github-logo-bold text-lg" />
                      Push to GitHub
                    </PanelHeaderButton>
                  </div>
                )}
                <IconButton
                  icon="i-ph:x-circle"
                  className="-mr-1"
                  size="xl"
                  onClick={() => {
                    workbenchStore.showWorkbench.set(false);
                  }}
                />
              </div>
              <div className="relative flex-1 overflow-hidden">
                <View
                  initial={{ x: selectedView === 'code' ? 0 : '-100%' }}
                  animate={{ x: selectedView === 'code' ? 0 : '-100%' }}
                >
                  <EditorPanel
                    editorDocument={currentDocument}
                    isStreaming={isStreaming}
                    selectedFile={selectedFile}
                    files={files}
                    unsavedFiles={unsavedFiles}
                    onFileSelect={onFileSelect}
                    onEditorScroll={onEditorScroll}
                    onEditorChange={onEditorChange}
                    onFileSave={onFileSave}
                    onFileReset={onFileReset}
                  />
                </View>
                <View
                  initial={{ x: selectedView === 'preview' ? 0 : '100%' }}
                  animate={{ x: selectedView === 'preview' ? 0 : '100%' }}
                >
                  <Preview />
                </View>
              </div>
            </div>
          </div>
        </div>
        {showCreateRepoDialog && (
          <GitHubCreateRepoDialog
            isOpen={showCreateRepoDialog}
            onClose={() => setShowCreateRepoDialog(false)}
            onSubmit={handleCreateRepo}
          />
        )}
        {showCredentialsDialog && (
          <GitHubCredentialsDialog
            _isOpen={showCredentialsDialog}
            onClose={() => setShowCredentialsDialog(false)}
            onSubmit={handleCredentialsSubmit}
          />
        )}
        {pushProgress && (
          <GitHubPushDialog
            progress={pushProgress}
            onClose={handlePushComplete}
            repoName={pendingRepoName || undefined}
            onBranchSelect={handleBranchSelect}
            onSubmit={handlePushSubmit}
          />
        )}
      </motion.div>
    )
  );
});
interface ViewProps extends HTMLMotionProps<'div'> {
  children: JSX.Element;
}

const View = memo(({ children, ...props }: ViewProps) => {
  return (
    <motion.div className="absolute inset-0" transition={viewTransition} {...props}>
      {children}
    </motion.div>
  );
});
