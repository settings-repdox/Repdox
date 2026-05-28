# RSVP System Deployment Guide

## Pre-Deployment Checklist

- [ ] All code committed to git
- [ ] Environment variables configured
- [ ] Database migration tested in staging
- [ ] Email templates reviewed
- [ ] RSVP components integrated into pages
- [ ] Admin emails verified in RLS policies

## Step 1: Database Migration

### Run in Supabase Console

1. Go to Supabase Dashboard → SQL Editor
2. Create a new query
3. Copy contents of `supabase/migrations/20260428_add_rsvp_system.sql`
4. Execute the migration
5. Verify tables and functions created:
   ```sql
   -- Check tables exist
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' AND table_name LIKE 'event_rsvp%';

   -- Check function exists
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_schema = 'public' AND routine_name = 'get_rsvp_summary';
   ```

### Rollback (if needed)

```sql
-- Drop tables
DROP TABLE IF EXISTS public.event_rsvp_email_logs CASCADE;
DROP TABLE IF EXISTS public.event_rsvp_responses CASCADE;

-- Drop type
DROP TYPE IF EXISTS public.rsvp_type CASCADE;

-- Drop function
DROP FUNCTION IF EXISTS public.get_rsvp_summary(UUID) CASCADE;
```

## Step 2: Environment Variables

### Add to `.env.production` (Vercel)

```bash
# Resend Email Service
RESEND_API_KEY=re_xxxxxxxxxxxxx

# RSVP Cron Secret (generate a strong random string)
RSVP_CRON_SECRET=rsvp_secret_xxxxxxxxxxxxxxxxxxxxxxxx

# Supabase (if not already set)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxxx
```

### Generate RSVP_CRON_SECRET

```bash
# On macOS/Linux
openssl rand -base64 32

# Output example: abc123def456ghi789jkl012mno345pqr678stu
```

### Add to `vercel.json`

```json
{
  "env": {
    "RESEND_API_KEY": "@resend_api_key",
    "RSVP_CRON_SECRET": "@rsvp_cron_secret"
  }
}
```

## Step 3: Resend API Setup

1. Visit https://resend.com
2. Create account or login
3. Generate API key from Dashboard
4. Add to Vercel environment as `RESEND_API_KEY`

Verify Resend is working:

```bash
curl --request POST \
  --url https://api.resend.com/emails \
  --header 'Authorization: Bearer re_xxxxxxxxxxxxx' \
  --header 'Content-Type: application/json' \
  --data '{
    "from": "noreply@repdox.com",
    "to": "test@example.com",
    "subject": "Test Email",
    "html": "<h1>Test</h1>"
  }'
```

## Step 4: Deploy Code

### Deploy to Vercel

```bash
# Commit changes
git add .
git commit -m "feat: implement auto RSVP system"

# Push to main branch
git push origin main

# Vercel auto-deploys from main
# Monitor deployment in Vercel Dashboard
```

### Verify API Endpoints

After deployment, test endpoints:

```bash
# Test RSVP submission endpoint
curl -X POST https://your-domain.com/api/events/rsvp \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "test-event-uuid",
    "response": "attending",
    "email": "test@example.com"
  }'

# Expected response:
# {"error": "event_not_found", "code": "event_not_found"}
# (This is expected since event doesn't exist - proves endpoint works)
```

## Step 5: Set Up Cron Jobs

### Option A: Vercel Cron (Recommended)

Update `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/events/send-rsvp-emails",
      "schedule": "0 9 * * *",
      "description": "Send RSVP reminder emails daily at 9 AM"
    }
  ]
}
```

Deploy and verify in Vercel Dashboard → Crons tab.

### Option B: External Service (EasyCron)

1. Visit https://easycron.com
2. Create account
3. Add Cron Job:
   - **Cron Expression**: `0 9 * * *` (daily at 9 AM)
   - **URL**: `https://your-domain.com/api/events/send-rsvp-emails`
   - **HTTP Method**: POST
   - **Headers**: `X-RSVP-Secret: <your-secret>`

### Option C: AWS Lambda / Google Cloud Functions

Similar setup with POST to:
```
https://your-domain.com/api/events/send-rsvp-emails
Header: X-RSVP-Secret: <secret>
```

## Step 6: Frontend Integration

### Update Event Creation Pages

Add `RSVPSettings` component to your event creation form:

```tsx
import RSVPSettings from "@/components/RSVPSettings";

// In form, add RSVP settings section
<RSVPSettings value={rsvpSettings} onChange={setRsvpSettings} />
```

### Update Event Detail Pages

Add `RSVPForm` component to event pages:

```tsx
import RSVPForm from "@/components/RSVPForm";

{event?.rsvp_enabled && (
  <RSVPForm eventId={event.id} eventTitle={event.title} />
)}
```

### Update Organizer Dashboard

Add `RSVPAnalytics` component to event management:

```tsx
import RSVPAnalytics from "@/components/RSVPAnalytics";

{event?.rsvp_enabled && (
  <RSVPAnalytics eventId={event.id} eventTitle={event.title} />
)}
```

## Step 7: Testing

### Test Event Creation with RSVP

1. Create new event with RSVP enabled
2. Set RSVP dates for today + 7 days
3. Choose "opt-in" mode
4. Verify event saves RSVP settings

### Test RSVP Submission

1. Register for the event as a test user
2. Navigate to event page
3. Fill RSVP form
4. Submit and verify success message
5. Check database:
   ```sql
   SELECT * FROM event_rsvp_responses 
   WHERE event_id = 'your-test-event-id';
   ```

### Test Email Sending (Manual)

1. Create event with test registrations
2. Call API endpoint manually:
   ```bash
   curl -X POST https://your-domain.com/api/events/send-rsvp-emails \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <test-user-token>" \
     -d '{"event_id": "your-event-id"}'
   ```
3. Check email delivery:
   - Test inbox for email receipt
   - Database `event_rsvp_email_logs` for delivery status
   - Resend dashboard for delivery analytics

### Test Analytics Dashboard

1. Submit multiple RSVP responses (attending, not_attending, maybe)
2. Open event management page
3. Verify RSVP tab shows:
   - Response counts for each category
   - Response rate percentage
   - List of individual responses

### Test CSV Export

1. In RSVP Analytics, click "Export CSV"
2. Verify file downloads with correct data
3. Open in spreadsheet application

## Step 8: Monitoring

### Check Email Logs

```sql
-- View failed emails
SELECT * FROM event_rsvp_email_logs 
WHERE status = 'failed' 
ORDER BY sent_at DESC;

-- Check recent sends
SELECT * FROM event_rsvp_email_logs 
ORDER BY sent_at DESC 
LIMIT 50;
```

### Monitor API Performance

Watch Vercel Analytics for:
- `/api/events/rsvp` endpoint response times
- `/api/events/send-rsvp-emails` endpoint usage
- Error rates

### Set Up Alerts

Configure Vercel alerts for:
- API endpoint errors > 5%
- Function duration > 30s
- Unhandled exceptions

## Step 9: Admin Tasks

### Verify RLS Policies

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename LIKE 'event_rsvp%';

-- List policies
SELECT policyname, tablename 
FROM pg_policies 
WHERE tablename LIKE 'event_rsvp%';
```

### Update Admin Emails in RLS

If admin emails change, update RLS policies:

```sql
-- Update admin emails in all policies
UPDATE pg_policies 
SET policy_definition = replace(
  policy_definition, 
  'old_admin@example.com', 
  'new_admin@example.com'
)
WHERE tablename LIKE 'event_rsvp%';
```

Or re-run migration with updated emails.

## Troubleshooting Deployment

### API Endpoints Return 404

- Verify files exist in `/api/events/` directory
- Check Vercel build logs
- Ensure TypeScript compiled correctly

### Database Migration Failed

- Check Supabase logs for specific error
- Verify migration doesn't have syntax errors
- Ensure you have admin access to Supabase project
- Try running in smaller chunks if hitting limits

### Emails Not Sending

- Verify `RESEND_API_KEY` is set in Vercel env
- Check Resend dashboard for API key validity
- Test Resend API directly (see curl example above)
- Review `event_rsvp_email_logs` for error messages

### RLS Permission Denied

- Verify RLS policies were created by migration
- Check admin emails in policies match your account
- For organizers: ensure `created_by` matches `auth.uid()`

### Cron Not Triggering

- Verify `vercel.json` has correct cron schedule
- Check Vercel Crons tab shows job
- Monitor Vercel Function Logs for invocations
- Manually test endpoint with cron secret

## Post-Deployment

### Announce Feature

- Update docs/changelog
- Notify event organizers about new feature
- Create tutorial video showing RSVP workflow

### Collect Feedback

- Monitor usage metrics
- Gather organizer feedback
- Track email delivery rates
- Identify improvement opportunities

### Plan Enhancements

Consider future additions:
- Customizable email templates
- Automated reminder emails
- SMS support
- Calendar integration
- Integration with check-in system

## Rollback Plan

If issues arise:

### Quick Rollback

1. Disable feature via flag:
   ```tsx
   // In components, wrap with feature flag
   {isRSVPEnabled && <RSVPSettings ... />}
   ```

2. Or revert specific commit:
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

### Database Rollback

```sql
-- If migration needs to be undone
DROP TABLE IF EXISTS public.event_rsvp_email_logs CASCADE;
DROP TABLE IF EXISTS public.event_rsvp_responses CASCADE;
DROP TYPE IF EXISTS public.rsvp_type CASCADE;
DROP FUNCTION IF EXISTS public.get_rsvp_summary(UUID) CASCADE;

-- Remove columns from events table
ALTER TABLE public.events DROP COLUMN IF EXISTS rsvp_enabled;
ALTER TABLE public.events DROP COLUMN IF EXISTS rsvp_type;
ALTER TABLE public.events DROP COLUMN IF EXISTS rsvp_start_date;
ALTER TABLE public.events DROP COLUMN IF EXISTS rsvp_end_date;
ALTER TABLE public.events DROP COLUMN IF EXISTS rsvp_reminder_sent_at;
```

## Support

For issues:
1. Check logs in Supabase → Logs
2. Check Vercel → Function Logs
3. Review `/api/events/*.ts` for error handling
4. Check browser console for client-side errors
5. Review `event_rsvp_email_logs` for email delivery issues
