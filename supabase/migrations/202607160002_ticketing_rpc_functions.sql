-- Ticketing & QR Check-in System — RPC functions.
--
-- Every mutation that touches ticket state goes through one of these
-- SECURITY DEFINER functions rather than a plain client-side
-- .from("tickets").update(...) call, for two reasons:
--   1. check_in_ticket() must be atomic under concurrent scans (two
--      volunteers scanning the same ticket at the same physical gate at
--      the same moment is a completely normal event-day scenario, not an
--      edge case) — `select ... for update` row-locks the ticket for the
--      duration of the transaction so only one scan can win.
--   2. Authorization for who may call these is enforced in the API layer
--      (api/tickets/*.ts) using the same pattern as the rest of the app's
--      API routes (docs/api/README.md), but the *data integrity* rules
--      (a CANCELLED ticket can never become VALID again by racing two
--      requests, etc.) are enforced here regardless of what the API layer
--      does, as defense in depth.

-- Short, human-typeable code for manual entry at the scanner. Not a
-- security credential — see the schema migration's design notes.
create or replace function public.generate_secure_ticket_code()
returns text
language plpgsql
as $$
declare
  v_code text;
begin
  v_code := 'RPDX-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 4))
    || '-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 4));
  return v_code;
end;
$$;

-- Idempotent: if a non-cancelled ticket already exists for this
-- registration, returns it instead of creating a duplicate (the trigger
-- below can fire more than once for the same registration, e.g. an INSERT
-- immediately followed by an UPDATE that doesn't actually change status).
create or replace function public.generate_ticket_for_registration(p_registration_id uuid)
returns public.tickets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_registration record;
  v_event record;
  v_existing public.tickets;
  v_ticket public.tickets;
  v_code text;
  v_token text;
  v_attempts int := 0;
begin
  select * into v_registration from public.event_registrations where id = p_registration_id;
  if not found then
    raise exception 'registration_not_found';
  end if;

  select * into v_event from public.events where id = v_registration.event_id;
  if not found then
    raise exception 'event_not_found';
  end if;

  if not v_event.ticketing_enabled then
    raise exception 'ticketing_not_enabled';
  end if;

  select * into v_existing from public.tickets
    where registration_id = p_registration_id and status <> 'CANCELLED'
    limit 1;
  if found then
    return v_existing;
  end if;

  -- Retry on the astronomically unlikely event of a collision rather than
  -- letting the unique index reject the insert outright.
  loop
    v_attempts := v_attempts + 1;
    v_code := public.generate_secure_ticket_code();
    v_token := encode(gen_random_bytes(32), 'hex');

    begin
      insert into public.tickets (event_id, registration_id, ticket_code, qr_token, ticket_type)
      values (
        v_registration.event_id,
        p_registration_id,
        v_code,
        v_token,
        coalesce(nullif(v_registration.role, ''), 'participant')
      )
      returning * into v_ticket;
      return v_ticket;
    exception when unique_violation then
      if v_attempts >= 5 then
        raise exception 'ticket_code_generation_failed';
      end if;
      -- loop again with freshly generated code/token
    end;
  end loop;
end;
$$;

-- Fires after a registration is created or transitions into a confirmed
-- state. Deliberately swallows errors (ticketing disabled, event missing,
-- etc.) rather than blocking the registration itself — ticket generation
-- is a side effect of a confirmed registration, not a precondition for one.
create or replace function public.trg_generate_ticket_on_registration_confirm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('confirmed', 'registered') then
    begin
      perform public.generate_ticket_for_registration(new.id);
    exception when others then
      raise notice 'ticket generation skipped for registration %: %', new.id, sqlerrm;
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_generate_ticket_on_registration_confirm on public.event_registrations;
create trigger trg_generate_ticket_on_registration_confirm
  after insert or update of status on public.event_registrations
  for each row
  execute function public.trg_generate_ticket_on_registration_confirm();

-- Atomic check-in. See file header for why this must be SECURITY DEFINER
-- + row-locked rather than a client-side read-then-write.
--
-- p_client_scan_id: idempotency key (see ticket_scans.client_scan_id).
-- If this scan_id was already processed, returns the original result
-- instead of re-evaluating — makes retried offline-sync uploads safe.
create or replace function public.check_in_ticket(
  p_qr_token text,
  p_event_id uuid,
  p_scanned_by uuid,
  p_client_scan_id uuid,
  p_device_id text default null,
  p_gate text default null,
  p_offline boolean default false,
  p_scanned_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prior_scan public.ticket_scans;
  v_ticket public.tickets;
  v_registration public.event_registrations;
  v_event public.events;
  v_prior_scanner_name text;
  v_result text;
  v_response jsonb;
begin
  -- Idempotency: a retried sync of the same client scan returns the
  -- original outcome rather than re-processing (and, for a VALID scan,
  -- rather than being misread as a duplicate check-in of the same ticket).
  select * into v_prior_scan from public.ticket_scans where client_scan_id = p_client_scan_id;
  if found then
    select * into v_ticket from public.tickets where id = v_prior_scan.ticket_id;
    return jsonb_build_object(
      'result', v_prior_scan.result,
      'replay', true,
      'ticket', case when v_ticket.id is not null then to_jsonb(v_ticket) else null end,
      'scanned_at', v_prior_scan.scanned_at
    );
  end if;

  select * into v_event from public.events where id = p_event_id;
  if not found then
    raise exception 'event_not_found';
  end if;

  -- Lock the ticket row for the duration of this transaction so a second,
  -- concurrent scan of the same ticket has to wait for this one to commit
  -- (and will then see the updated status) rather than racing it.
  select * into v_ticket from public.tickets where qr_token = p_qr_token for update;

  if not found then
    insert into public.ticket_scans (
      ticket_id, event_id, scanned_token, scanned_by, device_id, gate,
      result, offline, client_scan_id, scanned_at
    ) values (
      null, p_event_id, p_qr_token, p_scanned_by, p_device_id, p_gate,
      'INVALID', p_offline, p_client_scan_id, p_scanned_at
    );
    return jsonb_build_object('result', 'INVALID');
  end if;

  if v_ticket.event_id <> p_event_id then
    insert into public.ticket_scans (
      ticket_id, event_id, scanned_token, scanned_by, device_id, gate,
      result, offline, client_scan_id, scanned_at
    ) values (
      v_ticket.id, p_event_id, p_qr_token, p_scanned_by, p_device_id, p_gate,
      'WRONG_EVENT', p_offline, p_client_scan_id, p_scanned_at
    );
    return jsonb_build_object('result', 'WRONG_EVENT', 'ticket', to_jsonb(v_ticket));
  end if;

  if v_ticket.status = 'CANCELLED' then
    insert into public.ticket_scans (
      ticket_id, event_id, scanned_token, scanned_by, device_id, gate,
      result, offline, client_scan_id, scanned_at
    ) values (
      v_ticket.id, p_event_id, p_qr_token, p_scanned_by, p_device_id, p_gate,
      'CANCELLED', p_offline, p_client_scan_id, p_scanned_at
    );
    return jsonb_build_object('result', 'CANCELLED', 'ticket', to_jsonb(v_ticket));
  end if;

  if v_ticket.status = 'USED' then
    select full_name into v_prior_scanner_name from public.user_profiles where user_id = v_ticket.checked_in_by;
    insert into public.ticket_scans (
      ticket_id, event_id, scanned_token, scanned_by, device_id, gate,
      result, previous_check_in_at, offline, client_scan_id, scanned_at
    ) values (
      v_ticket.id, p_event_id, p_qr_token, p_scanned_by, p_device_id, p_gate,
      'DUPLICATE', v_ticket.checked_in_at, p_offline, p_client_scan_id, p_scanned_at
    );
    return jsonb_build_object(
      'result', 'DUPLICATE',
      'ticket', to_jsonb(v_ticket),
      'previous_check_in_at', v_ticket.checked_in_at,
      'previous_scanned_by_name', v_prior_scanner_name
    );
  end if;

  -- VALID — the only branch that actually mutates the ticket.
  update public.tickets
    set status = 'USED', checked_in_at = p_scanned_at, checked_in_by = p_scanned_by, updated_at = now()
    where id = v_ticket.id
    returning * into v_ticket;

  select * into v_registration from public.event_registrations where id = v_ticket.registration_id;

  -- Backward-compat: keep the legacy event_registrations check-in fields
  -- (used by src/components/ProfileCard.tsx) in sync so participants see
  -- consistent status whichever UI they look at.
  update public.event_registrations
    set check_in_status = 'checked_in', checked_in_at = p_scanned_at, checked_in_by = p_scanned_by
    where id = v_ticket.registration_id;

  insert into public.ticket_scans (
    ticket_id, event_id, scanned_token, scanned_by, device_id, gate,
    result, offline, client_scan_id, scanned_at
  ) values (
    v_ticket.id, p_event_id, p_qr_token, p_scanned_by, p_device_id, p_gate,
    'VALID', p_offline, p_client_scan_id, p_scanned_at
  );

  return jsonb_build_object(
    'result', 'VALID',
    'ticket', to_jsonb(v_ticket),
    'participant_name', coalesce(v_registration.name, ''),
    'team_name', v_registration.team_id
  );
end;
$$;

create or replace function public.cancel_ticket(
  p_ticket_id uuid,
  p_cancelled_by uuid,
  p_reason text default null
)
returns public.tickets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket public.tickets;
begin
  update public.tickets
    set status = 'CANCELLED', cancelled_at = now(), cancelled_by = p_cancelled_by, cancelled_reason = p_reason, updated_at = now()
    where id = p_ticket_id and status <> 'CANCELLED'
    returning * into v_ticket;

  if not found then
    raise exception 'ticket_not_found_or_already_cancelled';
  end if;

  return v_ticket;
end;
$$;

-- Cancels the old ticket (audit trail preserved, see partial unique index
-- in the schema migration) and issues a brand-new ticket_code/qr_token for
-- the same registration — e.g. when a participant loses access to their
-- original ticket link/email.
create or replace function public.reissue_ticket(
  p_ticket_id uuid,
  p_reissued_by uuid
)
returns public.tickets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old public.tickets;
  v_new public.tickets;
begin
  select * into v_old from public.tickets where id = p_ticket_id;
  if not found then
    raise exception 'ticket_not_found';
  end if;

  update public.tickets
    set status = 'CANCELLED', cancelled_at = now(), cancelled_by = p_reissued_by, cancelled_reason = 'reissued', updated_at = now()
    where id = p_ticket_id;

  insert into public.tickets (event_id, registration_id, ticket_code, qr_token, ticket_type, gaming_meta, reissued_from)
  values (
    v_old.event_id,
    v_old.registration_id,
    public.generate_secure_ticket_code(),
    encode(gen_random_bytes(32), 'hex'),
    v_old.ticket_type,
    v_old.gaming_meta,
    v_old.id
  )
  returning * into v_new;

  return v_new;
end;
$$;

create or replace function public.get_attendance_stats(p_event_id uuid)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'registered', (select count(*) from public.event_registrations where event_id = p_event_id),
    'tickets_issued', (select count(*) from public.tickets where event_id = p_event_id and status <> 'CANCELLED'),
    'checked_in', (select count(*) from public.tickets where event_id = p_event_id and status = 'USED'),
    'cancelled', (select count(*) from public.tickets where event_id = p_event_id and status = 'CANCELLED'),
    'remaining', (
      select count(*) from public.tickets
      where event_id = p_event_id and status = 'VALID'
    ),
    'recent_scans', (
      select coalesce(jsonb_agg(s order by s.scanned_at desc), '[]'::jsonb)
      from (
        select ts.id, ts.result, ts.scanned_at, ts.gate, ts.device_id,
               t.ticket_code, er.name as participant_name
        from public.ticket_scans ts
        left join public.tickets t on t.id = ts.ticket_id
        left join public.event_registrations er on er.id = t.registration_id
        where ts.event_id = p_event_id
        order by ts.scanned_at desc
        limit 20
      ) s
    )
  );
$$;
