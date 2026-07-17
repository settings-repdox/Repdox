import { motion } from "framer-motion";
import { Zap, Target, Heart, Lightbulb } from "lucide-react";

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
  return (
    <section className="py-24 px-6 bg-gradient-subtle">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="eyebrow justify-center mb-4 text-accent">Who we are</span>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-6">
            About Repdox
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We're a youth-led movement empowering students and early-career professionals
            through transformative events. From hackathons to
            gaming tournaments to skill-building workshops—we create spaces where
            ambition meets opportunity.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const Icon = feature.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ y: -6 }}
      className="group"
    >
      <div className="surface-card p-6 h-full">
        <div className="relative inline-flex items-center justify-center w-12 h-12 rounded-xl mb-5 bg-accent/10 border border-accent/20 group-hover:bg-accent/15 transition-colors duration-300">
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
}
