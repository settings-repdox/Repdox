// Export Registrations Edge Function (Deno + TypeScript)
// Deploy with: `supabase functions deploy export-registrations-xlsx`

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
// Use SheetJS via esm.sh (works in Deno)
import * as xlsx from "https://esm.sh/xlsx@0.18.5";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// Some CLI secret stores block envs starting with `SUPABASE_`. Accept an alternate var name as fallback.
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE");
if (!SERVICE_ROLE_KEY) console.warn("Service role key not found. Set SUPABASE_SERVICE_ROLE_KEY or SERVICE_ROLE_KEY in Function environment variables.");
const EXPORTS_BUCKET = Deno.env.get("EXPORTS_BUCKET") || "exports";
const SIGNED_URL_EXPIRES = Number(Deno.env.get("EXPORTS_SIGNED_URL_EXPIRES") || 3600); // seconds

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY ?? "", {
  global: { headers: { "x-supabase-function": "export-registrations-xlsx" } },
});

async function getUserFromAuthHeader(authHeader?: string | null) {
  if (!authHeader) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: authHeader } });
    if (!res.ok) return null;
    const json = await res.json();
    return json;
  } catch (e) {
    console.warn('Failed to fetch user from auth header', e);
    return null;
  }
}

serve(async (req: Request) => {
  try {
    if (req.method !== "POST") return new Response(null, { status: 405 });
    const body = await req.json();
    const { eventId } = body || {};
    if (!eventId) return new Response(JSON.stringify({ error: 'eventId required' }), { status: 400 });

    // Fetch event to ensure it exists
    const { data: ev, error: evErr } = await supabase
      .from('events')
      .select('id, title, created_by, organisers')
      .eq('id', eventId)
      .single();

    if (evErr || !ev) {
      console.error('Event lookup failed', evErr);
      return new Response(JSON.stringify({ error: 'event_not_found' }), { status: 404 });
    }

    // Authorize: ensure caller is an organizer or event owner
    const authHeader = req.headers.get('authorization');
    const user = await getUserFromAuthHeader(authHeader);

    let authorized = false;
    if (user && user.id && (user.id === ev.created_by)) authorized = true;

    if (!authorized && user && ev.organisers) {
      try {
        interface Organiser {
          user_id?: string;
          email?: string;
        }
        const orgs = (typeof ev.organisers === 'string' ? JSON.parse(ev.organisers) : ev.organisers) as (string | Organiser)[];
        if (Array.isArray(orgs)) {
          for (const o of orgs) {
            if (!o) continue;
            if (typeof o === 'string') {
              if (o === user.email || o === user.id) { authorized = true; break; }
            } else {
              if (o.user_id && o.user_id === user.id) { authorized = true; break; }
              if (o.email && o.email === user.email) { authorized = true; break; }
            }
          }
        }
      } catch (e) {
        console.warn('Failed to parse organisers', e);
      }
    }

    if (!authorized) {
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
    }

    const { data: regs, error: regsErr } = await supabase
      .from('event_registrations')
      .select('created_at, name, email, phone, role, status, message')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (regsErr) {
      console.error('Failed to fetch registrations', regsErr);
      return new Response(JSON.stringify({ error: 'failed_fetching_registrations' }), { status: 500 });
    }

    const rows = (regs || []).map((r) => ({
      created_at: r.created_at,
      name: r.name || '',
      email: r.email || '',
      phone: r.phone || '',
      role: r.role || '',
      status: r.status || '',
      message: r.message || '',
    }));

    // Build workbook
    const ws = xlsx.utils.json_to_sheet(rows);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'registrations');

    const wbout = xlsx.write(wb, { bookType: 'xlsx', type: 'array' });
    let u8: Uint8Array;
    if (wbout instanceof Uint8Array) u8 = wbout;
    else if (wbout instanceof ArrayBuffer) u8 = new Uint8Array(wbout);
    else u8 = new Uint8Array(wbout as ArrayBufferLike);

    const filename = `registrations-${eventId}.xlsx`;
    const path = `registrations/${eventId}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.xlsx`;

    // Upload to storage
    const uploadRes = await supabase.storage.from(EXPORTS_BUCKET).upload(path, u8, { upsert: true });
    if (uploadRes.error) {
      console.warn('Storage upload failed, falling back to base64', uploadRes.error);
      // Fallback: return base64 directly
      const b64 = xlsx.write(wb, { bookType: 'xlsx', type: 'base64' });
      return new Response(JSON.stringify({ ok: true, filename, data: b64 }), { status: 200 });
    }

    // Create signed URL
    const { data: urlData, error: urlErr } = await supabase.storage.from(EXPORTS_BUCKET).createSignedUrl(path, SIGNED_URL_EXPIRES);
    if (urlErr) {
      console.warn('Signed URL creation failed', urlErr);
      const b64 = xlsx.write(wb, { bookType: 'xlsx', type: 'base64' });
      return new Response(JSON.stringify({ ok: true, filename, data: b64 }), { status: 200 });
    }

    return new Response(JSON.stringify({ ok: true, filename, url: urlData.signedUrl, storagePath: path }), { status: 200 });
  } catch (err) {
    console.error('export-registrations-xlsx error', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
