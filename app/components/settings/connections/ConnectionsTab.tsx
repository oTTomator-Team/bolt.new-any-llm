import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Cookies from 'js-cookie';
import { logStore } from '~/lib/stores/logs';
import { createClient } from '@supabase/supabase-js';

interface GitHubUserResponse {
  login: string;
  id: number;
  [key: string]: any;
}

interface SupabaseProjectResponse {
  id: string;
  name: string;
  organization_id: string;
  region: string;
}

interface NetlifySite {
  id: string;
  name: string;
  url: string;
  // Add other relevant properties as needed
}

function GitHubConnectionSection() {
  const [githubUsername, setGithubUsername] = useState(Cookies.get('githubUsername') || '');
  const [githubToken, setGithubToken] = useState(Cookies.get('githubToken') || '');
  const [isConnected, setIsConnected] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    // Check if credentials exist and verify them
    if (githubUsername && githubToken) {
      verifyGitHubCredentials();
    }
  }, []);

  const verifyGitHubCredentials = async () => {
    setIsVerifying(true);

    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${githubToken}`,
        },
      });

      if (response.ok) {
        const data = (await response.json()) as GitHubUserResponse;

        if (data.login === githubUsername) {
          setIsConnected(true);
          return true;
        }
      }

      setIsConnected(false);

      return false;
    } catch (error) {
      console.error('Error verifying GitHub credentials:', error);
      setIsConnected(false);

      return false;
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSaveConnection = async () => {
    if (!githubUsername || !githubToken) {
      toast.error('Please provide both GitHub username and token');
      return;
    }

    setIsVerifying(true);

    const isValid = await verifyGitHubCredentials();

    if (isValid) {
      Cookies.set('githubUsername', githubUsername);
      Cookies.set('githubToken', githubToken);
      logStore.logSystem('GitHub connection settings updated', {
        username: githubUsername,
        hasToken: !!githubToken,
      });
      toast.success('GitHub credentials verified and saved successfully!');
      Cookies.set('git:github.com', JSON.stringify({ username: githubToken, password: 'x-oauth-basic' }));
      setIsConnected(true);
    } else {
      toast.error('Invalid GitHub credentials. Please check your username and token.');
    }
  };

  const handleDisconnect = () => {
    Cookies.remove('githubUsername');
    Cookies.remove('githubToken');
    Cookies.remove('git:github.com');
    setGithubUsername('');
    setGithubToken('');
    setIsConnected(false);
    logStore.logSystem('GitHub connection removed');
    toast.success('GitHub connection removed successfully!');
  };

  return (
    <div className="p-4 mb-4 border border-bolt-elements-borderColor rounded-lg bg-bolt-elements-background-depth-3">
      <h3 className="text-lg font-medium text-bolt-elements-textPrimary mb-4">GitHub Connection</h3>
      <div className="flex mb-4">
        <div className="flex-1 mr-2">
          <label className="block text-sm text-bolt-elements-textSecondary mb-1">GitHub Username:</label>
          <input
            type="text"
            value={githubUsername}
            onChange={(e) => setGithubUsername(e.target.value)}
            disabled={isVerifying}
            className="w-full bg-white dark:bg-bolt-elements-background-depth-4 relative px-2 py-1.5 rounded-md focus:outline-none placeholder-bolt-elements-textTertiary text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary border border-bolt-elements-borderColor disabled:opacity-50"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm text-bolt-elements-textSecondary mb-1">Personal Access Token:</label>
          <input
            type="password"
            value={githubToken}
            onChange={(e) => setGithubToken(e.target.value)}
            disabled={isVerifying}
            className="w-full bg-white dark:bg-bolt-elements-background-depth-4 relative px-2 py-1.5 rounded-md focus:outline-none placeholder-bolt-elements-textTertiary text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary border border-bolt-elements-borderColor disabled:opacity-50"
          />
        </div>
      </div>
      <div className="flex mb-4 items-center">
        {!isConnected ? (
          <button
            onClick={handleSaveConnection}
            disabled={isVerifying || !githubUsername || !githubToken}
            className="bg-bolt-elements-button-primary-background rounded-lg px-4 py-2 mr-2 transition-colors duration-200 hover:bg-bolt-elements-button-primary-backgroundHover text-bolt-elements-button-primary-text disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isVerifying ? (
              <>
                <div className="i-ph:spinner animate-spin mr-2" />
                Verifying...
              </>
            ) : (
              'Connect'
            )}
          </button>
        ) : (
          <button
            onClick={handleDisconnect}
            className="bg-bolt-elements-button-danger-background rounded-lg px-4 py-2 mr-2 transition-colors duration-200 hover:bg-bolt-elements-button-danger-backgroundHover text-bolt-elements-button-danger-text"
          >
            Disconnect
          </button>
        )}
        {isConnected && (
          <span className="text-sm text-green-600 flex items-center">
            <div className="i-ph:check-circle mr-1" />
            Connected to GitHub
          </span>
        )}
      </div>
    </div>
  );
}

function SupabaseConnectionSection() {
  const [supabaseUrl, setSupabaseUrl] = useState(Cookies.get('supabaseUrl') || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(Cookies.get('supabaseAnonKey') || '');
  const [isConnected, setIsConnected] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [projectDetails, setProjectDetails] = useState<SupabaseProjectResponse | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    // Check if credentials exist and verify them
    if (supabaseUrl && supabaseAnonKey) {
      verifySupabaseCredentials();
    }
  }, []);

  const validateSupabaseUrl = (url: string): boolean => {
    const urlPattern = /^https:\/\/[a-z0-9-]+\.supabase\.co$/;
    return urlPattern.test(url);
  };

  const validateSupabaseAnonKey = (key: string): boolean => {
    // Basic validation: check length and basic structure
    return key.length >= 20 && key.startsWith('eyJ') && key.includes('.');
  };

  const verifySupabaseCredentials = async () => {
    setIsVerifying(true);
    setConnectionError(null);

    // Debugging: Log connection attempt details
    console.log('Attempting Supabase Connection:', {
      url: supabaseUrl,
      anonKeyLength: supabaseAnonKey?.length,
      timestamp: new Date().toISOString()
    });

    try {
      // Validate URL
      if (!validateSupabaseUrl(supabaseUrl)) {
        const urlError = 'Invalid Supabase URL format. Must be https://your-project.supabase.co';
        console.error(urlError, supabaseUrl);
        setConnectionError(urlError);
        setIsConnected(false);
        return false;
      }

      // Validate Anon Key
      if (!validateSupabaseAnonKey(supabaseAnonKey)) {
        const keyError = 'Invalid Supabase Anon Key. Must be a valid JWT-like token.';
        console.error(keyError);
        setConnectionError(keyError);
        setIsConnected(false);
        return false;
      }

      // Enhanced network error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout

      try {
        // Attempt to create client with minimal configuration
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: false
          },
          global: {
            headers: {
              'x-bolt-connection-test': 'true',
              'User-Agent': 'Bolt.diy Supabase Connection Tester'
            }
          }
        });

        // Alternative connection verification methods
        const verificationMethods: Array<() => Promise<boolean>> = [
          // Method 1: Check API accessibility
          async () => {
            try {
              const response = await fetch(`${supabaseUrl}/rest/v1/`, {
                method: 'HEAD',
                headers: {
                  'apikey': supabaseAnonKey,
                  'Authorization': `Bearer ${supabaseAnonKey}`
                }
              });
              return response.ok;
            } catch (fetchError: unknown) {
              console.log('Direct API check error:', fetchError);
              return false;
            }
          },
          
          // Method 2: Attempt to retrieve public data or metadata
          async () => {
            try {
              // Try to fetch something that might exist in most Supabase projects
              const { data, error } = await supabase
                .from('public')
                .select('*')
                .limit(1);
              
              if (error) {
                console.log('Public schema check:', error);
                return false;
              }
              return true;
            } catch (queryError: unknown) {
              console.log('Query attempt error:', queryError);
              return false;
            }
          },
          
          // Method 3: Attempt to get current user (fallback)
          async () => {
            try {
              const { data: { user }, error } = await supabase.auth.getUser();
              
              // If no error is thrown but no user is found, it's still a valid connection
              if (error && error.message !== 'Auth session missing!') {
                console.log('User retrieval check:', error);
                return false;
              }
              return true;
            } catch (authError: unknown) {
              console.log('Auth check error:', authError);
              return false;
            }
          }
        ];

        // Try verification methods sequentially
        let isConnected = false;
        for (const method of verificationMethods) {
          try {
            isConnected = await method();
            if (isConnected) break;
          } catch (methodError: unknown) {
            console.log('Verification method failed:', methodError);
          }
        }

        clearTimeout(timeoutId);

        if (!isConnected) {
          console.error('All Supabase connection verification methods failed');
          setConnectionError('Unable to verify Supabase connection. Check your credentials and project configuration.');
          setIsConnected(false);
          return false;
        }

        // Successfully connected
        console.log('Supabase Connection Successful');

        // Try to get some project info if possible
        try {
          const { data: { publicUrl } } = supabase.storage.from('').getPublicUrl('');
          setProjectDetails({
            id: 'unknown',
            name: 'Supabase Project',
            organization_id: 'unknown',
            region: new URL(publicUrl).hostname.split('.')[0]
          });
        } catch (projectInfoError: unknown) {
          // Fallback if cannot retrieve project details
          console.error('Failed to retrieve project info:', projectInfoError);
          setProjectDetails({
            id: 'unknown',
            name: 'Supabase Project',
            organization_id: 'unknown',
            region: 'Unknown'
          });
        }

        setIsConnected(true);
        setConnectionError(null);
        return true;
      } catch (fetchError: unknown) {
        clearTimeout(timeoutId);
        
        // Comprehensive network error logging
        console.error('Supabase Network Connection Error:', {
          errorType: 'Network Error',
          errorName: fetchError instanceof Error ? fetchError.name : 'Unknown Error',
          errorMessage: fetchError instanceof Error ? fetchError.message : 'Unknown error occurred',
          stack: fetchError instanceof Error ? fetchError.stack : undefined,
          connectionDetails: {
            url: supabaseUrl,
            anonKeyPresent: !!supabaseAnonKey,
            anonKeyLength: supabaseAnonKey?.length
          }
        });

        // Specific network error handling
        let connectionErrorMessage = 'Unexpected error connecting to Supabase';
        if (fetchError instanceof Error) {
          if (fetchError.name === 'AbortError') {
            connectionErrorMessage = 'Connection timed out. Please check your network.';
          } else if (fetchError instanceof TypeError) {
            connectionErrorMessage = 'Network error. Check your internet connection and Supabase URL.';
          }
        }
        
        setConnectionError(connectionErrorMessage);
        setIsConnected(false);
        return false;
      }
    } catch (error: unknown) {
      // Catch-all for any unexpected errors
      console.error('Unexpected Supabase Connection Error:', {
        errorType: 'Unexpected Error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        connectionDetails: {
          url: supabaseUrl,
          anonKeyPresent: !!supabaseAnonKey,
          anonKeyLength: supabaseAnonKey?.length
        }
      });

      const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
      setConnectionError(errorMessage);
      setIsConnected(false);
      return false;
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSaveConnection = async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      setConnectionError('Please provide both Supabase URL and Anon Key');
      return;
    }

    setIsVerifying(true);
    setConnectionError(null);

    try {
      const isValid = await verifySupabaseCredentials();

      if (isValid) {
        // Save credentials with enhanced security
        Cookies.set('supabaseUrl', supabaseUrl, { 
          secure: true, 
          sameSite: 'strict',
          expires: 365 // 1 year expiration
        });
        Cookies.set('supabaseAnonKey', supabaseAnonKey, { 
          secure: true, 
          sameSite: 'strict',
          expires: 365 // 1 year expiration
        });
        
        logStore.logSystem('Supabase connection settings updated', {
          url: supabaseUrl,
          hasAnonKey: !!supabaseAnonKey,
          projectName: projectDetails?.name
        });

        toast.success('Supabase credentials verified and saved successfully!');
        setIsConnected(true);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save Supabase connection';
      setConnectionError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisconnect = () => {
    Cookies.remove('supabaseUrl');
    Cookies.remove('supabaseAnonKey');
    
    setSupabaseUrl('');
    setSupabaseAnonKey('');
    setIsConnected(false);
    setProjectDetails(null);
    setConnectionError(null);

    logStore.logSystem('Supabase connection removed');
    toast.success('Supabase connection removed successfully!');
  };

  return (
    <div className="p-4 mb-4 border border-bolt-elements-borderColor rounded-lg bg-bolt-elements-background-depth-3">
      <h3 className="text-lg font-medium text-bolt-elements-textPrimary mb-4">Supabase Connection</h3>
      
      {connectionError && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md">
          {connectionError}
        </div>
      )}

      <div className="flex mb-4">
        <div className="flex-1 mr-2">
          <label className="block text-sm text-bolt-elements-textSecondary mb-1">Supabase Project URL:</label>
          <input
            type="text"
            value={supabaseUrl}
            onChange={(e) => {
              setSupabaseUrl(e.target.value);
              setConnectionError(null);
            }}
            disabled={isVerifying}
            placeholder="https://your-project.supabase.co"
            className="w-full bg-white dark:bg-bolt-elements-background-depth-4 relative px-2 py-1.5 rounded-md focus:outline-none placeholder-bolt-elements-textTertiary text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary border border-bolt-elements-borderColor disabled:opacity-50"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm text-bolt-elements-textSecondary mb-1">Anon Key:</label>
          <input
            type="password"
            value={supabaseAnonKey}
            onChange={(e) => {
              setSupabaseAnonKey(e.target.value);
              setConnectionError(null);
            }}
            disabled={isVerifying}
            className="w-full bg-white dark:bg-bolt-elements-background-depth-4 relative px-2 py-1.5 rounded-md focus:outline-none placeholder-bolt-elements-textTertiary text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary border border-bolt-elements-borderColor disabled:opacity-50"
          />
        </div>
      </div>
      
      {isConnected && projectDetails && (
        <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded-md">
          <p>Connected Project: {projectDetails.name}</p>
          <p>Region: {projectDetails.region}</p>
        </div>
      )}

      <div className="flex mb-4 items-center">
        {!isConnected ? (
          <button
            onClick={handleSaveConnection}
            disabled={isVerifying || !supabaseUrl || !supabaseAnonKey}
            className="bg-bolt-elements-button-primary-background rounded-lg px-4 py-2 mr-2 transition-colors duration-200 hover:bg-bolt-elements-button-primary-backgroundHover text-bolt-elements-button-primary-text disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isVerifying ? (
              <>
                <div className="i-ph:spinner animate-spin mr-2" />
                Verifying...
              </>
            ) : (
              'Connect'
            )}
          </button>
        ) : (
          <button
            onClick={handleDisconnect}
            className="bg-bolt-elements-button-danger-background rounded-lg px-4 py-2 mr-2 transition-colors duration-200 hover:bg-bolt-elements-button-danger-backgroundHover text-bolt-elements-button-danger-text"
          >
            Disconnect
          </button>
        )}
        {isConnected && (
          <span className="text-sm text-green-600 flex items-center">
            <div className="i-ph:check-circle mr-1" />
            Connected to Supabase
          </span>
        )}
      </div>
    </div>
  );
}

function NetlifyConnectionSection() {
  const [netlifyToken, setNetlifyToken] = useState(Cookies.get('netlifyToken') || '');
  const [isConnected, setIsConnected] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    // Check if token exists and verify it
    if (netlifyToken) {
      verifyNetlifyCredentials();
    }
  }, []);

  const verifyNetlifyCredentials = async () => {
    setIsVerifying(true);

    try {
      console.log('[Netlify Connection] Starting credential verification', { 
        timestamp: new Date().toISOString() 
      });

      const response = await fetch('https://api.netlify.com/api/v1/sites', {
        headers: {
          Authorization: `Bearer ${netlifyToken}`,
          'User-Agent': 'Bolt IDE (https://bolt.diy)'
        },
      });

      console.log('[Netlify Connection] API Response', { 
        status: response.status, 
        statusText: response.statusText 
      });

      if (response.ok) {
        const sites: NetlifySite[] = await response.json();
        console.log('[Netlify Connection] Verified successfully', { 
          sitesCount: sites.length 
        });
        setIsConnected(true);
        return true;
      }

      console.warn('[Netlify Connection] Verification failed', { 
        status: response.status, 
        statusText: response.statusText 
      });

      setIsConnected(false);
      return false;
    } catch (error) {
      console.error('[Netlify Connection] Verification error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      setIsConnected(false);
      return false;
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSaveConnection = async () => {
    if (!netlifyToken) {
      toast.error('Please provide a Netlify Personal Access Token');
      return;
    }

    setIsVerifying(true);

    const isValid = await verifyNetlifyCredentials();

    if (isValid) {
      Cookies.set('netlifyToken', netlifyToken);
      logStore.logSystem('Netlify connection settings updated', {
        hasToken: !!netlifyToken,
      });
      toast.success('Netlify credentials verified and saved successfully!');
      setIsConnected(true);
    } else {
      toast.error('Invalid Netlify token. Please check your Personal Access Token.');
    }
  };

  const handleDisconnect = () => {
    Cookies.remove('netlifyToken');
    setNetlifyToken('');
    setIsConnected(false);
    logStore.logSystem('Netlify connection removed');
    toast.success('Netlify connection removed successfully!');
  };

  return (
    <div className="p-4 mb-4 border border-bolt-elements-borderColor rounded-lg bg-bolt-elements-background-depth-3">
      <h3 className="text-lg font-medium text-bolt-elements-textPrimary mb-4">Netlify Connection</h3>
      <div className="flex mb-4">
        <div className="flex-1">
          <label className="block text-sm text-bolt-elements-textSecondary mb-1">Personal Access Token:</label>
          <input
            type="password"
            value={netlifyToken}
            onChange={(e) => setNetlifyToken(e.target.value)}
            disabled={isVerifying}
            className="w-full bg-white dark:bg-bolt-elements-background-depth-4 relative px-2 py-1.5 rounded-md focus:outline-none placeholder-bolt-elements-textTertiary text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary border border-bolt-elements-borderColor disabled:opacity-50"
          />
          <p className="text-xs text-bolt-elements-textTertiary mt-1">
            Create a Personal Access Token at{' '}
            <a 
              href="https://app.netlify.com/user/applications/personal" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-500 hover:underline"
            >
              Netlify Personal Access Tokens
            </a>
          </p>
        </div>
      </div>
      <div className="flex mb-4 items-center">
        {!isConnected ? (
          <button
            onClick={handleSaveConnection}
            disabled={isVerifying || !netlifyToken}
            className="bg-bolt-elements-button-primary-background rounded-lg px-4 py-2 mr-2 transition-colors duration-200 hover:bg-bolt-elements-button-primary-backgroundHover text-bolt-elements-button-primary-text disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isVerifying ? (
              <>
                <div className="i-ph:spinner animate-spin mr-2" />
                Verifying...
              </>
            ) : (
              'Connect'
            )}
          </button>
        ) : (
          <button
            onClick={handleDisconnect}
            className="bg-bolt-elements-button-danger-background rounded-lg px-4 py-2 mr-2 transition-colors duration-200 hover:bg-bolt-elements-button-danger-backgroundHover text-bolt-elements-button-danger-text"
          >
            Disconnect
          </button>
        )}
        {isConnected && (
          <span className="text-sm text-green-600 flex items-center">
            <div className="i-ph:check-circle mr-1" />
            Connected to Netlify
          </span>
        )}
      </div>
    </div>
  );
}

export default function ConnectionsTab() {
  return (
    <div>
      <GitHubConnectionSection />
      <SupabaseConnectionSection />
      <NetlifyConnectionSection />
    </div>
  );
}
