import React, { useEffect, useState } from 'react';
import type { GitHubPushProgress } from '~/lib/stores/workbench';
import { DialogRoot } from '~/components/ui/Dialog';
import { motion } from 'framer-motion';
import { classNames } from '~/utils/classNames';
import styles from './Settings.module.scss';

interface GitHubPushDialogProps {
  progress: GitHubPushProgress;
  onClose: () => void;
  repoName?: string;
  onBranchSelect?: (branch: string) => void;
  onSubmit?: (repository: string, branch: string) => void;
}

export function GitHubPushDialog({ progress, onClose, repoName, onBranchSelect, onSubmit }: GitHubPushDialogProps) {
  const [repoDescription, setRepoDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState<string>('');

  // When component mounts, automatically set main branch
  useEffect(() => {
    if (onBranchSelect) {
      onBranchSelect('main');
    }
  }, [onBranchSelect]);

  // Add auto-close effect when push is completed
  useEffect(() => {
    if (progress.stage === 'committing' && progress.color === 'success') {
      const timer = setTimeout(() => {
        onClose();
      }, 5000); // 5 seconds
      return () => clearTimeout(timer);
    }

    if (progress.stage === 'committing' && progress.color === 'error') {
      setError('Failed to create repository. Please try again.');
    }

    return undefined;
  }, [progress.stage, progress.color, onClose]);

  return (
    <DialogRoot open={true} onOpenChange={onClose}>
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
          <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {progress.icon === 'spinner' && (
                  <div className="i-ph:spinner-gap-bold animate-spin text-2xl text-bolt-elements-accent" />
                )}
                {progress.icon === 'check' && <div className="i-ph:check-circle-bold text-2xl text-green-500" />}
                {progress.icon === 'warning' && <div className="i-ph:warning-bold text-2xl text-yellow-500" />}
                {progress.icon === 'error' && <div className="i-ph:x-circle-bold text-2xl text-red-500" />}
                {progress.icon === 'github' && (
                  <div className="i-ph:github-logo-bold text-2xl text-bolt-elements-textPrimary" />
                )}
                <h3 className="text-lg font-semibold text-bolt-elements-textPrimary">
                  {progress.stage === 'preparing' && 'Create GitHub Repository'}
                  {progress.stage === 'uploading' && 'Uploading to GitHub'}
                  {progress.stage === 'committing' && 'Creating Repository'}
                </h3>
              </div>
              {onClose && (
                <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={classNames(
                    'text-bolt-elements-textTertiary hover:text-bolt-elements-textSecondary transition-colors',
                    'hover:bg-bolt-elements-button-primary-backgroundHover rounded-md p-1',
                  )}
                >
                  <span className="i-ph:x-bold text-xl" />
                </motion.button>
              )}
            </div>

            {/* Repository Creation Form */}
            {progress.stage === 'preparing' && (
              <div className="space-y-4 border-t border-bolt-elements-borderColor pt-4">
                {/* Repository Name */}
                <div>
                  <label className="block text-sm font-medium text-bolt-elements-textSecondary mb-2">
                    Repository Name
                  </label>
                  <input
                    type="text"
                    value={repoName}
                    disabled
                    className={classNames(
                      'w-full px-3 py-2 bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-lg',
                      'text-bolt-elements-textPrimary focus:outline-none',
                      'opacity-75',
                    )}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-bolt-elements-textSecondary mb-2">
                    Description <span className="text-bolt-elements-textTertiary">(optional)</span>
                  </label>
                  <textarea
                    value={repoDescription}
                    onChange={(e) => setRepoDescription(e.target.value)}
                    rows={2}
                    className={classNames(
                      'w-full px-3 py-2 bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-lg',
                      'text-bolt-elements-textPrimary focus:outline-none focus:ring-2 focus:ring-bolt-elements-accent/50',
                      'focus:border-bolt-elements-accent transition-all duration-200 resize-none',
                    )}
                    placeholder="A short description of your repository"
                  />
                </div>

                {/* Privacy Setting */}
                <div>
                  <label className="block text-sm font-medium text-bolt-elements-textSecondary mb-2">
                    Repository Visibility
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsPrivate(false)}
                      className={classNames(styles['settings-button'], 'flex items-center gap-2 flex-1', {
                        'bg-bolt-elements-accent text-white': !isPrivate,
                      })}
                    >
                      <div className="i-ph:lock-open text-lg" />
                      Public
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPrivate(true)}
                      className={classNames(styles['settings-button'], 'flex items-center gap-2 flex-1', {
                        'bg-bolt-elements-accent text-white': isPrivate,
                      })}
                    >
                      <div className="i-ph:lock text-lg" />
                      Private
                    </button>
                  </div>
                </div>

                {/* Overview */}
                <div className="mt-4 p-3 bg-bolt-elements-background-depth-1 rounded-lg">
                  <h4 className="text-sm font-medium text-bolt-elements-textSecondary mb-2">Repository Overview</h4>
                  <ul className="space-y-2 text-sm text-bolt-elements-textSecondary">
                    <li className="flex items-center gap-2">
                      <div className="i-ph:check-circle text-green-500" />
                      Repository will be created as: {repoName}
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="i-ph:check-circle text-green-500" />
                      Visibility: {isPrivate ? 'Private' : 'Public'}
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="i-ph:check-circle text-green-500" />
                      Default branch: main
                    </li>
                    {repoDescription && (
                      <li className="flex items-center gap-2">
                        <div className="i-ph:check-circle text-green-500" />
                        Description added
                      </li>
                    )}
                  </ul>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-bolt-elements-borderColor">
                  <motion.button
                    onClick={onClose}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={classNames(
                      styles['settings-button'],
                      'hover:bg-bolt-elements-button-primary-backgroundHover transition-all duration-200',
                    )}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    onClick={() => onSubmit?.(repoName || '', 'main')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={classNames(
                      styles['settings-button'],
                      'bg-bolt-elements-accent hover:bg-bolt-elements-accent/90 text-white flex items-center gap-2',
                      'transition-all duration-200 shadow-sm',
                    )}
                  >
                    <div className="i-ph:git-branch text-lg" />
                    Create Repository
                  </motion.button>
                </div>
              </div>
            )}

            {/* Progress Details */}
            {progress.stage !== 'preparing' && (
              <div className="space-y-3">
                <div className="text-sm text-bolt-elements-textSecondary">
                  {progress.details}
                  {progress.subText && (
                    <div className="mt-1 text-xs text-bolt-elements-textTertiary">{progress.subText}</div>
                  )}
                </div>

                {/* Progress Bar */}
                {progress.progress > 0 && (
                  <div className="h-1 bg-bolt-elements-background-depth-1 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress.progress}%` }}
                      transition={{ duration: 0.3 }}
                      className={classNames('h-full rounded-full', {
                        'bg-green-500': progress.color === 'success',
                        'bg-yellow-500': progress.color === 'warning',
                        'bg-red-500': progress.color === 'error',
                        'bg-bolt-elements-accent': !progress.color || progress.color === 'default',
                      })}
                    />
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="text-sm text-red-500 bg-red-500/10 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="i-ph:warning-circle-bold" />
                      {error}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </DialogRoot>
  );
}
