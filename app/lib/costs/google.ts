import type { ProviderPricing, PricingMetadata } from './types';

export const googleMetadata: PricingMetadata = {
  currency: 'USD',
  unit: '1K tokens',
  description: 'Google Gemini models pricing',
};

export const googlePricing: ProviderPricing = {
  'gemini-1.5-flash-latest': {
    prompt: 0.0005,
    completion: 0.0015,
  },
  'gemini-2.0-flash-exp': {
    prompt: 0.001,
    completion: 0.003,
  },
  'gemini-1.5-flash-002': {
    prompt: 0.0005,
    completion: 0.0015,
  },
  'gemini-1.5-flash-8b': {
    prompt: 0.0005,
    completion: 0.0015,
  },
  'gemini-1.5-pro-latest': {
    prompt: 0.001,
    completion: 0.002,
  },
  'gemini-1.5-pro-002': {
    prompt: 0.001,
    completion: 0.002,
  },
  'gemini-exp-1206': {
    prompt: 0.001,
    completion: 0.002,
  },
} as const;
