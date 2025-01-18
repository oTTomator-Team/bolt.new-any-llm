import type { ReactNode } from 'react';

export type SettingCategory = 'profile' | 'file_sharing' | 'connectivity' | 'system' | 'services' | 'preferences';
export type TabType =
  | 'profile'
  | 'data'
  | 'providers'
  | 'features'
  | 'debug'
  | 'event-logs'
  | 'connection'
  | 'preferences';

export interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  password?: string;
  bio?: string;
  language: string;
  timezone: string;
}

export interface SettingItem {
  id: TabType;
  label: string;
  icon: string;
  category: SettingCategory;
  description?: string;
  component: () => ReactNode;
  badge?: string;
  keywords?: string[];
}

export const categoryLabels: Record<SettingCategory, string> = {
  profile: 'Profile & Account',
  file_sharing: 'File Sharing',
  connectivity: 'Connectivity',
  system: 'System',
  services: 'Services',
  preferences: 'Preferences',
};

export const categoryIcons: Record<SettingCategory, string> = {
  profile: 'i-ph:user-circle',
  file_sharing: 'i-ph:folder-simple',
  connectivity: 'i-ph:wifi-high',
  system: 'i-ph:gear',
  services: 'i-ph:cube',
  preferences: 'i-ph:sliders',
};
