"use client";

import { memo, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { animate } from "motion/react";

/**
 * GlowingEffect Component
 *
 * Creates a glowing border effect that follows the mouse cursor.
 *
 * Props:
 * @param {number} blur - How blurry the glow is (default: 0)
 * @param {number} inactiveZone - Center area where glow doesn't activate, 0-1 (default: 0.7)
 * @param {number} proximity - How close mouse needs to be to activate (default: 0)
 * @param {number} spread - How wide the glow spreads in degrees (default: 20)
 * @param {string} variant - "default" (rainbow) or "white" (default: "default")
 * @param {boolean} glow - Whether glow is always visible (default: false)
 * @param {string} className - Additional CSS classes
 * @param {boolean} disabled - Disable the effect (default: true)
 * @param {number} movementDuration - Animation speed in seconds (default: 2)
 * @param {number} borderWidth - Width of glowing border in pixels (default: 1)
 */
const GlowingEffect = memo(
  ({
    blur = 0,
    inactiveZone = 0.7,
    proximity = 0,
    spread = 20,
    variant = "default",
    glow = false,
    className,
    movementDuration = 2,
    borderWidth = 1,
    disabled = true,
  }) => {
    // Ref to the container element
    const containerRef = useRef(null);
    // Track last mouse position for scroll events
    const lastPosition = useRef({ x: 0, y: 0 });
    // Track animation frame for cleanup
    const animationFrameRef = useRef(0);

    /**
     * Handle mouse/pointer movement
     * Calculates the angle and activates the glow effect
     */
    const handleMove = useCallback(
      (e) => {
        if (!containerRef.current) return;

        // Cancel any pending animation frame
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }

        // Use requestAnimationFrame for smooth performance
        animationFrameRef.current = requestAnimationFrame(() => {
          const element = containerRef.current;
          if (!element) return;

          // Get element position and size
          const { left, top, width, height } = element.getBoundingClientRect();

          // Get mouse position (use last known if not provided)
          const mouseX = e?.x ?? lastPosition.current.x;
          const mouseY = e?.y ?? lastPosition.current.y;

          // Remember position for scroll events
          if (e) {
            lastPosition.current = { x: mouseX, y: mouseY };
          }

          // Calculate center of element
          const center = [left + width * 0.5, top + height * 0.5];

          // Calculate distance from mouse to center
          const distanceFromCenter = Math.hypot(
            mouseX - center[0],
            mouseY - center[1]
          );

          // Calculate the inactive radius (center area with no glow)
          const inactiveRadius = 0.5 * Math.min(width, height) * inactiveZone;

          // If mouse is in the inactive zone, deactivate
          if (distanceFromCenter < inactiveRadius) {
            element.style.setProperty("--active", "0");
            return;
          }

          // Check if mouse is within proximity of the element
          const isActive =
            mouseX > left - proximity &&
            mouseX < left + width + proximity &&
            mouseY > top - proximity &&
            mouseY < top + height + proximity;

          element.style.setProperty("--active", isActive ? "1" : "0");

          if (!isActive) return;

          // Calculate the angle from center to mouse position
          // atan2 gives angle in radians, convert to degrees
          const currentAngle =
            parseFloat(element.style.getPropertyValue("--start")) || 0;
          let targetAngle =
            (180 * Math.atan2(mouseY - center[1], mouseX - center[0])) /
              Math.PI +
            90;

          // Normalize angle difference to avoid spinning the wrong way
          const angleDiff = ((targetAngle - currentAngle + 180) % 360) - 180;
          const newAngle = currentAngle + angleDiff;

          // Animate the rotation smoothly
          animate(currentAngle, newAngle, {
            duration: movementDuration,
            ease: [0.16, 1, 0.3, 1], // Custom easing curve
            onUpdate: (value) => {
              element.style.setProperty("--start", String(value));
            },
          });
        });
      },
      [inactiveZone, proximity, movementDuration]
    );

    // Set up event listeners
    useEffect(() => {
      if (disabled) return;

      const handleScroll = () => handleMove();
      const handlePointerMove = (e) => handleMove(e);

      // Listen for scroll (recalculate position)
      window.addEventListener("scroll", handleScroll, { passive: true });
      // Listen for mouse movement
      document.body.addEventListener("pointermove", handlePointerMove, {
        passive: true,
      });

      // Cleanup on unmount
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        window.removeEventListener("scroll", handleScroll);
        document.body.removeEventListener("pointermove", handlePointerMove);
      };
    }, [handleMove, disabled]);

    return (
      <>
        {/* Static border (shown when disabled) */}
        <div
          className={cn(
            "pointer-events-none absolute -inset-px hidden rounded-[inherit] border opacity-0 transition-opacity",
            glow && "opacity-100",
            variant === "white" && "border-white",
            disabled && "!block"
          )}
        />

        {/* Dynamic glowing effect container */}
        <div
          ref={containerRef}
          style={{
            "--blur": `${blur}px`,
            "--spread": spread,
            "--start": "0",
            "--active": "0",
            "--glowingeffect-border-width": `${borderWidth}px`,
            "--repeating-conic-gradient-times": "5",
            "--gradient":
              variant === "white"
                ? `repeating-conic-gradient(
                  from 236.84deg at 50% 50%,
                  var(--black),
                  var(--black) calc(25% / var(--repeating-conic-gradient-times))
                )`
                : `radial-gradient(circle, #f97316 10%, #f9731600 20%),
                radial-gradient(circle at 40% 40%, #fb923c 5%, #fb923c00 15%),
                radial-gradient(circle at 60% 60%, #ea580c 10%, #ea580c00 20%),
                radial-gradient(circle at 40% 60%, #c2410c 10%, #c2410c00 20%),
                repeating-conic-gradient(
                  from 236.84deg at 50% 50%,
                  #f97316 0%,
                  #fb923c calc(25% / var(--repeating-conic-gradient-times)),
                  #ea580c calc(50% / var(--repeating-conic-gradient-times)),
                  #c2410c calc(75% / var(--repeating-conic-gradient-times)),
                  #f97316 calc(100% / var(--repeating-conic-gradient-times))
                )`,
          }}
          className={cn(
            "pointer-events-none absolute inset-0 rounded-[inherit] opacity-100 transition-opacity",
            glow && "opacity-100",
            blur > 0 && "blur-[var(--blur)] ",
            className,
            disabled && "!hidden"
          )}
        >
          {/* The actual glow element with mask */}
          <div
            className={cn(
              "glow",
              "rounded-[inherit]",
              'after:content-[""] after:rounded-[inherit] after:absolute after:inset-[calc(-1*var(--glowingeffect-border-width))]',
              "after:[border:var(--glowingeffect-border-width)_solid_transparent]",
              "after:[background:var(--gradient)] after:[background-attachment:fixed]",
              "after:opacity-[var(--active)] after:transition-opacity after:duration-300",
              "after:[mask-clip:padding-box,border-box]",
              "after:[mask-composite:intersect]",
              "after:[mask-image:linear-gradient(#0000,#0000),conic-gradient(from_calc((var(--start)-var(--spread))*1deg),#00000000_0deg,#fff,#00000000_calc(var(--spread)*2deg))]"
            )}
          />
        </div>
      </>
    );
  }
);

GlowingEffect.displayName = "GlowingEffect";

export { GlowingEffect };
