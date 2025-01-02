import type { ProviderPricing, PricingMetadata } from './types';

export const openrouterMetadata: PricingMetadata = {
  currency: 'USD',
  unit: '1K tokens',
  description: 'OpenRouter models pricing',
};

export const openrouterPricing: ProviderPricing = {
  'anthropic/claude-3.5-sonnet': {
    prompt: 0.003,
    completion: 0.015,
  },
  'anthropic/claude-3-haiku': {
    prompt: 0.0025,
    completion: 0.0125,
  },
  'deepseek/deepseek-coder': {
    prompt: 0.0008,
    completion: 0.0016,
  },
  'google/gemini-flash-1.5': {
    prompt: 0.0005,
    completion: 0.0015,
  },
  'google/gemini-pro-1.5': {
    prompt: 0.001,
    completion: 0.002,
  },
  'x-ai/grok-beta': {
    prompt: 0.002,
    completion: 0.006,
  },
  'mistralai/mistral-nemo': {
    prompt: 0.0002,
    completion: 0.0006,
  },
  'qwen/qwen-110b-chat': {
    prompt: 0.001,
    completion: 0.002,
  },
  'cohere/command': {
    prompt: 0.0015,
    completion: 0.003,
  },
} as const;
