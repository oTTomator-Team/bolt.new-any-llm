import type { Message } from 'ai';

export interface TokenUsageStatsProps {
  messages: Message[];
}

export interface TokenUsage {
  completionTokens: number;
  promptTokens: number;
  totalTokens: number;
  model?: string;
  provider?: string;
}

export interface ModelUsage {
  model: string;
  provider: string;
  completionTokens: number;
  promptTokens: number;
  totalTokens: number;
  count: number;
}

export interface UsageAnnotation {
  type: 'usage';
  value: TokenUsage;
}

export interface ModelAnnotation {
  type: 'model';
  value: string;
}

export interface PricingInfo {
  prompt?: number;
  completion?: number;
}
