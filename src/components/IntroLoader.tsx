import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const loadingStages = [
  "Loading About page...",
  "Loading Volunteers page...",
  "Loading Events...",
  "Loading Community...",
  "Loaded Repdox"
];

export default function IntroLoader({ onComplete }: { onComplete: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (currentIndex < loadingStages.length - 1) {
      const timer = setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
      }, 1000); // 1 second per card
      return () => clearTimeout(timer);
    } else {
      // Hold on the last card briefly, then trigger zoom-out
      const timer = setTimeout(() => {
        setIsExiting(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [currentIndex]);

  useEffect(() => {
    if (isExiting) {
      const timer = setTimeout(() => {
        onComplete();
      }, 800); // Match zoom out transition duration
      return () => clearTimeout(timer);
    }
  }, [isExiting, onComplete]);

  return (
    <motion.div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black overflow-hidden"
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
    >
      {/* Light Pillar Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
        {/* Center pillar */}
        <motion.div
          className="absolute w-[20vw] h-[150vh] bg-gradient-to-b from-transparent via-purple-500/30 to-transparent blur-[60px]"
          style={{ willChange: "transform, opacity" }}
          animate={{
            rotate: [0, 5, -5, 0],
            scale: [1, 1.1, 0.9, 1],
            opacity: [0.4, 0.7, 0.4]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Left pillar */}
        <motion.div
          className="absolute w-[15vw] h-[150vh] bg-gradient-to-b from-transparent via-pink-500/20 to-transparent blur-[80px]"
          style={{ willChange: "transform, opacity" }}
          animate={{
            rotate: [-15, -10, -20, -15],
            scale: [0.8, 1, 0.8],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Right pillar */}
        <motion.div
          className="absolute w-[10vw] h-[150vh] bg-gradient-to-b from-transparent via-blue-500/20 to-transparent blur-[50px]"
          style={{ willChange: "transform, opacity" }}
          animate={{
            rotate: [15, 20, 10, 15],
            scale: [1, 0.8, 1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      
      <div className="relative w-[320px] h-[180px]">
        {loadingStages.map((stage, i) => {
          const isSwapped = i < currentIndex;
          const isActive = i === currentIndex;
          const isBelow = i > currentIndex;
          const offset = i - currentIndex;

          return (
            <motion.div
              key={i}
              className="absolute inset-0 flex items-center justify-center rounded-3xl bg-[#18181b] border border-white/10"
              style={{ willChange: "transform, opacity" }}
              initial={{
                scale: 0.8,
                y: 50,
                opacity: 0,
                boxShadow: "0px 8px 30px 0px rgba(0, 0, 0, 0.4)"
              }}
              animate={{
                scale: isExiting ? 15 : isSwapped ? 0.9 : isActive ? 1 : 1 - offset * 0.08,
                y: isSwapped ? -200 : isActive ? 0 : offset * 20,
                x: isSwapped ? -200 : 0,
                rotate: isSwapped ? -15 : 0,
                opacity: isExiting ? 0 : isSwapped ? 0 : isActive ? 1 : 1 - offset * 0.3,
                zIndex: loadingStages.length - i,
                boxShadow: isActive 
                  ? "0px 0px 50px 10px rgba(168, 85, 247, 0.5), 0px 0px 100px 20px rgba(236, 72, 153, 0.3)"
                  : "0px 8px 30px 0px rgba(0, 0, 0, 0.4)"
              }}
              transition={{
                type: isExiting ? "tween" : "spring",
                duration: isExiting ? 0.8 : undefined,
                ease: isExiting ? "circIn" : undefined,
                stiffness: isExiting ? undefined : 250,
                damping: isExiting ? undefined : 25,
                mass: isExiting ? undefined : 0.8
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
    </motion.div>
  );
}