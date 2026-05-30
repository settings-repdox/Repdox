import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('event_registrations').select('*');
  console.log("Central table registrations:", data?.length, error);
  if (data?.length > 0) {
    console.log("Sample:", data[0]);
  }
}
run();
