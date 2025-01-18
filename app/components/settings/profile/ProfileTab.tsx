import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { classNames } from '~/utils/classNames';
import { Switch } from '~/components/ui/Switch';
import type { UserProfile } from '~/components/settings/settings.types';
import { themeStore, kTheme } from '~/lib/stores/theme';
import { motion } from 'framer-motion';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
const MIN_PASSWORD_LENGTH = 8;

export default function ProfileTab() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentTimezone, setCurrentTimezone] = useState('');
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('bolt_user_profile');
    return saved
      ? JSON.parse(saved)
      : {
          name: '',
          email: '',
          theme: 'system',
          notifications: true,
          language: 'en',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          password: '',
          bio: '',
        };
  });

  useEffect(() => {
    setCurrentTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  // Apply theme when profile changes
  useEffect(() => {
    if (profile.theme === 'system') {
      // Remove theme override
      localStorage.removeItem(kTheme);

      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.querySelector('html')?.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      // Set specific theme
      localStorage.setItem(kTheme, profile.theme);
      document.querySelector('html')?.setAttribute('data-theme', profile.theme);
      themeStore.set(profile.theme);
    }
  }, [profile.theme]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error('Please upload a valid image file (JPEG, PNG, or GIF)');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setIsLoading(true);

    try {
      const reader = new FileReader();

      reader.onloadend = () => {
        setProfile((prev) => ({ ...prev, avatar: reader.result as string }));
        setIsLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile.name.trim()) {
      toast.error('Name is required');
      return;
    }

    if (!profile.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (profile.password && profile.password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
      return;
    }

    setIsLoading(true);

    try {
      localStorage.setItem('bolt_user_profile', JSON.stringify(profile));
      toast.success('Profile settings saved successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile settings');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        {/* Profile Information */}
        <motion.div
          className="bg-white dark:bg-[#0A0A0A] rounded-lg shadow-sm dark:shadow-none"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 px-4 pt-4 pb-2">
            <div className="i-ph:user-circle-fill w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-bolt-elements-textPrimary">Personal Information</span>
          </div>
          <div className="flex items-start gap-4 p-4">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-12 h-12 rounded-lg bg-[#F5F5F5] dark:bg-[#1A1A1A] flex items-center justify-center overflow-hidden">
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <div className="i-ph:spinner-gap-bold animate-spin text-purple-500" />
                  ) : profile.avatar ? (
                    <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="i-ph:user-circle-fill text-bolt-elements-textSecondary" />
                  )}
                </AnimatePresence>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
              >
                <div className="i-ph:camera-fill text-white" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_FILE_TYPES.join(',')}
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            {/* Profile Fields */}
            <div className="flex-1 space-y-3">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <div className="i-ph:user-fill w-4 h-4 text-bolt-elements-textTertiary" />
                </div>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter your name"
                  className={classNames(
                    'w-full px-3 py-1.5 rounded-lg text-sm',
                    'pl-10',
                    'bg-[#F5F5F5] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#333333]',
                    'text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary',
                    'focus:outline-none focus:ring-1 focus:ring-purple-500',
                  )}
                />
              </div>

              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <div className="i-ph:envelope-fill w-4 h-4 text-bolt-elements-textTertiary" />
                </div>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your email"
                  className={classNames(
                    'w-full px-3 py-1.5 rounded-lg text-sm',
                    'pl-10',
                    'bg-[#F5F5F5] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#333333]',
                    'text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary',
                    'focus:outline-none focus:ring-1 focus:ring-purple-500',
                  )}
                />
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={profile.password}
                  onChange={(e) => setProfile((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter new password"
                  className={classNames(
                    'w-full px-3 py-1.5 rounded-lg text-sm',
                    'bg-[#F5F5F5] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#333333]',
                    'text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary',
                    'focus:outline-none focus:ring-1 focus:ring-purple-500',
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={classNames(
                    'absolute right-3 top-1/2 -translate-y-1/2',
                    'flex items-center justify-center',
                    'w-6 h-6 rounded-md',
                    'text-bolt-elements-textSecondary',
                    'hover:text-bolt-elements-item-contentActive',
                    'hover:bg-bolt-elements-item-backgroundActive',
                    'transition-colors',
                  )}
                >
                  <div className={classNames(showPassword ? 'i-ph:eye-slash-fill' : 'i-ph:eye-fill', 'w-4 h-4')} />
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Theme & Language */}
        <motion.div
          className="bg-white dark:bg-[#0A0A0A] rounded-lg shadow-sm dark:shadow-none p-4 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="i-ph:palette-fill w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-bolt-elements-textPrimary">Appearance</span>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="i-ph:paint-brush-fill w-4 h-4 text-bolt-elements-textSecondary" />
              <label className="block text-sm text-bolt-elements-textSecondary">Theme</label>
            </div>
            <div className="flex gap-2">
              {(['light', 'dark', 'system'] as const).map((theme) => (
                <button
                  key={theme}
                  onClick={() => setProfile((prev) => ({ ...prev, theme }))}
                  className={classNames(
                    'px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors',
                    profile.theme === theme
                      ? 'bg-purple-500 text-white hover:bg-purple-600'
                      : 'bg-[#F5F5F5] dark:bg-[#1A1A1A] text-bolt-elements-textSecondary hover:bg-[#E5E5E5] dark:hover:bg-[#252525] hover:text-bolt-elements-textPrimary',
                  )}
                >
                  <div
                    className={`w-4 h-4 ${
                      theme === 'light'
                        ? 'i-ph:sun-fill'
                        : theme === 'dark'
                          ? 'i-ph:moon-stars-fill'
                          : 'i-ph:monitor-fill'
                    }`}
                  />
                  <span className="capitalize">{theme}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="i-ph:translate-fill w-4 h-4 text-bolt-elements-textSecondary" />
              <label className="block text-sm text-bolt-elements-textSecondary">Language</label>
            </div>
            <select
              value={profile.language}
              onChange={(e) => setProfile((prev) => ({ ...prev, language: e.target.value }))}
              className={classNames(
                'w-full px-3 py-1.5 rounded-lg text-sm',
                'bg-[#F5F5F5] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#333333]',
                'text-bolt-elements-textPrimary',
                'focus:outline-none focus:ring-1 focus:ring-purple-500',
              )}
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="it">Italiano</option>
              <option value="pt">Português</option>
              <option value="ru">Русский</option>
              <option value="zh">中文</option>
              <option value="ja">日本語</option>
              <option value="ko">한국어</option>
            </select>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="i-ph:bell-fill w-4 h-4 text-bolt-elements-textSecondary" />
              <label className="block text-sm text-bolt-elements-textSecondary">Notifications</label>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-bolt-elements-textSecondary">
                {profile.notifications ? 'Notifications are enabled' : 'Notifications are disabled'}
              </span>
              <Switch
                checked={profile.notifications}
                onCheckedChange={(checked) => setProfile((prev) => ({ ...prev, notifications: checked }))}
              />
            </div>
          </div>
        </motion.div>

        {/* Timezone */}
        <div className="bg-white dark:bg-[#0A0A0A] rounded-lg shadow-sm dark:shadow-none p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="i-ph:clock-fill w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-bolt-elements-textPrimary">Time Settings</span>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <div className="i-ph:globe-fill w-4 h-4 text-bolt-elements-textSecondary" />
            <label className="block text-sm text-bolt-elements-textSecondary">Timezone</label>
          </div>
          <div className="flex gap-2">
            <select
              value={profile.timezone}
              onChange={(e) => setProfile((prev) => ({ ...prev, timezone: e.target.value }))}
              className={classNames(
                'flex-1 px-3 py-1.5 rounded-lg text-sm',
                'bg-[#F5F5F5] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#333333]',
                'text-bolt-elements-textPrimary',
                'focus:outline-none focus:ring-1 focus:ring-purple-500',
              )}
            >
              {Intl.supportedValuesOf('timeZone').map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <button
              onClick={() => setProfile((prev) => ({ ...prev, timezone: currentTimezone }))}
              className={classNames(
                'px-3 py-1.5 rounded-lg text-sm flex items-center gap-2',
                'bg-[#F5F5F5] dark:bg-[#1A1A1A] text-bolt-elements-textSecondary',
                'hover:text-bolt-elements-textPrimary',
              )}
            >
              <div className="i-ph:crosshair-simple-fill" />
              Auto-detect
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <motion.div
        className="flex justify-end mt-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <button
          onClick={handleSave}
          disabled={isLoading}
          className={classNames(
            'px-4 py-2 rounded-lg text-sm flex items-center gap-2',
            'bg-purple-500 text-white',
            'hover:bg-purple-600',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {isLoading ? (
            <>
              <div className="i-ph:spinner-gap-bold animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <div className="i-ph:check-circle-fill" />
              Save Changes
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
}
