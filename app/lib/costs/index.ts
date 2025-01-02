export * from './types';

import { anthropicPricing, anthropicMetadata } from './anthropic';
import { openaiPricing, openaiMetadata } from './openai';
import { googlePricing, googleMetadata } from './google';
import { mistralPricing, mistralMetadata } from './mistral';
import { coherePricing, cohereMetadata } from './cohere';
import { openrouterPricing, openrouterMetadata } from './openrouter';
import { groqPricing, groqMetadata } from './groq';
import type { ProviderPricing, PricingMetadata } from './types';

export {
  anthropicPricing,
  openaiPricing,
  googlePricing,
  mistralPricing,
  coherePricing,
  openrouterPricing,
  groqPricing,
};

export const providerMetadata: Record<string, PricingMetadata> = {
  Anthropic: anthropicMetadata,
  OpenAI: openaiMetadata,
  Google: googleMetadata,
  Mistral: mistralMetadata,
  Cohere: cohereMetadata,
  OpenRouter: openrouterMetadata,
  Groq: groqMetadata,
} as const;

export const allProviderPricing: Record<string, ProviderPricing> = {
  Anthropic: anthropicPricing,
  OpenAI: openaiPricing,
  Google: googlePricing,
  Mistral: mistralPricing,
  Cohere: coherePricing,
  OpenRouter: openrouterPricing,
  Groq: groqPricing,
} as const;

// Providers that need prefix matching due to version suffixes
const PREFIX_MATCHING_PROVIDERS = new Set(['Google', 'Groq']);

function findMatchingModel(provider: string, pricing: ProviderPricing, model: string): string | undefined {
  // First try exact match
  if (pricing[model]) {
    return model;
  }

  // Only do prefix matching for specific providers
  if (PREFIX_MATCHING_PROVIDERS.has(provider)) {
    const modelKeys = Object.keys(pricing);
    return modelKeys.find((key) => key.startsWith(model));
  }

  return undefined;
}

export function getModelPrice(provider: string, model: string) {
  const pricing = allProviderPricing[provider];

  if (!pricing) {
    return undefined;
  }

  const matchingModel = findMatchingModel(provider, pricing, model);

  return matchingModel ? pricing[matchingModel] : undefined;
}
