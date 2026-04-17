import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Share2 } from "lucide-react";
import { useSpring, animated } from "@react-spring/web";
import CountUp from "@/components/ui/CountUp";

export default function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showDiscordModal, setShowDiscordModal] = useState(false);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const scrollY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.8]);

  const [springs, api] = useSpring(() => ({
    rotateX: 0,
    rotateY: 0,
    config: { mass: 5, tension: 350, friction: 40 },
  }));

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const mouseX = (e.clientX - rect.left) / rect.width;
    const mouseY = (e.clientY - rect.top) / rect.height;

    api.start({
      rotateX: (mouseY - 0.5) * 10,
      rotateY: (mouseX - 0.5) * -10,
    });
  };

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background"
    >

      <motion.div
        style={{ y: scrollY, opacity, scale }}
        className="relative z-10 max-w-6xl mx-auto px-6 text-center"
      >
        <animated.div
          onMouseMove={handleMouseMove}
          onMouseLeave={() => api.start({ rotateX: 0, rotateY: 0 })}
          style={{
            transform: springs.rotateX.to((rx) =>
              springs.rotateY.to(
                (ry) =>
                  `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg)`,
              ),
            ),
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 backdrop-blur-sm border border-border mb-8"
          >
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-foreground">
              Next-Gen Event Platform
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl md:text-8xl font-display font-bold mb-6 leading-tight"
            style={{
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundImage: "linear-gradient(to bottom, hsl(var(--foreground)), hsl(var(--foreground)), hsl(var(--foreground) / 0.4))",
              filter: "drop-shadow(0 0 4px rgba(168, 85, 247, 0.15))",
            }}
          >
            Think. Build.
            <br />
            <span
              style={{
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundImage: "linear-gradient(to right, hsl(168, 70%, 55%), hsl(331, 70%, 65%), hsl(204, 70%, 60%))",
                filter: "drop-shadow(0 0 8px rgba(168, 85, 247, 0.2))",
              }}
            >
              Transform.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            Join hackathons, MUNs and workshops that spark change. Build.
            Compete. Connect.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
          >
            {/* Primary CTA: View Events */}
            <motion.button
              onClick={() => (window.location.href = "/events")}
              whileHover={{
                scale: 1.05,
              }}
              whileTap={{ scale: 0.95 }}
              onHoverStart={() => {}}
              className="group relative overflow-hidden bg-primary text-primary-foreground px-8 py-6 text-lg rounded-2xl font-semibold transition-all duration-300 hover:shadow-glow-purple"
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
              className="group relative px-8 py-6 text-lg rounded-2xl font-semibold text-foreground bg-background border-2 border-foreground/20 transition-all duration-300 hover:shadow-glow-cyan hover:border-foreground/60"
            >
              <span className="relative z-10 flex items-center gap-2">
                Join Community
                <Share2 className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
              </span>
            </motion.button>
          </motion.div>

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
                className="bg-card rounded-2xl p-8 max-w-md w-full border border-border"
              >
                <h2 className="text-2xl font-display font-bold mb-4 text-foreground">
                  Join Our Community
                </h2>
                <p className="text-muted-foreground mb-6">
                  Connect with innovators, builders, and creators on our Discord server.
                </p>
                <a
                  href="https://discord.gg/TbAqDgy4cw"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-primary text-primary-foreground px-6 py-3 rounded-lg text-center font-semibold hover:bg-primary/90 transition-colors duration-300"
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

          {/* <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="grid grid-cols-3 gap-8 max-w-2xl mx-auto"
          >
            {[
              { label: "Events Run", value: 50, suffix: "+" },
              { label: "Attendees", value: 5000, suffix: "+" },
              { label: "Partners", value: 30, suffix: "+" },
            ].map((stat, index) => (
              <div key={index} className="text-center group cursor-pointer">
                <div className="text-4xl md:text-5xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/60 group-hover:scale-110 transition-transform">
                  <CountUp
                    from={0}
                    to={stat.value}
                    separator=","
                    direction="up"
                    duration={2}
                    suffix={stat.suffix}
                  />
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </motion.div> */}
        </animated.div>
      </motion.div>
    </section>
  );
}
