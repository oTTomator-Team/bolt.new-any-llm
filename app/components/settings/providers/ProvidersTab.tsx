import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Switch } from '~/components/ui/Switch';
import Separator from '~/components/ui/Separator';
import { useSettings } from '~/lib/hooks/useSettings';
import { LOCAL_PROVIDERS, URL_CONFIGURABLE_PROVIDERS } from '~/lib/stores/settings';
import type { IProviderConfig } from '~/types/model';
import { logStore } from '~/lib/stores/logs';
import { motion } from 'framer-motion';
import { classNames } from '~/utils/classNames';
import { settingsStyles } from '~/components/settings/settings.styles';
import { toast } from 'react-toastify';
import { providerBaseUrlEnvKeys } from '~/utils/constants';
import { SiAmazon, SiOpenai, SiGoogle, SiHuggingface, SiPerplexity } from 'react-icons/si';
import { BsRobot, BsCloud, BsCodeSquare, BsCpu, BsBox } from 'react-icons/bs';
import { TbBrandOpenai, TbBrain, TbCloudComputing } from 'react-icons/tb';
import { BiCodeBlock, BiChip } from 'react-icons/bi';
import { FaCloud, FaBrain } from 'react-icons/fa';
import type { IconType } from 'react-icons';
import OllamaModelUpdater from './OllamaModelUpdater';
import { DialogRoot, Dialog } from '~/components/ui/Dialog';

// Add type for provider names to ensure type safety
type ProviderName =
  | 'AmazonBedrock'
  | 'Anthropic'
  | 'Cohere'
  | 'Deepseek'
  | 'Google'
  | 'Groq'
  | 'HuggingFace'
  | 'Hyperbolic'
  | 'LMStudio'
  | 'Mistral'
  | 'Ollama'
  | 'OpenAI'
  | 'OpenAILike'
  | 'OpenRouter'
  | 'Perplexity'
  | 'Together'
  | 'XAI';

// Update the PROVIDER_ICONS type to use the ProviderName type
const PROVIDER_ICONS: Record<ProviderName, IconType> = {
  AmazonBedrock: SiAmazon,
  Anthropic: FaBrain,
  Cohere: BiChip,
  Deepseek: BiCodeBlock,
  Google: SiGoogle,
  Groq: BsCpu,
  HuggingFace: SiHuggingface,
  Hyperbolic: TbCloudComputing,
  LMStudio: BsCodeSquare,
  Mistral: TbBrain,
  Ollama: BsBox,
  OpenAI: SiOpenai,
  OpenAILike: TbBrandOpenai,
  OpenRouter: FaCloud,
  Perplexity: SiPerplexity,
  Together: BsCloud,
  XAI: BsRobot,
};

// Update PROVIDER_DESCRIPTIONS to use the same type
const PROVIDER_DESCRIPTIONS: Partial<Record<ProviderName, string>> = {
  OpenAI: 'Use GPT-4, GPT-3.5, and other OpenAI models',
  Anthropic: 'Access Claude and other Anthropic models',
  Ollama: 'Run open-source models locally on your machine',
  LMStudio: 'Local model inference with LM Studio',
  OpenAILike: 'Connect to OpenAI-compatible API endpoints',
};

// Add these types and helper functions
type ProviderCategory = 'cloud' | 'local';

interface ProviderGroup {
  title: string;
  description: string;
  icon: string;
  providers: IProviderConfig[];
}

// Add this type
interface CategoryToggleState {
  cloud: boolean;
  local: boolean;
}

export default function ProvidersTab() {
  const { providers, updateProviderSettings, isLocalModel } = useSettings();
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [filteredProviders, setFilteredProviders] = useState<IProviderConfig[]>([]);
  const [categoryEnabled, setCategoryEnabled] = useState<CategoryToggleState>({
    cloud: false,
    local: false,
  });
  const [showOllamaUpdater, setShowOllamaUpdater] = useState(false);

  // Group providers by category
  const groupedProviders = useMemo(() => {
    const groups: Record<ProviderCategory, ProviderGroup> = {
      cloud: {
        title: 'Cloud Providers',
        description: 'AI models hosted on cloud platforms',
        icon: 'i-ph:cloud-duotone',
        providers: [],
      },
      local: {
        title: 'Local Providers',
        description: 'Run models locally on your machine',
        icon: 'i-ph:desktop-duotone',
        providers: [],
      },
    };

    filteredProviders.forEach((provider) => {
      const category: ProviderCategory = LOCAL_PROVIDERS.includes(provider.name) ? 'local' : 'cloud';
      groups[category].providers.push(provider);
    });

    return groups;
  }, [filteredProviders]);

  // Update the toggle handler
  const handleToggleCategory = useCallback(
    (category: ProviderCategory, enabled: boolean) => {
      setCategoryEnabled((prev) => ({ ...prev, [category]: enabled }));

      // Get providers for this category
      const categoryProviders = groupedProviders[category].providers;
      categoryProviders.forEach((provider) => {
        updateProviderSettings(provider.name, { ...provider.settings, enabled });
      });

      toast.success(enabled ? `All ${category} providers enabled` : `All ${category} providers disabled`);
    },
    [groupedProviders, updateProviderSettings],
  );

  // Add effect to update category toggle states based on provider states
  useEffect(() => {
    const newCategoryState = {
      cloud: groupedProviders.cloud.providers.every((p) => p.settings.enabled),
      local: groupedProviders.local.providers.every((p) => p.settings.enabled),
    };
    setCategoryEnabled(newCategoryState);
  }, [groupedProviders]);

  // Effect to filter and sort providers
  useEffect(() => {
    let newFilteredProviders: IProviderConfig[] = Object.entries(providers).map(([key, value]) => ({
      ...value,
      name: key,
    }));

    if (!isLocalModel) {
      newFilteredProviders = newFilteredProviders.filter((provider) => !LOCAL_PROVIDERS.includes(provider.name));
    }

    newFilteredProviders.sort((a, b) => a.name.localeCompare(b.name));

    // Split providers into regular and URL-configurable
    const regular = newFilteredProviders.filter((p) => !URL_CONFIGURABLE_PROVIDERS.includes(p.name));
    const urlConfigurable = newFilteredProviders.filter((p) => URL_CONFIGURABLE_PROVIDERS.includes(p.name));

    setFilteredProviders([...regular, ...urlConfigurable]);
  }, [providers, isLocalModel]);

  const handleToggleProvider = (provider: IProviderConfig, enabled: boolean) => {
    updateProviderSettings(provider.name, { ...provider.settings, enabled });

    if (enabled) {
      logStore.logProvider(`Provider ${provider.name} enabled`, { provider: provider.name });
      toast.success(`${provider.name} enabled`);
    } else {
      logStore.logProvider(`Provider ${provider.name} disabled`, { provider: provider.name });
      toast.success(`${provider.name} disabled`);
    }
  };

  const handleUpdateBaseUrl = (provider: IProviderConfig, baseUrl: string) => {
    let newBaseUrl: string | undefined = baseUrl;

    if (newBaseUrl && newBaseUrl.trim().length === 0) {
      newBaseUrl = undefined;
    }

    updateProviderSettings(provider.name, { ...provider.settings, baseUrl: newBaseUrl });
    logStore.logProvider(`Base URL updated for ${provider.name}`, {
      provider: provider.name,
      baseUrl: newBaseUrl,
    });
    toast.success(`${provider.name} base URL updated`);
    setEditingProvider(null);
  };

  return (
    <div className="space-y-6">
      {Object.entries(groupedProviders).map(([category, group]) => (
        <motion.div
          key={category}
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between gap-4 mt-8 mb-4">
            <div className="flex items-center gap-2">
              <div
                className={classNames(
                  'w-8 h-8 flex items-center justify-center rounded-lg',
                  'bg-bolt-elements-background-depth-3',
                  'text-purple-500',
                )}
              >
                <div className={group.icon} />
              </div>
              <div>
                <h4 className="text-md font-medium text-bolt-elements-textPrimary">{group.title}</h4>
                <p className="text-sm text-bolt-elements-textSecondary">{group.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-bolt-elements-textSecondary">
                Enable All {category === 'cloud' ? 'Cloud' : 'Local'}
              </span>
              <Switch
                checked={categoryEnabled[category as ProviderCategory]}
                onCheckedChange={(checked) => handleToggleCategory(category as ProviderCategory, checked)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {group.providers.map((provider, index) => (
              <motion.div
                key={provider.name}
                className={classNames(
                  settingsStyles.card,
                  'bg-bolt-elements-background-depth-2',
                  'hover:bg-bolt-elements-background-depth-3',
                  'transition-all duration-200',
                  'relative overflow-hidden group',
                  'flex flex-col',
                )}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="absolute top-0 right-0 p-2 flex gap-1">
                  {LOCAL_PROVIDERS.includes(provider.name) && (
                    <motion.span
                      className="px-2 py-0.5 text-xs rounded-full bg-green-500/10 text-green-500 font-medium"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Local
                    </motion.span>
                  )}
                  {URL_CONFIGURABLE_PROVIDERS.includes(provider.name) && (
                    <motion.span
                      className="px-2 py-0.5 text-xs rounded-full bg-purple-500/10 text-purple-500 font-medium"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Configurable
                    </motion.span>
                  )}
                </div>

                <div className="flex items-start gap-4 p-4">
                  <motion.div
                    className={classNames(
                      'w-10 h-10 flex items-center justify-center rounded-xl',
                      'bg-bolt-elements-background-depth-3 group-hover:bg-bolt-elements-background-depth-4',
                      'transition-all duration-200',
                      provider.settings.enabled ? 'text-purple-500' : 'text-bolt-elements-textSecondary',
                    )}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <div
                      className={classNames('w-6 h-6', 'transition-transform duration-200', 'group-hover:rotate-12')}
                    >
                      {React.createElement(PROVIDER_ICONS[provider.name as ProviderName] || BsRobot, {
                        className: 'w-full h-full',
                        'aria-label': `${provider.name} logo`,
                      })}
                    </div>
                  </motion.div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <div>
                        <h4 className="text-sm font-medium text-bolt-elements-textPrimary group-hover:text-purple-500 transition-colors">
                          {provider.name}
                        </h4>
                        <p className="text-xs text-bolt-elements-textSecondary mt-0.5">
                          {PROVIDER_DESCRIPTIONS[provider.name as keyof typeof PROVIDER_DESCRIPTIONS] ||
                            (URL_CONFIGURABLE_PROVIDERS.includes(provider.name)
                              ? 'Configure custom endpoint for this provider'
                              : 'Standard AI provider integration')}
                        </p>
                      </div>
                      <Switch
                        checked={provider.settings.enabled}
                        onCheckedChange={(checked) => handleToggleProvider(provider, checked)}
                      />
                    </div>

                    {provider.settings.enabled && URL_CONFIGURABLE_PROVIDERS.includes(provider.name) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="flex items-center gap-2 mt-4">
                          {editingProvider === provider.name ? (
                            <input
                              type="text"
                              defaultValue={provider.settings.baseUrl}
                              placeholder={`Enter ${provider.name} base URL`}
                              className={classNames(
                                'flex-1 px-3 py-1.5 rounded-lg text-sm',
                                'bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor',
                                'text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary',
                                'focus:outline-none focus:ring-2 focus:ring-purple-500/30',
                                'transition-all duration-200',
                              )}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleUpdateBaseUrl(provider, e.currentTarget.value);
                                } else if (e.key === 'Escape') {
                                  setEditingProvider(null);
                                }
                              }}
                              onBlur={(e) => handleUpdateBaseUrl(provider, e.target.value)}
                              autoFocus
                            />
                          ) : (
                            <div
                              className="flex-1 px-3 py-1.5 rounded-lg text-sm cursor-pointer group/url"
                              onClick={() => setEditingProvider(provider.name)}
                            >
                              <div className="flex items-center gap-2 text-bolt-elements-textSecondary">
                                <div className="i-ph:link text-sm" />
                                <span className="group-hover/url:text-purple-500 transition-colors">
                                  {provider.settings.baseUrl || 'Click to set base URL'}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {providerBaseUrlEnvKeys[provider.name]?.baseUrlKey && (
                          <div className="mt-2 text-xs text-green-500">
                            <div className="flex items-center gap-1">
                              <div className="i-ph:info" />
                              <span>Environment URL set in .env file</span>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                </div>

                <motion.div
                  className="absolute inset-0 border-2 border-purple-500/0 rounded-lg pointer-events-none"
                  animate={{
                    borderColor: provider.settings.enabled ? 'rgba(168, 85, 247, 0.2)' : 'rgba(168, 85, 247, 0)',
                    scale: provider.settings.enabled ? 1 : 0.98,
                  }}
                  transition={{ duration: 0.2 }}
                />

                {provider.name === 'Ollama' && provider.settings.enabled && (
                  <motion.button
                    onClick={() => setShowOllamaUpdater(true)}
                    className={classNames(settingsStyles.button.base, settingsStyles.button.secondary, 'ml-2')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="i-ph:arrows-clockwise" />
                    Update Models
                  </motion.button>
                )}

                <DialogRoot open={showOllamaUpdater} onOpenChange={setShowOllamaUpdater}>
                  <Dialog>
                    <div className="p-6">
                      <OllamaModelUpdater />
                    </div>
                  </Dialog>
                </DialogRoot>
              </motion.div>
            ))}
          </div>

          {category === 'cloud' && <Separator className="my-8" />}
        </motion.div>
      ))}
    </div>
  );
}
