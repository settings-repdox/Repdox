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
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [eventId, setEventId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    school: "",
    year: "",
    track: "",
    teamSize: "Solo",
    teamName: "",
    motivation: "",
    github: "",
    linkedin: ""
  });

  useEffect(() => {
    const fetchEvent = async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id")
        .eq("slug", "solve-for-india")
        .maybeSingle();
      
      if (data) {
        setEventId(data.id);
      } else {
        console.warn("Solve for India event not found, will use a placeholder ID or error handling during submit.");
      }
    };
    fetchEvent();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Check if event exists
      let targetEventId = eventId;
      if (!targetEventId) {
        // Fallback: try to find it again or use a known one if we have it from user
        const { data } = await supabase.from("events").select("id").eq("slug", "solve-for-india").single();
        if (data) targetEventId = data.id;
      }

      if (!targetEventId) {
        throw new Error("Event recruitment is currently not active or event ID is missing.");
      }

      // 2. Prepare payload for event_registrations
      // We'll map the extra fields to the 'message' or 'metadata' if it exists, 
      // or just concatenate them into 'message' for now as per schema.
      const registrationData = {
        event_id: targetEventId,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.track, // Mapping track to role
        message: JSON.stringify({
          school: formData.school,
          year: formData.year,
          teamSize: formData.teamSize,
          teamName: formData.teamName,
          motivation: formData.motivation,
          links: {
            github: formData.github,
            linkedin: formData.linkedin
          }
        }),
        status: "pending"
      };

      const { error } = await supabase
        .from("event_registrations")
        .insert([registrationData]);

      if (error) throw error;

      setIsSuccess(true);
      toast({
        title: "Registration Successful!",
        description: "You've successfully registered for Solve For India.",
      });
    } catch (err: any) {
      console.error("Registration error:", err);
      toast({
        title: "Registration Failed",
        description: err.message || "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = (currentStep / totalSteps) * 100;

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#030308] flex items-center justify-center p-6 relative overflow-hidden">
        {/* Animated Background */}
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
            Thank you for registering for Solve For India. We've received your application and our team will get back to you soon.
          </p>
          <Button 
            onClick={() => navigate("/")}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-6 rounded-xl font-bold"
          >
            Back to Home
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030308] text-white py-12 px-6 relative overflow-hidden font-sans">
      {/* Premium Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.05),transparent_50%)]" />
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-600/10 blur-[100px] rounded-full animate-float" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-600/10 blur-[100px] rounded-full animate-float-delayed" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <header className="text-center mb-12">
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
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/40"
          >
            Join the <br /><span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">Innovation Race</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-gray-400 text-lg max-w-xl mx-auto"
          >
            Bring your ideas to life and solve real-world problems. Register now to be part of India's biggest impact-driven hackathon.
          </motion.p>
        </header>

        {/* Progress Bar */}
        <div className="mb-12 max-w-md mx-auto">
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-purple-600 to-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <div className="flex justify-between mt-3 text-xs font-medium text-gray-500">
            <span className={currentStep >= 1 ? "text-purple-400" : ""}>Step 1</span>
            <span className={currentStep >= 2 ? "text-purple-400" : ""}>Step 2</span>
            <span className={currentStep >= 3 ? "text-purple-400" : ""}>Step 3</span>
          </div>
        </div>

        {/* Form Card */}
        <motion.div 
          layout
          className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[32px] overflow-hidden shadow-2xl shadow-purple-500/5"
        >
          <form onSubmit={handleSubmit} className="p-8 md:p-12">
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center border border-purple-500/30">
                      <User className="text-purple-400 w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Personal Details</h2>
                      <p className="text-gray-500 text-sm">Tell us who you are</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-gray-400 ml-1">Full Name</Label>
                      <Input 
                        id="name" 
                        name="name"
                        placeholder="John Doe" 
                        required
                        value={formData.name}
                        onChange={handleInputChange}
                        className="bg-black/40 border-white/10 rounded-xl py-6 focus:ring-purple-500/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-400 ml-1">Email Address</Label>
                      <Input 
                        id="email" 
                        name="email"
                        type="email" 
                        placeholder="john@example.com" 
                        required
                        value={formData.email}
                        onChange={handleInputChange}
                        className="bg-black/40 border-white/10 rounded-xl py-6 focus:ring-purple-500/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-gray-400 ml-1">Phone Number (WhatsApp)</Label>
                      <Input 
                        id="phone" 
                        name="phone"
                        type="tel" 
                        placeholder="+91 98765-43210" 
                        required
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="bg-black/40 border-white/10 rounded-xl py-6 focus:ring-purple-500/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="school" className="text-gray-400 ml-1">School / University</Label>
                      <Input 
                        id="school" 
                        name="school"
                        placeholder="Your Institution" 
                        required
                        value={formData.school}
                        onChange={handleInputChange}
                        className="bg-black/40 border-white/10 rounded-xl py-6 focus:ring-purple-500/50"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
                      <Code className="text-blue-400 w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Project & Track</h2>
                      <p className="text-gray-500 text-sm">How will you change India?</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="track" className="text-gray-400 ml-1">Select Your Track</Label>
                        <select 
                          id="track"
                          name="track"
                          value={formData.track}
                          onChange={(e) => setFormData(prev => ({ ...prev, track: e.target.value }))}
                          className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                          required
                        >
                          <option value="" disabled className="bg-slate-900">Select a track</option>
                          <option value="environment" className="bg-slate-900">Environment & Sustainability</option>
                          <option value="healthcare" className="bg-slate-900">Healthcare Innovation</option>
                          <option value="education" className="bg-slate-900">EdTech & Digital Literacy</option>
                          <option value="safety" className="bg-slate-900">Public Safety & Security</option>
                          <option value="fintech" className="bg-slate-900">Open Track / Others</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="teamSize" className="text-gray-400 ml-1">Team Composition</Label>
                        <div className="flex gap-4">
                          {["Solo", "Duo"].map((size) => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, teamSize: size }))}
                              className={`flex-1 py-3 rounded-xl border transition-all ${
                                formData.teamSize === size 
                                ? "bg-purple-600/20 border-purple-500 text-purple-400" 
                                : "bg-black/40 border-white/10 text-gray-500 hover:border-white/20"
                              }`}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {formData.teamSize === "Duo" && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="space-y-2"
                      >
                        <Label htmlFor="teamName" className="text-gray-400 ml-1">Team Name</Label>
                        <Input 
                          id="teamName" 
                          name="teamName"
                          placeholder="Cyber Crusaders" 
                          value={formData.teamName}
                          onChange={handleInputChange}
                          className="bg-black/40 border-white/10 rounded-xl py-6 focus:ring-purple-500/50"
                        />
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center border border-green-500/30">
                      <Award className="text-green-400 w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Motivation & Links</h2>
                      <p className="text-gray-500 text-sm">Final details</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="motivation" className="text-gray-400 ml-1">Why do you want to participate?</Label>
                      <Textarea 
                        id="motivation" 
                        name="motivation"
                        placeholder="Tell us about your drive and what you hope to achieve..." 
                        required
                        value={formData.motivation}
                        onChange={handleInputChange}
                        className="bg-black/40 border-white/10 rounded-2xl min-h-[120px] focus:ring-purple-500/50"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="github" className="text-gray-400 ml-1">GitHub Profile (Optional)</Label>
                        <Input 
                          id="github" 
                          name="github"
                          placeholder="https://github.com/username" 
                          value={formData.github}
                          onChange={handleInputChange}
                          className="bg-black/40 border-white/10 rounded-xl py-6 focus:ring-purple-500/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="linkedin" className="text-gray-400 ml-1">LinkedIn Profile (Optional)</Label>
                        <Input 
                          id="linkedin" 
                          name="linkedin"
                          placeholder="https://linkedin.com/in/username" 
                          value={formData.linkedin}
                          onChange={handleInputChange}
                          className="bg-black/40 border-white/10 rounded-xl py-6 focus:ring-purple-500/50"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form Actions */}
            <div className="flex items-center gap-4 mt-12 pt-8 border-t border-white/5">
              {currentStep > 1 && (
                <Button
                  type="button"
                  onClick={prevStep}
                  variant="ghost"
                  className="flex-1 py-7 rounded-2xl text-gray-400 hover:text-white hover:bg-white/5 font-semibold text-lg"
                >
                  <ChevronLeft className="mr-2" /> Previous
                </Button>
              )}
              
              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  className="flex-[2] py-7 rounded-2xl bg-white text-black hover:bg-gray-200 font-bold text-lg"
                >
                  Continue <ChevronRight className="ml-2" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] py-7 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold text-lg shadow-xl shadow-purple-600/20"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Registering...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Rocket className="w-5 h-5" /> Submit Registration
                    </span>
                  )}
                </Button>
              )}
            </div>
          </form>
        </motion.div>

        {/* Footer info */}
        <p className="text-center mt-8 text-gray-500 text-sm">
          Having trouble? Contact us at <a href="mailto:support@repdox.com" className="text-purple-400 hover:underline">support@repdox.com</a>
        </p>
      </div>

      <style>{`
        @keyframes float {
          0% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
          100% { transform: translateY(0) scale(1); }
        }
        @keyframes float-delayed {
          0% { transform: translateY(0) scale(1); }
          50% { transform: translateY(20px) scale(1.05); }
          100% { transform: translateY(0) scale(1); }
        }
        .animate-float { animation: float 10s infinite ease-in-out; }
        .animate-float-delayed { animation: float-delayed 12s infinite ease-in-out; }
      `}</style>
    </div>
  );
}
