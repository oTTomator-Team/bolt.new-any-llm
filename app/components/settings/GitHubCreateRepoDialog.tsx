import { Dialog, DialogRoot, DialogTitle } from '~/components/ui/Dialog';
import { useState } from 'react';
import { motion } from 'framer-motion';
import styles from './Settings.module.scss';
import { classNames } from '~/utils/classNames';

interface GitHubCreateRepoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (repoName: string) => void;
}

export function GitHubCreateRepoDialog({ isOpen, onClose, onSubmit }: GitHubCreateRepoDialogProps) {
  const [repoName, setRepoName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (repoName.trim()) {
      onSubmit(repoName.trim());
      onClose();
    }
  };

  const isValidRepoName = repoName.trim() && /^[a-zA-Z0-9._-]+$/.test(repoName);

  return (
    <DialogRoot open={isOpen} onOpenChange={onClose}>
      <Dialog onClose={onClose}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="p-6"
        >
          <DialogTitle>
            <div className="flex items-center gap-3">
              <div className="i-ph:github-logo-bold text-2xl text-bolt-elements-textPrimary" />
              <span className="text-xl font-semibold text-bolt-elements-textPrimary">Create GitHub Repository</span>
            </div>
          </DialogTitle>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-6">
            {/* Repository Name */}
            <div>
              <label htmlFor="repoName" className="block text-sm font-medium text-bolt-elements-textSecondary mb-2">
                Repository Name
              </label>
              <div className="relative">
                <input
                  id="repoName"
                  type="text"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  className={classNames(
                    'w-full px-4 py-2.5 bg-bolt-elements-background-depth-1 border rounded-lg',
                    'text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary text-base',
                    'transition-all duration-200',
                    isValidRepoName
                      ? 'border-green-500 focus:ring-2 focus:ring-green-500/50'
                      : 'border-bolt-elements-borderColor focus:ring-2 focus:ring-bolt-elements-accent/50 focus:border-bolt-elements-accent',
                  )}
                  placeholder="e.g., my-awesome-project"
                  autoFocus
                />
                {repoName && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={classNames(
                      'absolute right-3 top-1/2 -translate-y-1/2',
                      isValidRepoName ? 'text-green-500' : 'text-red-500',
                    )}
                  >
                    <div
                      className={isValidRepoName ? 'i-ph:check-circle-bold text-xl' : 'i-ph:warning-circle text-xl'}
                    />
                  </motion.div>
                )}
              </div>
              <p className="mt-2.5 text-sm text-bolt-elements-textTertiary">
                Choose a unique name for your repository. It can contain letters, numbers, hyphens, and underscores.
              </p>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-bolt-elements-textSecondary mb-2">
                Description <span className="text-bolt-elements-textTertiary">(optional)</span>
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className={classNames(
                  'w-full px-4 py-2.5 bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-lg',
                  'text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary text-base resize-none',
                  'focus:outline-none focus:ring-2 focus:ring-bolt-elements-accent/50 focus:border-bolt-elements-accent',
                  'transition-all duration-200',
                )}
                placeholder="A short description of your repository"
              />
            </div>

            {/* Privacy Setting */}
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

            <div className="flex justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={onClose}
                className={classNames(
                  styles['settings-button'],
                  'hover:bg-bolt-elements-button-primary-backgroundHover transition-all duration-200',
                )}
              >
                Cancel
              </button>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={classNames(
                  styles['settings-button'],
                  'bg-bolt-elements-accent hover:bg-bolt-elements-accent/90 text-white flex items-center gap-2',
                  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-bolt-elements-accent',
                  'transition-all duration-200 shadow-sm',
                )}
                disabled={!isValidRepoName}
              >
                <div className="i-ph:git-branch text-lg" />
                Create Repository
              </motion.button>
            </div>
          </form>
        </motion.div>
      </Dialog>
    </DialogRoot>
  );
}
