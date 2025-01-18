import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { classNames } from '~/utils/classNames';
import { settingsStyles } from '~/components/settings/settings.styles';
import { DialogTitle, DialogDescription } from '~/components/ui/Dialog';

interface OllamaModel {
  name: string;
  digest: string;
  size: number;
  modified_at: string;
  details?: {
    family: string;
    parameter_size: string;
    quantization_level: string;
  };
  status?: 'idle' | 'updating' | 'updated' | 'error' | 'checking';
  error?: string;
  newDigest?: string;
  progress?: {
    current: number;
    total: number;
    status: string;
  };
}

interface OllamaTagResponse {
  models: Array<{
    name: string;
    digest: string;
    size: number;
    modified_at: string;
    details?: {
      family: string;
      parameter_size: string;
      quantization_level: string;
    };
  }>;
}

interface OllamaPullResponse {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
}

export default function OllamaModelUpdater() {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      setIsLoading(true);

      const response = await fetch('http://localhost:11434/api/tags');
      const data = (await response.json()) as OllamaTagResponse;
      setModels(
        data.models.map((model) => ({
          name: model.name,
          digest: model.digest,
          size: model.size,
          modified_at: model.modified_at,
          details: model.details,
          status: 'idle' as const,
        })),
      );
    } catch (error) {
      toast.error('Failed to fetch Ollama models');
      console.error('Error fetching models:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateModel = async (modelName: string): Promise<{ success: boolean; newDigest?: string }> => {
    try {
      const response = await fetch('http://localhost:11434/api/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update ${modelName}`);
      }

      const reader = response.body?.getReader();

      if (!reader) {
        throw new Error('No response reader available');
      }

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const text = new TextDecoder().decode(value);
        const lines = text.split('\n').filter(Boolean);

        for (const line of lines) {
          const data = JSON.parse(line) as OllamaPullResponse;

          setModels((current) =>
            current.map((m) =>
              m.name === modelName
                ? {
                    ...m,
                    progress: {
                      current: data.completed || 0,
                      total: data.total || 0,
                      status: data.status,
                    },
                    newDigest: data.digest,
                  }
                : m,
            ),
          );
        }
      }

      setModels((current) => current.map((m) => (m.name === modelName ? { ...m, status: 'checking' } : m)));

      const updatedResponse = await fetch('http://localhost:11434/api/tags');
      const data = (await updatedResponse.json()) as OllamaTagResponse;
      const updatedModel = data.models.find((m) => m.name === modelName);

      return { success: true, newDigest: updatedModel?.digest };
    } catch (error) {
      console.error(`Error updating ${modelName}:`, error);
      return { success: false };
    }
  };

  const handleBulkUpdate = async () => {
    setIsBulkUpdating(true);

    for (const model of models) {
      setModels((current) => current.map((m) => (m.name === model.name ? { ...m, status: 'updating' } : m)));

      const { success, newDigest } = await updateModel(model.name);

      setModels((current) =>
        current.map((m) =>
          m.name === model.name
            ? {
                ...m,
                status: success ? 'updated' : 'error',
                error: success ? undefined : 'Update failed',
                newDigest,
              }
            : m,
        ),
      );
    }

    setIsBulkUpdating(false);
    toast.success('Bulk update completed');
  };

  const handleSingleUpdate = async (modelName: string) => {
    setModels((current) => current.map((m) => (m.name === modelName ? { ...m, status: 'updating' } : m)));

    const { success, newDigest } = await updateModel(modelName);

    setModels((current) =>
      current.map((m) =>
        m.name === modelName
          ? {
              ...m,
              status: success ? 'updated' : 'error',
              error: success ? undefined : 'Update failed',
              newDigest,
            }
          : m,
      ),
    );

    if (success) {
      toast.success(`Updated ${modelName}`);
    } else {
      toast.error(`Failed to update ${modelName}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className={settingsStyles['loading-spinner']} />
        <span className="ml-2 text-bolt-elements-textSecondary">Loading models...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <DialogTitle>Ollama Model Manager</DialogTitle>
        <DialogDescription>Update your local Ollama models to their latest versions</DialogDescription>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="i-ph:arrows-clockwise text-purple-500" />
          <span className="text-sm text-bolt-elements-textPrimary">{models.length} models available</span>
        </div>
        <motion.button
          onClick={handleBulkUpdate}
          disabled={isBulkUpdating}
          className={classNames(settingsStyles.button.base, settingsStyles.button.primary)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isBulkUpdating ? (
            <>
              <div className={settingsStyles['loading-spinner']} />
              Updating All...
            </>
          ) : (
            <>
              <div className="i-ph:arrows-clockwise" />
              Update All Models
            </>
          )}
        </motion.button>
      </div>

      <div className="space-y-2">
        {models.map((model) => (
          <div
            key={model.name}
            className={classNames(
              'flex items-center justify-between p-3 rounded-lg',
              'bg-[#F8F8F8] dark:bg-[#1A1A1A]',
              'border border-[#E5E5E5] dark:border-[#333333]',
            )}
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="i-ph:cube text-purple-500" />
                <span className="text-sm text-bolt-elements-textPrimary">{model.name}</span>
                {model.status === 'updating' && <div className={settingsStyles['loading-spinner']} />}
                {model.status === 'updated' && <div className="i-ph:check-circle text-green-500" />}
                {model.status === 'error' && <div className="i-ph:x-circle text-red-500" />}
              </div>
              <div className="flex items-center gap-2 text-xs text-bolt-elements-textSecondary">
                <span>Version: {model.digest.substring(0, 7)}</span>
                {model.status === 'updated' && model.newDigest && (
                  <>
                    <div className="i-ph:arrow-right w-3 h-3" />
                    <span className="text-green-500">{model.newDigest.substring(0, 7)}</span>
                  </>
                )}
                {model.progress && (
                  <span className="ml-2">
                    {model.progress.status}{' '}
                    {model.progress.total > 0 && (
                      <>({Math.round((model.progress.current / model.progress.total) * 100)}%)</>
                    )}
                  </span>
                )}
                {model.details && (
                  <span className="ml-2">
                    ({model.details.parameter_size}, {model.details.quantization_level})
                  </span>
                )}
              </div>
            </div>
            <motion.button
              onClick={() => handleSingleUpdate(model.name)}
              disabled={model.status === 'updating'}
              className={classNames(settingsStyles.button.base, settingsStyles.button.secondary)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="i-ph:arrows-clockwise" />
              Update
            </motion.button>
          </div>
        ))}
      </div>
    </div>
  );
}
