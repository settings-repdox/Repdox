/// <reference types="node" />
import { createClient } from '@supabase/supabase-js';

// Usage: set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars then run `ts-node scripts/create_message_bucket.ts`
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // service role key required to create buckets

if (!supabaseUrl || !supabaseKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createBucket() {
  const bucketName = 'messages';
  console.log('Creating bucket:', bucketName);
  const { data, error } = await supabase.storage.createBucket(bucketName, {
    public: false,
    // Put sensible defaults; adjust lifecycle/retention as needed in dashboard
  });

  if (error) {
    if ((error as any).status === 409) {
      console.log('Bucket already exists.');
      return;
    }
    console.error('Error creating bucket:', error);
    process.exit(1);
  }

  console.log('Bucket created:', data);
}

createBucket().catch((err) => {
  console.error(err);
  process.exit(1);
});
