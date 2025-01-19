import { createClient } from '@supabase/supabase-js/dist/module/index.js';
import type { Database } from '~/types/supabase';

// Safely extract and validate Supabase URL
function getSafeSupabaseUrl(): string {
  // Try multiple ways to get the Supabase URL
  const rawUrls = [
    process.env.SUPABASE_URL,
    process.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_URL,
    'https://wtiwrfwgbqfmvulsktwy.supabase.co' // Fallback to the URL you provided
  ];

  for (const rawUrl of rawUrls) {
    if (rawUrl) {
      try {
        // Remove any trailing slashes and potential '/auth/v1' suffix
        const cleanUrl = rawUrl.replace(/\/+$/, '').replace(/\/auth\/v1$/, '');
        
        // Validate the URL
        new URL(cleanUrl);
        
        console.log('Using Supabase Server URL:', cleanUrl);
        return cleanUrl;
      } catch (error) {
        console.warn('Invalid Supabase Server URL:', rawUrl, error);
      }
    }
  }

  throw new Error('No valid Supabase Server URL found');
}

// Safely extract Supabase Anon Key
function getSafeSupabaseAnonKey(): string {
  // Try multiple ways to get the Supabase Anon Key
  const rawKeys = [
    process.env.SUPABASE_ANON_KEY,
    process.env.VITE_SUPABASE_ANON_KEY,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0aXdyZmdnYnFmbXZ1bHNrdHd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcyMDU0NzksImV4cCI6MjA1Mjc4MTQ3OX0.CXjiwnAZVgaDrP-B78WH67pTxLCJCtBpaC7Rol1uiME' // Fallback to the key you provided
  ];

  for (const rawKey of rawKeys) {
    if (rawKey) {
      const trimmedKey = rawKey.trim();
      if (trimmedKey) {
        console.log('Using Supabase Server Anon Key (length):', trimmedKey.length);
        return trimmedKey;
      }
    }
  }

  throw new Error('No valid Supabase Server Anon Key found');
}

// Get safe Supabase configuration
const supabaseUrl = getSafeSupabaseUrl();
const supabaseAnonKey = getSafeSupabaseAnonKey();

// Create Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Server-side authentication helper
export async function authenticateUser(email: string, password: string) {
  return await supabase.auth.signInWithPassword({
    email,
    password,
  });
}

export async function signUpUser(email: string, password: string) {
  return await supabase.auth.signUp({
    email,
    password,
  });
}

export async function signOutUser() {
  return await supabase.auth.signOut();
}
