import React from 'react';
import { motion } from 'framer-motion';
import { classNames } from '~/utils/classNames';
import { GitBranch, Plus, FolderPlus, Folder, FileText, Copy, PencilSimple, Trash } from '@phosphor-icons/react';

interface FileTreeItem {
  name: string;
  type: 'file' | 'directory';
  size?: string;
  path: string;
  children?: FileTreeItem[];
}

interface GitHubFileTreeProps {
  items: FileTreeItem[];
  currentBranch: string;
  onCreateFile?: () => void;
  onCreateFolder?: () => void;
  onCopy?: (path: string) => void;
  onEdit?: (path: string) => void;
  onDelete?: (path: string) => void;
}

export function GitHubFileTree({
  items,
  currentBranch,
  onCreateFile,
  onCreateFolder,
  onCopy,
  onEdit,
  onDelete,
}: GitHubFileTreeProps) {
  return (
    <div className="bg-bolt-elements-background-depth-1 rounded-lg border border-bolt-elements-borderColor">
      {/* Header with branch info */}
      <div className="p-3 border-b border-bolt-elements-borderColor">
        <div className="flex items-center gap-2 text-sm text-bolt-elements-textSecondary">
          <GitBranch className="text-lg" />
          <span className="font-medium">{currentBranch}</span>
          <span className="text-bolt-elements-textTertiary">Default</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="p-3 border-b border-bolt-elements-borderColor flex gap-3">
        <button
          onClick={onCreateFile}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md 
            bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary
            hover:bg-bolt-elements-background-depth-3 transition-colors"
        >
          <Plus className="text-lg" />
          New File
        </button>
        <button
          onClick={onCreateFolder}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md 
            bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary
            hover:bg-bolt-elements-background-depth-3 transition-colors"
        >
          <FolderPlus className="text-lg" />
          New Folder
        </button>
      </div>

      {/* File list */}
      <div className="divide-y divide-bolt-elements-borderColor">
        {items.map((item) => (
          <div
            key={item.path}
            className="group px-3 py-2 flex items-center justify-between hover:bg-bolt-elements-background-depth-2"
          >
            <div className="flex items-center gap-2">
              {item.type === 'directory' ? (
                <Folder className="text-lg text-bolt-elements-textTertiary" />
              ) : (
                <FileText className="text-lg text-bolt-elements-textTertiary" />
              )}
              <span className="text-sm text-bolt-elements-textPrimary">{item.name}</span>
              {item.size && <span className="text-xs text-bolt-elements-textTertiary">{item.size}</span>}
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onCopy?.(item.path)}
                className={classNames(
                  'p-1 rounded-md text-bolt-elements-textTertiary',
                  'hover:text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3',
                )}
              >
                <Copy className="text-lg" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onEdit?.(item.path)}
                className={classNames(
                  'p-1 rounded-md text-bolt-elements-textTertiary',
                  'hover:text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3',
                )}
              >
                <PencilSimple className="text-lg" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onDelete?.(item.path)}
                className={classNames(
                  'p-1 rounded-md text-bolt-elements-textTertiary',
                  'hover:text-red-500 hover:bg-bolt-elements-background-depth-3',
                )}
              >
                <Trash className="text-lg" />
              </motion.button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
