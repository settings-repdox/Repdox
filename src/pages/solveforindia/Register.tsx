import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  User, 
  Code, 
  Award, 
  Rocket, 
  Sparkles 
} from "lucide-react";

export default function SolveForIndiaRegister() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [eventId, setEventId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    school: "",
    year: "",
    stream: "",
    track: "general",
    teamSize: "Solo",
    teamName: "",
    motivation: "",
    github: "",
    linkedin: ""
  });

  useEffect(() => {
    const fetchEvent = async () => {
      const { data } = await supabase
        .from("events")
        .select("id")
        .eq("slug", "SolveForIndia")
        .maybeSingle();
      
      if (data) {
        setEventId(data.id);
      } else {
        // Fallback to fetch any active event if specifically SolveForIndia isn't labeled yet
        const { data: latest } = await supabase.from("events").select("id").limit(1).single();
        if (latest) setEventId(latest.id);
      }
    };
    fetchEvent();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!eventId) throw new Error("Event ID not found. Please try again.");

      const registrationData = {
        event_id: eventId,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        message: JSON.stringify({
          school: formData.school,
          year: formData.year,
          stream: formData.stream,
          teamSize: formData.teamSize,
          teamName: formData.teamName,
          motivation: formData.motivation,
          links: {
            github: formData.github,
            linkedin: formData.linkedin
          }
        })
      };

      const { error } = await supabase
        .from("event_registrations")
        .insert([registrationData]);

      if (error) {
        if (error.code === '23505') throw new Error("You have already registered with this email address!");
        throw error;
      }

      setIsSuccess(true);
      toast({
        title: "Registration Successful!",
        description: "Redirecting in 5 seconds...",
      });

      setTimeout(() => {
        window.location.href = "https://repdox.com";
      }, 5000);

    } catch (err: any) {
      toast({
        title: "Registration Failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#030308] flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full animate-pulse delay-700" />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-10 text-center shadow-2xl"
        >
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Registration Complete!</h2>
          <p className="text-gray-400 mb-8">
            Welcome to Solve For India 2026. Redirecting you to our main site in a few seconds...
          </p>
          <Button 
            onClick={() => window.location.href = "https://repdox.com"}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-6 rounded-xl font-bold"
          >
            Go to Repdox.com
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030308] text-white py-12 px-6 relative overflow-hidden font-sans">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_10%,rgba(139,92,246,0.08),transparent_70%)]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <header className="text-center mb-16">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-purple-400">Solve For India 2026</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-bold mb-6"
          >
            Join the <br /><span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">Innovation Race</span>
          </motion.h1>
          <motion.p className="text-gray-400 text-lg max-w-xl mx-auto">
            Fill out the form below to secure your spot in India's biggest impact-driven hackathon.
          </motion.p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-12">
          {/* Section 1: Personal Details */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 md:p-12"
          >
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center border border-purple-500/30">
                <User className="text-purple-400 w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Personal Details</h2>
                <p className="text-gray-500 text-sm">Tell us about yourself</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <Label className="text-gray-400">Full Name</Label>
                <Input name="name" required value={formData.name} onChange={handleInputChange} className="bg-black/40 border-white/10 h-14 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-400">Email Address</Label>
                <Input name="email" type="email" required value={formData.email} onChange={handleInputChange} className="bg-black/40 border-white/10 h-14 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-400">WhatsApp Number</Label>
                <Input name="phone" type="tel" required value={formData.phone} onChange={handleInputChange} className="bg-black/40 border-white/10 h-14 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-400">School / University</Label>
                <Input name="school" required value={formData.school} onChange={handleInputChange} className="bg-black/40 border-white/10 h-14 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-400">Stream / Major</Label>
                <Input name="stream" required placeholder="e.g. PCM, CSE" value={formData.stream} onChange={handleInputChange} className="bg-black/40 border-white/10 h-14 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-400">Current Year</Label>
                <select name="year" required value={formData.year} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 h-14 rounded-xl px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50">
                  <option value="" disabled>Select Year</option>
                  <optgroup label="School" className="bg-slate-900">
                    <option value="9">9th Grade</option>
                    <option value="10">10th Grade</option>
                    <option value="11">11th Grade</option>
                    <option value="12">12th Grade</option>
                  </optgroup>
                  <optgroup label="University" className="bg-slate-900">
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </optgroup>
                </select>
              </div>
            </div>
          </motion.div>

          {/* Section 2: Team Info */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 md:p-12"
          >
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
                <Code className="text-blue-400 w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Team Composition</h2>
                <p className="text-gray-500 text-sm">Solo or with a partner?</p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="flex gap-4">
                {["Solo", "Duo"].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, teamSize: size }))}
                    className={`flex-1 py-4 rounded-xl border transition-all font-bold ${
                      formData.teamSize === size 
                      ? "bg-purple-600/20 border-purple-500 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.2)]" 
                      : "bg-black/40 border-white/10 text-gray-500 hover:border-white/20"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>

              {formData.teamSize === "Duo" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2">
                  <Label className="text-gray-400">Team Name</Label>
                  <Input name="teamName" required value={formData.teamName} onChange={handleInputChange} className="bg-black/40 border-white/10 h-14 rounded-xl" />
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Section 3: Final Details */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 md:p-12"
          >
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center border border-green-500/30">
                <Award className="text-green-400 w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Final Pulse</h2>
                <p className="text-gray-500 text-sm">The finish line</p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-2">
                <Label className="text-gray-400">Why do you want to participate?</Label>
                <Textarea name="motivation" required value={formData.motivation} onChange={handleInputChange} className="bg-black/40 border-white/10 rounded-2xl min-h-[140px] p-4 text-lg" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label className="text-gray-400">GitHub Profile (Optional)</Label>
                  <Input name="github" type="url" value={formData.github} onChange={handleInputChange} className="bg-black/40 border-white/10 h-14 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-400">LinkedIn Profile (Optional)</Label>
                  <Input name="linkedin" type="url" value={formData.linkedin} onChange={handleInputChange} className="bg-black/40 border-white/10 h-14 rounded-xl" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Submit Action */}
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="pt-8">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-8 rounded-[24px] bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold text-xl shadow-[0_20px_40px_rgba(147,51,234,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                <span className="flex items-center gap-3">
                  <Rocket className="w-6 h-6" /> Complete Registration
                </span>
              )}
            </Button>
          </motion.div>
        </form>

        <footer className="text-center mt-20 text-gray-600 text-sm">
          Having trouble? <a href="mailto:support@repdox.com" className="text-purple-500 hover:underline">Contact Support</a>
        </footer>
      </div>
    </div>
  );
}
