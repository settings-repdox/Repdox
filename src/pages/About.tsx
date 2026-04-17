import { motion, useScroll, useTransform } from "framer-motion";
import { Zap, Target, Heart, Lightbulb } from "lucide-react";
import { useRef } from "react";
import { useInView } from "react-intersection-observer";

const features = [
  {
    icon: Zap,
    title: "Energize Innovation",
    description: "Spark creativity through hands-on hackathons and collaborative workshops.",
    gradient: "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)",
    glow: "rgba(245, 158, 11, 0.4)"
  },
  {
    icon: Target,
    title: "Build Skills",
    description: "Develop technical and leadership abilities in real-world scenarios.",
    gradient: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
    glow: "rgba(6, 182, 212, 0.4)"
  },
  {
    icon: Heart,
    title: "Foster Community",
    description: "Connect with like-minded students, mentors, and industry leaders.",
    gradient: "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)",
    glow: "rgba(236, 72, 153, 0.4)"
  },
  {
    icon: Lightbulb,
    title: "Drive Impact",
    description: "Transform ideas into solutions that make a difference.",
    gradient: "linear-gradient(135deg, #a855f7 0%, #6366f1 100%)",
    glow: "rgba(168, 85, 247, 0.4)"
  },
];

export default function About() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], ["100px", "-100px"]);

  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  return (
    <section ref={containerRef} className="py-32 px-6 relative overflow-hidden">
      {/* Animated background layers */}
      <motion.div 
        style={{ y }}
        className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(120,119,198,0.1),transparent_50%)] pointer-events-none"
      />
      
      <div ref={ref} className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >          
          <h2 className="text-5xl md:text-6xl font-bold mb-6 text-foreground">
            About Repdox
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            We're a youth-led movement empowering students and early-career professionals 
            through transformative events. From hackathons to Model UN conferences, 
            gaming tournaments to skill-building workshops—we create spaces where 
            ambition meets opportunity.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                whileHover={{ y: -10, scale: 1.05 }}
                className="group relative"
              >
                <div className="h-full bg-card/50 backdrop-blur-md rounded-2xl p-6 border border-border/50 overflow-hidden hover:border-border transition-all duration-300">
                  {/* Gradient overlay on hover */}
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500" 
                    style={{ background: feature.gradient }}
                  />
                  
                  <div 
                    style={{ background: feature.gradient }}
                    className="relative inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg"
                  >
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-3 text-foreground group-hover:text-purple-500 transition-colors duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>


        {/* Extra Content: Organizer Benefits, Guidelines, Contact */}
        <div className="max-w-4xl mx-auto mt-24 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section className="bg-card/30 backdrop-blur-sm rounded-3xl p-8 border border-border/50 hover:border-emerald-500/30 transition-all">
              <h3 className="text-2xl font-bold mb-4 text-emerald-500">For Organizers</h3>
              <p className="text-muted-foreground leading-relaxed">
                Repdox supports organizers with professional tools to create events, manage registrations,
                accept role-based signups, and export participant lists. We provide
                templates and best practices for running safe, accessible, and impactful events.
              </p>
            </section>

            <section className="bg-card/30 backdrop-blur-sm rounded-3xl p-8 border border-border/50 hover:border-cyan-500/30 transition-all">
              <h3 className="text-2xl font-bold mb-4 text-cyan-500">Community Guidelines</h3>
              <p className="text-muted-foreground leading-relaxed">
                We strive to build welcoming spaces. Treat others with respect, follow local
                laws, and report behavior that makes you uncomfortable.
                Organizers are expected to provide clear codes of conduct.
              </p>
            </section>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section className="bg-card/30 backdrop-blur-sm rounded-3xl p-8 border border-border/50 hover:border-purple-500/30 transition-all">
              <h3 className="text-2xl font-bold mb-4 text-purple-500">Verification & Safety</h3>
              <p className="text-muted-foreground leading-relaxed">
                We offer account verification via email or phone to help organisers and attendees trust interactions. You can request a verification token in your profile settings — this ensures secure and verified community engagement.
              </p>
            </section>

            <section className="bg-emerald-500/10 backdrop-blur-md rounded-3xl p-8 border border-emerald-500/20 text-center flex flex-col items-center justify-center">
              <h3 className="text-2xl font-bold mb-4 text-foreground">Get Involved</h3>
              <p className="text-muted-foreground mb-6">
                Interested in contributing, organizing, or sponsoring?
              </p>
              <a 
                href="/contact" 
                className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/20"
              >
                Contact Our Team
              </a>
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}