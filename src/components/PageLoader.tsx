import { motion } from "framer-motion";

export default function PageLoader() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/80 backdrop-blur-xl">
      <div className="relative">
        {/* Pulsing Glow */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0 bg-purple-500/20 blur-3xl rounded-full"
        />
        
        {/* Logo Text with Animated Gradient */}
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-black tracking-[0.4em] relative z-10"
          style={{ 
            fontFamily: "'Syncopate', sans-serif",
            background: "linear-gradient(to left, #ffffff, #a855f7, #ec4899)",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          <motion.span
            animate={{
              backgroundPosition: ["0% center", "100% center", "0% center"],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
            }}
            className="block"
          >
            REPDOX
          </motion.span>
        </motion.h2>

        {/* Animated Bar */}
        <div className="mt-6 flex gap-2 justify-center">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{
                delay: i * 0.1,
                duration: 0.5,
                repeat: Infinity,
                repeatType: "reverse",
                repeatDelay: 0.5,
              }}
              className="w-12 h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full origin-right"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
