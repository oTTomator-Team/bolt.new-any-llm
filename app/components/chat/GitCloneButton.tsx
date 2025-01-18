import ignore from 'ignore';
import { useGit } from '~/lib/hooks/useGit';
import type { Message } from 'ai';
import { detectProjectCommands, createCommandsMessage } from '~/utils/projectCommands';
import { generateId } from '~/utils/fileUtils';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { LoadingOverlay } from '~/components/ui/LoadingOverlay';
import * as RadixDialog from '@radix-ui/react-dialog';

const IGNORE_PATTERNS = [
  'node_modules/**',
  '.git/**',
  '.github/**',
  '.vscode/**',
  '**/*.jpg',
  '**/*.jpeg',
  '**/*.png',
  'dist/**',
  'build/**',
  '.next/**',
  'coverage/**',
  '.cache/**',
  '.vscode/**',
  '.idea/**',
  '**/*.log',
  '**/.DS_Store',
  '**/npm-debug.log*',
  '**/yarn-debug.log*',
  '**/yarn-error.log*',
  '**/*lock.json',
  '**/*lock.yaml',
];

const ig = ignore().add(IGNORE_PATTERNS);

interface GitCloneButtonProps {
  className?: string;
  importChat?: (description: string, messages: Message[]) => Promise<void>;
}

export default function GitCloneButton({ importChat }: GitCloneButtonProps) {
  const { ready, gitClone } = useGit();
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');

  const handleClone = async () => {
    if (!ready || !repoUrl) {
      return;
    }

    setIsOpen(false);
    setLoading(true);

    try {
      const { workdir, data } = await gitClone(repoUrl);

      if (importChat) {
        const filePaths = Object.keys(data).filter((filePath) => !ig.ignores(filePath));
        const textDecoder = new TextDecoder('utf-8');

        const fileContents = filePaths
          .map((filePath) => {
            const { data: content, encoding } = data[filePath];
            return {
              path: filePath,
              content: encoding === 'utf8' ? content : content instanceof Uint8Array ? textDecoder.decode(content) : '',
            };
          })
          .filter((f) => f.content);

        const commands = await detectProjectCommands(fileContents);
        const commandsMessage = createCommandsMessage(commands);

        const filesMessage: Message = {
          role: 'assistant',
          content: `Cloning the repo ${repoUrl} into ${workdir}
<boltArtifact id="imported-files" title="Git Cloned Files" type="bundled">
${fileContents
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

        await importChat(`Git Project:${repoUrl.split('/').slice(-1)[0]}`, messages);
      }
    } catch (error) {
      console.error('Error during import:', error);
      toast.error('Failed to import repository');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <RadixDialog.Root open={isOpen} onOpenChange={setIsOpen}>
        <RadixDialog.Trigger asChild>
          <button
            title="Clone a Git Repo"
            className="px-4 py-2 rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-prompt-background text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-3 transition-all flex items-center gap-2"
          >
            <span className="i-ph:git-branch" />
            Clone a Git Repo
          </button>
        </RadixDialog.Trigger>

        <RadixDialog.Portal>
          <div className="fixed inset-0 z-50">
            {/* Backdrop with stronger blur effect */}
            <RadixDialog.Overlay className="fixed inset-0 bg-black/30">
              <div className="absolute inset-0 backdrop-blur-sm" />
            </RadixDialog.Overlay>

            {/* Dialog Content */}
            <RadixDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[370px] bg-white rounded-xl shadow-lg overflow-hidden">
              {/* Gradient Background Effects */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[328px] h-[87px] bg-[#A285FE] rounded-full blur-[160px] opacity-100" />
              <div className="absolute -left-[46px] -top-[45px] w-[178px] h-[158px] rounded-full bg-gradient-to-br from-[#DF52DF] to-[#480876] blur-[100px] opacity-70" />

              {/* Content Container */}
              <div className="relative h-full flex flex-col p-8">
                {/* Header with GitHub Icon */}
                <div className="flex flex-col items-center mb-8">
                  <h2 className="text-xl font-semibold text-black mb-6">Clone A Git Repo</h2>
                  <div className="w-[90px] h-[90px] ">
                    <img src="/github-mark.svg" alt="GitHub Logo" className="w-full h-full" />
                  </div>
                </div>

                {/* Input Field */}
                <div>
                  <input
                    type="text"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="Enter Git repository URL"
                    className="mt-4 w-full h-12 px-4 rounded-md border border-[#DFDFDF] bg-white text-black placeholder-[#ABABAB] focus:outline-none focus:ring-2 focus:ring-[#A285FE] focus:border-transparent"
                  />
                </div>

                {/* Clone Button */}
                <div className="mt-6">
                  <button
                    onClick={handleClone}
                    disabled={!repoUrl}
                    className="w-full h-12 rounded-md bg-[#F0EEFC] text-[#9C7DFF] font-medium hover:bg-[#E6E3F9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Clone
                  </button>
                </div>

                {/* Close Button */}
                <RadixDialog.Close asChild>
                  <button
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 focus:outline-none"
                    aria-label="Close"
                  >
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                        fill="currentColor"
                        fillRule="evenodd"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </RadixDialog.Close>
              </div>
            </RadixDialog.Content>
          </div>
        </RadixDialog.Portal>
      </RadixDialog.Root>

      {loading && <LoadingOverlay message="Please wait while we clone the repository..." />}
    </>
  );
}
