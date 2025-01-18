import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { DialogRoot, DialogClose, Dialog, DialogTitle } from '~/components/ui/Dialog';
import { db, getAll } from '~/lib/persistence';

export default function DataTab() {
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [isImportingKeys, setIsImportingKeys] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showResetInlineConfirm, setShowResetInlineConfirm] = useState(false);
  const [showDeleteInlineConfirm, setShowDeleteInlineConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiKeyFileInputRef = useRef<HTMLInputElement>(null);

  const handleExportAllChats = async () => {
    try {
      if (!db) {
        throw new Error('Database not initialized');
      }

      // Get all chats from IndexedDB
      const allChats = await getAll(db);
      const exportData = {
        chats: allChats,
        exportDate: new Date().toISOString(),
      };

      // Download as JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bolt-chats-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Chats exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export chats');
    }
  };

  const handleExportSettings = () => {
    try {
      const settings = {
        userProfile: localStorage.getItem('bolt_user_profile'),
        settings: localStorage.getItem('bolt_settings'),
        exportDate: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bolt-settings-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Settings exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export settings');
    }
  };

  const handleImportSettings = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const content = await file.text();
      const settings = JSON.parse(content);

      if (settings.userProfile) {
        localStorage.setItem('bolt_user_profile', settings.userProfile);
      }

      if (settings.settings) {
        localStorage.setItem('bolt_settings', settings.settings);
      }

      window.location.reload(); // Reload to apply settings
      toast.success('Settings imported successfully');
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import settings');
    }
  };

  const handleImportAPIKeys = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsImportingKeys(true);

    try {
      const content = await file.text();
      const keys = JSON.parse(content);

      // Validate and save each key
      Object.entries(keys).forEach(([key, value]) => {
        if (typeof value !== 'string') {
          throw new Error(`Invalid value for key: ${key}`);
        }

        localStorage.setItem(`bolt_${key.toLowerCase()}`, value);
      });

      toast.success('API keys imported successfully');
    } catch (error) {
      console.error('Error importing API keys:', error);
      toast.error('Failed to import API keys');
    } finally {
      setIsImportingKeys(false);

      if (apiKeyFileInputRef.current) {
        apiKeyFileInputRef.current.value = '';
      }
    }
  };

  const handleDownloadTemplate = () => {
    setIsDownloadingTemplate(true);

    try {
      const template = {
        Anthropic_API_KEY: '',
        OpenAI_API_KEY: '',
        Google_API_KEY: '',
        Groq_API_KEY: '',
        HuggingFace_API_KEY: '',
        OpenRouter_API_KEY: '',
        Deepseek_API_KEY: '',
        Mistral_API_KEY: '',
        OpenAILike_API_KEY: '',
        Together_API_KEY: '',
        xAI_API_KEY: '',
        Perplexity_API_KEY: '',
        Cohere_API_KEY: '',
        AzureOpenAI_API_KEY: '',
        OPENAI_LIKE_API_BASE_URL: '',
        LMSTUDIO_API_BASE_URL: '',
        OLLAMA_API_BASE_URL: '',
        TOGETHER_API_BASE_URL: '',
      };

      const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bolt-api-keys-template.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Template downloaded successfully');
    } catch (error) {
      console.error('Error downloading template:', error);
      toast.error('Failed to download template');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleResetSettings = async () => {
    setIsResetting(true);

    try {
      // Clear all stored settings
      localStorage.removeItem('bolt_user_profile');
      localStorage.removeItem('bolt_settings');
      localStorage.removeItem('bolt_chat_history');

      // Reload the page to apply reset
      window.location.reload();
      toast.success('Settings reset successfully');
    } catch (error) {
      console.error('Reset error:', error);
      toast.error('Failed to reset settings');
    } finally {
      setIsResetting(false);
    }
  };

  const handleDeleteAllChats = async () => {
    setIsDeleting(true);

    try {
      // Clear chat history
      localStorage.removeItem('bolt_chat_history');
      toast.success('Chat history deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete chat history');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportSettings} className="hidden" />
      {/* Reset Settings Dialog */}
      <DialogRoot open={showResetInlineConfirm} onOpenChange={setShowResetInlineConfirm}>
        <Dialog showCloseButton={false}>
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="i-ph:warning-circle-fill w-5 h-5 text-yellow-500" />
              <DialogTitle>Reset All Settings?</DialogTitle>
            </div>
            <p className="text-sm text-bolt-elements-textSecondary mt-2">
              This will reset all your settings to their default values. This action cannot be undone.
            </p>
            <div className="flex justify-end items-center gap-3 mt-6">
              <DialogClose asChild>
                <button className="px-4 py-2 rounded-lg text-sm bg-[#F5F5F5] dark:bg-[#1A1A1A] text-[#666666] dark:text-[#999999] hover:text-[#333333] dark:hover:text-white">
                  Cancel
                </button>
              </DialogClose>
              <motion.button
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-white dark:bg-[#1A1A1A] text-yellow-600 dark:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-500/10 border border-transparent hover:border-yellow-500/10 dark:hover:border-yellow-500/20"
                onClick={handleResetSettings}
                disabled={isResetting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isResetting ? (
                  <div className="i-ph:spinner-gap-bold animate-spin w-4 h-4" />
                ) : (
                  <div className="i-ph:arrow-counter-clockwise w-4 h-4" />
                )}
                Reset Settings
              </motion.button>
            </div>
          </div>
        </Dialog>
      </DialogRoot>

      {/* Delete Confirmation Dialog */}
      <DialogRoot open={showDeleteInlineConfirm} onOpenChange={setShowDeleteInlineConfirm}>
        <Dialog showCloseButton={false}>
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="i-ph:warning-circle-fill w-5 h-5 text-red-500" />
              <DialogTitle>Delete All Chats?</DialogTitle>
            </div>
            <p className="text-sm text-bolt-elements-textSecondary mt-2">
              This will permanently delete all your chat history. This action cannot be undone.
            </p>
            <div className="flex justify-end items-center gap-3 mt-6">
              <DialogClose asChild>
                <button className="px-4 py-2 rounded-lg text-sm bg-[#F5F5F5] dark:bg-[#1A1A1A] text-[#666666] dark:text-[#999999] hover:text-[#333333] dark:hover:text-white">
                  Cancel
                </button>
              </DialogClose>
              <motion.button
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-white dark:bg-[#1A1A1A] text-red-500 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 border border-transparent hover:border-red-500/10 dark:hover:border-red-500/20"
                onClick={handleDeleteAllChats}
                disabled={isDeleting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isDeleting ? (
                  <div className="i-ph:spinner-gap-bold animate-spin w-4 h-4" />
                ) : (
                  <div className="i-ph:trash w-4 h-4" />
                )}
                Delete All
              </motion.button>
            </div>
          </div>
        </Dialog>
      </DialogRoot>

      {/* Chat History Section */}
      <motion.div
        className="bg-white dark:bg-[#0A0A0A] rounded-lg p-6 border border-[#E5E5E5] dark:border-[#1A1A1A]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="i-ph:chat-circle-duotone w-5 h-5 text-purple-500" />
          <h3 className="text-lg font-medium">Chat History</h3>
        </div>
        <p className="text-sm text-bolt-elements-textSecondary mb-4">Export or delete all your chat history.</p>
        <div className="flex gap-4">
          <motion.button
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500 text-white text-sm hover:bg-purple-600"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExportAllChats}
          >
            <div className="i-ph:download-simple w-4 h-4" />
            Export All Chats
          </motion.button>
          <motion.button
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-red-500 text-sm hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowDeleteInlineConfirm(true)}
          >
            <div className="i-ph:trash w-4 h-4" />
            Delete All Chats
          </motion.button>
        </div>
      </motion.div>

      {/* Settings Backup Section */}
      <motion.div
        className="bg-white dark:bg-[#0A0A0A] rounded-lg p-6 border border-[#E5E5E5] dark:border-[#1A1A1A]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="i-ph:gear-duotone w-5 h-5 text-purple-500" />
          <h3 className="text-lg font-medium">Settings Backup</h3>
        </div>
        <p className="text-sm text-bolt-elements-textSecondary mb-4">
          Export your settings to a JSON file or import settings from a previously exported file.
        </p>
        <div className="flex gap-4">
          <motion.button
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500 text-white text-sm hover:bg-purple-600"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExportSettings}
          >
            <div className="i-ph:download-simple w-4 h-4" />
            Export Settings
          </motion.button>
          <motion.button
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500 text-white text-sm hover:bg-purple-600"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="i-ph:upload-simple w-4 h-4" />
            Import Settings
          </motion.button>
          <motion.button
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-50 text-yellow-600 text-sm hover:bg-yellow-100 dark:bg-yellow-500/10 dark:hover:bg-yellow-500/20"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowResetInlineConfirm(true)}
          >
            <div className="i-ph:arrow-counter-clockwise w-4 h-4" />
            Reset Settings
          </motion.button>
        </div>
      </motion.div>

      {/* API Keys Management Section */}
      <motion.div
        className="bg-white dark:bg-[#0A0A0A] rounded-lg p-6 border border-[#E5E5E5] dark:border-[#1A1A1A]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="i-ph:key-duotone w-5 h-5 text-purple-500" />
          <h3 className="text-lg font-medium">API Keys Management</h3>
        </div>
        <p className="text-sm text-bolt-elements-textSecondary mb-4">
          Import API keys from a JSON file or download a template to fill in your keys.
        </p>
        <div className="flex gap-4">
          <input
            ref={apiKeyFileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportAPIKeys}
            className="hidden"
          />
          <motion.button
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500 text-white text-sm hover:bg-purple-600"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDownloadTemplate}
            disabled={isDownloadingTemplate}
          >
            {isDownloadingTemplate ? (
              <div className="i-ph:spinner-gap-bold animate-spin" />
            ) : (
              <div className="i-ph:download-simple w-4 h-4" />
            )}
            Download Template
          </motion.button>
          <motion.button
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500 text-white text-sm hover:bg-purple-600"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => apiKeyFileInputRef.current?.click()}
            disabled={isImportingKeys}
          >
            {isImportingKeys ? (
              <div className="i-ph:spinner-gap-bold animate-spin w-4 h-4" />
            ) : (
              <div className="i-ph:upload-simple w-4 h-4" />
            )}
            Import API Keys
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
