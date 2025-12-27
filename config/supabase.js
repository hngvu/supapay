import { createClient } from '@supabase/supabase-js';

// Tạo client Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default supabase;