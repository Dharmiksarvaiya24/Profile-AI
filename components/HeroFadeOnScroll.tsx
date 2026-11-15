"use client";

import { useEffect, useRef } from "react";

export default function HeroFadeOnScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const FADE_PX = 180;
    const SLIDE_PX = 40; 

    const apply = () => {
      const t = Math.max(0, Math.min(1, window.scrollY / FADE_PX));
      el.style.opacity = String(1 - t);
      el.style.transform = `translateY(${-t * SLIDE_PX}px)`;
      el.style.visibility = t >= 1 ? "hidden" : "visible";
      el.style.display = t >= 1 ? "none" : "block";
    };

    apply();
    window.addEventListener("scroll", apply, { passive: true });
    return () => window.removeEventListener("scroll", apply);
  }, []);

  return (
    <div
      ref={ref}
      className="w-full h-full"
      style={{ willChange: "opacity, transform" }}
    >
      {children}
    </div>
  );
}
