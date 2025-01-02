import type { ProviderPricing, PricingMetadata } from './types';

export const openaiMetadata: PricingMetadata = {
  currency: 'USD',
  unit: '1K tokens',
  description: 'OpenAI models pricing',
};

export const openaiPricing: ProviderPricing = {
  'gpt-4o': {
    prompt: 0.03,
    completion: 0.06,
  },
} as const;
