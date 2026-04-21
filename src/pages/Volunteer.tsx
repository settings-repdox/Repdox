import { motion, useScroll, useTransform } from "framer-motion";
import { Users, Award, Globe, Rocket, Heart, ChevronRight } from "lucide-react";
import { useRef } from "react";
import { useInView } from "react-intersection-observer";

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

export default function Volunteer() {
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
              <h3 className="text-3xl font-bold">Ready to make an impact?</h3>
              <p className="text-muted-foreground leading-relaxed">
                Applications are now open for the 2026 session. 
                Our team will reach out to shortlisted candidates within 7 days.
              </p>
              <motion.a
                href="https://application.repdox.com"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg shadow-xl shadow-purple-500/30 hover:shadow-purple-500/50 transition-all"
              >
                Apply Now <Rocket className="w-5 h-5" />
              </motion.a>
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
