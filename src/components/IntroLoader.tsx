import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, Terminal, Zap, Sparkles } from 'lucide-react';
import CardSwap, { Card } from './reactbits/CardSwap';

export default function IntroLoader({ onComplete }: { onComplete: () => void }) {
  const [isExiting, setIsExiting] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (countdown > 1 && !isExiting) {
      const timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, isExiting]);

  useEffect(() => {
    if (isExiting) {
      const timer = setTimeout(() => {
        onComplete();
      }, 500); // Match zoom out transition duration
      return () => clearTimeout(timer);
    }
  }, [isExiting, onComplete]);

  // When CardSwap transitions to the last card (index 3: "REPDOX")
  const handleActiveCardChange = (idx: number) => {
    setActiveIndex(idx);
    if (idx === 3) {
      // Hold on the final card for 1.0 second, then exit
      const timer = setTimeout(() => {
        setIsExiting(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  };

  return (
    <motion.div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black overflow-hidden"
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      {/* Aurora glow background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
        <motion.div
          className="absolute w-[40vw] h-[150vh] bg-gradient-to-b from-transparent via-purple-600/20 to-transparent blur-[80px]"
          animate={{
            rotate: [0, 10, -10, 0],
            scale: [1, 1.15, 0.85, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-[30vw] h-[150vh] bg-gradient-to-b from-transparent via-pink-600/10 to-transparent blur-[100px]"
          animate={{
            rotate: [-10, 5, -15, -10],
            scale: [0.9, 1.1, 0.9],
          }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* CardSwap centered viewport */}
      <div className="relative flex items-center justify-center" style={{ width: '380px', height: '320px', transform: 'translate(-10px, 10px)' }}>
        <CardSwap
          width={320}
          height={240}
          cardDistance={20}
          verticalDistance={20}
          delay={1000} // 1.0 second per swap for snappy intro
          skewAmount={4}
          easing="linear" // Use fast power1 transition (0.8s) instead of slow elastic
          onActiveCardChange={handleActiveCardChange}
        >
          {/* Card 1: Think */}
          <Card className="flex flex-col items-center justify-center p-6 rounded-3xl bg-[#09090b]/90 border border-white/10 shadow-[0px_0px_40px_-10px_rgba(168,85,247,0.2)]">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border border-yellow-500/30 flex items-center justify-center mb-5">
              <Lightbulb className="w-6 h-6 text-yellow-400" />
            </div>
            <h3 className="text-xl font-display font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white via-yellow-200 to-amber-200 uppercase mb-2">
              THINK
            </h3>
            <p className="text-muted-foreground text-center text-xs max-w-[240px] leading-relaxed">
              Imagine the possibilities. Conceptualize solutions for real-world problems.
            </p>
          </Card>

          {/* Card 2: Build */}
          <Card className="flex flex-col items-center justify-center p-6 rounded-3xl bg-[#09090b]/90 border border-white/10 shadow-[0px_0px_40px_-10px_rgba(59,130,246,0.2)]">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center mb-5">
              <Terminal className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-display font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-200 to-cyan-200 uppercase mb-2">
              BUILD
            </h3>
            <p className="text-muted-foreground text-center text-xs max-w-[240px] leading-relaxed">
              Hack and design. Turn concepts into fully functional code and systems.
            </p>
          </Card>

          {/* Card 3: Transform */}
          <Card className="flex flex-col items-center justify-center p-6 rounded-3xl bg-[#09090b]/90 border border-white/10 shadow-[0px_0px_40px_-10px_rgba(236,72,153,0.2)]">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 border border-pink-500/30 flex items-center justify-center mb-5">
              <Zap className="w-6 h-6 text-pink-400 animate-pulse" />
            </div>
            <h3 className="text-xl font-display font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white via-pink-200 to-rose-200 uppercase mb-2">
              TRANSFORM
            </h3>
            <p className="text-muted-foreground text-center text-xs max-w-[240px] leading-relaxed">
              Inspire and lead. Make a lasting impact in the global tech community.
            </p>
          </Card>

          {/* Card 4: REPDOX */}
          <Card className="flex flex-col items-center justify-center p-6 rounded-3xl bg-[#0d0716] border border-purple-500/30 shadow-[0px_0px_50px_10px_rgba(168,85,247,0.3),_0px_0px_100px_20px_rgba(236,72,153,0.1)]">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-5 shadow-lg shadow-purple-500/30">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h3 
              className="text-3xl font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-300 to-pink-400 uppercase mb-2"
              style={{ fontFamily: "'Syncopate', sans-serif" }}
            >
              REPDOX
            </h3>
            <p className="text-purple-300/80 text-center text-[10px] tracking-widest uppercase font-bold max-w-[240px] leading-relaxed">
              Think. Build. Transform.
            </p>
          </Card>
        </CardSwap>
      </div>

      {/* Countdown display */}
      <div className="absolute bottom-12 flex flex-col items-center justify-center gap-1 select-none">
        <span className="text-[10px] tracking-[0.3em] text-purple-400/60 font-bold uppercase">
          Initializing
        </span>
        <motion.div
          key={countdown}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className="text-2xl font-black font-display text-white tracking-[0.1em]"
        >
          {countdown}...
        </motion.div>
      </div>
    </motion.div>
  );
}