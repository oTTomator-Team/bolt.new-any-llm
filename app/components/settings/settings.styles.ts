import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const settingsStyles = {
  // Card styles
  card: 'bg-white dark:bg-[#0A0A0A] rounded-lg p-6 border border-[#E5E5E5] dark:border-[#1A1A1A]',

  // Button styles
  button: {
    base: 'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed',
    primary: 'bg-purple-500 text-white hover:bg-purple-600',
    secondary:
      'bg-[#F5F5F5] dark:bg-[#1A1A1A] text-[#666666] dark:text-[#999999] hover:text-[#333333] dark:hover:text-white',
    danger: 'bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20',
    warning: 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100 dark:bg-yellow-500/10 dark:hover:bg-yellow-500/20',
    success: 'bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-500/10 dark:hover:bg-green-500/20',
  },

  // Form styles
  form: {
    label: 'block text-sm text-bolt-elements-textSecondary mb-2',
    input:
      'w-full px-3 py-2 rounded-lg text-sm bg-[#F8F8F8] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#333333] text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary focus:outline-none focus:ring-1 focus:ring-purple-500',
  },

  // Search container
  search: {
    input:
      'w-full h-10 pl-10 pr-4 rounded-lg text-sm bg-[#F8F8F8] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#333333] text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all',
  },

  'loading-spinner': 'i-ph:spinner-gap-bold animate-spin w-4 h-4',
} as const;
