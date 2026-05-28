import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Edge Function: upload attachments to private `messages` bucket and call `app.send_message` RPC.
// Expects SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SERVICE_ROLE_KEY / SERVICE_ROLE) env vars.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE");
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) console.warn("SUPABASE_URL or service role key not found. Set SUPABASE_SERVICE_ROLE_KEY or SERVICE_ROLE_KEY in Function environment variables.");

const supabase = createClient(SUPABASE_URL ?? "", SERVICE_ROLE_KEY ?? "", {
  global: { headers: { "x-supabase-function": "send-message" } },
});

serve(async (req: Request) => {
  try {
    if (req.method !== "POST") return new Response(null, { status: 405 });

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response(JSON.stringify({ error: "content-type must be multipart/form-data" }), { status: 400 });
    }

    const form = await req.formData();
    const conversation_id = String(form.get("conversation_id") ?? "");
    const sender_id = String(form.get("sender_id") ?? "");
    const plaintext = String(form.get("plaintext") ?? "");

    if (!conversation_id || !sender_id || !plaintext) {
      return new Response(JSON.stringify({ error: "conversation_id, sender_id and plaintext are required" }), { status: 400 });
    }

    const attachments: Array<{ path: string; content_type?: string; size?: number }> = [];

    for (const entry of form.entries()) {
      const [key, value] = entry as [string, File | string | null];
      if (value instanceof File) {
        const file = value as File;
        const filePath = `${conversation_id}/${Date.now()}_${file.name}`;
        const fileBuffer = new Uint8Array(await file.arrayBuffer());
        const { error: uploadError } = await supabase.storage.from("messages").upload(filePath, fileBuffer, {
          contentType: file.type,
          upsert: false,
        });
        if (uploadError) throw uploadError;
        attachments.push({ path: filePath, content_type: file.type, size: file.size });
      }
    }

    const metadata = { attachments };

    // Call the DB RPC to encrypt & store message server-side
    const { data, error: rpcError } = await supabase.rpc("app.send_message", {
      p_conversation_id: conversation_id,
      p_sender_id: sender_id,
      p_plaintext: plaintext,
      p_metadata: metadata,
    });

    if (rpcError) throw rpcError;

    return new Response(JSON.stringify({ ok: true, message: data }), { status: 200 });
  } catch (err) {
    const error = err as Error;
    console.error("send-message error:", error);
    return new Response(JSON.stringify({ error: error.message || String(error) }), { status: 500 });
  }
});
