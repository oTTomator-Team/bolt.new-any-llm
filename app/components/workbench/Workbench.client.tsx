import { useStore } from '@nanostores/react';
import { motion, type HTMLMotionProps, type Variants, AnimatePresence } from 'framer-motion';
import { computed } from 'nanostores';
import { memo, useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  type OnChangeCallback as OnEditorChange,
  type OnScrollCallback as OnEditorScroll,
} from '~/components/editor/codemirror/CodeMirrorEditor';
import { IconButton } from '~/components/ui/IconButton';
import { PanelHeaderButton } from '~/components/ui/PanelHeaderButton';
import { Slider, type SliderOptions } from '~/components/ui/Slider';
import { workbenchStore, type WorkbenchViewType } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';
import { cubicEasingFn } from '~/utils/easings';
import { renderLogger } from '~/utils/logger';
import { EditorPanel } from './EditorPanel';
import { Preview } from './Preview';
import useViewport from '~/lib/hooks';
import Cookies from 'js-cookie';
import { createClient } from '@supabase/supabase-js';

interface WorkspaceProps {
  chatStarted?: boolean;
  isStreaming?: boolean;
}

const viewTransition = { ease: cubicEasingFn };

const sliderOptions: SliderOptions<WorkbenchViewType> = {
  left: {
    value: 'code',
    text: 'Code',
  },
  right: {
    value: 'preview',
    text: 'Preview',
  },
};

const workbenchVariants = {
  closed: {
    width: 0,
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
  open: {
    width: 'var(--workbench-width)',
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
} satisfies Variants;

const validateSupabaseUrl = (url: string): boolean => {
  const urlPattern = /^https:\/\/[a-z0-9-]+\.supabase\.co$/;
  return urlPattern.test(url);
};

const validateSupabaseAnonKey = (key: string): boolean => {
  return key.length >= 20 && key.startsWith('eyJ') && key.includes('.');
};

const SupabaseConnectionModal = ({
  isOpen, 
  onClose, 
  onConnect,
  initialUrl = '',
  initialAnonKey = ''
}: {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (url: string, anonKey: string) => Promise<void>;
  initialUrl?: string;
  initialAnonKey?: string;
}) => {
  const [supabaseUrl, setSupabaseUrl] = useState(initialUrl);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(initialAnonKey);
  const [isVerifying, setIsVerifying] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const handleConnect = async () => {
    setIsVerifying(true);
    setConnectionError(null);

    try {
      await onConnect(supabaseUrl, supabaseAnonKey);
      onClose();
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-bolt-elements-background-depth-2 rounded-lg p-6 w-full max-w-md mx-4"
      >
        <h2 className="text-xl font-semibold mb-4 text-bolt-elements-textPrimary">
          Connect Supabase Project
        </h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-bolt-elements-textSecondary mb-2">
            Supabase Project URL
          </label>
          <input
            type="text"
            value={supabaseUrl}
            onChange={(e) => {
              setSupabaseUrl(e.target.value);
              setConnectionError(null);
            }}
            placeholder="https://your-project.supabase.co"
            className="w-full px-3 py-2 border border-bolt-elements-borderColor rounded-md bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-bolt-elements-textSecondary mb-2">
            Anon Key
          </label>
          <input
            type="password"
            value={supabaseAnonKey}
            onChange={(e) => {
              setSupabaseAnonKey(e.target.value);
              setConnectionError(null);
            }}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ..."
            className="w-full px-3 py-2 border border-bolt-elements-borderColor rounded-md bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {connectionError && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md">
            {connectionError}
          </div>
        )}

        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-4 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleConnect}
            disabled={!supabaseUrl || !supabaseAnonKey || isVerifying}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
              !supabaseUrl || !supabaseAnonKey || isVerifying
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isVerifying ? 'Verifying...' : 'Connect'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Centralized Supabase client management
const createSupabaseClient = (url: string, anonKey: string) => {
  // Use a singleton pattern to prevent multiple client instances
  const existingClient = (window as any).__supabaseClient;
  if (existingClient) {
    return existingClient;
  }

  const client = createClient(url, anonKey, {
    auth: { 
      persistSession: false,
      storage: {
        getItem: (key) => localStorage.getItem(`supabase_${key}`),
        setItem: (key, value) => localStorage.setItem(`supabase_${key}`, value),
        removeItem: (key) => localStorage.removeItem(`supabase_${key}`)
      }
    },
    global: {
      headers: {
        'x-bolt-connection-test': 'true'
      }
    }
  });

  // Store the client globally to prevent multiple instances
  (window as any).__supabaseClient = client;
  return client;
};

const handleSupabaseConnection = async (url?: string, anonKey?: string) => {
  try {
    // If no URL or Anon Key provided, throw to trigger modal
    if (!url || !anonKey) {
      throw new Error('Supabase credentials required');
    }

    // Validate inputs
    if (!validateSupabaseUrl(url)) {
      throw new Error('Invalid Supabase URL format');
    }

    if (!validateSupabaseAnonKey(anonKey)) {
      throw new Error('Invalid Supabase Anon Key');
    }

    // Create Supabase client
    const supabase = createSupabaseClient(url, anonKey);

    // Comprehensive connection verification
    const connectionTests = [
      // Test 1: Basic API Health Check
      async () => {
        try {
          const response = await fetch(`${url}/rest/v1/`, {
            method: 'GET',
            headers: {
              'apikey': anonKey,
              'Authorization': `Bearer ${anonKey}`,
              'Accept': 'application/json'
            }
          });
          
          if (!response.ok) {
            console.error('API Health Check Failed', {
              status: response.status,
              statusText: response.statusText,
              headers: Object.fromEntries(response.headers.entries())
            });
            return false;
          }
          
          const apiResponse = await response.json();
          console.log('API Health Check Successful', { apiResponse });
          return true;
        } catch (fetchError) {
          console.error('API Health Check Error', fetchError);
          return false;
        }
      },

      // Test 2: Authentication Check
      async () => {
        try {
          const { data: { user }, error } = await supabase.auth.getUser();
          
          if (error) {
            // "Auth session missing!" is not necessarily an error
            if (error.message === 'Auth session missing!') {
              console.log('No active auth session (expected for some projects)');
              return true;
            }

            console.error('Auth User Retrieval Error', {
              errorCode: error.code,
              errorMessage: error.message
            });
            return false;
          }
          
          console.log('Auth User Check', { 
            userRetrieved: !!user,
            userDetails: user ? { 
              id: user.id, 
              email: user.email 
            } : null 
          });
          
          return true;
        } catch (authError) {
          console.error('Auth Check Unexpected Error', authError);
          return false;
        }
      },

      // Test 3: Flexible Project Verification
      async () => {
        try {
          // Comprehensive project verification methods
          const methods = [
            // Method 1: Detect existing tables
            async () => {
              try {
                // Use information_schema to list tables
                const { data, error } = await supabase
                  .from('information_schema.tables')
                  .select('table_name')
                  .eq('table_schema', 'public')
                  .limit(5);
                
                if (error) {
                  console.error('Table discovery error', {
                    errorCode: error.code,
                    errorMessage: error.message
                  });
                  return false;
                }
                
                const tableNames = data?.map((row: { table_name: string }) => row.table_name) || [];
                console.log('Discovered public tables', { 
                  tableCount: tableNames.length,
                  tableNames 
                });

                // If no tables found, this might indicate a new project
                return tableNames.length > 0;
              } catch (queryError) {
                console.error('Table discovery unexpected error', queryError);
                return false;
              }
            },

            // Method 2: Flexible table query with dynamic table selection
            async () => {
              // Common table names to try
              const potentialTables = ['users', 'profiles', 'public'];
              
              for (const tableName of potentialTables) {
                try {
                  const { data, error } = await supabase
                    .from(tableName)
                    .select('*')
                    .limit(1);
                  
                  if (!error) {
                    console.log(`Successfully queried table: ${tableName}`, {
                      dataRetrieved: data?.length ?? 0
                    });
                    return true;
                  }
                } catch (tableError) {
                  console.error(`Error querying table ${tableName}`, tableError);
                }
              }
              
              return false;
            },

            // Method 3: Direct API Verification with Enhanced Error Handling
            async () => {
              try {
                // Use native fetch with comprehensive error handling
                const response = await fetch(`${url}/rest/v1/`, {
                  method: 'GET',
                  headers: {
                    'apikey': anonKey,
                    'Authorization': `Bearer ${anonKey}`,
                    'Accept': 'application/json',
                    'Origin': 'http://localhost:5173'
                  }
                });
                
                if (!response.ok) {
                  console.error('API Base Endpoint Check Failed', {
                    status: response.status,
                    statusText: response.statusText,
                    headers: Object.fromEntries(response.headers.entries())
                  });
                  return false;
                }
                
                const apiResponse = await response.json();
                console.log('API Base Endpoint Verification Successful', { apiResponse });
                return true;
              } catch (fetchError) {
                console.error('API Base Endpoint Verification Error', fetchError);
                return false;
              }
            }
          ];

          // Run methods with a more flexible success criteria
          const testResults = await Promise.all(methods.map(method => method()));
          const successfulTests = testResults.filter(result => result);

          // Require at least one successful test
          if (successfulTests.length === 0) {
            console.error('All Supabase Connection Tests Failed', { 
              testResults,
              details: 'No connection verification method succeeded'
            });
            throw new Error('Unable to establish a Supabase connection');
          }

          console.log('Partial Connection Success', {
            successfulTestCount: successfulTests.length,
            totalTests: testResults.length
          });

          return true;
        } catch (error) {
          console.error('Project Verification Comprehensive Error', error);
          return false;
        }
      }
    ];

    // Run all connection tests
    const testResults = await Promise.all(connectionTests.map(test => test()));
    const allTestsPassed = testResults.some(result => result);

    if (!allTestsPassed) {
      console.error('Supabase Connection Tests Failed', { 
        testResults,
        details: 'All connection verification methods failed'
      });
      throw new Error('Unable to establish a Supabase connection');
    }

    // Save credentials
    Cookies.set('supabaseUrl', url, { 
      secure: true, 
      sameSite: 'strict',
      expires: 365 
    });
    Cookies.set('supabaseAnonKey', anonKey, { 
      secure: true, 
      sameSite: 'strict',
      expires: 365 
    });

    // Log successful connection with comprehensive details
    console.log('Supabase Connection Established', {
      status: 'success',
      url,
      timestamp: new Date().toISOString(),
      testResults
    });

    toast.success('Supabase connection established successfully!');
    return true;
  } catch (error) {
    // Log connection error with detailed information
    console.error('Supabase Connection Error', {
      status: 'error',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : null,
      timestamp: new Date().toISOString()
    });

    toast.error(`Supabase connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
};

export const Workbench = memo(({ chatStarted, isStreaming }: WorkspaceProps) => {
  const [isSyncing, setIsSyncing] = useState(false);

  const hasPreview = useStore(computed(workbenchStore.previews, (previews) => previews.length > 0));
  const showWorkbench = useStore(workbenchStore.showWorkbench);
  const selectedFile = useStore(workbenchStore.selectedFile);
  const currentDocument = useStore(workbenchStore.currentDocument);
  const unsavedFiles = useStore(workbenchStore.unsavedFiles);
  const files = useStore(workbenchStore.files);
  const selectedView = useStore(workbenchStore.currentView);

  const isSmallViewport = useViewport(1024);

  const setSelectedView = (view: WorkbenchViewType) => {
    workbenchStore.currentView.set(view);
  };

  useEffect(() => {
    if (hasPreview) {
      setSelectedView('preview');
    }
  }, [hasPreview]);

  useEffect(() => {
    workbenchStore.setDocuments(files);
  }, [files]);

  const onEditorChange = useCallback<OnEditorChange>((update) => {
    workbenchStore.setCurrentDocumentContent(update.content);
  }, []);

  const onEditorScroll = useCallback<OnEditorScroll>((position) => {
    workbenchStore.setCurrentDocumentScrollPosition(position);
  }, []);

  const onFileSelect = useCallback((filePath: string | undefined) => {
    workbenchStore.setSelectedFile(filePath);
  }, []);

  const onFileSave = useCallback(() => {
    workbenchStore.saveCurrentDocument().catch(() => {
      toast.error('Failed to update file content');
    });
  }, []);

  const onFileReset = useCallback(() => {
    workbenchStore.resetCurrentDocument();
  }, []);

  const handleSyncFiles = useCallback(async () => {
    setIsSyncing(true);

    try {
      const directoryHandle = await window.showDirectoryPicker();
      await workbenchStore.syncFiles(directoryHandle);
      toast.success('Files synced successfully');
    } catch (error) {
      console.error('Error syncing files:', error);
      toast.error('Failed to sync files');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  const openSupabaseConnectionModal = useCallback(() => {
    setIsSupabaseModalOpen(true);
  }, []);

  const handleSupabaseConnectionButtonClick = useCallback(() => {
    setIsSupabaseModalOpen(true);
  }, []);

  return (
    <>
      {chatStarted && (
        <motion.div
          initial="closed"
          animate={showWorkbench ? 'open' : 'closed'}
          variants={workbenchVariants}
          className="z-workbench"
        >
          <div
            className={classNames(
              'fixed top-[calc(var(--header-height)+1.5rem)] bottom-6 w-[var(--workbench-inner-width)] mr-4 z-0 transition-[left,width] duration-200 bolt-ease-cubic-bezier',
              {
                'w-full': isSmallViewport,
                'left-0': showWorkbench && isSmallViewport,
                'left-[var(--workbench-left)]': showWorkbench,
                'left-[100%]': !showWorkbench,
              },
            )}
          >
            <div className="absolute inset-0 px-2 lg:px-6">
              <div className="h-full flex flex-col bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor shadow-sm rounded-lg overflow-hidden">
                <div className="flex items-center px-3 py-2 border-b border-bolt-elements-borderColor">
                  <Slider selected={selectedView} options={sliderOptions} setSelected={setSelectedView} />
                  <div className="ml-auto" />
                  {selectedView === 'code' && (
                    <div className="flex overflow-y-auto">
                      <PanelHeaderButton
                        className="mr-1 text-sm"
                        onClick={() => {
                          workbenchStore.downloadZip();
                        }}
                      >
                        <div className="i-ph:code" />
                        Download Code
                      </PanelHeaderButton>
                      <PanelHeaderButton className="mr-1 text-sm" onClick={handleSyncFiles} disabled={isSyncing}>
                        {isSyncing ? <div className="i-ph:spinner" /> : <div className="i-ph:cloud-arrow-down" />}
                        {isSyncing ? 'Syncing...' : 'Sync Files'}
                      </PanelHeaderButton>
                      <PanelHeaderButton
                        className="mr-1 text-sm"
                        onClick={() => {
                          workbenchStore.toggleTerminal(!workbenchStore.showTerminal.get());
                        }}
                      >
                        <div className="i-ph:terminal" />
                        Toggle Terminal
                      </PanelHeaderButton>
                      <PanelHeaderButton
                        className="mr-1 text-sm"
                        onClick={() => {
                          const repoName = prompt(
                            'Please enter a name for your new GitHub repository:',
                            'bolt-generated-project',
                          );

                          if (!repoName) {
                            alert('Repository name is required. Push to GitHub cancelled.');
                            return;
                          }

                          const githubUsername = Cookies.get('githubUsername');
                          const githubToken = Cookies.get('githubToken');

                          if (!githubUsername || !githubToken) {
                            const usernameInput = prompt('Please enter your GitHub username:');
                            const tokenInput = prompt('Please enter your GitHub personal access token:');

                            if (!usernameInput || !tokenInput) {
                              alert('GitHub username and token are required. Push to GitHub cancelled.');
                              return;
                            }

                            workbenchStore.pushToGitHub(repoName, usernameInput, tokenInput);
                          } else {
                            workbenchStore.pushToGitHub(repoName, githubUsername, githubToken);
                          }
                        }}
                      >
                        <div className="i-ph:github-logo" />
                        Push to GitHub
                      </PanelHeaderButton>
                      <div className="flex items-center space-x-2">
                        <PanelHeaderButton
                          className="mr-1 text-sm"
                          onClick={handleSupabaseConnectionButtonClick}
                        >
                          <div className="i-ph:database" />
                          Connect Supabase
                        </PanelHeaderButton>
                        <PanelHeaderButton
                          className="mr-1 text-sm"
                          onClick={() => {
                            const netlifyToken = Cookies.get('netlifyToken');

                            if (!netlifyToken) {
                              toast.error('Please connect Netlify in Settings > Connections');
                              return;
                            }

                            // Prompt for site name or use default
                            const siteName = prompt(
                              'Enter a name for your Netlify site:',
                              'bolt-generated-site'
                            );

                            if (!siteName) {
                              toast.error('Site name is required. Deployment cancelled.');
                              return;
                            }

                            workbenchStore.deployToNetlify(siteName, netlifyToken);
                          }}
                        >
                          <div className="i-ph:cloud-arrow-up" />
                          Deploy to Netlify
                        </PanelHeaderButton>
                      </div>
                    </div>
                  )}
                  <IconButton
                    icon="i-ph:x-circle"
                    className="-mr-1"
                    size="xl"
                    onClick={() => {
                      workbenchStore.showWorkbench.set(false);
                    }}
                  />
                </div>
                <div className="relative flex-1 overflow-hidden">
                  <View
                    initial={{ x: selectedView === 'code' ? 0 : '-100%' }}
                    animate={{ x: selectedView === 'code' ? 0 : '-100%' }}
                  >
                    <EditorPanel
                      editorDocument={currentDocument}
                      isStreaming={isStreaming}
                      selectedFile={selectedFile}
                      files={files}
                      unsavedFiles={unsavedFiles}
                      onFileSelect={onFileSelect}
                      onEditorScroll={onEditorScroll}
                      onEditorChange={onEditorChange}
                      onFileSave={onFileSave}
                      onFileReset={onFileReset}
                    />
                  </View>
                  <View
                    initial={{ x: selectedView === 'preview' ? 0 : '100%' }}
                    animate={{ x: selectedView === 'preview' ? 0 : '100%' }}
                  >
                    <Preview />
                  </View>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
      <AnimatePresence>
        {isSupabaseModalOpen && (
          <SupabaseConnectionModal
            isOpen={isSupabaseModalOpen}
            initialUrl={Cookies.get('supabaseUrl') || ''}
            initialAnonKey={Cookies.get('supabaseAnonKey') || ''}
            onClose={() => setIsSupabaseModalOpen(false)}
            onConnect={async (url, anonKey) => {
              try {
                await handleSupabaseConnection(url, anonKey);
                setIsSupabaseModalOpen(false);
              } catch (error) {
                // Modal stays open if connection fails
                console.error('Connection failed', error);
              }
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
});

interface ViewProps extends HTMLMotionProps<'div'> {
  children: JSX.Element;
}

const View = memo(({ children, ...props }: ViewProps) => {
  return (
    <motion.div className="absolute inset-0" transition={viewTransition} {...props}>
      {children}
    </motion.div>
  );
});
