import { ChatMessage } from './index';

export type ChatRole = 'user' | 'assistant' | 'sage';

export interface ChatSession {
  sessionId: string;
  messages: ChatMessage[];
  lastUpdated: string;
}
