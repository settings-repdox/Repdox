import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Users, Award, Globe, Rocket, Heart, ChevronRight, CheckCircle2, Loader2, Sparkles, Mail } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const volunteerRoles = [
  {
    icon: Users,
    title: "Event Management",
    description: "Lead the planning and execution of hackathons, MUNs, and gaming tournaments.",
    gradient: "linear-gradient(135deg, #a855f7 -20%, #6366f1 120%)",
  },
  {
    icon: Globe,
    title: "Outreach & PR",
    description: "Spread the word! Manage social media and build partnerships with schools and colleges.",
    gradient: "linear-gradient(135deg, #06b6d4 -20%, #3b82f6 120%)",
  },
  {
    icon: Rocket,
    title: "Tech & Design",
    description: "Build the platform, design branding assets, or manage technical ops during events.",
    gradient: "linear-gradient(135deg, #ec4899 -20%, #f43f5e 120%)",
  },
  {
    icon: Award,
    title: "Logistics",
    description: "Ensure everything runs smoothly behind the scenes, from sponsorships to operations.",
    gradient: "linear-gradient(135deg, #f59e0b -20%, #f97316 120%)",
  },
];

const benefits = [
  "Certificate of Excellence",
  "Leadership Opportunities",
  "Early Access to All Events",
];

export default function Volunteers() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], ["80px", "-80px"]);

  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  const [hasApplied, setHasApplied] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
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
    const checkStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        setFormData(prev => ({
          ...prev,
          email: user.email || "",
          fullName: user.user_metadata?.full_name || ""
        }));

        try {
          const { data, error } = await supabase
            .from('volunteer_applications' as any)
            .select('status')
            .eq('user_id', user.id)
            .maybeSingle();

          if (data) {
            setHasApplied(true);
            setApplicationStatus((data as any).status);
          }
        } catch (err) {
          console.error("Error checking volunteer status:", err);
        }
      }
      setIsLoading(false);
    };

    checkStatus();
  }, []);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to apply");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: submitError } = await supabase
        .from('volunteer_applications' as any)
        .insert([{
          user_id: user.id,
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          school: formData.school,
          city: formData.city,
          branch: formData.branch,
          class: formData.class,
          role_preference: formData.rolePreference,
          motivation: formData.motivation,
          status: 'pending'
        }]);

      if (submitError) throw submitError;

      setHasApplied(true);
      setApplicationStatus('pending');
      setIsFormOpen(false);
      toast.success("Application submitted successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit application");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-32 overflow-hidden" ref={containerRef}>
      {/* Decorative background gradients */}
      <motion.div 
        style={{ y }}
        className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(168,85,247,0.08),transparent_50%),radial-gradient(circle_at_80%_70%,rgba(6,182,212,0.08),transparent_50%)] pointer-events-none"
      />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-24"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-semibold mb-6"
          >
            <Heart className="w-4 h-4" />
            Join the Movement
          </motion.div>
          <h1 className="text-5xl md:text-7xl font-bold mb-8 bg-gradient-to-r from-foreground via-foreground/80 to-foreground/50 bg-clip-text text-transparent">
            Build the Future <br/> as a Volunteer
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Repdox is 100% student-driven. Join our team of passionate youth leaders 
            organizing the next generation of transformative events across India.
          </p>
        </motion.div>

        {/* Roles Grid */}
        <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-32">
          {volunteerRoles.map((role, index) => {
            const Icon = role.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                whileHover={{ y: -10 }}
                className="group p-8 rounded-3xl bg-card/40 backdrop-blur-xl border border-border/50 hover:border-purple-500/30 transition-all duration-300 relative overflow-hidden"
              >
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500"
                  style={{ background: role.gradient }}
                />
                
                <div 
                  style={{ background: role.gradient }}
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-black/20"
                >
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3">{role.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {role.description}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Benefits & Call to Action */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            <h2 className="text-4xl font-bold">Why Volunteer with Us?</h2>
            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <ChevronRight className="w-4 h-4 text-emerald-500" />
                  </div>
                  <span className="text-lg text-foreground/80">{benefit}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.8 }}
            className="relative p-1 rounded-3xl bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500"
          >
            <div className="bg-card/90 backdrop-blur-2xl rounded-[22px] p-10 md:p-14 text-center space-y-8">
              {isLoading ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                  <p className="text-muted-foreground">Checking your status...</p>
                </div>
              ) : hasApplied ? (
                <div className="space-y-6">
                  <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                  </div>
                  <h3 className="text-3xl font-bold">
                    {applicationStatus === 'approved' ? "You're a Volunteer!" : 
                     applicationStatus === 'interview' ? "Interview Selected!" :
                     applicationStatus === 'rejected' ? "Application Status" : "Application Received!"}
                  </h3>
                  <div className={`inline-block px-4 py-2 rounded-full text-sm font-semibold border ${
                    applicationStatus === 'approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                    applicationStatus === 'interview' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                    applicationStatus === 'rejected' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                    'bg-purple-500/10 border-purple-500/20 text-purple-400'
                  }`}>
                    Status: {applicationStatus?.toUpperCase() || 'PENDING'}
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {applicationStatus === 'approved' 
                      ? "Welcome to the team! You are officially a Repdox volunteer. You can now access volunteer-only features and help us build amazing events."
                      : applicationStatus === 'interview'
                      ? "Congratulations! You have been selected for an interview. We are excited to talk to you. We will get back to you via mail with the schedule and details shortly."
                      : applicationStatus === 'rejected'
                      ? "Thank you for your interest in joining Repdox. Unfortunately, we are not moving forward with your application at this time."
                      : "You have already filled out the Join Us form. Our team is currently reviewing your application. We'll get in touch with you soon!"}
                  </p>
                  
                  <div className="flex flex-col gap-4 items-center">
                    {applicationStatus === 'approved' ? (
                      <Link to="/profile?section=dashboard">
                        <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 font-bold px-8 py-6 rounded-xl">
                          Go to Your Dashboard
                        </Button>
                      </Link>
                    ) : applicationStatus === 'rejected' ? (
                      <a href="mailto:support@repdox.com?subject=Re: Volunteer Application Inquiry">
                        <Button variant="outline" className="border-purple-500/30 hover:bg-purple-500/10 font-bold px-8 py-6 rounded-xl">
                          Contact Support via Mail
                        </Button>
                      </a>
                    ) : applicationStatus === 'interview' ? (
                      <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10 flex items-center gap-3 text-blue-400">
                        <Mail className="w-5 h-5" />
                        <span className="text-sm font-medium">Keep an eye on your inbox!</span>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground/60 italic">
                        Check back later for updates on your application status.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="text-3xl font-bold">Ready to make an impact?</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Applications are now open for the 2026 session.
                  </p>
                  
                  {user ? (
                    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                      <DialogTrigger asChild>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg shadow-xl shadow-purple-500/30 hover:shadow-purple-500/50 transition-all"
                        >
                          Apply Now <Rocket className="w-5 h-5" />
                        </motion.button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[500px] bg-background/95 backdrop-blur-xl border-border/50 max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <Sparkles className="w-6 h-6 text-purple-500" />
                            Join Repdox Team
                          </DialogTitle>
                          <DialogDescription>
                            Fill out the form below to apply for a volunteer position. (Database migration required for schema: add columns 'school', 'city', 'branch', 'class' to 'volunteer_applications' table)
                          </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleFormSubmit} className="space-y-6 pt-4">
                          <div className="space-y-4">
                            <div className="grid gap-2">
                              <Label htmlFor="fullName">Full Name</Label>
                              <Input
                                id="fullName"
                                required
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                className="bg-accent/50 border-border/50"
                                placeholder="John Doe"
                              />
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                  id="email"
                                  type="email"
                                  required
                                  disabled
                                  value={formData.email}
                                  className="bg-accent/30 border-border/50 opacity-70"
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input
                                  id="phone"
                                  type="tel"
                                  required
                                  value={formData.phone}
                                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                  className="bg-accent/50 border-border/50"
                                  placeholder="+91 98765 43210"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="school">School / College</Label>
                                <Input
                                  id="school"
                                  placeholder="Your educational institution"
                                  value={formData.school}
                                  onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                                  className="bg-white/5 border-white/10"
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="city">City</Label>
                                <Input
                                  id="city"
                                  placeholder="Your city"
                                  value={formData.city}
                                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                  className="bg-white/5 border-white/10"
                                  required
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="branch">Branch / Stream</Label>
                                <Input
                                  id="branch"
                                  placeholder="e.g. Science, Commerce, Arts"
                                  value={formData.branch}
                                  onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                                  className="bg-white/5 border-white/10"
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="class">Class / Year</Label>
                                <Input
                                  id="class"
                                  placeholder="e.g. 11th, 2nd Year"
                                  value={formData.class}
                                  onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                                  className="bg-white/5 border-white/10"
                                  required
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="role">Preferred Role</Label>
                              <Select 
                                onValueChange={(val) => setFormData({ ...formData, rolePreference: val })}
                                required
                              >
                                <SelectTrigger className="bg-accent/50 border-border/50">
                                  <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                  {volunteerRoles.map((role) => (
                                    <SelectItem key={role.title} value={role.title}>
                                      {role.title}
                                    </SelectItem>
                                  ))}
                                  <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="grid gap-2">
                              <Label htmlFor="motivation">Why do you want to join Repdox?</Label>
                              <Textarea
                                id="motivation"
                                required
                                value={formData.motivation}
                                onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
                                className="bg-accent/50 border-border/50 min-h-[100px]"
                                placeholder="Tell us about your interest and skills..."
                              />
                            </div>
                          </div>

                          <Button 
                            type="submit" 
                            className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 font-bold text-lg"
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Submitting...
                              </>
                            ) : (
                              "Submit Application"
                            )}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <div className="space-y-4">
                      <Link to="/signin">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg shadow-xl shadow-purple-500/30 hover:shadow-purple-500/50 transition-all"
                        >
                          Sign In to Apply <Rocket className="w-5 h-5" />
                        </motion.button>
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        You must be logged in to submit a volunteer application.
                      </p>
                    </div>
                  )}
                </>
              ) }
              <p className="text-xs text-muted-foreground/60 italic mt-4">
                * No prior experience required. We value passion and willingness to learn!
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
