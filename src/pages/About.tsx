import { motion, useScroll, useTransform } from "framer-motion";
import { Zap, Target, Heart, Lightbulb } from "lucide-react";
import { useRef } from "react";
import { useInView } from "react-intersection-observer";

const features = [
  {
    icon: Zap,
    title: "Energize Innovation",
    description: "Spark creativity through hands-on hackathons and collaborative workshops.",
  },
  {
    icon: Target,
    title: "Build Skills",
    description: "Develop technical and leadership abilities in real-world scenarios.",
  },
  {
    icon: Heart,
    title: "Foster Community",
    description: "Connect with like-minded students, mentors, and industry leaders.",
  },
  {
    icon: Lightbulb,
    title: "Drive Impact",
    description: "Transform ideas into solutions that make a difference.",
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
        className="absolute inset-0 bg-gradient-subtle pointer-events-none"
      />
      
      <div ref={ref} className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >          
          <span className="eyebrow justify-center mb-4 text-accent">Who we are</span>
          <h2 className="text-4xl md:text-6xl font-display font-bold mb-6 text-foreground">
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
                whileHover={{ y: -6 }}
                className="group relative"
              >
                <div className="h-full surface-card p-6">
                  <div className="relative inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 bg-accent/10 border border-accent/20 group-hover:bg-accent/15 transition-colors duration-300">
                    <Icon className="h-6 w-6 text-accent" />
                  </div>

                  <h3 className="text-lg font-display font-semibold mb-2 text-foreground">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="surface-card p-8">
              <h3 className="text-xl font-display font-semibold mb-3 text-foreground">For Organizers</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">
                Repdox supports organizers with professional tools to create events, manage registrations,
                accept role-based signups, and export participant lists. We provide
                templates and best practices for running safe, accessible, and impactful events.
              </p>
            </section>

            <section className="surface-card p-8">
              <h3 className="text-xl font-display font-semibold mb-3 text-foreground">Community Guidelines</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">
                We strive to build welcoming spaces. Treat others with respect, follow local
                laws, and report behavior that makes you uncomfortable.
                Organizers are expected to provide clear codes of conduct.
              </p>
            </section>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="surface-card p-8">
              <h3 className="text-xl font-display font-semibold mb-3 text-foreground">Verification & Safety</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">
                We offer account verification via email or phone to help organisers and attendees trust interactions. You can request a verification token in your profile settings — this ensures secure and verified community engagement.
              </p>
            </section>

            <section className="rounded-xl p-8 border border-accent/30 bg-accent/5 text-center flex flex-col items-center justify-center">
              <h3 className="text-xl font-display font-semibold mb-2 text-foreground">Get Involved</h3>
              <p className="text-muted-foreground mb-6 text-sm">
                Interested in contributing, organizing, or sponsoring?
              </p>
              <a 
                href="/contact" 
                className="px-6 py-2.5 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold rounded-lg transition-all active-scale text-sm"
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