import { createClient } from '@supabase/supabase-js';

// Supabase configuration - these will need to be added to environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️  Supabase configuration missing. Direct Supabase fallback will not work.');
  console.warn('Add REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY to your .env file');
}

// Create Supabase client for direct access
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

console.log('🔧 Supabase client initialized:', supabase ? '✅ Ready' : '❌ Not configured');

export default supabase;
