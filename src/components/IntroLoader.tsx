import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

const WORDS = ["Think.", "Build.", "Transform."];
const WORD_DURATION_MS = 650;
const HOLD_ON_LAST_MS = 700;
const EXIT_DURATION_MS = 500;

export default function IntroLoader({ onComplete }: { onComplete: () => void }) {
  const prefersReducedMotion = useReducedMotion();
  const [wordIndex, setWordIndex] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  const totalSteps = WORDS.length;

  useEffect(() => {
    if (prefersReducedMotion) {
      // Skip the sequence entirely; show the final state briefly, then exit.
      const timer = setTimeout(() => setIsExiting(true), 400);
      return () => clearTimeout(timer);
    }

    if (wordIndex < totalSteps - 1) {
      const timer = setTimeout(() => setWordIndex((i) => i + 1), WORD_DURATION_MS);
      return () => clearTimeout(timer);
    }

    // Reached the last word — hold, then start exiting.
    const timer = setTimeout(() => setIsExiting(true), HOLD_ON_LAST_MS);
    return () => clearTimeout(timer);
  }, [wordIndex, totalSteps, prefersReducedMotion]);

  useEffect(() => {
    if (!isExiting) return;
    const timer = setTimeout(onComplete, EXIT_DURATION_MS);
    return () => clearTimeout(timer);
  }, [isExiting, onComplete]);

  const progressPct = useMemo(
    () => ((wordIndex + 1) / totalSteps) * 100,
    [wordIndex, totalSteps],
  );

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-background"
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: EXIT_DURATION_MS / 1000, ease: "easeInOut" }}
    >
      {/* Same subtle grid + accent glow treatment as the Hero, so the intro
          reads as the first frame of the site rather than a separate splash. */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--border) / 0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.5) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse 60% 50% at 50% 50%, black, transparent)",
          WebkitMaskImage:
            "radial-gradient(ellipse 60% 50% at 50% 50%, black, transparent)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-subtle pointer-events-none"
      />

      <div className="relative flex flex-col items-center gap-10">
        {/* Mark — same square + wordmark as Nav/Footer, so the brand is
            established immediately rather than only appearing at the end. */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex items-center gap-2"
        >
          <span className="w-2.5 h-2.5 rounded-sm bg-accent" />
          <span className="font-display text-lg font-bold tracking-[0.1em] text-foreground">
            REPDOX
          </span>
        </motion.div>

        {/* Word sequence */}
        <div className="h-16 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.span
              key={prefersReducedMotion ? "static" : wordIndex}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="font-display text-4xl sm:text-5xl font-bold text-foreground"
            >
              {prefersReducedMotion ? (
                "Repdox"
              ) : (
                <>
                  {WORDS[wordIndex].slice(0, -1)}
                  <span className="text-accent">{WORDS[wordIndex].slice(-1)}</span>
                </>
              )}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* Progress bar instead of a numeric countdown — quieter, and
            visually continuous with the word sequence above it. */}
        {!prefersReducedMotion && (
          <div className="w-40 h-[3px] rounded-full bg-border overflow-hidden">
            <motion.div
              className="h-full bg-accent rounded-full"
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}
