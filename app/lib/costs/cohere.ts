import type { ProviderPricing, PricingMetadata } from './types';

export const cohereMetadata: PricingMetadata = {
  currency: 'USD',
  unit: '1K tokens',
  description: 'Cohere models pricing',
};

export const coherePricing: ProviderPricing = {
  'command-r-plus-08-2024': {
    prompt: 0.015,
    completion: 0.03,
  },
  'command-r-08-2024': {
    prompt: 0.01,
    completion: 0.02,
  },
  'command-r-plus': {
    prompt: 0.015,
    completion: 0.03,
  },
  'command-r': {
    prompt: 0.01,
    completion: 0.02,
  },
  command: {
    prompt: 0.0015,
    completion: 0.003,
  },
  'command-nightly': {
    prompt: 0.0015,
    completion: 0.003,
  },
  'command-light': {
    prompt: 0.0003,
    completion: 0.0006,
  },
  'command-light-nightly': {
    prompt: 0.0003,
    completion: 0.0006,
  },
  'c4ai-aya-expanse-8b': {
    prompt: 0.0005,
    completion: 0.001,
  },
  'c4ai-aya-expanse-32b': {
    prompt: 0.001,
    completion: 0.002,
  },
} as const;
