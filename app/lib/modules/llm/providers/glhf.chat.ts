import { BaseProvider, getOpenAILikeModel } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';
import type { LanguageModelV1 } from 'ai';

export default class GLHFProvider extends BaseProvider {
  name = 'glhf.chat';
  getApiKeyLink = 'https://glhf.chat/users/settings/api';

  config = {
    baseUrlKey: 'GLHF_API_BASE_URL',
    apiTokenKey: 'GLHF_API_KEY',
  };

  defaultBaseUrl = 'https://glhf.chat/api/openai/v1';

  get staticModels(): ModelInfo[] {
    return [
      {
        name: 'hf:mistralai/Mistral-7B-Instruct-v0.3',
        label: 'Mistral-7B-Instruct',
        provider: this.name,
        maxTokenAllowed: 8000,
      },
      {
        name: 'hf:qwen/Qwen2.5-Coder-32B-Instruct',
        label: 'Qwen2.5-Coder-32B',
        provider: this.name,
        maxTokenAllowed: 8000,
      },
      {
        name: 'hf:deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct',
        label: 'DeepSeek-Coder-V2-Lite',
        provider: this.name,
        maxTokenAllowed: 8000,
      },
      {
        name: 'hf:nvidia/Llama-3.1-Nemotron-70B-Instruct-HF',
        label: 'Llama-3.1-Nemotron-70B',
        provider: this.name,
        maxTokenAllowed: 8000,
      },
      {
        name: 'hf:google/codegemma-7b-it',
        label: 'CodeGemma-7B',
        provider: this.name,
        maxTokenAllowed: 8000,
      }
    ];
  }

  async getDynamicModels(
    apiKeys?: Record<string, string>,
    settings?: IProviderSetting,
    serverEnv: Record<string, string> = {},
  ): Promise<ModelInfo[]> {
    // Retornamos apenas os modelos estáticos, evitando duplicação
    return this.staticModels;
  }

  getModelInstance(options: {
    model?: string;
    serverEnv: Record<string, string>;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }): LanguageModelV1 {
    const { model, serverEnv, apiKeys, providerSettings } = options;

    const { baseUrl, apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv,
      defaultBaseUrlKey: this.config.baseUrlKey,
      defaultApiTokenKey: this.config.apiTokenKey,
    });

    const effectiveBaseUrl = baseUrl || this.defaultBaseUrl;

    if (!apiKey) {
      throw new Error(`Missing API key for ${this.name} provider`);
    }

    // Usa o primeiro modelo como padrão se nenhum for especificado
    const modelToUse = model || this.staticModels[0].name;
    return getOpenAILikeModel(effectiveBaseUrl, apiKey, modelToUse);
  }

  async testApiConnection(): Promise<void> {
    const { baseUrl, apiKey } = this.getProviderBaseUrlAndKey({
      serverEnv: process.env as any,
      defaultBaseUrlKey: this.config.baseUrlKey,
      defaultApiTokenKey: this.config.apiTokenKey,
    });

    const effectiveBaseUrl = baseUrl || this.defaultBaseUrl;

    if (!apiKey) {
      throw new Error('Missing API key for GLHF provider during connection test.');
    }

    try {
      const response = await fetch(`${effectiveBaseUrl}/models`, {
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
      });

      if (!response.ok) {
        throw new Error(`GLHF API connection failed: ${response.status} ${response.statusText}`);
      }

      console.log('GLHF API connection successful.');
    } catch (error) {
      console.error('Error during GLHF API connection test:', error);
      throw error;
    }
  }
}
