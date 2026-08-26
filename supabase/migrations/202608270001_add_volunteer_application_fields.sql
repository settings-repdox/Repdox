-- src/pages/Volunteers.tsx previously bypassed the domain layer AND the
-- current Supabase project entirely: it called a hardcoded legacy project
-- (fpdbrvmejpujuwtitfbi.supabase.co) via raw fetch() against a
-- survey_responses table that doesn't exist here. See
-- docs/architecture/PHASE11_COMPLIANCE_REPORT.md.
--
-- public.volunteer_applications already exists in this project and is the
-- intended replacement, but its schema is missing four fields the legacy
-- table captured and the volunteer application form still collects:
-- school, city, branch, class. Adding them here so Volunteers.tsx can be
-- migrated onto IVolunteerService -> volunteer_applications without
-- silently dropping that data.
--
-- All four are nullable: existing rows (if any) won't have values, and a
-- NOT NULL constraint would either fail this migration or require picking
-- an arbitrary default.

alter table public.volunteer_applications
  add column if not exists school text,
  add column if not exists city text,
  add column if not exists branch text,
  add column if not exists class text;
