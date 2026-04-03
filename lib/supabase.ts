import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if Supabase is configured
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database Types
export interface Account {
  id: string;
  user_id: string;
  name: string;
  broker: string;
  account_number: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface Trade {
  id: string;
  user_id: string;
  account_id: string;
  symbol: string;
  entry_price: number;
  exit_price: number | null;
  position_size: number;
  entry_date: string;
  exit_date: string | null;
  profit_loss: number;
  strategy: string | null;
  notes: string | null;
  status: 'open' | 'closed';
  created_at: string;
  updated_at: string;
}

export interface Strategy {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  completed: boolean;
  created_at: string;
}

export interface TradingRule {
  id: string;
  user_id: string;
  rule_text: string;
  completed: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}
