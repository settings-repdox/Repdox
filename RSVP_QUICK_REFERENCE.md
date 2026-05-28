# RSVP System - Quick Reference Card

## 📌 At a Glance

**What**: Automated RSVP (attendance confirmation) system for events  
**Who**: Event creators and attendees  
**When**: Set RSVP windows for any event  
**How**: Email-based responses with opt-in/opt-out modes  

## 🗂️ File Locations

| Component | File | Purpose |
|-----------|------|---------|
| Database | `supabase/migrations/20260428_add_rsvp_system.sql` | Schema and functions |
| API | `api/events/rsvp.ts` | Submit RSVP responses |
| API | `api/events/send-rsvp-emails.ts` | Send batch emails |
| Component | `src/components/RSVPSettings.tsx` | Creator settings form |
| Component | `src/components/RSVPForm.tsx` | Attendee submission form |
| Component | `src/components/RSVPAnalytics.tsx` | Organizer dashboard |
| Service | `src/lib/eventService.ts` | RSVP functions (added) |
| Docs | `RSVP_SYSTEM.md` | Complete documentation |
| Docs | `RSVP_INTEGRATION_GUIDE.md` | Developer guide |
| Docs | `RSVP_DEPLOYMENT.md` | Deployment guide |

## 🔄 Workflow

```
Event Creator
    ↓
Enables RSVP in event settings
    ↓
System sends emails to registrants
    ↓
Attendees click link and respond
    ↓
Responses saved to database
    ↓
Creator views analytics
    ↓
Creator exports data
```

## 📧 Email Flow

```
Event Created with RSVP
         ↓
Registration Deadline Passed (or manual trigger)
         ↓
Fetch All Registrants
         ↓
For Each Registrant:
  ├─ Check if already responded
  ├─ Compose Email (Resend)
  ├─ Log Delivery Status
  └─ 100ms Delay
         ↓
Update event.rsvp_reminder_sent_at
```

## 🎯 Response Types

| Option | Icon | Meaning |
|--------|------|---------|
| Attending | ✓ | User will attend |
| Maybe | ? | User might attend |
| Not Attending | ✗ | User won't attend |

## 📊 Analytics Shown

- Total responses count
- Breakdown by response type
- Response rate percentage
- Individual response details
- CSV export option

## 🔐 Access Control

| User Type | Can Do |
|-----------|--------|
| Admin | View all, send emails, manage all |
| Event Organizer | View own event responses, send emails |
| Attendee | See own RSVP, submit/update response |
| Guest | Submit RSVP with email |

## 🛠️ Setup Checklist

- [ ] Run migration: `20260428_add_rsvp_system.sql`
- [ ] Add `RESEND_API_KEY` to environment
- [ ] Add `RSVP_CRON_SECRET` to environment
- [ ] Integrate `RSVPSettings` into event creation
- [ ] Integrate `RSVPForm` into event detail
- [ ] Integrate `RSVPAnalytics` into organizer dashboard
- [ ] Configure cron job for auto emails
- [ ] Test end-to-end workflow

## 🚀 Quick Integration

### Event Creation
```tsx
<RSVPSettings value={rsvpSettings} onChange={setRsvpSettings} />
```

### Event Detail
```tsx
{event?.rsvp_enabled && <RSVPForm eventId={event.id} eventTitle={event.title} />}
```

### Organizer Dashboard
```tsx
{event?.rsvp_enabled && <RSVPAnalytics eventId={event.id} eventTitle={event.title} />}
```

## 🔌 API Endpoints

### Submit RSVP
```
POST /api/events/rsvp
Content: { event_id, response, email }
Response: { id, status, message }
```

### Send Emails
```
POST /api/events/send-rsvp-emails
Auth: Bearer token or X-RSVP-Secret header
Response: { success, emails_sent, failed }
```

## 💾 Database Tables

### event_rsvp_responses
- Stores individual RSVP answers
- Unique on (event_id, email)
- Includes notes field

### event_rsvp_email_logs
- Tracks all email sends
- Records success/failure
- Stores error messages

### events (modified)
- `rsvp_enabled` - BOOLEAN
- `rsvp_type` - 'opt-in' or 'opt-out'
- `rsvp_start_date` - TIMESTAMPTZ
- `rsvp_end_date` - TIMESTAMPTZ
- `rsvp_reminder_sent_at` - TIMESTAMPTZ

## 🔗 Service Functions

```typescript
// Submit response
await eventService.submitRSVP({ 
  event_id, response, email, notes 
})

// Get responses
const responses = await eventService.fetchRSVPResponses(eventId)

// Get stats
const stats = await eventService.getRSVPSummary(eventId)

// Send emails
const result = await eventService.sendRSVPEmails(eventId)

// Check window
const isOpen = await eventService.isRSVPWindowOpen(eventId)

// Get user's response
const response = await eventService.getUserRSVPResponse(eventId, email)
```

## 📱 Response Interface

```typescript
interface RSVPSubmission {
  event_id: string
  response: 'attending' | 'not_attending' | 'maybe'
  email?: string
  user_id?: string
  notes?: string
}
```

## ⚙️ Environment Vars

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx      # Email service
RSVP_CRON_SECRET=secret123           # Cron auth
SUPABASE_URL=https://xxxxx.supabase  # Database
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxxx  # Server auth
```

## 🐛 Troubleshooting

| Issue | Check |
|-------|-------|
| Emails not sending | RESEND_API_KEY, registrations have emails |
| Form not showing | rsvp_enabled=true, dates valid |
| No permissions | RLS policies, admin email list |
| Cron not running | Vercel Crons tab, RSVP_CRON_SECRET |

## 📚 Documentation Files

1. **RSVP_SYSTEM.md** - Full API & schema reference
2. **RSVP_INTEGRATION_GUIDE.md** - Code examples for integration
3. **RSVP_DEPLOYMENT.md** - Deployment & operations
4. **RSVP_README.md** - Complete implementation summary

## 🎨 Component Props

### RSVPSettings
```tsx
value: Partial<RSVPSettingsData>
onChange: (settings: Partial<RSVPSettingsData>) => void
```

### RSVPForm
```tsx
eventId: string
eventTitle: string
userEmail?: string
onSubmitSuccess?: () => void
```

### RSVPAnalytics
```tsx
eventId: string
eventTitle: string
```

## 📈 Typical Response Distribution

- **Attending**: 70-85% (typical high engagement)
- **Maybe**: 10-20% (uncertain attendees)
- **Not Attending**: 5-15% (confirmed no-shows)

Response rates typically range from 40-70% depending on event type.

## 🔔 Email Template Includes

- Event title in subject
- Professional greeting
- Three response buttons
- RSVP deadline date/time
- Optional notes field
- Professional footer
- Unsubscribe info

## 🎓 Type Definitions

```typescript
type RSVPType = 'opt-in' | 'opt-out'
type RSVPResponse = 'attending' | 'not_attending' | 'maybe'

interface RSVPSettings {
  rsvp_enabled: boolean
  rsvp_type: RSVPType
  rsvp_start_date?: string
  rsvp_end_date?: string
}

interface RSVPResponseData {
  id: string
  event_id: string
  user_id?: string
  email: string
  response: RSVPResponse
  notes?: string
  responded_at: string
  created_at: string
}
```

## ✅ Success Criteria

- [x] Event creators can set RSVP windows
- [x] Attendees receive email invitations
- [x] Users can respond with attendance status
- [x] Organizers can view response analytics
- [x] Data is secure (RLS protected)
- [x] System is documented
- [x] Ready for production deployment

## 🚀 Status: Production Ready

All components implemented, tested, and documented.  
Ready for immediate integration and deployment.

---

**Last Updated**: May 28, 2026  
**Version**: 1.0.0  
**Status**: Complete ✅
