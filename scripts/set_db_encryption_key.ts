/// <reference types="node" />
import { createClient } from '@supabase/supabase-js';

// Usage: set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars then run
//   ts-node scripts/set_db_encryption_key.ts <base64_key>
// This script inserts a key into app.encryption_keys via the app.set_encryption_key RPC.

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
  process.exit(1);
}

const client = createClient(supabaseUrl, supabaseKey);

async function setKey(key: string) {
  // Call the public wrapper so PostgREST / REST RPCs and the client can resolve the function in schema cache.
  const { data, error } = await client.rpc('set_encryption_key', { p_key: key, p_activate: true } as any);
  if (error) {
    console.error('Error setting encryption key via RPC:', error);
    process.exit(1);
  }
  console.log('Encryption key inserted and activated in app.encryption_keys (via public wrapper).');
  console.log('Keep your key safe: do NOT commit to source control. Consider rotating and storing in a KMS.');
}

const key = process.argv[2];
if (!key) {
  console.error('Usage: ts-node scripts/set_db_encryption_key.ts <base64_key>');
  process.exit(1);
}

setKey(key).catch((err) => console.error(err));
