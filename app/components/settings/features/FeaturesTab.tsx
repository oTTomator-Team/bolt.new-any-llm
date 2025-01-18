import React, { useState } from 'react';
import { Switch } from '~/components/ui/Switch';
import { PromptLibrary } from '~/lib/common/prompt-library';
import { useSettings } from '~/lib/hooks/useSettings';
import { motion, AnimatePresence } from 'framer-motion';
import { classNames } from '~/utils/classNames';
import { settingsStyles } from '~/components/settings/settings.styles';
import { toast } from 'react-toastify';

interface FeatureToggle {
  id: string;
  title: string;
  description: string;
  icon: string;
  enabled: boolean;
  beta?: boolean;
  experimental?: boolean;
  tooltip?: string;
}

export default function FeaturesTab() {
  const {
    debug,
    enableDebugMode,
    isLocalModel,
    enableLocalModels,
    enableEventLogs,
    isLatestBranch,
    enableLatestBranch,
    promptId,
    setPromptId,
    autoSelectTemplate,
    setAutoSelectTemplate,
    enableContextOptimization,
    contextOptimizationEnabled,
  } = useSettings();

  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null);

  const handleToggle = (enabled: boolean) => {
    enableDebugMode(enabled);
    enableEventLogs(enabled);
    toast.success(`Debug features ${enabled ? 'enabled' : 'disabled'}`);
  };

  const features: FeatureToggle[] = [
    {
      id: 'debug',
      title: 'Debug Features',
      description: 'Enable debugging tools and detailed logging',
      icon: 'i-ph:bug',
      enabled: debug,
      experimental: true,
      tooltip: 'Access advanced debugging tools and view detailed system logs',
    },
    {
      id: 'latestBranch',
      title: 'Use Main Branch',
      description: 'Check for updates against the main branch instead of stable',
      icon: 'i-ph:git-branch',
      enabled: isLatestBranch,
      beta: true,
      tooltip: 'Get the latest features and improvements before they are officially released',
    },
    {
      id: 'autoTemplate',
      title: 'Auto Select Code Template',
      description: 'Let Bolt select the best starter template for your project',
      icon: 'i-ph:magic-wand',
      enabled: autoSelectTemplate,
      tooltip: 'Automatically choose the most suitable template based on your project type',
    },
    {
      id: 'contextOptimization',
      title: 'Context Optimization',
      description: 'Optimize chat context by redacting file contents and using system prompts',
      icon: 'i-ph:arrows-in',
      enabled: contextOptimizationEnabled,
      tooltip: 'Improve AI responses by optimizing the context window and system prompts',
    },
    {
      id: 'experimentalProviders',
      title: 'Experimental Providers',
      description: 'Enable experimental providers like Ollama, LMStudio, and OpenAILike',
      icon: 'i-ph:robot',
      enabled: isLocalModel,
      experimental: true,
      tooltip: 'Try out new AI providers and models in development',
    },
  ];

  const handleToggleFeature = (featureId: string, enabled: boolean) => {
    switch (featureId) {
      case 'debug':
        handleToggle(enabled);
        break;
      case 'latestBranch':
        enableLatestBranch(enabled);
        toast.success(`Main branch updates ${enabled ? 'enabled' : 'disabled'}`);
        break;
      case 'autoTemplate':
        setAutoSelectTemplate(enabled);
        toast.success(`Auto template selection ${enabled ? 'enabled' : 'disabled'}`);
        break;
      case 'contextOptimization':
        enableContextOptimization(enabled);
        toast.success(`Context optimization ${enabled ? 'enabled' : 'disabled'}`);
        break;
      case 'experimentalProviders':
        enableLocalModels(enabled);
        toast.success(`Experimental providers ${enabled ? 'enabled' : 'disabled'}`);
        break;
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        className="flex items-center gap-2"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="i-ph:puzzle-piece text-xl text-purple-500" />
        <div>
          <h3 className="text-lg font-medium text-bolt-elements-textPrimary">Features</h3>
          <p className="text-sm text-bolt-elements-textSecondary">Customize your Bolt experience</p>
        </div>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {features.map((feature, index) => (
          <motion.div
            key={feature.id}
            className={classNames(
              settingsStyles.card,
              'bg-bolt-elements-background-depth-2',
              'hover:bg-bolt-elements-background-depth-3',
              'transition-colors duration-200',
              'relative overflow-hidden group cursor-pointer',
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onHoverStart={() => setHoveredFeature(feature.id)}
            onHoverEnd={() => setHoveredFeature(null)}
            onClick={() => setExpandedFeature(expandedFeature === feature.id ? null : feature.id)}
          >
            <AnimatePresence>
              {hoveredFeature === feature.id && feature.tooltip && (
                <motion.div
                  className={classNames(
                    'absolute -top-12 left-1/2 transform -translate-x-1/2',
                    'px-3 py-2 rounded-lg text-xs',
                    'bg-bolt-elements-background-depth-4 text-bolt-elements-textPrimary',
                    'border border-bolt-elements-borderColor',
                    'whitespace-nowrap z-10',
                  )}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                >
                  {feature.tooltip}
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 rotate-45 w-2 h-2 bg-bolt-elements-background-depth-4 border-r border-b border-bolt-elements-borderColor" />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="absolute top-0 right-0 p-2 flex gap-1">
              {feature.beta && (
                <motion.span
                  className="px-2 py-0.5 text-xs rounded-full bg-blue-500/10 text-blue-500 font-medium"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Beta
                </motion.span>
              )}
              {feature.experimental && (
                <motion.span
                  className="px-2 py-0.5 text-xs rounded-full bg-purple-500/10 text-purple-500 font-medium"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Experimental
                </motion.span>
              )}
            </div>

            <div className="flex items-start gap-4 p-4">
              <motion.div
                className={classNames(
                  'p-2 rounded-lg text-xl',
                  'bg-bolt-elements-background-depth-3 group-hover:bg-bolt-elements-background-depth-4',
                  'transition-colors duration-200',
                )}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <div className={classNames(feature.icon, 'text-purple-500')} />
              </motion.div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-bolt-elements-textPrimary group-hover:text-purple-500 transition-colors">
                      {feature.title}
                    </h4>
                    <p className="text-xs text-bolt-elements-textSecondary mt-0.5">{feature.description}</p>
                  </div>
                  <Switch
                    checked={feature.enabled}
                    onCheckedChange={(checked) => handleToggleFeature(feature.id, checked)}
                  />
                </div>
              </div>
            </div>

            <motion.div
              className="absolute inset-0 border-2 border-purple-500/0 rounded-lg pointer-events-none"
              animate={{
                borderColor: feature.enabled ? 'rgba(168, 85, 247, 0.2)' : 'rgba(168, 85, 247, 0)',
                scale: feature.enabled ? 1 : 0.98,
              }}
              transition={{ duration: 0.2 }}
            />
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        className={classNames(
          settingsStyles.card,
          'bg-bolt-elements-background-depth-2',
          'hover:bg-bolt-elements-background-depth-3',
          'transition-all duration-200',
          'group',
        )}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        whileHover={{ scale: 1.01 }}
      >
        <div className="flex items-start gap-4 p-4">
          <motion.div
            className={classNames(
              'p-2 rounded-lg text-xl',
              'bg-bolt-elements-background-depth-3 group-hover:bg-bolt-elements-background-depth-4',
              'transition-colors duration-200',
            )}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <div className="i-ph:book text-purple-500" />
          </motion.div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-medium text-bolt-elements-textPrimary group-hover:text-purple-500 transition-colors">
                  Prompt Library
                </h4>
                <p className="text-xs text-bolt-elements-textSecondary mt-0.5">
                  Choose a prompt from the library to use as the system prompt
                </p>
              </div>
              <select
                value={promptId}
                onChange={(e) => {
                  setPromptId(e.target.value);
                  toast.success('Prompt template updated');
                }}
                className={classNames(
                  'p-2 rounded-lg text-sm min-w-[200px]',
                  'bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor',
                  'text-bolt-elements-textPrimary',
                  'focus:outline-none focus:ring-2 focus:ring-purple-500/30',
                  'group-hover:border-purple-500/30',
                  'transition-all duration-200',
                )}
              >
                {PromptLibrary.getList().map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
