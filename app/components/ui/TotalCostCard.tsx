import React from 'react';
import type { ModelUsage } from '~/types/token-usage';
import { getModelPrice } from '~/lib/costs';

interface TotalCostCardProps {
  usage: ModelUsage;
}

function calculateTotalCost(usage: ModelUsage): number {
  const pricing = getModelPrice(usage.provider, usage.model);

  if (!pricing) {
    console.warn(`No pricing found for model ${usage.model} from provider ${usage.provider}`);
    return 0;
  }

  const promptCost = (usage.promptTokens * pricing.prompt) / 1000;
  const completionCost = (usage.completionTokens * pricing.completion) / 1000;
  const totalCost = promptCost + completionCost;

  return totalCost < 0 ? 0 : totalCost;
}

export function TotalCostCard({ usage }: TotalCostCardProps) {
  const totalCost = calculateTotalCost(usage);
  const totalTokens = usage.promptTokens + usage.completionTokens;

  return (
    <div className="rounded-lg border border-bolt-elements-borderPrimary bg-bolt-elements-surfacePrimary p-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-lg font-semibold">Total Cost</span>
          <span className="text-sm text-bolt-elements-textSecondary">{totalTokens.toLocaleString()} total tokens</span>
        </div>
        <span className="text-lg font-semibold">${totalCost.toFixed(4)}</span>
      </div>
    </div>
  );
}
