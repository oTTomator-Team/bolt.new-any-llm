import { Dialog, DialogRoot, DialogTitle } from '~/components/ui/Dialog';
import { useState } from 'react';

interface GitHubCredentialsDialogProps {
  _isOpen: boolean;
  onClose: () => void;
  onSubmit: (username: string, token: string) => void;
}

export function GitHubCredentialsDialog({ _isOpen, onClose, onSubmit }: GitHubCredentialsDialogProps) {
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(username, token);
  };

  return (
    <DialogRoot open={true} onOpenChange={onClose}>
      <Dialog onClose={onClose}>
        <div className="p-6">
          <DialogTitle>
            <div className="flex items-center gap-3">
              <div className="i-ph:github-logo-bold text-xl" />
              <span>GitHub Credentials</span>
            </div>
          </DialogTitle>
          <form onSubmit={handleSubmit} className="mt-4">
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-bolt-elements-textSecondary mb-2">
                  GitHub Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-lg 
                    text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary
                    focus:outline-none focus:ring-2 focus:ring-bolt-elements-accent/50 focus:border-bolt-elements-accent
                    transition-colors"
                  placeholder="e.g., octocat"
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="token" className="block text-sm font-medium text-bolt-elements-textSecondary mb-2">
                  Personal Access Token
                </label>
                <input
                  id="token"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full px-3 py-2 bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-lg 
                    text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary
                    focus:outline-none focus:ring-2 focus:ring-bolt-elements-accent/50 focus:border-bolt-elements-accent
                    transition-colors"
                  placeholder="ghp_xxxxxxxxxxxx"
                />
                <p className="mt-2 text-xs text-bolt-elements-textTertiary">
                  You can generate a new token in your{' '}
                  <a
                    href="https://github.com/settings/tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-bolt-elements-accent hover:underline"
                  >
                    GitHub Settings
                  </a>
                  . Make sure it has the required scopes.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-bolt-elements-textSecondary 
                  hover:text-bolt-elements-textPrimary transition-colors rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-bolt-elements-accent 
                  hover:bg-bolt-elements-accent/90 transition-colors rounded-lg
                  disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!username.trim() || !token.trim()}
              >
                Connect
              </button>
            </div>
          </form>
        </div>
      </Dialog>
    </DialogRoot>
  );
}
