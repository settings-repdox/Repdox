# RSVP System Integration Guide

## Quick Start

This guide shows how to integrate the RSVP system into your existing pages.

## 1. Adding RSVP Settings to Event Creation

### Edit your EventBuilder/CreateEvent component

```tsx
// src/pages/EventBuilder.tsx (or similar)

import RSVPSettings, { RSVPSettingsData } from "@/components/RSVPSettings";
import eventService from "@/lib/eventService";

export default function EventBuilder() {
  // ... existing state

  const [rsvpSettings, setRsvpSettings] = useState<Partial<RSVPSettingsData>>({
    rsvp_enabled: false,
    rsvp_type: "opt-in",
    rsvp_start_date: "",
    rsvp_start_time: "",
    rsvp_end_date: "",
    rsvp_end_time: "",
  });

  const handleCreateEvent = async () => {
    const payload = {
      form: {
        // ... existing form fields
        rsvp_enabled: rsvpSettings.rsvp_enabled,
        rsvp_type: rsvpSettings.rsvp_type,
        rsvp_start_date: rsvpSettings.rsvp_start_date,
        rsvp_start_time: rsvpSettings.rsvp_start_time,
        rsvp_end_date: rsvpSettings.rsvp_end_date,
        rsvp_end_time: rsvpSettings.rsvp_end_time,
      },
      // ... other payload fields
    };

    await eventService.createEvent(payload);
  };

  return (
    <div className="space-y-6">
      {/* ... existing form sections ... */}

      {/* Add RSVP Settings Section */}
      <RSVPSettings value={rsvpSettings} onChange={setRsvpSettings} />

      <button onClick={handleCreateEvent}>Create Event</button>
    </div>
  );
}
```

## 2. Adding RSVP Form to Event Detail Page

### Edit your EventDetail component

```tsx
// src/pages/EventDetail.tsx

import RSVPForm from "@/components/RSVPForm";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import eventService from "@/lib/eventService";

export default function EventDetail() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    loadEvent();
    getCurrentUserEmail();
  }, [eventId]);

  const loadEvent = async () => {
    const data = await eventService.getEventBySlug(eventId);
    setEvent(data);
  };

  const getCurrentUserEmail = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUserEmail(user?.email || "");
  };

  return (
    <div className="space-y-8">
      {/* Event details section */}
      <div>
        <h1>{event?.title}</h1>
        <p>{event?.long_description}</p>
        {/* ... other event details ... */}
      </div>

      {/* RSVP Section */}
      {event?.rsvp_enabled && (
        <div id="rsvp" className="scroll-mt-20">
          <RSVPForm
            eventId={event.id}
            eventTitle={event.title}
            userEmail={userEmail}
            onSubmitSuccess={() => {
              // Optional: refresh event data or show success message
              toast({
                title: "Success",
                description: "Your RSVP has been recorded!",
              });
            }}
          />
        </div>
      )}

      {/* ... rest of page ... */}
    </div>
  );
}
```

## 3. Adding RSVP Analytics to Event Management

### Edit your EventManagement/OrganizerDashboard component

```tsx
// src/pages/OrganizerDashboard.tsx or similar

import RSVPAnalytics from "@/components/RSVPAnalytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function EventManagement() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    const data = await eventService.getEventBySlug(eventId);
    setEvent(data);
  };

  return (
    <div className="space-y-6">
      <h1>Manage Event: {event?.title}</h1>

      <Tabs defaultValue="registrations">
        <TabsList>
          <TabsTrigger value="registrations">Registrations</TabsTrigger>
          {event?.rsvp_enabled && <TabsTrigger value="rsvp">RSVP</TabsTrigger>}
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="registrations">
          {/* Your existing registrations component */}
        </TabsContent>

        {event?.rsvp_enabled && (
          <TabsContent value="rsvp">
            <RSVPAnalytics eventId={event.id} eventTitle={event.title} />
          </TabsContent>
        )}

        <TabsContent value="settings">
          {/* Your existing settings component */}
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

## 4. Manually Triggering RSVP Emails

### Add a button in your event management interface

```tsx
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mail, Loader2 } from "lucide-react";

function EventManagementActions({ event }) {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  const handleSendRSVPEmails = async () => {
    if (!event?.rsvp_enabled) {
      toast({
        title: "Error",
        description: "RSVP is not enabled for this event",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      const result = await eventService.sendRSVPEmails(event.id);
      toast({
        title: "Success",
        description: `Sent ${result.emails_sent} RSVP emails (${result.failed} failed)`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex gap-2">
      {event?.rsvp_enabled && (
        <Button
          onClick={handleSendRSVPEmails}
          disabled={sending}
          variant="outline"
        >
          {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Mail className="mr-2 h-4 w-4" />
          Send RSVP Emails
        </Button>
      )}
    </div>
  );
}
```

## 5. Displaying RSVP Status in Event List

### Show RSVP info in event cards/tables

```tsx
function EventCard({ event }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{event.title}</CardTitle>
        {event.rsvp_enabled && <Badge className="mt-2">RSVP Enabled</Badge>}
      </CardHeader>
      <CardContent>
        <p>{event.short_blurb}</p>

        {event.rsvp_enabled && (
          <div className="mt-4 text-sm text-gray-600">
            <p>
              RSVP opens: {new Date(event.rsvp_start_date).toLocaleDateString()}
            </p>
            <p>
              RSVP closes: {new Date(event.rsvp_end_date).toLocaleDateString()}
            </p>
            <p>Type: {event.rsvp_type === "opt-in" ? "Opt-in" : "Opt-out"}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

## 6. Pre-fill User Email (for logged-in users)

```tsx
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

function EventDetail() {
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    };
    getCurrentUser();
  }, []);

  return (
    <RSVPForm
      eventId={event.id}
      eventTitle={event.title}
      userEmail={userEmail}
    />
  );
}
```

## 7. Conditional Display Based on RSVP Window

```tsx
import eventService from "@/lib/eventService";
import { useEffect, useState } from "react";

function EventDetail() {
  const [rsvpWindowOpen, setRsvpWindowOpen] = useState(false);

  useEffect(() => {
    const checkRSVP = async () => {
      const isOpen = await eventService.isRSVPWindowOpen(event.id);
      setRsvpWindowOpen(isOpen);
    };
    checkRSVP();
  }, [event.id]);

  return (
    <div>
      {/* Event details */}

      {event?.rsvp_enabled && rsvpWindowOpen ? (
        <RSVPForm eventId={event.id} eventTitle={event.title} />
      ) : event?.rsvp_enabled ? (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded">
          <p className="text-amber-900">
            RSVP for this event is no longer open. The deadline has passed.
          </p>
        </div>
      ) : null}
    </div>
  );
}
```

## 8. Validate RSVP Settings Before Event Creation

```tsx
function EventBuilder() {
  const [errors, setErrors] = useState({});

  const validateRSVP = () => {
    const newErrors = {};

    if (rsvpSettings.rsvp_enabled) {
      if (!rsvpSettings.rsvp_start_date) {
        newErrors.rsvp_start_date = "RSVP start date is required";
      }
      if (!rsvpSettings.rsvp_end_date) {
        newErrors.rsvp_end_date = "RSVP end date is required";
      }

      const startDate = new Date(
        `${rsvpSettings.rsvp_start_date}T${rsvpSettings.rsvp_start_time}`
      );
      const endDate = new Date(
        `${rsvpSettings.rsvp_end_date}T${rsvpSettings.rsvp_end_time}`
      );

      if (startDate >= endDate) {
        newErrors.rsvp_dates = "RSVP end date must be after start date";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateEvent = async () => {
    if (!validateRSVP()) {
      toast({
        title: "Validation Error",
        description: "Please fix RSVP settings",
        variant: "destructive"
      });
      return;
    }

    // Proceed with creation
  };

  return (
    // ... your form with RSVPSettings
  );
}
```

## Testing Checklist

- [ ] RSVP Settings form displays and validates
- [ ] Event can be created with RSVP enabled
- [ ] RSVP form displays on event detail page
- [ ] RSVP form checks if window is open
- [ ] User can submit RSVP response
- [ ] RSVP response is saved to database
- [ ] Organizer can view RSVP analytics
- [ ] Organizer can send RSVP emails
- [ ] Email logs are tracked
- [ ] CSV export works
- [ ] Row-level security prevents unauthorized access
- [ ] Guest users can RSVP with email
- [ ] Authenticated users can RSVP with their email

## Environment Setup

Don't forget to set environment variables:

```bash
# .env.local or .env.production
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key
RESEND_API_KEY=your_resend_key
RSVP_CRON_SECRET=your_secret_for_cron
```

And for edge functions:

```bash
# vercel.json
{
  "env": {
    "RESEND_API_KEY": "your_resend_key",
    "RSVP_CRON_SECRET": "your_secret"
  }
}
```

## Troubleshooting Integration

### "RSVPForm not found" error

- Ensure the component file is in `src/components/RSVPForm.tsx`
- Check import path is correct

### RSVP settings not saving

- Verify migration `20260428_add_rsvp_system.sql` was applied
- Check Supabase types are regenerated

### Emails not sending

- Verify `RESEND_API_KEY` is set in environment
- Check event has valid registrations with emails
- Review `event_rsvp_email_logs` table for errors

### Permission denied errors

- Ensure RLS policies from migration are applied
- Check that logged-in user is the event organizer
- Verify admin emails in RLS policies match your admins

For more detailed information, see [RSVP_SYSTEM.md](./RSVP_SYSTEM.md)
