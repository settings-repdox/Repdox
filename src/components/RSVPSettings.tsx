import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export interface RSVPSettingsData {
  rsvp_enabled: boolean;
  rsvp_type: "opt-in" | "opt-out";
  rsvp_start_date: string;
  rsvp_start_time: string;
  rsvp_end_date: string;
  rsvp_end_time: string;
}

interface RSVPSettingsProps {
  value: Partial<RSVPSettingsData>;
  onChange: (settings: Partial<RSVPSettingsData>) => void;
}

export default function RSVPSettings({ value, onChange }: RSVPSettingsProps) {
  const [showOptionalWarning, setShowOptionalWarning] = useState(false);

  const handleChange = (key: keyof RSVPSettingsData, val: any) => {
    onChange({ ...value, [key]: val });
  };

  const handleTypeChange = (type: "opt-in" | "opt-out") => {
    handleChange("rsvp_type", type);
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle>RSVP Settings</CardTitle>
        <CardDescription>
          Configure automatic RSVP collection for this event. Send emails to registrants asking
          them to confirm their attendance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable RSVP Toggle */}
        <div className="flex items-center justify-between space-x-4">
          <div className="space-y-1">
            <Label htmlFor="rsvp-enabled" className="text-base font-medium">
              Enable RSVP
            </Label>
            <p className="text-sm text-gray-500">
              Allow attendees to confirm their attendance via email
            </p>
          </div>
          <Switch
            id="rsvp-enabled"
            checked={value.rsvp_enabled || false}
            onCheckedChange={(checked) => handleChange("rsvp_enabled", checked)}
          />
        </div>

        {value.rsvp_enabled && (
          <>
            {/* RSVP Type Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">RSVP Basis</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <RadioGroup
                    value={value.rsvp_type || "opt-in"}
                    onValueChange={(v) => handleTypeChange(v as "opt-in" | "opt-out")}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="opt-in" id="opt-in" />
                      <Label htmlFor="opt-in" className="font-normal cursor-pointer">
                        Opt-in: Attendees must actively confirm attendance
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="flex items-center space-x-3">
                  <RadioGroup
                    value={value.rsvp_type || "opt-in"}
                    onValueChange={(v) => handleTypeChange(v as "opt-in" | "opt-out")}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="opt-out" id="opt-out" />
                      <Label htmlFor="opt-out" className="font-normal cursor-pointer">
                        Opt-out: Attendees are assumed to attend unless they decline
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {value.rsvp_type === "opt-in"
                  ? "Use this for events where you need to know exactly who's attending."
                  : "Use this for events where most people will attend unless they say otherwise."}
              </p>
            </div>

            {/* RSVP Dates */}
            <div className="space-y-4 border-t pt-4">
              <Label className="text-base font-medium">RSVP Window</Label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rsvp-start-date">RSVP Start Date</Label>
                  <Input
                    id="rsvp-start-date"
                    type="date"
                    value={value.rsvp_start_date || ""}
                    onChange={(e) => handleChange("rsvp_start_date", e.target.value)}
                    min={today}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rsvp-start-time">Start Time</Label>
                  <Input
                    id="rsvp-start-time"
                    type="time"
                    value={value.rsvp_start_time || ""}
                    onChange={(e) => handleChange("rsvp_start_time", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rsvp-end-date">RSVP End Date</Label>
                  <Input
                    id="rsvp-end-date"
                    type="date"
                    value={value.rsvp_end_date || ""}
                    onChange={(e) => handleChange("rsvp_end_date", e.target.value)}
                    min={value.rsvp_start_date || today}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rsvp-end-time">End Time</Label>
                  <Input
                    id="rsvp-end-time"
                    type="time"
                    value={value.rsvp_end_time || ""}
                    onChange={(e) => handleChange("rsvp_end_time", e.target.value)}
                  />
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  RSVP emails will be sent immediately after your event is approved. Make sure
                  dates are set before publishing!
                </AlertDescription>
              </Alert>
            </div>

            {/* Send RSVP Emails CTA */}
            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-3">
                Once your event is live, you can send RSVP reminders to all registered attendees
                from the event management dashboard.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
