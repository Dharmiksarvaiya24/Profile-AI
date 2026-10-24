"use client";

import { useEffect, useRef } from "react";

/**
 * Hides the hero ID card as scrolling begins, before the 3D hero (iPhone /
 * MacBook) rises into view, so the card never visually overlaps the device
 * during the scroll transition. Pure DOM style updates — no React re-renders.
 */
export default function HeroFadeOnScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // The device hero starts rising within the first ~12% of its 280vh scroll
    // span (≈180px at a typical 844px viewport) — fade fully out inside that
    // window so the handoff is seamless.
    const FADE_PX = 180;
    const SLIDE_PX = 40; // slight upward drift for a smoother exit

    const apply = () => {
      const t = Math.max(0, Math.min(1, window.scrollY / FADE_PX));
      el.style.opacity = String(1 - t);
      el.style.transform = `translateY(${-t * SLIDE_PX}px)`;
      el.style.visibility = t >= 1 ? "hidden" : "visible";
    };

    apply();
    window.addEventListener("scroll", apply, { passive: true });
    return () => window.removeEventListener("scroll", apply);
  }, []);

  return (
    <div
      ref={ref}
      className="w-full h-full"
      style={{ willChange: "opacity, transform", transition: "opacity 0.05s linear" }}
    >
      {children}
    </div>
  );
}
