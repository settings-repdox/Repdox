import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Mail, Send, ArrowRight, Sparkles, Trophy, Users, GraduationCap, MapPin, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

// Dedicated client for the old volunteer database
const OLD_PROJECT_URL = "https://fpdbrvmejpujuwtitfbi.supabase.co";
const OLD_PROJECT_KEY = "sb_publishable__s8qGXZm8TyOT2X5QnQ-1g_MMeWWpS2";
const oldDb = (window as any).supabase?.createClient 
  ? (window as any).supabase.createClient(OLD_PROJECT_URL, OLD_PROJECT_KEY)
  : null;

export default function Volunteers() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasApplied, setHasApplied] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
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
    motivation: ""
  });

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        navigate('/signin?redirect=/join-us');
        return;
      }
      setUser(currentUser);
      setFormData(prev => ({ ...prev, email: currentUser.email || "" }));
      handleStatusCheck(currentUser);
    };
    checkUser();
  }, [navigate]);

  const handleStatusCheck = async (currentUser: any) => {
    if (!currentUser?.email) return;
    try {
      // Check status in the OLD project
      const data = await fetch(`${OLD_PROJECT_URL}/rest/v1/survey_responses?email=eq.${currentUser.email}&select=status`, {
        headers: { "apikey": OLD_PROJECT_KEY, "Authorization": `Bearer ${OLD_PROJECT_KEY}` }
      }).then(res => res.json());

      if (data && data.length > 0) {
        setHasApplied(true);
        setApplicationStatus(data[0].status);
      }
    } catch (err) {
      console.error('Error checking status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`${OLD_PROJECT_URL}/rest/v1/survey_responses`, {
        method: "POST",
        headers: { 
            "apikey": OLD_PROJECT_KEY, 
            "Authorization": `Bearer ${OLD_PROJECT_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        },
        body: JSON.stringify([{
          student_name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          school: formData.school,
          city: formData.city,
          branch: formData.branch,
          class: formData.class,
          preferred_game: formData.rolePreference,
          reason: formData.motivation,
          status: 'pending',
          submitted_at: new Date().toISOString()
        }])
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Submission failed");
      }

      setHasApplied(true);
      setApplicationStatus('pending');
      toast.success("Application submitted successfully!");
    } catch (error: any) {
      console.error('Error submitting application:', error);
      toast.error(error.message || "Failed to submit application");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#05050e] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (hasApplied) {
    return (
      <div className="min-h-screen bg-[#05050e] text-white pt-24 pb-20 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-200px] left-[-200px] w-[600px] h-[600px] bg-purple-600/10 blur-[120px] rounded-full animate-pulse"></div>
          <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-cyan-600/10 blur-[100px] rounded-full animate-pulse delay-700"></div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:64px_64px]"></div>
        </div>

        <div className="max-w-3xl mx-auto px-4 relative z-10 text-center">
          <div className="w-24 h-24 bg-purple-500/10 border-2 border-purple-500/30 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
            {applicationStatus === 'approved' ? <Trophy className="w-12 h-12 text-purple-400" /> : <CheckCircle2 className="w-12 h-12 text-purple-400" />}
          </div>
          
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight">
            {applicationStatus === 'pending' && "Application Pending"}
            {applicationStatus === 'interview' && "Selected for Interview!"}
            {applicationStatus === 'approved' && "Welcome to the Team!"}
            {applicationStatus === 'rejected' && "Application Status"}
          </h1>

          <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-8 md:p-12 shadow-2xl">
            {applicationStatus === 'pending' && (
              <>
                <p className="text-xl text-muted-foreground mb-8">
                  Your application is being reviewed by our team. We'll get back to you soon!
                </p>
                <div className="flex flex-col md:flex-row gap-4 justify-center">
                  <Button onClick={() => navigate('/events')} className="bg-purple-600 hover:bg-purple-700 h-12 px-8 rounded-xl font-bold">
                    Explore Events
                  </Button>
                </div>
              </>
            )}

            {applicationStatus === 'interview' && (
              <>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-400 text-sm font-bold mb-6">
                  <Sparkles className="w-4 h-4" /> RECRUITMENT PHASE 2
                </div>
                <p className="text-xl text-white mb-8">
                  Great news! You've been shortlisted for an interview. We will reach out to you via email shortly to schedule the call.
                </p>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-left mb-8">
                  <p className="text-sm text-muted-foreground mb-2">Next Steps:</p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">✅ Keep an eye on your inbox</li>
                    <li className="flex items-center gap-2">✅ Prepare to discuss your experience</li>
                    <li className="flex items-center gap-2">✅ Research about Repdox projects</li>
                  </ul>
                </div>
              </>
            )}

            {applicationStatus === 'approved' && (
              <>
                <p className="text-xl text-white mb-8">
                  Congratulations! You are officially part of the Repdox community.
                </p>
                <Button 
                  onClick={() => navigate('/dashboard')}
                  className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:opacity-90 h-12 px-10 rounded-xl font-bold shadow-lg shadow-purple-500/20"
                >
                  Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </>
            )}

            {applicationStatus === 'rejected' && (
              <>
                <p className="text-xl text-muted-foreground mb-8">
                  Thank you for your interest. Unfortunately, we aren't able to move forward with your application at this time.
                </p>
                <p className="text-sm text-muted-foreground mb-8">
                  If you have any questions, feel free to contact us.
                </p>
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = 'mailto:support@repdox.com'}
                  className="border-white/10 hover:bg-white/5 h-12 px-8 rounded-xl font-bold"
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
    <div className="min-h-screen bg-[#05050e] text-white pt-24 pb-20 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-250px] left-[-250px] w-[700px] h-[700px] bg-purple-600/10 blur-[130px] rounded-full"></div>
        <div className="absolute bottom-[-150px] right-[-100px] w-[500px] h-[500px] bg-cyan-600/10 blur-[110px] rounded-full"></div>
        <div className="absolute top-[40%] right-[10%] w-[350px] h-[350px] bg-amber-600/5 blur-[90px] rounded-full"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:64px_64px]"></div>
      </div>

      <div className="max-w-4xl mx-auto px-4 relative z-10">
        <header className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-3 bg-purple-500/10 border border-purple-500/30 rounded-full px-6 py-2 text-sm font-bold text-purple-400 mb-4 animate-fade-down">
            <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(168,85,247,0.8)]"></span>
            RECRUITMENT 2026
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1]">
            JOIN US <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">TODAY</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-lg mx-auto">
            Help us build the future of student events and competitions. Become a Repdox Volunteer.
          </p>
        </header>

        <div className="bg-white/5 border border-white/10 backdrop-blur-2xl rounded-[32px] p-6 md:p-12 shadow-2xl relative">
          <form onSubmit={handleSubmit} className="space-y-10">
            
            {/* Personal Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-purple-400 font-bold border-b border-white/5 pb-4">
                <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                PERSONAL INFORMATION
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-muted-foreground flex items-center gap-2">
                    Full Name <span className="text-purple-400">*</span>
                  </Label>
                  <Input
                    id="fullName"
                    placeholder="Enter your full name"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="h-14 bg-white/5 border-white/10 focus:border-purple-500/50 focus:bg-purple-500/5 transition-all rounded-2xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-muted-foreground flex items-center gap-2">
                    Phone Number <span className="text-purple-400">*</span>
                  </Label>
                  <Input
                    id="phone"
                    placeholder="+91 00000 00000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="h-14 bg-white/5 border-white/10 focus:border-purple-500/50 focus:bg-purple-500/5 transition-all rounded-2xl"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Academic Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-cyan-400 font-bold border-b border-white/5 pb-4">
                <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center">
                  <GraduationCap className="w-5 h-5" />
                </div>
                ACADEMIC DETAILS
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="school" className="text-muted-foreground flex items-center gap-2">
                    School / College <span className="text-cyan-400">*</span>
                  </Label>
                  <Input
                    id="school"
                    placeholder="Institution Name"
                    value={formData.school}
                    onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                    className="h-14 bg-white/5 border-white/10 focus:border-cyan-500/50 focus:bg-cyan-500/5 transition-all rounded-2xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-muted-foreground flex items-center gap-2">
                    City <span className="text-cyan-400">*</span>
                  </Label>
                  <Input
                    id="city"
                    placeholder="Your City"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="h-14 bg-white/5 border-white/10 focus:border-cyan-500/50 focus:bg-cyan-500/5 transition-all rounded-2xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branch" className="text-muted-foreground flex items-center gap-2">
                    Branch / Stream <span className="text-cyan-400">*</span>
                  </Label>
                  <Input
                    id="branch"
                    placeholder="e.g. Science, Commerce"
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    className="h-14 bg-white/5 border-white/10 focus:border-cyan-500/50 focus:bg-cyan-500/5 transition-all rounded-2xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="class" className="text-muted-foreground flex items-center gap-2">
                    Class / Year <span className="text-cyan-400">*</span>
                  </Label>
                  <Input
                    id="class"
                    placeholder="e.g. 11th, 1st Year"
                    value={formData.class}
                    onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                    className="h-14 bg-white/5 border-white/10 focus:border-cyan-500/50 focus:bg-cyan-500/5 transition-all rounded-2xl"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Role Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-amber-400 font-bold border-b border-white/5 pb-4">
                <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                  <Briefcase className="w-5 h-5" />
                </div>
                ROLE PREFERENCE
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-muted-foreground flex items-center gap-2">
                  Preferred Role <span className="text-amber-400">*</span>
                </Label>
                <Select 
                  onValueChange={(val) => setFormData({ ...formData, rolePreference: val })}
                  required
                >
                  <SelectTrigger className="h-14 bg-white/5 border-white/10 focus:ring-amber-500/30 rounded-2xl">
                    <SelectValue placeholder="Select a position" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0e0c1e] border-white/10 text-white">
                    <SelectItem value="Event Management">Event Management</SelectItem>
                    <SelectItem value="Marketing & Outreach">Marketing & Outreach</SelectItem>
                    <SelectItem value="Technical Support">Technical Support</SelectItem>
                    <SelectItem value="Social Media">Social Media & Content</SelectItem>
                    <SelectItem value="Logistics">Logistics & Operations</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="motivation" className="text-muted-foreground flex items-center gap-2">
                  Why do you want to join Repdox? <span className="text-amber-400">*</span>
                </Label>
                <Textarea
                  id="motivation"
                  placeholder="Tell us about your interest, skills and what you can bring to the team..."
                  value={formData.motivation}
                  onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
                  className="min-h-[150px] bg-white/5 border-white/10 focus:border-amber-500/50 focus:bg-amber-500/5 transition-all rounded-2xl resize-none leading-relaxed"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-16 bg-gradient-to-r from-purple-600 via-purple-500 to-cyan-500 hover:opacity-90 rounded-2xl text-xl font-black tracking-widest shadow-2xl shadow-purple-500/20 group overflow-hidden relative"
            >
              <div className="relative z-10 flex items-center justify-center gap-3">
                {isSubmitting ? (
                  <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    SUBMIT APPLICATION <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </>
                )}
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            </Button>
          </form>
        </div>

        {/* Footer info */}
        <p className="mt-10 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" /> All applications are reviewed manually within 3-5 business days.
        </p>
      </div>
    </div>
  );
}
