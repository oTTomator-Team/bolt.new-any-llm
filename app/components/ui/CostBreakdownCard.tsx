import React from 'react';
import type { ModelUsage } from '~/types/token-usage';
import { getModelPrice } from '~/lib/costs';

interface CostBreakdownCardProps {
  usage: ModelUsage;
}

function calculateModelCost(usage: ModelUsage) {
  const pricing = getModelPrice(usage.provider, usage.model);

  if (!pricing) {
    return { promptCost: 0, completionCost: 0, totalCost: 0 };
  }

  const promptCost = (usage.promptTokens * pricing.prompt) / 1000;
  const completionCost = (usage.completionTokens * pricing.completion) / 1000;
  const totalCost = promptCost + completionCost;

  return { promptCost, completionCost, totalCost };
}

export function CostBreakdownCard({ usage }: CostBreakdownCardProps) {
  const { promptCost, completionCost, totalCost } = calculateModelCost(usage);

  return (
    <div className="rounded-lg border border-bolt-elements-borderPrimary bg-bolt-elements-surfacePrimary p-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-medium">{usage.model}</span>
            <span className="text-sm text-bolt-elements-textSecondary">{usage.provider}</span>
          </div>
          <span className="font-medium">${totalCost.toFixed(4)}</span>
        </div>
        <div className="flex flex-col gap-1 text-sm text-bolt-elements-textSecondary">
          <div className="flex justify-between">
            <span>Prompt Cost ({usage.promptTokens.toLocaleString()} tokens)</span>
            <span>${promptCost.toFixed(4)}</span>
          </div>
          <div className="flex justify-between">
            <span>Completion Cost ({usage.completionTokens.toLocaleString()} tokens)</span>
            <span>${completionCost.toFixed(4)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
