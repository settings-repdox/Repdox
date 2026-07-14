import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ChevronLeft, ChevronRight, Mail, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import EventCard from "./EventCard";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";

export default function CurrentEventsStrip() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['current-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('is_active', true)
        .order('start_at', { ascending: true })
        .limit(6);
      
      if (error) throw error;
      return (data || []).map(event => ({
        ...event,
        type: event.type as string | string[],
        format: event.format as string | string[],
      }));
    },
  });

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const cardWidth = 380 + 24; // card width + gap
    const scrollAmount = direction === 'left' ? -cardWidth : cardWidth;
    
    container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    
    const newIndex = direction === 'left' 
      ? Math.max(0, currentIndex - 1)
      : Math.min(events.length - 1, currentIndex + 1);
    setCurrentIndex(newIndex);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - (scrollContainerRef.current?.offsetLeft || 0));
    setScrollLeft(scrollContainerRef.current?.scrollLeft || 0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - (scrollContainerRef.current?.offsetLeft || 0);
    const walk = (x - startX) * 2;
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => setIsDragging(false);

  if (isLoading) {
    return (
      <section className="py-20 px-6 relative overflow-hidden">
        <div className="max-w-[95vw] mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-muted rounded-xl w-1/3 mx-auto" />
            <div className="h-96 bg-muted rounded-2xl" />
          </div>
        </div>
      </section>
    );
  }

  if (events.length === 0) {
    return (
      <EmptyEventsState />
    );
  }

  return (
    <section
      ref={ref}
      className="py-24 px-0 relative overflow-hidden"
    >

      <div className="max-w-[95vw] mx-auto relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >

          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/60">
            Upcoming Events
          </h2>
          <p className="text-muted-foreground text-lg">
            Don't miss out on our next events
          </p>
        </motion.div>

        <div className="relative">
          {events.length > 1 && (
            <>
              <MagneticButton
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20"
                onClick={() => scroll('left')}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="h-5 w-5" />
              </MagneticButton>

              <MagneticButton
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20"
                onClick={() => scroll('right')}
                disabled={currentIndex === events.length - 1}
              >
                <ChevronRight className="h-5 w-5" />
              </MagneticButton>
            </>
          )}

          {/* Scrollable Container */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            ref={scrollContainerRef}
            className={`flex gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide cursor-grab active:cursor-grabbing ${events.length <= 1 ? 'justify-center px-6' : 'px-16'} py-4`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            style={{ scrollBehavior: isDragging ? 'auto' : 'smooth' }}
          >
            {events.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: 50 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <EventCard event={event} compact />
              </motion.div>
            ))}
          </motion.div>

          {/* Progress indicators - static dots */}
          <div className="flex justify-center gap-3 mt-10">
            {events.map((_, index) => (
              <motion.div
                key={index}
                className={`h-2 w-2 rounded-full transition-all duration-500 ${
                  index === currentIndex 
                    ? 'bg-accent scale-125' 
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// Empty Events State Component
function EmptyEventsState() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Store email subscription (can be replaced with actual API call)
      // For now, we'll just simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsSubmitted(true);
      setEmail("");
      setTimeout(() => setIsSubmitted(false), 3000);
    } catch (err) {
      setError("Failed to subscribe. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="py-24 px-6 relative overflow-hidden">
      <div className="max-w-2xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Decorative icon */}
          <motion.div
            className="mb-8 inline-flex items-center justify-center w-20 h-20 rounded-full bg-accent/10 border border-accent/20"
            // animate={{ scale: [1, 1.05, 1], rotate: [0, 5, 0] }}
            // transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <Mail className="w-10 h-10 text-accent" />
          </motion.div>

          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/60">
            No events live yet
          </h2>
          <p className="text-lg text-muted-foreground mb-12 leading-relaxed">
            Great things are coming! Subscribe to our newsletter to be notified
            the moment we launch our next event.
          </p>

          {/* Email subscription form */}
          <motion.form
            onSubmit={handleSubscribe}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="space-y-4"
          >
            {/* Input field */}
            <div className="relative flex flex-col sm:flex-row gap-3">
              <motion.input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                disabled={isSubmitted || isLoading}
                whileFocus={{ scale: 1.02 }}
                className="flex-1 px-6 py-3 rounded-2xl bg-card border border-border/50 text-foreground placeholder-muted-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-300 disabled:opacity-50"
              />
              <motion.button
                type="submit"
                disabled={isSubmitted || isLoading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold whitespace-nowrap hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitted ? "Subscribed!" : isLoading ? "..." : "Subscribe"}
              </motion.button>
            </div>

            {/* Error message */}
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-500 text-sm"
              >
                {error}
              </motion.p>
            )}

            {/* Success message */}
            {isSubmitted && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center justify-center gap-2 text-green-500 text-sm"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Thanks for subscribing! We'll notify you soon.</span>
              </motion.div>
            )}
          </motion.form>

          {/* Secondary message */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-muted-foreground text-sm mt-8"
          >
            Check back soon for exciting hackathons, MUNs, workshops, and more!
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}

// Magnetic Button Component
function MagneticButton({ 
  children, 
  className = "", 
  onClick,
  disabled = false 
}: { 
  children: React.ReactNode; 
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const springX = useSpring(x, { stiffness: 300, damping: 20 });
  const springY = useSpring(y, { stiffness: 300, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current || disabled) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) * 0.3);
    y.set((e.clientY - centerY) * 0.3);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      disabled={disabled}
      style={{ x: springX, y: springY }}
      className={`p-3 rounded-full bg-accent/10 backdrop-blur-md border border-border hover:bg-accent/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${className}`}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      {children}
    </motion.button>
  );
}
