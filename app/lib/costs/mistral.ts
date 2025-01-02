import type { ProviderPricing, PricingMetadata } from './types';

export const mistralMetadata: PricingMetadata = {
  currency: 'USD',
  unit: '1K tokens',
  description: 'Mistral AI models pricing',
};

export const mistralPricing: ProviderPricing = {
  'open-mistral-7b': {
    prompt: 0.0002,
    completion: 0.0006,
  },
  'open-mixtral-8x7b': {
    prompt: 0.0003,
    completion: 0.0009,
  },
} as const;
