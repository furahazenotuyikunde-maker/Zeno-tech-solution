/**
 * Supabase client configuration for ZENO TECH SOLUTION
 * To connect to your Supabase project:
 * 1. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local
 * 2. Run schema.sql in your Supabase SQL Editor
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith('http'));
};
