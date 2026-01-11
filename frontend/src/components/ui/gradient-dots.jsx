"use client";

import React from "react";
import { motion } from "motion/react";

/**
 * GradientDots Component
 *
 * Creates an animated dot pattern background with moving color gradients.
 * Great for hero sections or as a subtle animated background.
 *
 * Props:
 * @param {number} dotSize - Size of dots (default: 8)
 * @param {number} spacing - Space between dots (default: 10)
 * @param {number} duration - Animation loop duration in seconds (default: 30)
 * @param {number} colorCycleDuration - How fast colors shift (default: 6)
 * @param {string} backgroundColor - Background color (default: 'var(--background)')
 * @param {string} className - Additional CSS classes
 */
export function GradientDots({
  dotSize = 8,
  spacing = 10,
  duration = 30,
  colorCycleDuration = 6,
  backgroundColor = "#0a0a0a",
  className = "",
  ...props
}) {
  // Hexagonal spacing for more natural dot arrangement
  const hexSpacing = spacing * 1.732;

  return (
    <motion.div
      className={`absolute inset-0 ${className}`}
      style={{
        backgroundColor,
        backgroundImage: `
          radial-gradient(circle at 50% 50%, transparent 1.5px, ${backgroundColor} 0 ${dotSize}px, transparent ${dotSize}px),
          radial-gradient(circle at 50% 50%, transparent 1.5px, ${backgroundColor} 0 ${dotSize}px, transparent ${dotSize}px),
          radial-gradient(circle at 50% 50%, #f97316, transparent 60%),
          radial-gradient(circle at 50% 50%, #fb923c, transparent 60%),
          radial-gradient(circle at 50% 50%, #ea580c, transparent 60%),
          radial-gradient(ellipse at 50% 50%, #c2410c, transparent 60%)
        `,
        backgroundSize: `
          ${spacing}px ${hexSpacing}px,
          ${spacing}px ${hexSpacing}px,
          200% 200%,
          200% 200%,
          200% 200%,
          200% ${hexSpacing}px
        `,
        backgroundPosition: `
          0px 0px, ${spacing / 2}px ${hexSpacing / 2}px,
          0% 0%,
          0% 0%,
          0% 0px
        `,
      }}
      animate={{
        backgroundPosition: [
          `0px 0px, ${spacing / 2}px ${hexSpacing / 2}px, 800% 400%, 1000% -400%, -1200% -600%, 400% ${hexSpacing}px`,
          `0px 0px, ${spacing / 2}px ${hexSpacing / 2}px, 0% 0%, 0% 0%, 0% 0%, 0% 0%`,
        ],
        filter: ["hue-rotate(0deg)", "hue-rotate(360deg)"],
      }}
      transition={{
        backgroundPosition: {
          duration: duration,
          ease: "linear",
          repeat: Infinity,
        },
        filter: {
          duration: colorCycleDuration,
          ease: "linear",
          repeat: Infinity,
        },
      }}
      {...props}
    />
  );
}
