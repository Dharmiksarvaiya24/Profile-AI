"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const MacbookHero = dynamic(() => import("./MacbookHero"), {
  ssr: false,
  loading: () => null,
});

export default function MacbookWrapper() {
  const [shouldRender, setShouldRender] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mount the 3D Canvas only once the section is near the viewport (800px margin)
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin: "800px" }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Preload the GLB + 3D chunk on idle so it never blocks initial render
  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      import("./MacbookHero");
      import("@react-three/drei").then((drei) => {
        if (!cancelled) drei.useGLTF.preload("/mac.glb");
      });
    };
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(run);
      return () => {
        cancelled = true;
        w.cancelIdleCallback?.(id);
      };
    }
    const t = setTimeout(run, 1);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      {shouldRender ? (
        <MacbookHero />
      ) : (
        <div className="relative w-full h-[300vh] pointer-events-none" />
      )}
    </div>
  );
}
