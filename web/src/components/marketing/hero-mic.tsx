"use client"
import { motion } from "framer-motion"
import { Mic } from "lucide-react"

/**
 * Big animated microphone (CTA visual). Listens vibe.
 */
export function HeroMic() {
  return (
    <div className="relative mx-auto h-44 w-44 sm:h-56 sm:w-56">
      {/* Halo */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full border border-electric/30"
          initial={{ scale: 0.8, opacity: 0.6 }}
          animate={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.7, ease: "easeOut" }}
        />
      ))}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-electric to-electric-deep grid place-items-center shadow-[0_18px_60px_-10px_rgba(255,213,0,0.55)]">
        <Mic className="h-20 w-20 sm:h-24 sm:w-24 text-black" strokeWidth={1.8} />
      </div>
      {/* Wires around */}
      <svg
        className="absolute -inset-10 pointer-events-none"
        viewBox="0 0 320 320"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="g1" x1="0" x2="1">
            <stop offset="0" stopColor="#e63946" />
            <stop offset="1" stopColor="#2f6fff" />
          </linearGradient>
          <linearGradient id="g2" x1="0" x2="1">
            <stop offset="0" stopColor="#10b981" />
            <stop offset="1" stopColor="#f4c20b" />
          </linearGradient>
        </defs>
        <motion.path
          d="M40 160 C 40 60 280 60 280 160"
          stroke="url(#g1)" strokeWidth="2.5" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
        />
        <motion.path
          d="M40 160 C 40 260 280 260 280 160"
          stroke="url(#g2)" strokeWidth="2.5" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 2, ease: "easeOut", delay: 0.3 }}
        />
      </svg>
    </div>
  )
}
