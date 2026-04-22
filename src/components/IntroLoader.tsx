import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const loadingStages = [
  "Loading About page...",
  "Loading Volunteer's page...",
  "Loading Events...",
  "Loading Community...",
  "Loaded Repdox"
];

export default function IntroLoader({ onComplete }: { onComplete: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < loadingStages.length - 1) {
      const timer = setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
      }, 1000); // 1 second per card
      return () => clearTimeout(timer);
    } else {
      // Hold on the last card briefly before completing the loader
      const timer = setTimeout(() => {
        onComplete();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, onComplete]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black overflow-hidden">
      {/* Dynamic Background Glow */}
      <motion.div
        className="absolute inset-0 opacity-30"
        animate={{
          background: [
            "radial-gradient(circle at 50% 50%, rgba(168,85,247,0.2) 0%, rgba(0,0,0,0) 50%)",
            "radial-gradient(circle at 50% 50%, rgba(236,72,153,0.2) 0%, rgba(0,0,0,0) 50%)",
            "radial-gradient(circle at 50% 50%, rgba(168,85,247,0.2) 0%, rgba(0,0,0,0) 50%)"
          ]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />
      
      <div className="relative w-[320px] h-[180px]">
        {loadingStages.map((stage, i) => {
          const isSwapped = i < currentIndex;
          const isActive = i === currentIndex;
          const isBelow = i > currentIndex;
          const offset = i - currentIndex;

          return (
            <motion.div
              key={i}
              className="absolute inset-0 flex items-center justify-center rounded-3xl bg-zinc-900/80 backdrop-blur-md border border-white/10"
              initial={{
                scale: 0.8,
                y: 50,
                opacity: 0,
                boxShadow: "0px 8px 30px 0px rgba(0, 0, 0, 0.4)"
              }}
              animate={{
                scale: isSwapped ? 0.9 : isActive ? 1 : 1 - offset * 0.08,
                y: isSwapped ? -200 : isActive ? 0 : offset * 20,
                x: isSwapped ? -200 : 0,
                rotate: isSwapped ? -15 : 0,
                opacity: isSwapped ? 0 : isActive ? 1 : 1 - offset * 0.3,
                zIndex: loadingStages.length - i,
                boxShadow: isActive 
                  ? "0px 0px 50px 10px rgba(168, 85, 247, 0.5), 0px 0px 100px 20px rgba(236, 72, 153, 0.3)"
                  : "0px 8px 30px 0px rgba(0, 0, 0, 0.4)"
              }}
              transition={{
                type: "spring",
                stiffness: 250,
                damping: 25,
                mass: 0.8
              }}
            >
              <h2
                className={`text-xl font-bold px-6 text-center ${
                  i === loadingStages.length - 1
                    ? "text-4xl tracking-widest font-black uppercase"
                    : ""
                }`}
                style={{
                  fontFamily: i === loadingStages.length - 1 ? "'Syncopate', sans-serif" : "inherit",
                  background: "linear-gradient(to right, #ffffff, #a855f7, #ec4899)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {stage}
              </h2>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}