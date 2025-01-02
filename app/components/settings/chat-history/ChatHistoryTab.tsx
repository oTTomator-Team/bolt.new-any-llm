import { useNavigate } from '@remix-run/react';
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { db, deleteById, getAll } from '~/lib/persistence';
import { classNames } from '~/utils/classNames';
import styles from '~/components/settings/Settings.module.scss';
import { logStore } from '~/lib/stores/logs'; // Import logStore for event logging

export default function ChatHistoryTab() {
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const downloadAsJson = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDeleteAllChats = async () => {
    const confirmDelete = window.confirm('Are you sure you want to delete all chats? This action cannot be undone.');

    if (!confirmDelete) {
      return; // Exit if the user cancels
    }

    if (!db) {
      const error = new Error('Database is not available');
      logStore.logError('Failed to delete chats - DB unavailable', error);
      toast.error('Database is not available');

      return;
    }

    try {
      setIsDeleting(true);

      const allChats = await getAll(db);
      await Promise.all(allChats.map((chat) => deleteById(db!, chat.id)));
      logStore.logSystem('All chats deleted successfully', { count: allChats.length });
      toast.success('All chats deleted successfully');
      navigate('/', { replace: true });
    } catch (error) {
      logStore.logError('Failed to delete chats', error);
      toast.error('Failed to delete chats');
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportAllChats = async () => {
    if (!db) {
      const error = new Error('Database is not available');
      logStore.logError('Failed to export chats - DB unavailable', error);
      toast.error('Database is not available');

      return;
    }

    try {
      const allChats = await getAll(db);
      const exportData = {
        chats: allChats,
        exportDate: new Date().toISOString(),
      };

      downloadAsJson(exportData, `all-chats-${new Date().toISOString()}.json`);
      logStore.logSystem('Chats exported successfully', { count: allChats.length });
      toast.success('Chats exported successfully');
    } catch (error) {
      logStore.logError('Failed to export chats', error);
      toast.error('Failed to export chats');
      console.error(error);
    }
  };

  return (
    <>
      <div className="p-4">
        <h3 className="text-lg font-medium text-bolt-elements-textPrimary mb-4">Chat History</h3>
        <button
          onClick={handleExportAllChats}
          className={classNames(
            'bg-bolt-elements-button-primary-background',
            'rounded-lg px-4 py-2 mb-4 transition-colors duration-200',
            'hover:bg-bolt-elements-button-primary-backgroundHover',
            'text-bolt-elements-button-primary-text',
          )}
        >
          Export All Chats
        </button>

        <div
          className={classNames('text-bolt-elements-textPrimary rounded-lg py-4 mb-4', styles['settings-danger-area'])}
        >
          <h4 className="font-semibold">Danger Area</h4>
          <p className="mb-2">This action cannot be undone!</p>
          <button
            onClick={handleDeleteAllChats}
            disabled={isDeleting}
            className={classNames(
              'bg-bolt-elements-button-danger-background',
              'rounded-lg px-4 py-2 transition-colors duration-200',
              isDeleting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-bolt-elements-button-danger-backgroundHover',
              'text-bolt-elements-button-danger-text',
            )}
          >
            {isDeleting ? 'Deleting...' : 'Delete All Chats'}
          </button>
        </div>
      </div>
    </>
  );
}
