import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Mail,
  Send,
  ArrowRight,
  Sparkles,
  Trophy,
  Users,
  GraduationCap,
  MapPin,
  Briefcase,
  Video,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

// Dedicated client for the old volunteer database
const OLD_PROJECT_URL = "https://fpdbrvmejpujuwtitfbi.supabase.co";
const OLD_PROJECT_KEY = "sb_publishable__s8qGXZm8TyOT2X5QnQ-1g_MMeWWpS2";

interface OldSupabaseClient {
  createClient: (url: string, key: string) => any;
}

const oldDb = (window as unknown as { supabase?: OldSupabaseClient }).supabase
  ?.createClient
  ? (
      window as unknown as { supabase: OldSupabaseClient }
    ).supabase.createClient(OLD_PROJECT_URL, OLD_PROJECT_KEY)
  : null;

export default function Volunteers() {
  const navigate = useNavigate();
  const [user, setUser] = useState<import("@supabase/supabase-js").User | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [hasApplied, setHasApplied] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(
    null,
  );
  const [interviewTime, setInterviewTime] = useState<string | null>(null);
  const [meetLink, setMeetLink] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    school: "",
    city: "",
    branch: "",
    class: "",
    rolePreference: "",
    motivation: "",
  });

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      if (!currentUser) {
        navigate("/signin?redirect=/join-us");
        return;
      }
      setUser(currentUser);
      setFormData((prev) => ({ ...prev, email: currentUser.email || "" }));
      handleStatusCheck(currentUser);
    };
    checkUser();
  }, [navigate]);

  const handleStatusCheck = async (
    currentUser: import("@supabase/supabase-js").User,
  ) => {
    if (!currentUser?.email) return;
    try {
      // Try to fetch with new interview columns
      let response = await fetch(
        `${OLD_PROJECT_URL}/rest/v1/survey_responses?email=eq.${currentUser.email}&select=status,interview_time,meet_link`,
        {
          headers: {
            apikey: OLD_PROJECT_KEY,
            Authorization: `Bearer ${OLD_PROJECT_KEY}`,
          },
        },
      );

      if (!response.ok) {
        // Fallback: fetch only status if the new columns don't exist yet
        console.warn("Falling back to basic status check...");
        response = await fetch(
          `${OLD_PROJECT_URL}/rest/v1/survey_responses?email=eq.${currentUser.email}&select=status`,
          {
            headers: {
              apikey: OLD_PROJECT_KEY,
              Authorization: `Bearer ${OLD_PROJECT_KEY}`,
            },
          },
        );
      }

      const data = await response.json();

      if (data && data.length > 0) {
        setHasApplied(true);
        setApplicationStatus(data[0].status);
        setInterviewTime(data[0].interview_time || null);
        setMeetLink(data[0].meet_link || null);
      }
    } catch (err) {
      console.error("Error checking status:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `${OLD_PROJECT_URL}/rest/v1/survey_responses`,
        {
          method: "POST",
          headers: {
            apikey: OLD_PROJECT_KEY,
            Authorization: `Bearer ${OLD_PROJECT_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify([
            {
              student_name: formData.fullName,
              email: formData.email,
              phone: formData.phone,
              school: formData.school,
              city: formData.city,
              branch: formData.branch,
              class: formData.class,
              preferred_game: formData.rolePreference,
              reason: formData.motivation,
              status: "pending",
              submitted_at: new Date().toISOString(),
            },
          ]),
        },
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Submission failed");
      }

      setHasApplied(true);
      setApplicationStatus("pending");
      toast.success("Application submitted successfully!");
    } catch (err) {
      const error = err as Error;
      console.error("Error submitting application:", error);
      toast.error(error.message || "Failed to submit application");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (hasApplied) {
    return (
      <div className="min-h-screen bg-background text-foreground pt-24 pb-20 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-200px] left-[-200px] w-[600px] h-[600px] bg-accent/10 blur-[120px] rounded-full"></div>
          <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--border)/0.5)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.5)_1px,transparent_1px)] bg-[size:64px_64px] opacity-40"></div>
        </div>

        <div className="max-w-3xl mx-auto px-4 relative z-10 text-center">
          <div className="w-24 h-24 bg-accent/10 border-2 border-accent/30 rounded-full flex items-center justify-center mx-auto mb-8">
            {applicationStatus === "approved" ? (
              <Trophy className="w-12 h-12 text-accent" />
            ) : (
              <CheckCircle2 className="w-12 h-12 text-accent" />
            )}
          </div>

          <h1 className="text-4xl md:text-5xl font-display font-bold mb-6 tracking-tight text-foreground">
            {applicationStatus === "pending" && "Application Pending"}
            {applicationStatus === "interview" && "Selected for Interview!"}
            {applicationStatus === "approved" && "Welcome to the Team!"}
            {applicationStatus === "rejected" && "Application Status"}
          </h1>

          <div className="bg-card border border-border rounded-3xl p-8 md:p-12 shadow-lg">
            {applicationStatus === "pending" && (
              <>
                <p className="text-xl text-muted-foreground mb-8">
                  Your application is being reviewed by our team. We'll get back
                  to you soon!
                </p>
                <div className="flex flex-col md:flex-row gap-4 justify-center">
                  <Button
                    onClick={() => navigate("/events")}
                    className="bg-accent text-accent-foreground hover:bg-accent/90 h-12 px-8 rounded-xl font-bold"
                  >
                    Explore Events
                  </Button>
                </div>
              </>
            )}

            {applicationStatus === "interview" && (
              <>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/20 rounded-full text-accent text-sm font-bold mb-6">
                  <Sparkles className="w-4 h-4" /> RECRUITMENT PHASE 2
                </div>
                <h2 className="text-2xl font-display font-bold text-foreground mb-4">
                  Interview Invitation
                </h2>
                <p className="text-muted-foreground mb-8 text-lg">
                  Great news! You've been shortlisted for an interview. We have
                  mailed you the scheduled time for your call.
                </p>

                {interviewTime ? (
                  <div className="space-y-6">
                    <div className="p-6 bg-accent/10 rounded-2xl border border-accent/20 flex flex-col items-center">
                      <Clock className="w-8 h-8 text-accent mb-3" />
                      <p className="text-accent font-bold text-sm uppercase tracking-wider mb-2">
                        Scheduled Time
                      </p>
                      <p className="text-xl font-bold text-foreground">
                        {new Date(interviewTime).toLocaleString("en-IN", {
                          dateStyle: "long",
                          timeStyle: "short",
                          timeZone: "Asia/Kolkata",
                        })}
                      </p>
                    </div>

                    {(() => {
                      const now = new Date();
                      const scheduled = new Date(interviewTime);
                      // Show link 10 minutes before and up to 1 hour after
                      const isMeetVisible =
                        now.getTime() >= scheduled.getTime() - 10 * 60 * 1000 &&
                        now.getTime() <= scheduled.getTime() + 60 * 60 * 1000;

                      if (isMeetVisible && meetLink) {
                        return (
                          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <Button
                              onClick={() => window.open(meetLink, "_blank")}
                              className="w-full h-16 bg-accent text-accent-foreground hover:bg-accent/90 rounded-2xl text-lg font-black tracking-wider shadow-accent group"
                            >
                              JOIN INTERVIEW MEET{" "}
                              <Video className="ml-3 w-6 h-6 group-hover:scale-110 transition-transform" />
                            </Button>
                            <p className="text-xs text-muted-foreground mt-4 italic">
                              * Please ensure you are in a quiet environment
                              with a stable internet connection.
                            </p>
                          </div>
                        );
                      } else {
                        return (
                          <div className="p-6 bg-secondary rounded-2xl border border-border flex flex-col items-center">
                            <Video className="w-8 h-8 text-muted-foreground/50 mb-3" />
                            <p className="text-muted-foreground italic text-center">
                              The meet link will become active 10 minutes before
                              your scheduled time.
                            </p>
                          </div>
                        );
                      }
                    })()}
                  </div>
                ) : (
                  <div className="p-6 bg-secondary rounded-2xl border border-border">
                    <p className="text-muted-foreground">
                      Our team is currently finalizing your interview slot. You
                      will receive an email confirmation very shortly.
                    </p>
                  </div>
                )}

                <div className="mt-10 p-4 bg-secondary rounded-2xl border border-border text-left">
                  <p className="text-sm text-muted-foreground mb-3 font-bold uppercase tracking-widest">
                    Preparation Tips:
                  </p>
                  <ul className="space-y-2 text-sm text-foreground/80">
                    <li className="flex items-center gap-2 font-medium">
                      <div className="w-1.5 h-1.5 bg-accent rounded-full" />{" "}
                      Be ready to discuss your skills and motivation
                    </li>
                    <li className="flex items-center gap-2 font-medium">
                      <div className="w-1.5 h-1.5 bg-accent rounded-full" />{" "}
                      Have your portfolio or previous work ready if applicable
                    </li>
                    <li className="flex items-center gap-2 font-medium">
                      <div className="w-1.5 h-1.5 bg-accent rounded-full" />{" "}
                      Find a quiet space with good lighting
                    </li>
                  </ul>
                </div>
              </>
            )}

            {applicationStatus === "approved" && (
              <>
                <p className="text-xl text-foreground mb-8">
                  Congratulations! You are officially part of the Repdox
                  community.
                </p>
                <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-center mb-4">
                  <p className="text-emerald-500 font-bold mb-1">NEXT STEPS</p>
                  <p className="text-sm text-foreground/80">
                    You will receive a call and a WhatsApp message from our team
                    shortly regarding your onboarding.
                  </p>
                </div>
              </>
            )}

            {applicationStatus === "rejected" && (
              <>
                <p className="text-xl text-muted-foreground mb-8">
                  Thank you for your interest. Unfortunately, we aren't able to
                  move forward with your application at this time.
                </p>
                <p className="text-sm text-muted-foreground mb-8">
                  If you have any questions, feel free to contact us.
                </p>
                <Button
                  variant="outline"
                  onClick={() =>
                    (window.location.href = "mailto:supportrepdox@gmail.com")
                  }
                  className="hover:bg-accent/10 h-12 px-8 rounded-xl font-bold"
                >
                  <Mail className="w-4 h-4 mr-2" /> Contact Support
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pt-24 pb-20 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-250px] left-[-250px] w-[700px] h-[700px] bg-accent/10 blur-[130px] rounded-full"></div>
        <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--border)/0.5)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.5)_1px,transparent_1px)] bg-[size:64px_64px] opacity-40"></div>
      </div>

      <div className="max-w-4xl mx-auto px-4 relative z-10">
        <header className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-3 bg-accent/10 border border-accent/30 rounded-full px-6 py-2 text-sm font-bold text-accent mb-4">
            <span className="w-2 h-2 bg-accent rounded-full animate-pulse"></span>
            RECRUITMENT 2026
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight leading-[1.1] text-foreground">
            JOIN US <span className="text-accent">TODAY</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-lg mx-auto">
            Help us build the future of student events and competitions. Become
            a Repdox Volunteer.
          </p>
        </header>

        <div className="bg-card border border-border rounded-[32px] p-6 md:p-12 shadow-lg relative">
          <form onSubmit={handleSubmit} className="space-y-10">
            {/* Personal Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-foreground font-bold border-b border-border pb-4">
                <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
                  <Users className="w-5 h-5" />
                </div>
                PERSONAL INFORMATION
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="fullName"
                    className="text-muted-foreground flex items-center gap-2"
                  >
                    Full Name <span className="text-accent">*</span>
                  </Label>
                  <Input
                    id="fullName"
                    placeholder="Enter your full name"
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    className="h-14 bg-secondary/50 border-border focus:border-accent/50 focus:bg-accent/5 transition-all rounded-2xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="phone"
                    className="text-muted-foreground flex items-center gap-2"
                  >
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    placeholder="+91 00000 00000"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="h-14 bg-secondary/50 border-border focus:border-accent/50 focus:bg-accent/5 transition-all rounded-2xl"
                  />
                </div>
              </div>
            </div>

            {/* Academic Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-foreground font-bold border-b border-border pb-4">
                <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
                  <GraduationCap className="w-5 h-5" />
                </div>
                ACADEMIC DETAILS
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="school"
                    className="text-muted-foreground flex items-center gap-2"
                  >
                    School / College <span className="text-accent">*</span>
                  </Label>
                  <Input
                    id="school"
                    placeholder="Institution Name"
                    value={formData.school}
                    onChange={(e) =>
                      setFormData({ ...formData, school: e.target.value })
                    }
                    className="h-14 bg-secondary/50 border-border focus:border-accent/50 focus:bg-accent/5 transition-all rounded-2xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="city"
                    className="text-muted-foreground flex items-center gap-2"
                  >
                    City <span className="text-accent">*</span>
                  </Label>
                  <Input
                    id="city"
                    placeholder="Your City"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    className="h-14 bg-secondary/50 border-border focus:border-accent/50 focus:bg-accent/5 transition-all rounded-2xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="branch"
                    className="text-muted-foreground flex items-center gap-2"
                  >
                    Branch / Stream <span className="text-accent">*</span>
                  </Label>
                  <Input
                    id="branch"
                    placeholder="e.g. Science, Commerce"
                    value={formData.branch}
                    onChange={(e) =>
                      setFormData({ ...formData, branch: e.target.value })
                    }
                    className="h-14 bg-secondary/50 border-border focus:border-accent/50 focus:bg-accent/5 transition-all rounded-2xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="class"
                    className="text-muted-foreground flex items-center gap-2"
                  >
                    Class / Year <span className="text-accent">*</span>
                  </Label>
                  <Select
                    onValueChange={(val) =>
                      setFormData({ ...formData, class: val })
                    }
                    required
                  >
                    <SelectTrigger className="h-14 bg-secondary/50 border-border focus:ring-accent/30 rounded-2xl">
                      <SelectValue placeholder="Select your year" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border text-popover-foreground">
                      <SelectItem value="9th Grade">9th Grade</SelectItem>
                      <SelectItem value="10th Grade">10th Grade</SelectItem>
                      <SelectItem value="11th Grade">11th Grade</SelectItem>
                      <SelectItem value="12th Grade">12th Grade</SelectItem>
                      <SelectItem value="1st Year">1st Year (UG)</SelectItem>
                      <SelectItem value="2nd Year">2nd Year (UG)</SelectItem>
                      <SelectItem value="3rd Year">3rd Year (UG)</SelectItem>
                      <SelectItem value="4th Year">4th Year (UG)</SelectItem>
                      <SelectItem value="Graduate">Graduate</SelectItem>
                      <SelectItem value="Post Graduate">
                        Post Graduate
                      </SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Role Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-foreground font-bold border-b border-border pb-4">
                <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
                  <Briefcase className="w-5 h-5" />
                </div>
                ROLE PREFERENCE
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="role"
                  className="text-muted-foreground flex items-center gap-2"
                >
                  Preferred Role <span className="text-accent">*</span>
                </Label>
                <Select
                  onValueChange={(val) =>
                    setFormData({ ...formData, rolePreference: val })
                  }
                  required
                >
                  <SelectTrigger className="h-14 bg-secondary/50 border-border focus:ring-accent/30 rounded-2xl">
                    <SelectValue placeholder="Select a position" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-popover-foreground">
                    <SelectItem value="Event Management">
                      Event Management
                    </SelectItem>
                    <SelectItem value="Marketing & Outreach">
                      Marketing & Outreach
                    </SelectItem>
                    <SelectItem value="Technical Support">
                      Technical Support
                    </SelectItem>
                    <SelectItem value="Social Media">
                      Social Media & Content
                    </SelectItem>
                    <SelectItem value="Logistics">
                      Logistics & Operations
                    </SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="motivation"
                  className="text-muted-foreground flex items-center gap-2"
                >
                  Why do you want to join Repdox?{" "}
                  <span className="text-accent">*</span>
                </Label>
                <Textarea
                  id="motivation"
                  placeholder="Tell us about your interest, skills and what you can bring to the team..."
                  value={formData.motivation}
                  onChange={(e) =>
                    setFormData({ ...formData, motivation: e.target.value })
                  }
                  className="min-h-[150px] bg-secondary/50 border-border focus:border-accent/50 focus:bg-accent/5 transition-all rounded-2xl resize-none leading-relaxed"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-16 bg-accent text-accent-foreground hover:bg-accent/90 rounded-2xl text-xl font-black tracking-widest shadow-accent group overflow-hidden relative"
            >
              <div className="relative z-10 flex items-center justify-center gap-3">
                {isSubmitting ? (
                  <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    SUBMIT APPLICATION{" "}
                    <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </>
                )}
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent-foreground/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            </Button>
          </form>
        </div>

        {/* Footer info */}
        <p className="mt-10 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" /> All applications are
          reviewed manually within 3-5 business days.
        </p>
      </div>
    </div>
  );
}
