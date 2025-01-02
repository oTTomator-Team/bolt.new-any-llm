import type { ProviderPricing, PricingMetadata } from './types';

export const xiaMetadata: PricingMetadata = {
  currency: 'USD',
  unit: '1K tokens',
  description: 'Xia AI models pricing',
};

export const xiaPricing: ProviderPricing = {
  'xia-chat': {
    prompt: 0.0015, // $0.0015 per 1K tokens for prompt
    completion: 0.002, // $0.002 per 1K tokens for completion
  },
  'xia-code': {
    prompt: 0.002, // $0.002 per 1K tokens for prompt
    completion: 0.0025, // $0.0025 per 1K tokens for completion
  },
  'xia-vision': {
    prompt: 0.003, // $0.003 per 1K tokens for prompt
    completion: 0.004, // $0.004 per 1K tokens for completion
  },
} as const;
