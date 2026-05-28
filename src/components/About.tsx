import { motion } from "framer-motion";
import { Zap, Target, Heart, Lightbulb } from "lucide-react";
import { useState } from "react";

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
  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            About Repdox
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            We're a youth-led movement empowering students and early-career professionals 
            through transformative events. From hackathons to Model UN conferences, 
            gaming tournaments to skill-building workshops—we create spaces where 
            ambition meets opportunity.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ feature, index }: { feature: typeof features[0], index: number }) {
  const Icon = feature.icon;
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ y: -8, scale: 1.02 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group"
    >
      <motion.div
        className="bg-card rounded-lg p-6 h-full border border-border/50 transition-all duration-300 relative overflow-hidden"
        animate={{
          boxShadow: isHovered
            ? `0 10px 30px -10px ${feature.glow.replace('0.4', '0.2')}`
            : "0 0 0 rgba(0, 0, 0, 0)",
        }}
        transition={{ duration: 0.3 }}
      >
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none" 
          style={{ background: feature.gradient }}
        />
        
        <motion.div
          className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 shadow-lg transition-all duration-300"
          style={{ background: feature.gradient }}
          whileHover={{
            scale: 1.1,
            rotate: 2,
          }}
          transition={{ duration: 0.3 }}
        >
          <Icon className="h-7 w-7 text-white" />
        </motion.div>
        <h3 className="text-xl font-semibold font-display mb-2 text-foreground group-hover:text-purple-500 transition-colors duration-300">
          {feature.title}
        </h3>
        <p className="text-muted-foreground leading-relaxed text-sm">
          {feature.description}
        </p>
      </motion.div>
    </motion.div>
  );
}
