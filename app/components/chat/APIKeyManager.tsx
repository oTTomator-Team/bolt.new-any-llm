import React, { useState, useEffect, useCallback } from 'react';
import { IconButton } from '~/components/ui/IconButton';
import { Switch } from '~/components/ui/Switch';
import type { ProviderInfo } from '~/types/model';
import Cookies from 'js-cookie';
interface APIKeyManagerProps {
  provider: ProviderInfo;
  apiKey: string;
  setApiKey: (key: string) => void;
  getApiKeyLink?: string;
  labelForGetApiKey?: string;
}

// cache which stores whether the provider's API key is set via environment variable
const providerEnvKeyStatusCache: Record<string, boolean> = {};

const apiKeyMemoizeCache: { [k: string]: Record<string, string> } = {};

export function getApiKeysFromCookies() {
  const storedApiKeys = Cookies.get('apiKeys');
  let parsedKeys: Record<string, string> = {};

  if (storedApiKeys) {
    parsedKeys = apiKeyMemoizeCache[storedApiKeys];

    if (!parsedKeys) {
      parsedKeys = apiKeyMemoizeCache[storedApiKeys] = JSON.parse(storedApiKeys);
    }
  }

  return parsedKeys;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const APIKeyManager: React.FC<APIKeyManagerProps> = ({ provider, apiKey, setApiKey }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey);
  const [isPromptCachingEnabled, setIsPromptCachingEnabled] = useState(() => {
    // Read initial state from localStorage, defaulting to true
    const savedState = localStorage.getItem('PROMPT_CACHING_ENABLED');
    return savedState !== null ? JSON.parse(savedState) : true;
  });
  const [isEnvKeySet, setIsEnvKeySet] = useState(false);

  useEffect(() => {
    // Update localStorage whenever the prompt caching state changes
    localStorage.setItem('PROMPT_CACHING_ENABLED', JSON.stringify(isPromptCachingEnabled));
  }, [isPromptCachingEnabled]);

  // Reset states and load saved key when provider changes
  useEffect(() => {
    // Load saved API key from cookies for this provider
    const savedKeys = getApiKeysFromCookies();
    const savedKey = savedKeys[provider.name] || '';

    setTempKey(savedKey);
    setApiKey(savedKey);
    setIsEditing(false);
  }, [provider.name]);

  const checkEnvApiKey = useCallback(async () => {
    // Check cache first
    if (providerEnvKeyStatusCache[provider.name] !== undefined) {
      setIsEnvKeySet(providerEnvKeyStatusCache[provider.name]);
      return;
    }

    try {
      const response = await fetch(`/api/check-env-key?provider=${encodeURIComponent(provider.name)}`);
      const data = await response.json();
      const isSet = (data as { isSet: boolean }).isSet;

      // Cache the result
      providerEnvKeyStatusCache[provider.name] = isSet;
      setIsEnvKeySet(isSet);
    } catch (error) {
      console.error('Failed to check environment API key:', error);
      setIsEnvKeySet(false);
    }
  }, [provider.name]);

  useEffect(() => {
    checkEnvApiKey();
  }, [checkEnvApiKey]);

  const handleSave = () => {
    // Save to parent state
    setApiKey(tempKey);

    // Save to cookies
    const currentKeys = getApiKeysFromCookies();
    const newKeys = { ...currentKeys, [provider.name]: tempKey };
    Cookies.set('apiKeys', JSON.stringify(newKeys));

    setIsEditing(false);
  };

  return (
    <div className="flex flex-col items-left justify-between py-3 px-1">
      <div className="flex">
        <div className="flex items-center gap-2 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-bolt-elements-textSecondary">{provider?.name} API Key:</span>
            {!isEditing && (
              <div className="flex items-center gap-2">
                {apiKey ? (
                  <>
                    <div className="i-ph:check-circle-fill text-green-500 w-4 h-4" />
                    <span className="text-xs text-green-500">Set via UI</span>
                  </>
                ) : isEnvKeySet ? (
                  <>
                    <div className="i-ph:check-circle-fill text-green-500 w-4 h-4" />
                    <span className="text-xs text-green-500">Set via environment variable</span>
                  </>
                ) : (
                  <>
                    <div className="i-ph:x-circle-fill text-red-500 w-4 h-4" />
                    <span className="text-xs text-red-500">Not Set (Please set via UI or ENV_VAR)</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={tempKey}
                placeholder="Enter API Key"
                onChange={(e) => setTempKey(e.target.value)}
                className="w-[300px] px-3 py-1.5 text-sm rounded border border-bolt-elements-borderColor 
                          bg-bolt-elements-prompt-background text-bolt-elements-textPrimary 
                          focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus"
              />
              <IconButton
                onClick={handleSave}
                title="Save API Key"
                className="bg-green-500/10 hover:bg-green-500/20 text-green-500"
              >
                <div className="i-ph:check w-4 h-4" />
              </IconButton>
              <IconButton
                onClick={() => setIsEditing(false)}
                title="Cancel"
                className="bg-red-500/10 hover:bg-red-500/20 text-red-500"
              >
                <div className="i-ph:x w-4 h-4" />
              </IconButton>
            </div>
          ) : (
            <>
              {
                <IconButton
                  onClick={() => setIsEditing(true)}
                  title="Edit API Key"
                  className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-500"
                >
                  <div className="i-ph:pencil-simple w-4 h-4" />
                </IconButton>
              }
              {provider?.getApiKeyLink && !apiKey && (
                <IconButton
                  onClick={() => window.open(provider?.getApiKeyLink)}
                  title="Get API Key"
                  className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-500 flex items-center gap-2"
                >
                  <span className="text-xs whitespace-nowrap">{provider?.labelForGetApiKey || 'Get API Key'}</span>
                  <div className={`${provider?.icon || 'i-ph:key'} w-4 h-4`} />
                </IconButton>
              )}
            </>
          )}
        </div>
      </div>

      {provider?.name === 'Anthropic' && (
        <div className="border-t mt-4 pt-4 pb-2 -mt-4">
          <div className="flex items-center space-x-2">
            <Switch checked={isPromptCachingEnabled} onCheckedChange={setIsPromptCachingEnabled} />
            <label htmlFor="prompt-caching" className="text-sm text-bolt-elements-textSecondary">
              Enable Prompt Caching
            </label>
          </div>
          <p className="text-xs text-bolt-elements-textTertiary mt-2">
            When enabled, generates 10x cheaper responses if re-prompted within 5 mins (Recommended)
          </p>
        </div>
      )}
    </div>
  );
};
