import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { useState } from 'react';
import { chatStore } from '~/lib/stores/chat';
import { classNames } from '~/utils/classNames';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';
import { ChatDetailsButton } from '~/components/chat/chat-details-button';
import { ChatDetailsSidebar } from '~/components/chat/chat-details-sidebar';

export function Header() {
  const chat = useStore(chatStore);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <>
      <header
        className={classNames('flex items-center p-5 border-b h-[var(--header-height)]', {
          'border-transparent': !chat.started,
          'border-bolt-elements-borderColor': chat.started,
        })}
      >
        <div className="flex items-center gap-2 z-logo text-bolt-elements-textPrimary cursor-pointer">
          <div className="i-ph:sidebar-simple-duotone text-xl" />
          <a href="/" className="text-2xl font-semibold text-accent flex items-center">
            {/* <span className="i-bolt:logo-text?mask w-[46px] inline-block" /> */}
            <img src="/logo-light-styled.png" alt="logo" className="w-[90px] inline-block dark:hidden" />
            <img src="/logo-dark-styled.png" alt="logo" className="w-[90px] inline-block hidden dark:block" />
          </a>
        </div>
        {chat.started && (
          <>
            <span className="flex-1 px-4 truncate text-center text-bolt-elements-textPrimary">
              <ClientOnly>{() => <ChatDescription />}</ClientOnly>
            </span>
            <ClientOnly>
              {() => (
                <div className="flex items-center gap-4 mr-1">
                  <ChatDetailsButton onClick={() => setIsSidebarOpen(true)} />
                  <HeaderActionButtons />
                </div>
              )}
            </ClientOnly>
          </>
        )}
      </header>
      <ClientOnly>
        {() => <ChatDetailsSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />}
      </ClientOnly>
    </>
  );
}
