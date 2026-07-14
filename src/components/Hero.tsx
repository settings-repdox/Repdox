import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Share2 } from "lucide-react";

export default function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showDiscordModal, setShowDiscordModal] = useState(false);
  const navigate = useNavigate();

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-subtle"
    >
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.4]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--border) / 0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.5) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 60% 50% at 50% 30%, black, transparent)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 50% at 50% 30%, black, transparent)",
        }}
      />
      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
        <div className="eyebrow inline-flex px-4 py-2 rounded-full bg-card border border-border mb-8">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <span className="normal-case tracking-normal text-foreground/80 font-medium">
            Next-Gen Event Platform
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-7xl font-display font-bold mb-6 leading-[1.05] text-foreground">
          Think. Build.
          <br />
          <span className="text-accent">Transform.</span>
        </h1>

        <p className="text-lg md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed px-4 md:px-0">
          Join hackathons, MUNs and workshops that spark change. Build.
          Compete. Connect.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          {/* Primary CTA: View Events */}
          <motion.button
            onClick={() => navigate("/events")}
            whileHover={{
              scale: 1.05,
            }}
            whileTap={{ scale: 0.95 }}
            className="group relative overflow-hidden bg-accent text-accent-foreground px-8 py-6 text-lg rounded-xl font-semibold transition-all duration-300 hover:shadow-accent"
          >
            <span className="relative z-10 flex items-center gap-2">
              View Events
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </span>
          </motion.button>

          {/* Secondary CTA: Join Community */}
          <motion.button
            onClick={() => setShowDiscordModal(true)}
            whileHover={{
              scale: 1.05,
            }}
            whileTap={{ scale: 0.95 }}
            className="group relative px-8 py-6 text-lg rounded-xl font-semibold text-foreground bg-transparent border border-border transition-all duration-300 hover:border-accent/60 hover:bg-accent/5"
          >
            <span className="relative z-10 flex items-center gap-2">
              Join Community
              <Share2 className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
            </span>
          </motion.button>
        </div>

        {/* Discord Modal Overlay */}
        {showDiscordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDiscordModal(false)}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl p-8 max-w-md w-full border border-border shadow-lg"
            >
              <h2 className="text-2xl font-display font-bold mb-4 text-foreground">
                Join Our Community
              </h2>
              <p className="text-muted-foreground mb-6">
                Connect with innovators, builders, and creators on our Discord server.
              </p>
              <a
                href="https://discord.gg/y9kRMNn49K"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-accent text-accent-foreground px-6 py-3 rounded-lg text-center font-semibold hover:bg-accent/90 transition-colors duration-300"
              >
                Open Discord Invite
              </a>
              <button
                onClick={() => setShowDiscordModal(false)}
                className="block w-full mt-3 text-muted-foreground hover:text-foreground transition-colors duration-300"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
