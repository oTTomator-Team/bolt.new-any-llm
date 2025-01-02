export interface ModelPricing {
  prompt: number; // Cost per 1K tokens
  completion: number; // Cost per 1K tokens
}

export interface ProviderPricing {
  [modelName: string]: ModelPricing;
}

export interface PricingMetadata {
  currency: string;
  unit: string;
  description?: string;
}
