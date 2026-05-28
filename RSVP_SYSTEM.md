# Auto RSVP System Documentation

## Overview

The Auto RSVP System allows event creators to automatically send RSVP (Résumé Voting) emails to registered attendees and collect their attendance confirmations. This system supports both **opt-in** (attendees must confirm attendance) and **opt-out** (attendees are assumed to attend unless they decline) modes.

## Features

- 🎯 **Two RSVP Modes**: Opt-in and Opt-out options
- 📧 **Automated Emails**: Send RSVP reminders to all registered attendees
- 📊 **Real-time Analytics**: Track RSVP responses with detailed statistics
- ✏️ **Flexible Responses**: Attendees can respond with: Attending, Not Attending, or Maybe
- 💬 **Optional Notes**: Allow attendees to add notes (dietary restrictions, questions, etc.)
- 📥 **Export Data**: Download RSVP responses as CSV for further analysis
- 🔐 **Role-based Access**: Only event organizers and admins can view RSVP responses

## Database Schema

### New Tables

#### `event_rsvp_responses`
Stores individual RSVP responses from attendees.

```sql
- id: UUID (Primary Key)
- event_id: UUID (Foreign Key → events.id)
- user_id: UUID (Foreign Key → auth.users.id, nullable)
- email: TEXT (indexed)
- response: TEXT ('attending', 'not_attending', 'maybe')
- notes: TEXT (optional)
- responded_at: TIMESTAMPTZ
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
- UNIQUE(event_id, email) -- prevent duplicate responses per email
```

#### `event_rsvp_email_logs`
Tracks RSVP email delivery for audit and debugging.

```sql
- id: UUID (Primary Key)
- event_id: UUID (Foreign Key → events.id)
- email: TEXT (indexed)
- sent_at: TIMESTAMPTZ
- status: TEXT ('sent', 'failed', 'bounced')
- error_message: TEXT (nullable)
- created_at: TIMESTAMPTZ
```

### Updated Columns (events table)

```sql
- rsvp_enabled: BOOLEAN (default: false)
- rsvp_type: ENUM ('opt-in', 'opt-out') (default: 'opt-in')
- rsvp_start_date: TIMESTAMPTZ (nullable)
- rsvp_end_date: TIMESTAMPTZ (nullable)
- rsvp_reminder_sent_at: TIMESTAMPTZ (nullable)
```

## API Endpoints

### 1. Submit RSVP Response
**POST** `/api/events/rsvp`

Submit or update an RSVP response for an event.

**Request:**
```json
{
  "event_id": "uuid",
  "response": "attending" | "not_attending" | "maybe",
  "email": "user@example.com",
  "user_id": "uuid (optional)",
  "notes": "Any additional notes (optional)"
}
```

**Response:**
```json
{
  "id": "uuid",
  "status": "submitted",
  "message": "RSVP submitted as attending",
  "event_title": "Event Name"
}
```

**Error Codes:**
- `event_not_found`: Event doesn't exist
- `rsvp_disabled`: RSVP is not enabled for this event
- `rsvp_not_started`: RSVP window hasn't started yet
- `rsvp_closed`: RSVP deadline has passed
- `invalid_response`: Invalid response value

### 2. Send RSVP Emails
**POST** `/api/events/send-rsvp-emails`

Send RSVP reminder emails to all registered attendees who haven't responded yet.

**Request:**
```json
{
  "event_id": "uuid",
  "user_token": "jwt (optional if using cron secret)"
}
```

**Headers:**
```
X-RSVP-Secret: <RSVP_CRON_SECRET> (optional for cron jobs)
Authorization: Bearer <JWT_TOKEN> (for authenticated requests)
```

**Response:**
```json
{
  "success": true,
  "emails_sent": 45,
  "failed": 2,
  "total_registrations": 50,
  "message": "Successfully sent 45 RSVP emails (2 failed)"
}
```

## Frontend Components

### RSVPSettings Component
Configuration form for event creators to enable and configure RSVP.

**Location:** `src/components/RSVPSettings.tsx`

**Props:**
```typescript
interface RSVPSettingsProps {
  value: Partial<RSVPSettingsData>;
  onChange: (settings: Partial<RSVPSettingsData>) => void;
}
```

**Usage:**
```tsx
import RSVPSettings from "@/components/RSVPSettings";

const [rsvpSettings, setRsvpSettings] = useState({
  rsvp_enabled: false,
  rsvp_type: "opt-in",
  rsvp_start_date: "",
  rsvp_start_time: "",
  rsvp_end_date: "",
  rsvp_end_time: ""
});

<RSVPSettings value={rsvpSettings} onChange={setRsvpSettings} />
```

### RSVPForm Component
User-facing form for submitting RSVP responses.

**Location:** `src/components/RSVPForm.tsx`

**Props:**
```typescript
interface RSVPFormProps {
  eventId: string;
  eventTitle: string;
  userEmail?: string;
  onSubmitSuccess?: () => void;
}
```

**Usage:**
```tsx
import RSVPForm from "@/components/RSVPForm";

<RSVPForm
  eventId={event.id}
  eventTitle={event.title}
  userEmail={userEmail}
  onSubmitSuccess={() => console.log("RSVP submitted!")}
/>
```

### RSVPAnalytics Component
Dashboard for organizers to view RSVP statistics and responses.

**Location:** `src/components/RSVPAnalytics.tsx`

**Props:**
```typescript
interface RSVPAnalyticsProps {
  eventId: string;
  eventTitle: string;
}
```

**Usage:**
```tsx
import RSVPAnalytics from "@/components/RSVPAnalytics";

<RSVPAnalytics eventId={event.id} eventTitle={event.title} />
```

## Service Functions

All RSVP-related functions are exported from `src/lib/eventService.ts`:

### `submitRSVP(rsvp: RSVPSubmission): Promise<RSVPResponseData>`
Submit an RSVP response for an event.

### `fetchRSVPResponses(eventId: string): Promise<RSVPResponseData[]>`
Fetch all RSVP responses for an event (organizer/admin only).

### `getRSVPSummary(eventId: string): Promise<RSVPSummary | null>`
Get RSVP statistics including response counts and rate.

### `sendRSVPEmails(eventId: string): Promise<{ success: boolean; emails_sent: number; failed: number }>`
Send RSVP reminder emails to all registered attendees.

### `getUserRSVPResponse(eventId: string, email: string): Promise<RSVPResponseData | null>`
Get a user's RSVP response for a specific event.

### `isRSVPWindowOpen(eventId: string): Promise<boolean>`
Check if the RSVP window is currently open for an event.

## Integration Steps

### 1. Add RSVP Settings to Event Creation Form

In your event creation/editing component:

```tsx
import RSVPSettings from "@/components/RSVPSettings";

// In your form state
const [rsvpSettings, setRsvpSettings] = useState<Partial<RSVPSettingsData>>({
  rsvp_enabled: false,
  rsvp_type: "opt-in"
});

// In your JSX
<RSVPSettings value={rsvpSettings} onChange={setRsvpSettings} />

// When creating/updating event, pass to eventService
await eventService.createEvent({
  form: {
    // ... other fields
    ...rsvpSettings
  },
  // ... other payload fields
});
```

### 2. Add RSVP Form to Event Detail Page

In your event detail component:

```tsx
import RSVPForm from "@/components/RSVPForm";

export default function EventDetail() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);

  return (
    <div>
      {/* Event details */}
      
      {event?.rsvp_enabled && (
        <RSVPForm
          eventId={event.id}
          eventTitle={event.title}
          userEmail={userEmail}
          onSubmitSuccess={() => {
            // Optionally refresh page or show message
            toast({ title: "RSVP submitted!" });
          }}
        />
      )}
    </div>
  );
}
```

### 3. Add RSVP Analytics to Organizer Dashboard

In your event management/dashboard component:

```tsx
import RSVPAnalytics from "@/components/RSVPAnalytics";

export default function EventManagement() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);

  return (
    <div>
      {/* Event info */}
      
      {event?.rsvp_enabled && (
        <RSVPAnalytics eventId={event.id} eventTitle={event.title} />
      )}
    </div>
  );
}
```

## Environment Variables

Add these to your `.env` or Vercel deployment:

```
# Resend API Key (required for sending emails)
RESEND_API_KEY=your_resend_api_key_here

# Secret for cron job authentication (optional but recommended)
RSVP_CRON_SECRET=your_secure_random_secret_here

# Base URL for email links
VERCEL_URL=https://your-domain.com
```

## Cron Job Setup (for Automatic Email Sending)

### Option 1: Vercel Cron
Create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/events/send-rsvp-emails",
      "schedule": "0 9 * * *"
    }
  ]
}
```

Then call the endpoint with the cron secret:

```bash
curl -X POST https://your-domain.com/api/events/send-rsvp-emails \
  -H "X-RSVP-Secret: $RSVP_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"event_id": "event-uuid"}'
```

### Option 2: External Cron Service (e.g., EasyCron)
Set up an HTTP POST request to:
```
POST https://your-domain.com/api/events/send-rsvp-emails
Header: X-RSVP-Secret: <your-secret>
```

## Email Template

The system sends professionally formatted HTML emails with:
- Event title
- RSVP deadline
- Three response options (Attending, Not Attending, Maybe)
- Direct link to RSVP form
- Professional footer

Customize the email template in `api/events/send-rsvp-emails.ts` (search for `emailHtml`).

## Security Considerations

1. **RLS Policies**: All RSVP responses are protected by Row-Level Security
   - Only admins can view all responses
   - Organizers can only view responses for their own events
   - Users can only see/edit their own responses

2. **Authentication**: 
   - User token validation for API endpoints
   - Cron secret required for automated email sending
   - Service role key used server-side for database operations

3. **Validation**:
   - Email format validation
   - RSVP window date/time checking
   - Duplicate response prevention

4. **Rate Limiting**: Email sending includes 100ms delay between sends to prevent rate limiting

## Troubleshooting

### Emails Not Sending
- Check `RESEND_API_KEY` is set in environment
- Verify event has RSVP enabled and window is open
- Check `event_rsvp_email_logs` table for failure reasons
- Ensure registrations have valid emails

### RSVP Form Not Showing
- Confirm `rsvp_enabled` is true on event
- Check RSVP window dates are valid
- Verify user has RSVP form component integrated

### Permission Denied Errors
- Ensure RLS policies are properly applied (migration ran)
- Verify user is event organizer (for viewing responses)
- Check admin email list in RLS policies

## Example Workflow

1. **Event Creator** creates event and enables RSVP with dates
2. **Admin** approves event
3. **System** (manual or cron) sends RSVP emails to all registrations
4. **Attendees** receive email with RSVP link
5. **Attendees** click link and submit response
6. **Event Creator** views responses in analytics dashboard
7. **Event Creator** exports CSV for further processing

## Future Enhancements

Potential additions to the system:
- [ ] Customizable email templates per event
- [ ] Automated reminder emails
- [ ] SMS RSVP support
- [ ] Calendar integration (add to calendars)
- [ ] Dietary preference collection
- [ ] Team-based RSVP tracking
- [ ] Integration with attendance at event time
