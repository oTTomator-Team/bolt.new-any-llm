import type { ProviderPricing, PricingMetadata } from './types';

export const groqMetadata: PricingMetadata = {
  currency: 'USD',
  unit: '1K tokens',
  description: 'Groq models pricing',
};

export const groqPricing: ProviderPricing = {
  'llama-3.1-8b-instant': {
    prompt: 0.0001,
    completion: 0.0002,
  },
  'llama-3.2-11b-vision-preview': {
    prompt: 0.0002,
    completion: 0.0004,
  },
  'llama-3.2-90b-vision-preview': {
    prompt: 0.001,
    completion: 0.002,
  },
  'llama-3.2-3b-preview': {
    prompt: 0.00005,
    completion: 0.0001,
  },
  'llama-3.2-1b-preview': {
    prompt: 0.00003,
    completion: 0.00006,
  },
  'llama-3.3-70b-versatile': {
    prompt: 0.0008,
    completion: 0.0016,
  },
} as const;
