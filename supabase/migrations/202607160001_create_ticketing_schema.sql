-- Ticketing & QR Check-in System — schema.
--
-- Design notes (see docs/architecture/domain-model/README.md and ADR 0007
-- for the full writeup):
--   * qr_token is a 256-bit random hex string (gen_random_bytes(32)) — never
--     derived from the row's sequential id, per the "no sequential IDs in
--     QR codes" requirement. It is the only thing embedded in the QR code;
--     the QR never carries participant name/email/etc.
--   * ticket_code is a short human-readable code (e.g. RPDX-A3F9-K2M7) for
--     manual entry at the scanner when a camera isn't available/practical.
--     It is NOT a security credential by itself in the same sense as
--     qr_token (fewer bits of entropy, meant to be read/typed by a human),
--     so check-in still requires it to match a real ticket server-side —
--     see check_in_ticket() below — but it should not be treated as
--     interchangeable with qr_token for anything security-sensitive.
--   * A partial unique index (not a plain UNIQUE column) enforces "one
--     *active* ticket per registration" — reissuing a ticket cancels the
--     old one rather than deleting it, so the audit trail survives, and a
--     plain UNIQUE constraint would block that.

create extension if not exists "pgcrypto";

-- Organisers enable ticketing per event, and can define named gates/entry
-- points the scanner's gate selector will offer.
alter table public.events
  add column if not exists ticketing_enabled boolean not null default false;
alter table public.events
  add column if not exists ticket_gates text[] not null default '{}';

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  registration_id uuid not null references public.event_registrations(id) on delete cascade,
  ticket_code text not null,
  qr_token text not null,
  status text not null default 'VALID' check (status in ('VALID', 'USED', 'CANCELLED')),
  ticket_type text not null default 'participant'
    check (ticket_type in ('participant', 'volunteer', 'judge', 'sponsor', 'media', 'staff')),
  -- Optional gaming-event fields, shown to the scanner at check-in when present.
  gaming_meta jsonb,
  checked_in_at timestamptz,
  checked_in_by uuid references auth.users(id) on delete set null,
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users(id) on delete set null,
  cancelled_reason text,
  reissued_from uuid references public.tickets(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists tickets_qr_token_uidx on public.tickets(qr_token);
create unique index if not exists tickets_ticket_code_uidx on public.tickets(ticket_code);
-- One *active* (non-cancelled) ticket per registration — see design notes above.
create unique index if not exists tickets_registration_active_uidx
  on public.tickets(registration_id) where status <> 'CANCELLED';
create index if not exists tickets_event_id_idx on public.tickets(event_id);
create index if not exists tickets_event_status_idx on public.tickets(event_id, status);
create index if not exists tickets_registration_id_idx on public.tickets(registration_id);

create table if not exists public.ticket_scans (
  id uuid primary key default gen_random_uuid(),
  -- Nullable: an INVALID scan (unrecognized token) has no real ticket to
  -- reference, but we still want the audit row — see design notes above.
  ticket_id uuid references public.tickets(id) on delete set null,
  event_id uuid not null references public.events(id) on delete cascade,
  scanned_token text not null,
  scanned_by uuid references auth.users(id) on delete set null,
  device_id text,
  gate text,
  result text not null check (result in ('VALID', 'DUPLICATE', 'INVALID', 'CANCELLED', 'WRONG_EVENT')),
  previous_check_in_at timestamptz,
  offline boolean not null default false,
  -- Client-generated idempotency key (a uuid minted at scan time on the
  -- device). Offline scans get synced through check_in_ticket() and may be
  -- retried by the client if a sync attempt's response is lost — the unique
  -- index on this column makes a retried sync a no-op instead of a second
  -- check-in. See check_in_ticket()'s idempotency check.
  client_scan_id uuid not null,
  scanned_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists ticket_scans_client_scan_id_uidx on public.ticket_scans(client_scan_id);
create index if not exists ticket_scans_ticket_id_idx on public.ticket_scans(ticket_id);
create index if not exists ticket_scans_event_id_idx on public.ticket_scans(event_id, scanned_at desc);

-- Scanner-access allowlist: who besides the event owner and global admins
-- may use /scanner and /admin/tickets for a given event. Lets an organiser
-- hand check-in duty to volunteers without giving them any other event
-- ownership privileges.
create table if not exists public.event_staff (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'volunteer' check (role in ('organizer', 'volunteer', 'staff')),
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index if not exists event_staff_event_id_idx on public.event_staff(event_id);
create index if not exists event_staff_user_id_idx on public.event_staff(user_id);
