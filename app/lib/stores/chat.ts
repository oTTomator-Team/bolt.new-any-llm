import { map } from 'nanostores';
import type { Message } from 'ai';

interface ChatStore {
  started: boolean;
  aborted: boolean;
  showChat: boolean;
  messages: Message[];
  title: string;
}

export const chatStore = map<ChatStore>({
  started: false,
  aborted: false,
  showChat: true,
  messages: [] as Message[],
  title: '',
});

export function updateChatMessages(messages: Message[]) {
  chatStore.setKey('messages', messages);
}
