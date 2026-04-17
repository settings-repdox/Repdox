'use client';

import { useState, useEffect } from 'react';

export default function IntroLoader({ onComplete }: { onComplete: () => void }) {
  const [stage, setStage] = useState('enter');

  useEffect(() => {
    // Improved timing: slower entry, longer hold, smoother exit
    const enterTimer = setTimeout(() => setStage('hold'), 300); // Was 100ms, now 300ms for calmer entry
    const holdTimer = setTimeout(() => setStage('exit'), 2200); // Was 2000ms, now 2200ms for better rhythm
    const exitTimer = setTimeout(onComplete, 3200); // Was 4000ms, now 3200ms for tighter overall duration

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`intro-loader ${stage}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000000',
        // Improved: Smoother fade with longer duration and refined easing
        transition: 'opacity 800ms cubic-bezier(0.4, 0.0, 0.2, 1)',
        opacity: stage === 'exit' ? 0 : 1,
        // Subtle scale on exit for depth perception
        transform: stage === 'exit' ? 'scale(1.02)' : 'scale(1)',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1
          style={{
            fontSize: '4.5rem',
            fontWeight: 'bold',
            margin: 0,
            fontFamily: "'Syncopate', sans-serif",
            letterSpacing: '0.2em',
            background: 'linear-gradient(to right, #ffffff, #a855f7, #ec4899)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            // Improved: Gentler Y movement with slight scale for natural motion
            transform: stage === 'enter' 
              ? 'translateY(40px) scale(0.95)' 
              : stage === 'exit'
              ? 'translateY(-10px) scale(1.02)'
              : 'translateY(0) scale(1)',
            // Improved: Separate opacity timing for layered reveal
            opacity: stage === 'enter' ? 0 : stage === 'exit' ? 0 : 1,
            // Improved: Longer duration with refined easing for premium feel
            transition: 'opacity 1000ms cubic-bezier(0.4, 0.0, 0.2, 1), transform 1000ms cubic-bezier(0.4, 0.0, 0.2, 1)',
          }}
        >
          REPDOX
        </h1>
        
        {/* Improved: Bars now reveal sequentially with mask effect instead of scale */}
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          justifyContent: 'center', 
          marginTop: '2rem',
          // Improved: Bars fade in after text for intentional sequencing
          opacity: stage === 'enter' ? 0 : stage === 'exit' ? 0 : 1,
          transform: stage === 'exit' ? 'translateY(10px)' : 'translateY(0)',
          transition: 'all 700ms cubic-bezier(0.4, 0.0, 0.2, 1) 300ms',
        }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: '40px',
                height: '4px',
                backgroundColor: '#8B5CF6',
                borderRadius: '2px',
                // Improved: Use clip-path for smoother reveal instead of scaleX
                clipPath: stage === 'enter' || stage === 'exit' 
                  ? 'inset(0 100% 0 0)' 
                  : 'inset(0 0 0 0)',
                // Improved: Staggered timing refined for better rhythm
                transition: `clip-path 600ms cubic-bezier(0.4, 0.0, 0.2, 1) ${400 + i * 120}ms`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}