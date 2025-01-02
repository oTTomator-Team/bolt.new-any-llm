import React, { useState, useEffect } from 'react';
import { Dialog, DialogRoot } from '~/components/ui/Dialog';
import { allProviderPricing, providerMetadata } from '~/lib/costs';
import type { ModelPricing } from '~/lib/costs/types';
import { openDatabase, setPricing, getPricing, clearAllPricing } from '~/lib/persistence/db';
import { ArrowPathIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import styles from '~/components/settings/Settings.module.scss';

interface TokenUsageSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  writeMode?: boolean;
}

type PricingState = Record<string, Record<string, ModelPricing>>;

export function TokenUsageSettingsModal({ open, onOpenChange, writeMode = false }: TokenUsageSettingsModalProps) {
  const [localPricing, setLocalPricing] = useState<PricingState>(() => JSON.parse(JSON.stringify(allProviderPricing)));
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load custom pricing from IndexedDB when modal opens
  useEffect(() => {
    if (open) {
      const loadCustomPricing = async () => {
        console.log('Loading custom pricing...');

        try {
          const db = await openDatabase();

          if (!db) {
            console.error('Database not available');
            return;
          }

          // Start with default pricing
          const pricing = JSON.parse(JSON.stringify(allProviderPricing));
          console.log('Default pricing loaded:', pricing);

          // Load and apply any custom pricing
          for (const provider of Object.keys(pricing)) {
            const customPricing = await getPricing(db, provider);
            console.log(`Custom pricing for ${provider}:`, customPricing);

            if (customPricing) {
              pricing[provider] = customPricing;
              console.log(`Applied custom pricing for ${provider}`);
            }
          }

          setLocalPricing(pricing);
          setHasUnsavedChanges(false);
          setError(null);
          console.log('Final pricing state:', pricing);
        } catch (err) {
          console.error('Error loading custom pricing:', err);
          setError('Failed to load custom pricing');
        }
      };

      loadCustomPricing();
    }
  }, [open]);

  // Clear success message after 3 seconds
  // eslint-disable-next-line consistent-return
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handlePriceChange = (provider: string, model: string, type: keyof ModelPricing, value: string): void => {
    const newPrice = parseFloat(value);

    if (isNaN(newPrice) || newPrice < 0) {
      return;
    }

    setLocalPricing((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        [model]: {
          ...prev[provider][model],
          [type]: newPrice,
        },
      },
    }));
    setHasUnsavedChanges(true);
    setError(null);
    setSuccessMessage(null);
  };

  const resetToDefaults = async () => {
    try {
      setIsSaving(true);

      const db = await openDatabase();

      if (!db) {
        throw new Error('Database not available');
      }

      // Clear all custom pricing from the database
      await clearAllPricing(db);

      // Reset local state to default pricing
      const defaultPricing = JSON.parse(JSON.stringify(allProviderPricing));
      setLocalPricing(defaultPricing);
      setHasUnsavedChanges(false);
      setSuccessMessage('Reset to default values successfully');
    } catch (err) {
      console.error('Error resetting to defaults:', err);
      setError('Failed to reset to defaults');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    console.log('Starting save operation...');
    setError(null);
    setSuccessMessage(null);
    setIsSaving(true);

    try {
      const db = await openDatabase();

      if (!db) {
        throw new Error('Database not available');
      }

      console.log('Saving pricing data:', localPricing);

      // Save each provider's pricing to IndexedDB
      await Promise.all(
        Object.entries(localPricing).map(([provider, pricing]) => {
          console.log(`Saving pricing for ${provider}:`, pricing);
          return setPricing(db, provider, pricing);
        }),
      );

      setHasUnsavedChanges(false);
      setSuccessMessage('Changes saved successfully');
      console.log('Save operation complete');
    } catch (error) {
      console.error('Error saving pricing changes:', error);
      setError(error instanceof Error ? error.message : 'Failed to save changes');
    }

    setIsSaving(false);
  };

  const getProviderIcon = (provider: string) => {
    const iconMap: Record<string, string> = {
      XAI: 'xAI',
    };

    const iconName = iconMap[provider] || provider;

    return `/icons/${iconName}.svg`;
  };

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <Dialog className="min-w-[600px] min-h-[400px] w-[50vw] h-[70vh] max-w-[900px] max-h-[800px]">
        <div className="p-8 h-full w-full overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold">Token Cost Settings</h2>
              {writeMode && (
                <p className="text-sm text-bolt-elements-textSecondary mt-1">
                  Changes will be saved to the cost configuration files
                </p>
              )}
              {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
              {successMessage && <p className="text-sm text-green-500 mt-1">{successMessage}</p>}
            </div>
            <div className="flex gap-3">
              <button
                onClick={resetToDefaults}
                disabled={isSaving}
                className={`w-32 px-4 py-2 text-sm rounded-lg transition-all flex items-center justify-center gap-2 ${styles['settings-button']}`}
              >
                <ArrowPathIcon className="w-4 h-4" />
                Reset
              </button>
              {hasUnsavedChanges && (
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`w-32 px-4 py-2 text-sm rounded-lg transition-all flex items-center justify-center gap-2 ${styles['settings-button']}`}
                >
                  {isSaving ? (
                    <>
                      <span className="animate-spin">↻</span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      Save
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          <div className="space-y-8">
            {Object.entries(localPricing).map(([provider, models]) => {
              const metadata = providerMetadata[provider];
              return (
                <div key={provider} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={getProviderIcon(provider)}
                      alt={`${provider} icon`}
                      width={24}
                      height={24}
                      className="rounded"
                    />
                    <h3 className="text-lg font-medium">{provider}</h3>
                    <span className="text-sm text-bolt-elements-textSecondary">
                      ({metadata?.currency || 'USD'} per {metadata?.unit || '1K tokens'})
                    </span>
                  </div>
                  <div className="grid gap-4">
                    {Object.entries(models).map(([model, config]) => (
                      <div key={model} className="grid grid-cols-3 gap-6 items-center">
                        <label className="text-sm text-bolt-elements-textSecondary pl-9">{model}</label>
                        <div className="space-y-1">
                          <label className="block text-xs text-bolt-elements-textSecondary">Prompt Cost</label>
                          <input
                            type="number"
                            value={config.prompt}
                            onChange={(e) => handlePriceChange(provider, model, 'prompt', e.target.value)}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-bolt-elements-item-backgroundActive"
                            step="0.000001"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs text-bolt-elements-textSecondary">Completion Cost</label>
                          <input
                            type="number"
                            value={config.completion}
                            onChange={(e) => handlePriceChange(provider, model, 'completion', e.target.value)}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-bolt-elements-item-backgroundActive"
                            step="0.000001"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex justify-between">
            <button
              onClick={resetToDefaults}
              disabled={isSaving}
              className={`w-32 px-4 py-2 text-sm rounded-lg transition-all flex items-center justify-center gap-2 ${styles['settings-button']}`}
            >
              <ArrowPathIcon className="w-4 h-4" />
              Reset
            </button>
            <button
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Dialog>
    </DialogRoot>
  );
}
