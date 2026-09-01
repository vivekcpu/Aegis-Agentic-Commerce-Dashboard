/**
 * AegisLoader
 * A short "boot sequence" shown once when the dashboard first mounts.
 * Purely decorative/branding — it does not block on any real network
 * request, it just runs for a fixed duration then calls onDone().
 *
 * Motion notes:
 * - Rings: plain CSS animation (`animate-ring-expand`), staggered with
 *   animationDelay so they look like radar pulses expanding outward.
 * - Letters: framer-motion stagger so "A · E · G · I · S" reveal one
 *   at a time instead of popping in all at once.
 */
import React, { useEffect } from "react";
import { motion } from "framer-motion";

const LETTERS = ["A", "E", "G", "I", "S"];

export default function AegisLoader({ onDone, duration = 2200 }) {
  useEffect(() => {
    const t = setTimeout(onDone, duration);
    return () => clearTimeout(t);
  }, [onDone, duration]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-obsidian scan-bg"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Radar rings expanding from center, behind the text */}
      <div className="relative w-40 h-40 sm:w-56 sm:h-56 flex items-center justify-center">
        {[0, 0.5, 1, 1.5].map((delay) => (
          <span
            key={delay}
            className="absolute inset-0 rounded-full border border-amber animate-ring-expand"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
        <span className="w-3 h-3 rounded-full bg-amber shadow-[0_0_20px_4px_rgba(245,165,36,0.6)]" />
      </div>

      {/* Letter-by-letter reveal */}
      <div className="mt-8 flex gap-2 sm:gap-3 font-display text-2xl sm:text-4xl font-bold tracking-[0.3em] text-amber">
        {LETTERS.map((letter, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 * i + 0.2, duration: 0.4 }}
          >
            {letter}
          </motion.span>
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.5 }}
        className="mt-3 text-[10px] sm:text-xs text-stone-500 tracking-widest uppercase"
      >
        Starting your dashboard…
      </motion.p>
    </motion.div>
  );
}
