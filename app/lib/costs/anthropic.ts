import type { ProviderPricing, PricingMetadata } from './types';

export const anthropicMetadata: PricingMetadata = {
  currency: 'USD',
  unit: '1K tokens',
  description: 'Anthropic Claude models pricing',
};

export const anthropicPricing: ProviderPricing = {
  'claude-3-5-sonnet-latest': {
    prompt: 0.003,
    completion: 0.015,
  },
  'claude-3-5-sonnet-20240620': {
    prompt: 0.003,
    completion: 0.015,
  },
  'claude-3-5-haiku-latest': {
    prompt: 0.0025,
    completion: 0.0125,
  },
  'claude-3-opus-latest': {
    prompt: 0.015,
    completion: 0.075,
  },
  'claude-3-sonnet-20240229': {
    prompt: 0.003,
    completion: 0.015,
  },
  'claude-3-haiku-20240307': {
    prompt: 0.0025,
    completion: 0.0125,
  },
} as const;
