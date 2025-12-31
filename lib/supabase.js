import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Kita pakai createClient standar agar tidak bentrok dengan versi library
export const supabase = createClient(supabaseUrl, supabaseAnonKey);