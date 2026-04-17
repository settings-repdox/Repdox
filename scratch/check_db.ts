import { supabase } from "../src/integrations/supabase/client";

async function checkColumns() {
  const { data, error } = await supabase.from('events').select('*').limit(1);
  if (error) {
    console.error("Error fetching event:", error);
    return;
  }
  if (data && data.length > 0) {
    console.log("Event columns:", Object.keys(data[0]));
    console.log("Event data sample:", data[0]);
  } else {
    console.log("No events found in table.");
  }
}

checkColumns();
