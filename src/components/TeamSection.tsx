import { motion } from "framer-motion";
import { User, ShieldCheck, Rocket, Briefcase, Zap, Palette } from "lucide-react";

const team = [
  {
    name: "Shlok Ram",
    role: "Founder",
    bio: "Successfully led multiple high-impact events with a vision for national tech-growth.",
    icon: Rocket,
    gradient: "from-emerald-400 to-cyan-500",
    glow: "rgba(52, 211, 153, 0.3)"
  },
  {
    name: "Amish Gandhi",
    role: "Co-Founder",
    bio: "National & international hackathon winner bringing deep technical expertise.",
    icon: Zap,
    gradient: "from-blue-400 to-indigo-500",
    glow: "rgba(96, 165, 250, 0.3)"
  },
  {
    name: "Urooj Fatima",
    role: "HR",
    bio: "Expert event organizer and active contributor in the MUN circuit.",
    icon: ShieldCheck,
    gradient: "from-purple-400 to-pink-500",
    glow: "rgba(192, 132, 252, 0.3)"
  },
  {
    name: "Anshika Yadav",
    role: "HR & Social Media",
    bio: "Core member, social media head, and expert in debates & diplomacy.",
    icon: Briefcase,
    gradient: "from-orange-400 to-red-500",
    glow: "rgba(251, 146, 60, 0.3)"
  },
  {
    name: "Vaibhav Singh",
    role: "Logistics & Research",
    bio: "Architect of multiple hackathons and gaming events across India.",
    icon: User,
    gradient: "from-teal-400 to-emerald-600",
    glow: "rgba(45, 212, 191, 0.3)"
  },
  {
    name: "Creative Core",
    role: "Design Team",
    bio: "Anya Mittal, Yash Singh, Aditya Madankar. Maintaining the brand identity and aesthetic.",
    icon: Palette,
    gradient: "from-pink-400 to-purple-600",
    glow: "rgba(244, 114, 182, 0.3)"
  }
];

export default function TeamSection() {
  return (
    <section id="team" className="py-24 relative">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500">
            Meet the Visionaries
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            The dedicated team working behind the scenes to revolutionize the student event ecosystem in India.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {team.map((member, index) => {
            const Icon = member.icon;
            return (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -10 }}
                className="group relative"
              >
                <div 
                  className="absolute inset-0 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ backgroundColor: member.glow }}
                />
                
                <div className="relative h-full bg-card/40 backdrop-blur-xl border border-border/50 rounded-3xl p-8 overflow-hidden hover:border-emerald-500/50 transition-colors duration-300">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 bg-gradient-to-br ${member.gradient} text-white shadow-lg`}>
                    <Icon className="w-8 h-8" />
                  </div>
                  
                  <div className="mb-4">
                    <span className="text-xs font-bold tracking-widest text-emerald-500 uppercase mb-2 block">
                      {member.role}
                    </span>
                    <h3 className="text-2xl font-bold text-foreground">
                      {member.name}
                    </h3>
                  </div>
                  
                  <p className="text-muted-foreground leading-relaxed">
                    {member.bio}
                  </p>

                  <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Icon className="w-24 h-24" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
